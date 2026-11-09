package edu.tesla.school.events;

import java.time.LocalDate;
import java.util.List;

/**
 * Domain events published by services. They carry ids (not entities) because they are
 * handled after the transaction commits, on another thread, by {@link SchoolEventListener}.
 */
public final class SchoolEvents {

    private SchoolEvents() {
    }

    public record AccountCreated(Long userId, String temporaryPassword) {
    }

    public record GradesPosted(List<Long> gradeIds) {
    }

    public record AttendanceTaken(Long courseId, LocalDate date, List<Long> flaggedAttendanceIds) {
    }

    public record AnnouncementPublished(Long announcementId) {
    }
}
