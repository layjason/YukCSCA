package com.yukcsca.identity.infrastructure.security;

import com.yukcsca.identity.application.FirstAdminSettings;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("yukcsca.admin")
public record FirstAdminProperties(@Email @Size(max = 320) String firstEmail)
    implements FirstAdminSettings {}
