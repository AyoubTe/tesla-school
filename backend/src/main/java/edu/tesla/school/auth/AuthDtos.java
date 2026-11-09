package edu.tesla.school.auth;

import edu.tesla.school.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    static final String PASSWORD_RULE = "^(?=.*[A-Za-z])(?=.*\\d).{8,}$";
    static final String PASSWORD_MESSAGE = "Use at least 8 characters with a letter and a number.";

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {
    }

    public record LoginResponse(String token, Instant expiresAt, MeDto user) {
    }

    /** The signed-in user plus the ids the UI needs to load "my" data. */
    public record MeDto(Long id, String email, String firstName, String lastName, String fullName, Role role,
                        Long teacherId, Long studentId, Long classId, String className,
                        boolean mustChangePassword) {
    }

    public record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String newPassword) {
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(max = 100) @Pattern(regexp = PASSWORD_RULE, message = PASSWORD_MESSAGE) String newPassword) {
    }

    public record UpdateProfileRequest(@NotBlank @Size(max = 80) String firstName,
                                       @NotBlank @Size(max = 80) String lastName) {
    }
}
