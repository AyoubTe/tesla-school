package edu.tesla.school.grade;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public final class GradeDtos {

    private GradeDtos() {
    }

    public record GradeDto(Long id, Long studentId, String studentName, Long courseId, String courseCode,
                           String courseName, String color, String title, GradeType type, double score,
                           double maxScore, double percent, LocalDate date, String comment) {
    }

    public record GradeRequest(@NotNull Long studentId,
                               @NotNull Long courseId,
                               @NotBlank @Size(max = 120) String title,
                               @NotNull GradeType type,
                               @PositiveOrZero double score,
                               @DecimalMin("1") @DecimalMax("1000") double maxScore,
                               @NotNull LocalDate date,
                               @Size(max = 500) String comment) {
    }

    /** One assessment for a whole class: shared title/type/date, one score per student. */
    public record BulkGradeRequest(@NotNull Long courseId,
                                   @NotBlank @Size(max = 120) String title,
                                   @NotNull GradeType type,
                                   @DecimalMin("1") @DecimalMax("1000") double maxScore,
                                   @NotNull LocalDate date,
                                   @NotEmpty List<@Valid Entry> entries) {
        public record Entry(@NotNull Long studentId, @PositiveOrZero Double score, @Size(max = 500) String comment) {
        }
    }

    public record CourseAverage(Long courseId, String courseCode, String courseName, String color,
                                double coefficient, Double average, int count) {
    }

    /** Averages are percentages (0–100). Overall is weighted by course coefficient. */
    public record GradeSummary(Double overall, List<CourseAverage> courses) {
    }
}
