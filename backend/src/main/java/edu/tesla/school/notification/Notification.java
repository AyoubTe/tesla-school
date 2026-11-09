package edu.tesla.school.notification;

import edu.tesla.school.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(indexes = @Index(name = "idx_notification_recipient", columnList = "recipient_id, is_read"))
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id")
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationType type;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 1000)
    private String message;

    /** In-app route to open when the notification is clicked, e.g. "/grades". */
    @Column(length = 255)
    private String link;

    @Column(name = "is_read")
    private boolean read;

    @CreationTimestamp
    private Instant createdAt;

    public enum NotificationType {
        GRADE, ATTENDANCE, ANNOUNCEMENT, ACCOUNT, SCHEDULE, SYSTEM
    }
}
