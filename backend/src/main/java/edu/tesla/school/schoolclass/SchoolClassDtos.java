package edu.tesla.school.schoolclass;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class SchoolClassDtos {

    private SchoolClassDtos() {
    }

    public record ClassDto(Long id, String name, int gradeLevel, String academicYear, String room, int capacity,
                           Long homeroomTeacherId, String homeroomTeacherName, long studentCount, long courseCount) {
    }

    public record ClassRequest(@NotBlank @Size(max = 60) String name,
                               @Min(1) @Max(13) int gradeLevel,
                               @NotBlank @Size(max = 20) String academicYear,
                               @Size(max = 40) String room,
                               @Min(1) @Max(60) int capacity,
                               Long homeroomTeacherId) {
    }
}
