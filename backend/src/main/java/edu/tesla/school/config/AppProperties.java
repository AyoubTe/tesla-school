package edu.tesla.school.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String name,
        String frontendUrl,
        List<String> corsOrigins,
        String mailFrom,
        Jwt jwt,
        Seed seed
) {
    public record Jwt(String secret, long expirationMinutes) {
    }

    public record Seed(boolean enabled) {
    }
}
