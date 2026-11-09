package edu.tesla.school.attendance;

import edu.tesla.school.attendance.AttendanceDtos.AttendanceDto;
import edu.tesla.school.attendance.AttendanceDtos.AttendanceSummary;
import edu.tesla.school.attendance.AttendanceDtos.RollCallRequest;
import edu.tesla.school.attendance.AttendanceDtos.RollCallSheet;
import edu.tesla.school.student.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService service;
    private final StudentService studentService;

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public RollCallSheet sheet(@PathVariable Long courseId,
                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.sheet(courseId, date);
    }

    @PostMapping("/roll-call")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public RollCallSheet save(@Valid @RequestBody RollCallRequest request) {
        return service.save(request);
    }

    @GetMapping("/student/{studentId}")
    public List<AttendanceDto> byStudent(@PathVariable Long studentId) {
        return service.byStudent(studentId);
    }

    @GetMapping("/student/{studentId}/summary")
    public AttendanceSummary summary(@PathVariable Long studentId) {
        return service.summary(studentId);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('STUDENT')")
    public List<AttendanceDto> mine() {
        return service.byStudent(studentService.current().getId());
    }

    @GetMapping("/mine/summary")
    @PreAuthorize("hasRole('STUDENT')")
    public AttendanceSummary mySummary() {
        return service.summary(studentService.current().getId());
    }
}
