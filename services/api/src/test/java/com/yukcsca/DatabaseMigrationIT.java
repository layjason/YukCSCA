package com.yukcsca;

import static org.assertj.core.api.Assertions.assertThat;

import com.yukcsca.support.PostgresIntegrationTestSupport;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@ActiveProfiles("test")
@SpringBootTest
class DatabaseMigrationIT extends PostgresIntegrationTestSupport {
  @Autowired DataSource dataSource;

  @Test
  void startsAgainstRealPostgresAndAppliesFlywayMigrations() throws Exception {
    try (var connection = dataSource.getConnection();
        var statement =
            connection.prepareStatement(
                "select count(*) from information_schema.tables "
                    + "where table_name in ('auth_session', 'security_event')");
        var result = statement.executeQuery()) {
      assertThat(result.next()).isTrue();
      assertThat(result.getInt(1)).isEqualTo(2);
    }
  }
}
