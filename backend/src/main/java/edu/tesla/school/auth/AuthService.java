package edu.tesla.school.auth;

import edu.tesla.school.auth.AuthDtos.ChangePasswordRequest;
import edu.tesla.school.auth.AuthDtos.LoginRequest;
import edu.tesla.school.auth.AuthDtos.LoginResponse;
import edu.tesla.school.auth.AuthDtos.MeDto;
import edu.tesla.school.auth.AuthDtos.ResetPasswordRequest;
import edu.tesla.school.auth.AuthDtos.UpdateProfileRequest;
import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.mail.MailService;
import edu.tesla.school.student.Student;
import edu.tesla.school.student.StudentRepository;
import edu.tesla.school.teacher.TeacherRepository;
import edu.tesla.school.user.PasswordResetToken;
import edu.tesla.school.user.PasswordResetTokenRepository;
import edu.tesla.school.user.User;
import edu.tesla.school.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().trim(), request.password()));
        User user = userRepository.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new NotFoundException("User", request.email()));
        user.setLastLoginAt(Instant.now());
        JwtService.IssuedToken token = jwtService.issue(user);
        return new LoginResponse(token.value(), token.expiresAt(), me(user));
    }

    @Transactional(readOnly = true)
    public MeDto me(String email) {
        return me(userRepository.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("User", email)));
    }

    private MeDto me(User user) {
        Long teacherId = null;
        Long studentId = null;
        Long classId = null;
        String className = null;
        switch (user.getRole()) {
            case TEACHER -> teacherId = teacherRepository.findByUserId(user.getId()).map(t -> t.getId()).orElse(null);
            case STUDENT -> {
                Student s = studentRepository.findByUserId(user.getId()).orElse(null);
                if (s != null) {
                    studentId = s.getId();
                    if (s.getSchoolClass() != null) {
                        classId = s.getSchoolClass().getId();
                        className = s.getSchoolClass().getName();
                    }
                }
            }
            default -> {
            }
        }
        return new MeDto(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(), user.fullName(),
                user.getRole(), teacherId, studentId, classId, className, user.isMustChangePassword());
    }

    /** Always succeeds from the caller's point of view, so the endpoint can't be used to probe for accounts. */
    @Transactional
    public void forgotPassword(String email) {
        userRepository.findByEmailIgnoreCase(email.trim()).filter(User::isEnabled).ifPresent(user -> {
            tokenRepository.deleteByUserId(user.getId());
            String token = randomToken(32);
            tokenRepository.save(new PasswordResetToken(token, user, Instant.now().plus(30, ChronoUnit.MINUTES)));
            mailService.sendPasswordReset(user.getEmail(), user.getFirstName(), token);
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken token = tokenRepository.findByToken(request.token())
                .filter(PasswordResetToken::isUsable)
                .orElseThrow(() -> new BadRequestException("This reset link is invalid or has expired. Request a new one."));
        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        token.setUsed(true);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("User", email));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Your current password is incorrect.");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new BadRequestException("Choose a password different from your current one.");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
    }

    @Transactional
    public MeDto updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(() -> new NotFoundException("User", email));
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        return me(user);
    }

    public static String randomToken(int bytes) {
        byte[] buf = new byte[bytes];
        RANDOM.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    /** Readable temporary password: 10 chars, always containing letters and digits. */
    public static String temporaryPassword() {
        String letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
        String digits = "23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 7; i++) {
            sb.append(letters.charAt(RANDOM.nextInt(letters.length())));
        }
        for (int i = 0; i < 3; i++) {
            sb.append(digits.charAt(RANDOM.nextInt(digits.length())));
        }
        return sb.toString();
    }
}
