package edu.tesla.school.scheduling;

import edu.tesla.school.course.CourseDtos.SlotDto;
import edu.tesla.school.course.CourseService;
import edu.tesla.school.notification.Notification.NotificationType;
import edu.tesla.school.notification.NotificationService;
import edu.tesla.school.teacher.Teacher;
import edu.tesla.school.teacher.TeacherRepository;
import edu.tesla.school.user.PasswordResetTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledJobs {

    private final TeacherRepository teacherRepository;
    private final CourseService courseService;
    private final NotificationService notifications;
    private final PasswordResetTokenRepository tokenRepository;

    /** Weekday mornings: each teacher gets a live notification summarising today's lessons. */
    @Scheduled(cron = "${app.jobs.morning-brief-cron:0 30 7 * * MON-FRI}", zone = "${app.timezone:Europe/Paris}")
    @Transactional
    public void morningBrief() {
        LocalDate today = LocalDate.now();
        int sent = 0;
        for (Teacher t : teacherRepository.findAllWithUser()) {
            if (!t.getUser().isEnabled()) {
                continue;
            }
            List<SlotDto> slots = courseService.scheduleForTeacher(t.getId()).stream()
                    .filter(s -> s.day() == today.getDayOfWeek()).toList();
            if (slots.isEmpty()) {
                continue;
            }
            SlotDto first = slots.getFirst();
            String message = "First: " + first.courseName() + " with " + first.className() + " at "
                    + first.startTime() + (first.room() == null ? "" : " in " + first.room()) + ".";
            notifications.notify(t.getUser(), NotificationType.SCHEDULE,
                    slots.size() == 1 ? "You have 1 lesson today" : "You have " + slots.size() + " lessons today",
                    message, "/timetable");
            sent++;
        }
        log.info("Morning brief sent to {} teachers", sent);
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void purgeResetTokens() {
        int removed = tokenRepository.deleteStale(Instant.now());
        if (removed > 0) {
            log.info("Removed {} expired password reset tokens", removed);
        }
    }
}
