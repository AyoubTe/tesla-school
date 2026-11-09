package edu.tesla.school.grade;

import edu.tesla.school.grade.GradeDtos.BulkGradeRequest;
import edu.tesla.school.grade.GradeDtos.GradeDto;
import edu.tesla.school.grade.GradeDtos.GradeRequest;
import edu.tesla.school.grade.GradeDtos.GradeSummary;
import edu.tesla.school.student.StudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/grades")
@RequiredArgsConstructor
public class GradeController {

    private final GradeService service;
    private final StudentService studentService;

    @GetMapping("/course/{courseId}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public List<GradeDto> byCourse(@PathVariable Long courseId) {
        return service.byCourse(courseId);
    }

    @GetMapping("/student/{studentId}")
    public List<GradeDto> byStudent(@PathVariable Long studentId) {
        return service.byStudent(studentId);
    }

    @GetMapping("/student/{studentId}/summary")
    public GradeSummary summary(@PathVariable Long studentId) {
        return service.summary(studentId);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('STUDENT')")
    public List<GradeDto> mine() {
        return service.byStudent(studentService.current().getId());
    }

    @GetMapping("/mine/summary")
    @PreAuthorize("hasRole('STUDENT')")
    public GradeSummary mySummary() {
        return service.summary(studentService.current().getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public GradeDto create(@Valid @RequestBody GradeRequest request) {
        return service.create(request);
    }

    @PostMapping("/bulk")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public List<GradeDto> createBulk(@Valid @RequestBody BulkGradeRequest request) {
        return service.createBulk(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public GradeDto update(@PathVariable Long id, @Valid @RequestBody GradeRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
