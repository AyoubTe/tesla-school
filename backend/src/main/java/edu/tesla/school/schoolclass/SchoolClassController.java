package edu.tesla.school.schoolclass;

import edu.tesla.school.schoolclass.SchoolClassDtos.ClassDto;
import edu.tesla.school.schoolclass.SchoolClassDtos.ClassRequest;
import edu.tesla.school.student.StudentDtos.StudentDto;
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
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class SchoolClassController {

    private final SchoolClassService service;
    private final StudentService studentService;

    @GetMapping
    public List<ClassDto> list() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ClassDto get(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/students")
    @PreAuthorize("hasAnyRole('ADMIN','TEACHER')")
    public List<StudentDto> students(@PathVariable Long id) {
        return studentService.byClass(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public ClassDto create(@Valid @RequestBody ClassRequest request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ClassDto update(@PathVariable Long id, @Valid @RequestBody ClassRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
