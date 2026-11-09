package edu.tesla.school.teacher;

import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.config.AsyncAndCacheConfig;
import edu.tesla.school.course.Course;
import edu.tesla.school.course.CourseRepository;
import edu.tesla.school.schoolclass.SchoolClass;
import edu.tesla.school.schoolclass.SchoolClassRepository;
import edu.tesla.school.teacher.TeacherDtos.TeacherDto;
import edu.tesla.school.teacher.TeacherDtos.TeacherRequest;
import edu.tesla.school.user.Role;
import edu.tesla.school.user.User;
import edu.tesla.school.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final CourseRepository courseRepository;
    private final SchoolClassRepository classRepository;
    private final UserService userService;

    @Transactional(readOnly = true)
    @Cacheable(AsyncAndCacheConfig.TEACHERS)
    public List<TeacherDto> findAll() {
        Map<Long, Long> courseCounts = new HashMap<>();
        courseRepository.countPerTeacher().forEach(r -> courseCounts.put((Long) r[0], (Long) r[1]));
        return teacherRepository.findAllWithUser().stream()
                .map(t -> toDto(t, courseCounts.getOrDefault(t.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public TeacherDto findById(Long id) {
        Teacher t = find(id);
        long count = courseRepository.findByTeacherId(id).size();
        return toDto(t, count);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = AsyncAndCacheConfig.TEACHERS, allEntries = true),
            @CacheEvict(value = AsyncAndCacheConfig.DASHBOARD, allEntries = true)})
    public TeacherDto create(TeacherRequest request) {
        User user = userService.createAccount(request.email(), request.firstName(), request.lastName(), Role.TEACHER);
        Teacher t = new Teacher();
        t.setUser(user);
        t.setEmployeeNumber(nextEmployeeNumber());
        apply(t, request);
        if (t.getHireDate() == null) {
            t.setHireDate(LocalDate.now());
        }
        return toDto(teacherRepository.save(t), 0);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = AsyncAndCacheConfig.TEACHERS, allEntries = true),
            @CacheEvict(value = AsyncAndCacheConfig.COURSES, allEntries = true),
            @CacheEvict(value = AsyncAndCacheConfig.CLASSES, allEntries = true),
            @CacheEvict(value = AsyncAndCacheConfig.SCHEDULE, allEntries = true)})
    public TeacherDto update(Long id, TeacherRequest request) {
        Teacher t = find(id);
        userService.changeEmail(t.getUser(), request.email());
        t.getUser().setFirstName(request.firstName().trim());
        t.getUser().setLastName(request.lastName().trim());
        apply(t, request);
        return toDto(t, courseRepository.findByTeacherId(id).size());
    }

    /** Unassigns the teacher from courses and homerooms, then removes the profile and its login. */
    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.TEACHERS, AsyncAndCacheConfig.COURSES, AsyncAndCacheConfig.CLASSES,
            AsyncAndCacheConfig.SCHEDULE, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public void delete(Long id) {
        Teacher t = find(id);
        for (Course c : courseRepository.findByTeacherId(id)) {
            c.setTeacher(null);
        }
        for (SchoolClass c : classRepository.findAll()) {
            if (c.getHomeroomTeacher() != null && Objects.equals(c.getHomeroomTeacher().getId(), id)) {
                c.setHomeroomTeacher(null);
            }
        }
        userService.purgeLinks(t.getUser().getId());
        teacherRepository.delete(t);
    }

    Teacher find(Long id) {
        return teacherRepository.findById(id).orElseThrow(() -> new NotFoundException("Teacher", id));
    }

    private void apply(Teacher t, TeacherRequest r) {
        t.setSpecialty(r.specialty());
        t.setPhone(r.phone());
        if (r.hireDate() != null) {
            t.setHireDate(r.hireDate());
        }
        t.setBio(r.bio());
    }

    private String nextEmployeeNumber() {
        return "T-%04d".formatted(teacherRepository.maxId() + 1001);
    }

    public static TeacherDto toDto(Teacher t, long courseCount) {
        User u = t.getUser();
        return new TeacherDto(t.getId(), u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.fullName(),
                t.getEmployeeNumber(), t.getSpecialty(), t.getPhone(), t.getHireDate(), t.getBio(), u.isEnabled(),
                courseCount);
    }
}
