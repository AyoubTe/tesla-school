package edu.tesla.school.events;

import edu.tesla.school.announcement.Announcement;
import edu.tesla.school.announcement.AnnouncementRepository;
import edu.tesla.school.attendance.Attendance;
import edu.tesla.school.attendance.AttendanceRepository;
import edu.tesla.school.events.SchoolEvents.AccountCreated;
import edu.tesla.school.events.SchoolEvents.AnnouncementPublished;
import edu.tesla.school.events.SchoolEvents.AttendanceTaken;
import edu.tesla.school.events.SchoolEvents.GradesPosted;
import edu.tesla.school.grade.Grade;
import edu.tesla.school.grade.GradeRepository;
import edu.tesla.school.mail.MailService;
import edu.tesla.school.notification.Notification.NotificationType;
import edu.tesla.school.notification.NotificationService;
import edu.tesla.school.student.Student;
import edu.tesla.school.student.StudentRepository;
import edu.tesla.school.user.Role;
import edu.tesla.school.user.User;
import edu.tesla.school.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;
import java.util.Locale;

/**
 * Fan-out for domain events: once the originating transaction has committed, create in-app
 * notifications (pushed live over WebSocket) and send the matching e-mails.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SchoolEventListener {

    private final UserRepository userRepository;
    private final GradeRepository gradeRepository;
    private final AttendanceRepository attendanceRepository;
    private final AnnouncementRepository announcementRepository;
    private final StudentRepository studentRepository;
    private final NotificationService notifications;
    private final MailService mail;

    @Async
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAccountCreated(AccountCreated event) {
        userRepository.findById(event.userId()).ifPresent(user -> {
            notifications.notify(user, NotificationType.ACCOUNT, "Welcome to Tesla School",
                    "Your account is ready. Choose a new password from your profile.", "/profile");
            mail.sendWelcome(user.getEmail(), user.getFirstName(), user.getRole().name(), event.temporaryPassword());
        });
    }

    @Async
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onGradesPosted(GradesPosted event) {
        List<Grade> grades = gradeRepository.findAllById(event.gradeIds());
        for (Grade g : grades) {
            User user = g.getStudent().getUser();
            String course = g.getCourse().getName();
            String score = fmt(g.getScore()) + " / " + fmt(g.getMaxScore());
            notifications.notify(user, NotificationType.GRADE, "New grade in " + course,
                    g.getTitle() + ": " + score, "/grades");
            mail.sendGradePosted(user.getEmail(), user.getFirstName(), course, g.getTitle(), score, g.percent() + "%");
        }
    }

    @Async
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAttendanceTaken(AttendanceTaken event) {
        if (event.flaggedAttendanceIds().isEmpty()) {
            return;
        }
        for (Attendance a : attendanceRepository.findAllWithRelations(event.flaggedAttendanceIds())) {
            Student student = a.getStudent();
            User user = student.getUser();
            String status = a.getStatus().name().toLowerCase(Locale.ROOT);
            String course = a.getCourse().getName();
            notifications.notify(user, NotificationType.ATTENDANCE, "Marked " + status + " in " + course,
                    "Recorded for " + a.getDate() + ". Contact the office if this is wrong.", "/attendance");
            if (student.getGuardianEmail() != null && !student.getGuardianEmail().isBlank()) {
                String guardian = student.getGuardianName() == null ? "Guardian" : student.getGuardianName();
                mail.sendAbsenceAlert(student.getGuardianEmail(), guardian, user.fullName(), course,
                        a.getDate(), a.getStatus().name());
            }
        }
    }

    @Async
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onAnnouncementPublished(AnnouncementPublished event) {
        Announcement a = announcementRepository.findById(event.announcementId()).orElse(null);
        if (a == null) {
            return;
        }
        String author = a.getAuthor().fullName();
        List<User> recipients = switch (a.getAudience()) {
            case ALL -> userRepository.findByEnabledTrue();
            case TEACHERS -> userRepository.findByRoleAndEnabledTrue(Role.TEACHER);
            case STUDENTS -> userRepository.findByRoleAndEnabledTrue(Role.STUDENT);
            case CLASS -> a.getSchoolClass() == null ? List.of()
                    : studentRepository.findByClassId(a.getSchoolClass().getId()).stream()
                    .map(Student::getUser).filter(User::isEnabled).toList();
        };
        recipients = recipients.stream().filter(u -> !u.getId().equals(a.getAuthor().getId())).toList();

        notifications.notifyAll(recipients, NotificationType.ANNOUNCEMENT, a.getTitle(),
                "Posted by " + author, "/announcements");
        if (a.getAudience() == Announcement.Audience.ALL) {
            notifications.broadcast(a.getTitle(), "Posted by " + author, "/announcements");
        }
        if (a.isPinned()) {
            // Pinned announcements are important enough to reach inboxes too.
            recipients.forEach(u -> mail.sendAnnouncement(u.getEmail(), u.getFirstName(), a.getTitle(),
                    a.getContent(), author));
        }
        log.info("Announcement {} delivered to {} recipients", a.getId(), recipients.size());
    }

    private static String fmt(double v) {
        return v == Math.rint(v) ? String.valueOf((long) v) : String.valueOf(v);
    }
}
