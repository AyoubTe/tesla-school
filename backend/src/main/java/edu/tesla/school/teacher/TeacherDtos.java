package edu.tesla.school.teacher;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class TeacherDtos {

    private TeacherDtos() {
    }

    public record TeacherDto(Long id, Long userId, String email, String firstName, String lastName, String fullName,
                             String employeeNumber, String specialty, String phone, LocalDate hireDate, String bio,
                             boolean enabled, long courseCount) {
    }

    public record TeacherRequest(@NotBlank @Size(max = 80) String firstName,
                                 @NotBlank @Size(max = 80) String lastName,
                                 @NotBlank @Email @Size(max = 180) String email,
                                 @Size(max = 120) String specialty,
                                 @Size(max = 40) String phone,
                                 @PastOrPresent LocalDate hireDate,
                                 @Size(max = 1000) String bio) {
    }
}
