package com.yukcsca.profile.application;

import com.yukcsca.identity.application.CurrentAuthenticationService;
import com.yukcsca.identity.application.StudentAccountActivation;
import com.yukcsca.identity.application.StudentAccountActivation.AccountRoleState;
import com.yukcsca.identity.domain.UserRole;
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
  private final Clock clock;

  public StudentProfileService(
      StudentProfileStore profiles,
      StudentAccountActivation accounts,
      CurrentAuthenticationService authentication,
      Clock clock) {
    this.profiles = profiles;
    this.accounts = accounts;
    this.authentication = authentication;
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
    if (authentication.requireAccount(accountId).role() != UserRole.STUDENT) {
      throw new ProfileAccessDeniedException();
    }
    return profiles
        .findByAccountId(accountId)
        .orElseThrow(() -> new IllegalStateException("Student account is missing its profile."));
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

  private record ValidatedProfile(
      String preferredName,
      int birthYear,
      StudentGrade currentGrade,
      String city,
      ExplanationLanguage explanationLanguage) {}
}
