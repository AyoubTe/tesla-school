package edu.tesla.school.user;

import edu.tesla.school.announcement.AnnouncementRepository;
import edu.tesla.school.auth.AuthService;
import edu.tesla.school.notification.NotificationRepository;
import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.ConflictException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.common.PageResponse;
import edu.tesla.school.events.SchoolEvents.AccountCreated;
import edu.tesla.school.mail.MailService;
import edu.tesla.school.user.UserDtos.CreateAdminRequest;
import edu.tesla.school.user.UserDtos.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/** Administration of login accounts (all roles). Teacher/student profiles reuse {@link #createAccount}. */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;
    private final MailService mailService;
    private final NotificationRepository notificationRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final AnnouncementRepository announcementRepository;

    /** Removes rows that reference a login so its profile (teacher/student) can be deleted. */
    @Transactional
    public void purgeLinks(Long userId) {
        notificationRepository.deleteByRecipientId(userId);
        tokenRepository.deleteByUserId(userId);
        announcementRepository.deleteByAuthorId(userId);
    }

    /**
     * Creates a login with a generated password. The welcome e-mail (with that password) and the
     * in-app notification are sent after the surrounding transaction commits.
     */
    @Transactional
    public User createAccount(String email, String firstName, String lastName, Role role) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalized)) {
            throw new ConflictException("An account already uses " + normalized + ".");
        }
        String temporaryPassword = AuthService.temporaryPassword();
        User user = new User(normalized, passwordEncoder.encode(temporaryPassword), firstName.trim(), lastName.trim(), role);
        user.setMustChangePassword(true);
        user = userRepository.save(user);
        events.publishEvent(new AccountCreated(user.getId(), temporaryPassword));
        return user;
    }

    @Transactional
    public void changeEmail(User user, String email) {
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        if (!normalized.equals(user.getEmail())) {
            if (userRepository.existsByEmailIgnoreCase(normalized)) {
                throw new ConflictException("An account already uses " + normalized + ".");
            }
            user.setEmail(normalized);
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<UserDto> search(String q, Role role, int page, int size) {
        String term = q == null || q.isBlank() ? "" : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        var pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("role", "lastName", "firstName"));
        return PageResponse.of(userRepository.search(term, role, pageable), UserDto::of);
    }

    @Transactional
    public UserDto createAdmin(CreateAdminRequest request) {
        return UserDto.of(createAccount(request.email(), request.firstName(), request.lastName(), Role.ADMIN));
    }

    @Transactional
    public UserDto setEnabled(Long id, boolean enabled, String actingEmail) {
        User user = find(id);
        if (!enabled && user.getEmail().equalsIgnoreCase(actingEmail)) {
            throw new BadRequestException("You can't disable your own account.");
        }
        user.setEnabled(enabled);
        return UserDto.of(user);
    }

    /** Admin-initiated reset: generates a temporary password and e-mails it to the user. */
    @Transactional
    public UserDto resetPassword(Long id) {
        User user = find(id);
        String temporaryPassword = AuthService.temporaryPassword();
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        mailService.sendAdminPasswordReset(user.getEmail(), user.getFirstName(), temporaryPassword);
        return UserDto.of(user);
    }

    private User find(Long id) {
        return userRepository.findById(id).orElseThrow(() -> new NotFoundException("User", id));
    }
}
