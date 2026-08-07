package com.yukcsca;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.support.PostgresTestConfiguration;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest
@Import(PostgresTestConfiguration.class)
class DatabaseMigrationIT {
  @Autowired DataSource dataSource;

  @Test
  void startsAgainstRealPostgresAndAppliesFlywayMigrations() throws Exception {
    try (var connection = dataSource.getConnection();
        var statement =
            connection.prepareStatement(
                "select count(*) from information_schema.tables "
                    + "where table_name in ('auth_session', 'security_event', 'student_profile', "
                    + "'email_verification_claim', 'credential_authenticator', "
                    + "'account_policy_acceptance', 'credential_email_outbox', "
                    + "'password_recovery_claim', 'password_recovery_email_outbox', "
                    + "'academic_package', 'academic_revision', 'academic_image', "
                    + "'academic_audit', 'student_content_progress')");
        var result = statement.executeQuery()) {
      assertThat(result.next()).isTrue();
      assertThat(result.getInt(1)).isEqualTo(14);
    }
  }
}
