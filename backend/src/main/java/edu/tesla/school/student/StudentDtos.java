package edu.tesla.school.student;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public final class StudentDtos {

    private StudentDtos() {
    }

    public record StudentDto(Long id, Long userId, String email, String firstName, String lastName, String fullName,
                             String studentNumber, LocalDate dateOfBirth, String phone, String address,
                             String guardianName, String guardianEmail, Long classId, String className,
                             LocalDate enrollmentDate, boolean enabled) {
    }

    public record StudentRequest(@NotBlank @Size(max = 80) String firstName,
                                 @NotBlank @Size(max = 80) String lastName,
                                 @NotBlank @Email @Size(max = 180) String email,
                                 @Past LocalDate dateOfBirth,
                                 @Size(max = 40) String phone,
                                 @Size(max = 255) String address,
                                 @Size(max = 120) String guardianName,
                                 @Email @Size(max = 180) String guardianEmail,
                                 Long classId) {
    }
}
