package edu.tesla.school.schoolclass;

import edu.tesla.school.announcement.Announcement;
import edu.tesla.school.announcement.AnnouncementRepository;
import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.ConflictException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.config.AsyncAndCacheConfig;
import edu.tesla.school.course.CourseRepository;
import edu.tesla.school.schoolclass.SchoolClassDtos.ClassDto;
import edu.tesla.school.schoolclass.SchoolClassDtos.ClassRequest;
import edu.tesla.school.student.StudentRepository;
import edu.tesla.school.teacher.Teacher;
import edu.tesla.school.teacher.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SchoolClassService {

    private final SchoolClassRepository classRepository;
    private final StudentRepository studentRepository;
    private final CourseRepository courseRepository;
    private final TeacherRepository teacherRepository;
    private final AnnouncementRepository announcementRepository;

    @Transactional(readOnly = true)
    @Cacheable(AsyncAndCacheConfig.CLASSES)
    public List<ClassDto> findAll() {
        Map<Long, Long> students = toMap(studentRepository.countPerClass());
        Map<Long, Long> courses = toMap(courseRepository.countPerClass());
        return classRepository.findAllOrdered().stream()
                .map(c -> toDto(c, students.getOrDefault(c.getId(), 0L), courses.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ClassDto findById(Long id) {
        SchoolClass c = find(id);
        return toDto(c, studentRepository.countBySchoolClassId(id), courseRepository.countBySchoolClassId(id));
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public ClassDto create(ClassRequest request) {
        if (classRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw new ConflictException("A class named " + request.name().trim() + " already exists.");
        }
        SchoolClass c = new SchoolClass();
        apply(c, request);
        return toDto(classRepository.save(c), 0, 0);
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.COURSES, AsyncAndCacheConfig.SCHEDULE,
            AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public ClassDto update(Long id, ClassRequest request) {
        SchoolClass c = find(id);
        long students = studentRepository.countBySchoolClassId(id);
        if (request.capacity() < students) {
            throw new BadRequestException("Capacity can't be below the current " + students + " students.");
        }
        if (!c.getName().equalsIgnoreCase(request.name().trim()) && classRepository.existsByNameIgnoreCase(request.name().trim())) {
            throw new ConflictException("A class named " + request.name().trim() + " already exists.");
        }
        apply(c, request);
        return toDto(c, students, courseRepository.countBySchoolClassId(id));
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public void delete(Long id) {
        SchoolClass c = find(id);
        if (studentRepository.countBySchoolClassId(id) > 0) {
            throw new BadRequestException("Move or remove the students in " + c.getName() + " before deleting it.");
        }
        if (courseRepository.countBySchoolClassId(id) > 0) {
            throw new BadRequestException("Delete the courses of " + c.getName() + " before deleting it.");
        }
        announcementRepository.detachClass(id, Announcement.Audience.STUDENTS);
        classRepository.delete(c);
    }

    private void apply(SchoolClass c, ClassRequest r) {
        c.setName(r.name().trim());
        c.setGradeLevel(r.gradeLevel());
        c.setAcademicYear(r.academicYear().trim());
        c.setRoom(r.room());
        c.setCapacity(r.capacity());
        if (r.homeroomTeacherId() == null) {
            c.setHomeroomTeacher(null);
        } else {
            Teacher t = teacherRepository.findById(r.homeroomTeacherId())
                    .orElseThrow(() -> new NotFoundException("Teacher", r.homeroomTeacherId()));
            c.setHomeroomTeacher(t);
        }
    }

    private SchoolClass find(Long id) {
        return classRepository.findById(id).orElseThrow(() -> new NotFoundException("Class", id));
    }

    private static Map<Long, Long> toMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        rows.forEach(r -> map.put((Long) r[0], (Long) r[1]));
        return map;
    }

    private static ClassDto toDto(SchoolClass c, long students, long courses) {
        Teacher t = c.getHomeroomTeacher();
        return new ClassDto(c.getId(), c.getName(), c.getGradeLevel(), c.getAcademicYear(), c.getRoom(), c.getCapacity(),
                t == null ? null : t.getId(), t == null ? null : t.getUser().fullName(), students, courses);
    }
}
