package edu.tesla.school.attendance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public final class AttendanceDtos {

    private AttendanceDtos() {
    }

    public record AttendanceDto(Long id, Long studentId, String studentName, Long courseId, String courseName,
                                String color, LocalDate date, AttendanceStatus status, String note) {
    }

    public record RollCallSheet(Long courseId, String courseName, String className, LocalDate date, boolean taken,
                                List<RollCallLine> lines) {
    }

    public record RollCallLine(Long studentId, String studentName, String studentNumber, AttendanceStatus status,
                               String note) {
    }

    public record RollCallRequest(@NotNull Long courseId,
                                  @NotNull @PastOrPresent LocalDate date,
                                  @NotEmpty List<@Valid Entry> entries) {
        public record Entry(@NotNull Long studentId, @NotNull AttendanceStatus status, @Size(max = 255) String note) {
        }
    }

    public record AttendanceSummary(int total, int present, int absent, int late, int excused, Double rate) {
        public static AttendanceSummary of(List<Attendance> records) {
            int present = 0, absent = 0, late = 0, excused = 0;
            for (Attendance a : records) {
                switch (a.getStatus()) {
                    case PRESENT -> present++;
                    case ABSENT -> absent++;
                    case LATE -> late++;
                    case EXCUSED -> excused++;
                }
            }
            int total = records.size();
            // Late still counts as attending; excused absences are left out of the rate.
            int counted = total - excused;
            Double rate = counted == 0 ? null : Math.round((present + late) * 1000.0 / counted) / 10.0;
            return new AttendanceSummary(total, present, absent, late, excused, rate);
        }
    }
}
