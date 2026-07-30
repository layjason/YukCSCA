package com.yukcsca.profile.application;

import com.yukcsca.identity.application.CurrentAccountRole;
import com.yukcsca.identity.application.CurrentAuthenticationService;
import com.yukcsca.identity.application.SecurityEventService;
import com.yukcsca.identity.application.StudentAccountActivation;
import com.yukcsca.identity.application.StudentAccountActivation.AccountRoleState;
import com.yukcsca.profile.domain.ExplanationLanguage;
import com.yukcsca.profile.domain.StudentGrade;
import com.yukcsca.profile.domain.StudentProfile;
import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentProfileService {
  private static final ZoneId JAKARTA = ZoneId.of("Asia/Jakarta");

  private final StudentProfileStore profiles;
  private final StudentAccountActivation accounts;
  private final CurrentAuthenticationService authentication;
  private final SecurityEventService securityEvents;
  private final Clock clock;

  public StudentProfileService(
      StudentProfileStore profiles,
      StudentAccountActivation accounts,
      CurrentAuthenticationService authentication,
      SecurityEventService securityEvents,
      Clock clock) {
    this.profiles = profiles;
    this.accounts = accounts;
    this.authentication = authentication;
    this.securityEvents = securityEvents;
    this.clock = clock;
  }

  /** Creates the profile and completes its account-role transition in one transaction. */
  @Transactional
  public StudentActivationResult activate(UUID accountId, StudentActivationCommand command) {
    ValidatedProfile validated = validate(command);
    AccountRoleState role = accounts.lockRole(accountId);
    if (role == AccountRoleState.STUDENT) {
      StudentProfile existing =
          profiles
              .findByAccountId(accountId)
              .orElseThrow(
                  () -> new IllegalStateException("Student account is missing its profile."));
      return new StudentActivationResult(existing, false);
    }
    if (role == AccountRoleState.OTHER) {
      throw new RoleAlreadyAssignedException();
    }

    StudentProfile profile =
        profiles.save(
            StudentProfile.create(
                accountId,
                validated.preferredName(),
                validated.birthYear(),
                validated.currentGrade(),
                validated.city(),
                validated.explanationLanguage(),
                clock.instant()));
    accounts.activateStudent(accountId);
    return new StudentActivationResult(profile, true);
  }

  @Transactional(readOnly = true)
  public StudentProfile getOwnProfile(UUID accountId) {
    requireStudent(accountId);
    return profiles
        .findByAccountId(accountId)
        .orElseThrow(() -> new IllegalStateException("Student account is missing its profile."));
  }

  /**
   * Updates only supplied fields on the authenticated student's profile. The profile row is locked
   * before mutation so concurrent disjoint updates cannot overwrite one another.
   */
  @Transactional
  public StudentProfile updateOwnProfile(UUID accountId, StudentProfileUpdateCommand command) {
    requireStudent(accountId);
    ValidatedProfileUpdate update = validate(command);
    StudentProfile profile =
        profiles
            .findByAccountIdForUpdate(accountId)
            .orElseThrow(
                () -> new IllegalStateException("Student account is missing its profile."));
    boolean changed =
        profile.update(
            update.preferredName(),
            update.birthYear(),
            update.currentGrade(),
            update.city(),
            update.explanationLanguage(),
            clock.instant());
    if (changed) {
      profiles.save(profile);
      securityEvents.recordStudentProfileUpdate(accountId);
    }
    return profile;
  }

  private void requireStudent(UUID accountId) {
    if (authentication.requireAccount(accountId).role() != CurrentAccountRole.STUDENT) {
      throw new ProfileAccessDeniedException();
    }
  }

  private ValidatedProfile validate(StudentActivationCommand command) {
    List<ProfileViolation> violations = new ArrayList<>();
    int currentYear = ZonedDateTime.ofInstant(clock.instant(), JAKARTA).getYear();
    if (command.birthYear() < currentYear - 21 || command.birthYear() > currentYear - 12) {
      violations.add(
          new ProfileViolation(ProfileField.BIRTH_YEAR, ProfileViolationCode.OUT_OF_RANGE));
    }

    StudentGrade grade = null;
    try {
      grade = StudentGrade.valueOf(command.currentGrade());
    } catch (IllegalArgumentException exception) {
      violations.add(
          new ProfileViolation(ProfileField.CURRENT_GRADE, ProfileViolationCode.UNSUPPORTED));
    }

    ExplanationLanguage language =
        ExplanationLanguage.fromWireValue(command.defaultExplanationLanguage()).orElse(null);
    if (language == null) {
      violations.add(
          new ProfileViolation(
              ProfileField.DEFAULT_EXPLANATION_LANGUAGE, ProfileViolationCode.UNSUPPORTED));
    }
    if (!violations.isEmpty()) throw new ProfileValidationException(violations);

    return new ValidatedProfile(
        command.preferredName().trim(),
        command.birthYear(),
        grade,
        command.city().trim(),
        language);
  }

  private ValidatedProfileUpdate validate(StudentProfileUpdateCommand command) {
    List<ProfileViolation> violations = new ArrayList<>();
    String preferredName =
        validateOptionalText(command.preferredName(), ProfileField.PREFERRED_NAME, violations);
    Integer birthYear = command.birthYear();
    if (birthYear != null && !isBirthYearInRange(birthYear)) {
      violations.add(
          new ProfileViolation(ProfileField.BIRTH_YEAR, ProfileViolationCode.OUT_OF_RANGE));
    }

    StudentGrade grade = null;
    if (command.currentGrade() != null) {
      String wireGrade = command.currentGrade().trim();
      if (wireGrade.isEmpty()) {
        violations.add(
            new ProfileViolation(ProfileField.CURRENT_GRADE, ProfileViolationCode.REQUIRED));
      } else {
        try {
          grade = StudentGrade.valueOf(wireGrade);
        } catch (IllegalArgumentException exception) {
          violations.add(
              new ProfileViolation(ProfileField.CURRENT_GRADE, ProfileViolationCode.UNSUPPORTED));
        }
      }
    }

    String city = validateOptionalText(command.city(), ProfileField.CITY, violations);
    ExplanationLanguage language = null;
    if (command.defaultExplanationLanguage() != null) {
      String wireLanguage = command.defaultExplanationLanguage().trim();
      if (wireLanguage.isEmpty()) {
        violations.add(
            new ProfileViolation(
                ProfileField.DEFAULT_EXPLANATION_LANGUAGE, ProfileViolationCode.REQUIRED));
      } else {
        language = ExplanationLanguage.fromWireValue(wireLanguage).orElse(null);
        if (language == null) {
          violations.add(
              new ProfileViolation(
                  ProfileField.DEFAULT_EXPLANATION_LANGUAGE, ProfileViolationCode.UNSUPPORTED));
        }
      }
    }
    if (!violations.isEmpty()) throw new ProfileValidationException(violations);

    return new ValidatedProfileUpdate(preferredName, birthYear, grade, city, language);
  }

  private String validateOptionalText(
      String value, ProfileField field, List<ProfileViolation> violations) {
    if (value == null) return null;
    String trimmed = value.trim();
    if (trimmed.isEmpty()) {
      violations.add(new ProfileViolation(field, ProfileViolationCode.REQUIRED));
    }
    return trimmed;
  }

  private boolean isBirthYearInRange(int birthYear) {
    int currentYear = ZonedDateTime.ofInstant(clock.instant(), JAKARTA).getYear();
    return birthYear >= currentYear - 21 && birthYear <= currentYear - 12;
  }

  private record ValidatedProfile(
      String preferredName,
      int birthYear,
      StudentGrade currentGrade,
      String city,
      ExplanationLanguage explanationLanguage) {}

  private record ValidatedProfileUpdate(
      String preferredName,
      Integer birthYear,
      StudentGrade currentGrade,
      String city,
      ExplanationLanguage explanationLanguage) {}
}
