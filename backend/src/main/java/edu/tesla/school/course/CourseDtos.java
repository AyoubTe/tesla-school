package edu.tesla.school.course;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalTime;

public final class CourseDtos {

    private CourseDtos() {
    }

    public record CourseDto(Long id, String code, String name, String description, double coefficient, String color,
                            Long teacherId, String teacherName, Long classId, String className) {
    }

    public record CourseRequest(@NotBlank @Size(max = 20) String code,
                                @NotBlank @Size(max = 120) String name,
                                @Size(max = 1000) String description,
                                @DecimalMin("0.5") @DecimalMax("10") double coefficient,
                                @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Use a hex color like #1F8FB8") String color,
                                Long teacherId,
                                @NotNull Long classId) {
    }

    public record SlotDto(Long id, Long courseId, String courseCode, String courseName, String color,
                          Long teacherId, String teacherName, Long classId, String className,
                          DayOfWeek day, LocalTime startTime, LocalTime endTime, String room) {
    }

    public record SlotRequest(@NotNull Long courseId,
                              @NotNull DayOfWeek day,
                              @NotNull LocalTime startTime,
                              @NotNull LocalTime endTime,
                              @Size(max = 40) String room) {
    }
}
