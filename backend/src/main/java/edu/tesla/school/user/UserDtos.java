package edu.tesla.school.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserDto(Long id, String email, String firstName, String lastName, String fullName, Role role,
                          boolean enabled, boolean mustChangePassword, Instant lastLoginAt, Instant createdAt) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.fullName(), u.getRole(),
                    u.isEnabled(), u.isMustChangePassword(), u.getLastLoginAt(), u.getCreatedAt());
        }
    }

    public record CreateAdminRequest(@NotBlank @Email @Size(max = 180) String email,
                                     @NotBlank @Size(max = 80) String firstName,
                                     @NotBlank @Size(max = 80) String lastName) {
    }

    public record StatusRequest(boolean enabled) {
    }
}
