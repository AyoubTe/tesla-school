package edu.tesla.school.course;

import edu.tesla.school.auth.AuthDtos.MeDto;
import edu.tesla.school.auth.AuthService;
import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.course.CourseDtos.CourseDto;
import edu.tesla.school.course.CourseDtos.CourseRequest;
import edu.tesla.school.course.CourseDtos.SlotDto;
import edu.tesla.school.course.CourseDtos.SlotRequest;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CourseController {

    private final CourseService service;
    private final AuthService authService;
    private final CurrentUser currentUser;

    @GetMapping("/courses")
    public List<CourseDto> list(@RequestParam(required = false) Long teacherId,
                                @RequestParam(required = false) Long classId) {
        // Filters run over the cached full list, so they never hit the database.
        return service.findAll().stream()
                .filter(c -> teacherId == null || Objects.equals(c.teacherId(), teacherId))
                .filter(c -> classId == null || Objects.equals(c.classId(), classId))
                .toList();
    }

    /** Teacher: the courses they teach. Student: the courses of their class. Admin: everything. */
    @GetMapping("/courses/mine")
    public List<CourseDto> mine() {
        MeDto me = authService.me(currentUser.email());
        return switch (me.role()) {
            case TEACHER -> list(me.teacherId(), null);
            case STUDENT -> me.classId() == null ? List.of() : list(null, me.classId());
            case ADMIN -> service.findAll();
        };
    }

    @GetMapping("/courses/{id}")
    public CourseDto get(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping("/courses")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public CourseDto create(@Valid @RequestBody CourseRequest request) {
        return service.create(request);
    }

    @PutMapping("/courses/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public CourseDto update(@PathVariable Long id, @Valid @RequestBody CourseRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/courses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    // --------------------------------------------------------------- timetable

    @GetMapping("/schedule")
    public List<SlotDto> schedule(@RequestParam(required = false) Long classId,
                                  @RequestParam(required = false) Long teacherId) {
        if (classId != null) {
            return service.scheduleForClass(classId);
        }
        if (teacherId != null) {
            return service.scheduleForTeacher(teacherId);
        }
        return mySchedule();
    }

    @GetMapping("/schedule/mine")
    public List<SlotDto> mySchedule() {
        MeDto me = authService.me(currentUser.email());
        if (me.teacherId() != null) {
            return service.scheduleForTeacher(me.teacherId());
        }
        if (me.classId() != null) {
            return service.scheduleForClass(me.classId());
        }
        return List.of();
    }

    @PostMapping("/schedule")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public SlotDto addSlot(@Valid @RequestBody SlotRequest request) {
        return service.addSlot(request);
    }

    @DeleteMapping("/schedule/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteSlot(@PathVariable Long id) {
        service.deleteSlot(id);
    }
}
