package edu.tesla.school.notification;

import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.common.PageResponse;
import edu.tesla.school.notification.Notification.NotificationType;
import edu.tesla.school.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;

/**
 * Stores notifications and pushes them live over STOMP to {@code /user/queue/notifications}.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    public static final String USER_QUEUE = "/queue/notifications";
    public static final String BROADCAST_TOPIC = "/topic/announcements";

    private final NotificationRepository repository;
    private final SimpMessagingTemplate messaging;

    public record NotificationDto(Long id, NotificationType type, String title, String message,
                                  String link, boolean read, Instant createdAt) {
        static NotificationDto of(Notification n) {
            return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getMessage(),
                    n.getLink(), n.isRead(), n.getCreatedAt());
        }
    }

    /** Live-only payload for school-wide broadcasts (not persisted). */
    public record BroadcastDto(String title, String message, String link, Instant at) {
    }

    @Transactional
    public NotificationDto notify(User recipient, NotificationType type, String title, String message, String link) {
        Notification n = new Notification();
        n.setRecipient(recipient);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setLink(link);
        n = repository.save(n);
        if (n.getCreatedAt() == null) {
            n.setCreatedAt(Instant.now());
        }
        NotificationDto dto = NotificationDto.of(n);
        messaging.convertAndSendToUser(recipient.getEmail(), USER_QUEUE, dto);
        return dto;
    }

    @Transactional
    public void notifyAll(Collection<User> recipients, NotificationType type, String title, String message, String link) {
        recipients.forEach(u -> notify(u, type, title, message, link));
    }

    public void broadcast(String title, String message, String link) {
        messaging.convertAndSend(BROADCAST_TOPIC, new BroadcastDto(title, message, link, Instant.now()));
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(Long userId, int page, int size) {
        return PageResponse.of(
                repository.findByRecipientIdOrderByCreatedAtDesc(userId, PageRequest.of(page, Math.min(size, 100))),
                NotificationDto::of);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByRecipientIdAndReadFalse(userId);
    }

    @Transactional
    public void markRead(Long userId, Long id) {
        Notification n = repository.findByIdAndRecipientId(id, userId)
                .orElseThrow(() -> new NotFoundException("Notification", id));
        n.setRead(true);
    }

    @Transactional
    public int markAllRead(Long userId) {
        return repository.markAllRead(userId);
    }
}
