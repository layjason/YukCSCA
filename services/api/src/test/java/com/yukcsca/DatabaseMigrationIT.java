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
                    + "'academic_audit', 'student_content_progress', "
                    + "'academic_term_pronunciation', 'student_terminology_preview_progress', "
                    + "'student_terminology_notebook', 'student_terminology_review', "
                    + "'agent_conversation', 'agent_turn', 'agent_trace', 'agent_flag', "
                    + "'agent_content_chunk')");
        var result = statement.executeQuery()) {
      assertThat(result.next()).isTrue();
      assertThat(result.getInt(1)).isEqualTo(23);
    }
    try (var connection = dataSource.getConnection();
        var statement =
            connection.prepareStatement(
                "select format_type(a.atttypid, a.atttypmod) "
                    + "from pg_attribute a "
                    + "join pg_class c on c.oid = a.attrelid "
                    + "join pg_namespace n on n.oid = c.relnamespace "
                    + "where n.nspname = 'public' "
                    + "and c.relname = 'agent_content_chunk' "
                    + "and a.attname = 'embedding'");
        var result = statement.executeQuery()) {
      assertThat(result.next()).isTrue();
      assertThat(result.getString(1)).isEqualTo("vector(1024)");
    }
  }
}
