package com.yukcsca;

import com.yukcsca.identity.infrastructure.security.AuthProperties;
import com.yukcsca.identity.infrastructure.security.AuthRateLimitProperties;
import com.yukcsca.identity.infrastructure.security.CredentialAuthProperties;
import com.yukcsca.identity.infrastructure.security.FirstAdminProperties;
import com.yukcsca.identity.infrastructure.security.SessionMaintenanceProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({
  AuthProperties.class,
  AuthRateLimitProperties.class,
  CredentialAuthProperties.class,
  FirstAdminProperties.class,
  SessionMaintenanceProperties.class
})
public class YukcscaApplication {
  public static void main(String[] args) {
    SpringApplication.run(YukcscaApplication.class, args);
  }
}
