package edu.tesla.school.auth;

import edu.tesla.school.auth.AuthDtos.ChangePasswordRequest;
import edu.tesla.school.auth.AuthDtos.ForgotPasswordRequest;
import edu.tesla.school.auth.AuthDtos.LoginRequest;
import edu.tesla.school.auth.AuthDtos.LoginResponse;
import edu.tesla.school.auth.AuthDtos.MeDto;
import edu.tesla.school.auth.AuthDtos.ResetPasswordRequest;
import edu.tesla.school.auth.AuthDtos.UpdateProfileRequest;
import edu.tesla.school.common.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public MeDto me() {
        return authService.me(currentUser.email());
    }

    @PutMapping("/me")
    public MeDto updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(currentUser.email(), request);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(currentUser.email(), request);
        return ResponseEntity.noContent().build();
    }
}
