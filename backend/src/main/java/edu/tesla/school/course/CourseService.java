package edu.tesla.school.course;

import edu.tesla.school.attendance.AttendanceRepository;
import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.ConflictException;
import edu.tesla.school.common.ApiExceptions.ForbiddenException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.config.AsyncAndCacheConfig;
import edu.tesla.school.course.CourseDtos.CourseDto;
import edu.tesla.school.course.CourseDtos.CourseRequest;
import edu.tesla.school.course.CourseDtos.SlotDto;
import edu.tesla.school.course.CourseDtos.SlotRequest;
import edu.tesla.school.grade.GradeRepository;
import edu.tesla.school.schoolclass.SchoolClass;
import edu.tesla.school.schoolclass.SchoolClassRepository;
import edu.tesla.school.teacher.Teacher;
import edu.tesla.school.teacher.TeacherRepository;
import edu.tesla.school.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CourseService {

    private static final Comparator<SlotDto> SLOT_ORDER =
            Comparator.comparing((SlotDto s) -> s.day().getValue()).thenComparing(SlotDto::startTime);

    private final CourseRepository courseRepository;
    private final ScheduleSlotRepository slotRepository;
    private final SchoolClassRepository classRepository;
    private final TeacherRepository teacherRepository;
    private final GradeRepository gradeRepository;
    private final AttendanceRepository attendanceRepository;
    private final CurrentUser currentUser;

    // ---------------------------------------------------------------- courses

    @Transactional(readOnly = true)
    @Cacheable(value = AsyncAndCacheConfig.COURSES, key = "'all'")
    public List<CourseDto> findAll() {
        return courseRepository.findAllWithRelations().stream().map(CourseService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public CourseDto findById(Long id) {
        return toDto(find(id));
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.COURSES, AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.TEACHERS,
            AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public CourseDto create(CourseRequest request) {
        if (courseRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ConflictException("Course code " + request.code().trim().toUpperCase(Locale.ROOT) + " is already used.");
        }
        Course c = new Course();
        apply(c, request);
        return toDto(courseRepository.save(c));
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.COURSES, AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.TEACHERS,
            AsyncAndCacheConfig.SCHEDULE, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public CourseDto update(Long id, CourseRequest request) {
        Course c = find(id);
        if (!c.getCode().equalsIgnoreCase(request.code().trim()) && courseRepository.existsByCodeIgnoreCase(request.code().trim())) {
            throw new ConflictException("Course code " + request.code().trim().toUpperCase(Locale.ROOT) + " is already used.");
        }
        apply(c, request);
        return toDto(c);
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.COURSES, AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.TEACHERS,
            AsyncAndCacheConfig.SCHEDULE, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public void delete(Long id) {
        Course c = find(id);
        gradeRepository.deleteByCourseId(id);
        attendanceRepository.deleteByCourseId(id);
        slotRepository.deleteByCourseId(id);
        courseRepository.delete(c);
    }

    /** Admins manage every course; teachers only the courses they teach. */
    @Transactional(readOnly = true)
    public Course requireManageable(Long courseId) {
        Course course = find(courseId);
        if (currentUser.hasRole(Role.ADMIN)) {
            return course;
        }
        Teacher teacher = course.getTeacher();
        if (currentUser.hasRole(Role.TEACHER) && teacher != null
                && teacher.getUser().getEmail().equalsIgnoreCase(currentUser.email())) {
            return course;
        }
        throw new ForbiddenException("You don't teach this course");
    }

    public Course find(Long id) {
        return courseRepository.findById(id).orElseThrow(() -> new NotFoundException("Course", id));
    }

    private void apply(Course c, CourseRequest r) {
        c.setCode(r.code().trim().toUpperCase(Locale.ROOT));
        c.setName(r.name().trim());
        c.setDescription(r.description());
        c.setCoefficient(r.coefficient() <= 0 ? 1 : r.coefficient());
        if (r.color() != null && !r.color().isBlank()) {
            c.setColor(r.color());
        }
        SchoolClass sc = classRepository.findById(r.classId()).orElseThrow(() -> new NotFoundException("Class", r.classId()));
        c.setSchoolClass(sc);
        if (r.teacherId() == null) {
            c.setTeacher(null);
        } else {
            c.setTeacher(teacherRepository.findById(r.teacherId())
                    .orElseThrow(() -> new NotFoundException("Teacher", r.teacherId())));
        }
    }

    public static CourseDto toDto(Course c) {
        Teacher t = c.getTeacher();
        SchoolClass sc = c.getSchoolClass();
        return new CourseDto(c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getCoefficient(), c.getColor(),
                t == null ? null : t.getId(), t == null ? null : t.getUser().fullName(),
                sc.getId(), sc.getName());
    }

    // --------------------------------------------------------------- schedule

    @Transactional(readOnly = true)
    @Cacheable(value = AsyncAndCacheConfig.SCHEDULE, key = "'class-' + #classId")
    public List<SlotDto> scheduleForClass(Long classId) {
        return slotRepository.findByClassId(classId).stream().map(CourseService::toDto).sorted(SLOT_ORDER).toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(value = AsyncAndCacheConfig.SCHEDULE, key = "'teacher-' + #teacherId")
    public List<SlotDto> scheduleForTeacher(Long teacherId) {
        return slotRepository.findByTeacherId(teacherId).stream().map(CourseService::toDto).sorted(SLOT_ORDER).toList();
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.SCHEDULE, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public SlotDto addSlot(SlotRequest r) {
        if (!r.endTime().isAfter(r.startTime())) {
            throw new BadRequestException("The end time must be after the start time.");
        }
        Course course = find(r.courseId());
        List<ScheduleSlot> sameDay = slotRepository.findByDay(r.day());
        for (ScheduleSlot other : sameDay) {
            boolean overlaps = r.startTime().isBefore(other.getEndTime()) && other.getStartTime().isBefore(r.endTime());
            if (!overlaps) {
                continue;
            }
            Course oc = other.getCourse();
            if (Objects.equals(oc.getSchoolClass().getId(), course.getSchoolClass().getId())) {
                throw new ConflictException(course.getSchoolClass().getName() + " already has " + oc.getName() + " at that time.");
            }
            if (course.getTeacher() != null && oc.getTeacher() != null
                    && Objects.equals(oc.getTeacher().getId(), course.getTeacher().getId())) {
                throw new ConflictException(course.getTeacher().getUser().fullName() + " is already teaching "
                        + oc.getName() + " at that time.");
            }
            if (r.room() != null && !r.room().isBlank() && r.room().equalsIgnoreCase(other.getRoom())) {
                throw new ConflictException("Room " + r.room() + " is already booked at that time.");
            }
        }
        ScheduleSlot slot = slotRepository.save(new ScheduleSlot(course, r.day(), r.startTime(), r.endTime(),
                r.room() == null || r.room().isBlank() ? course.getSchoolClass().getRoom() : r.room().trim()));
        return toDto(slot);
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.SCHEDULE, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public void deleteSlot(Long id) {
        slotRepository.delete(slotRepository.findById(id).orElseThrow(() -> new NotFoundException("Timetable slot", id)));
    }

    public static SlotDto toDto(ScheduleSlot s) {
        Course c = s.getCourse();
        Teacher t = c.getTeacher();
        return new SlotDto(s.getId(), c.getId(), c.getCode(), c.getName(), c.getColor(),
                t == null ? null : t.getId(), t == null ? null : t.getUser().fullName(),
                c.getSchoolClass().getId(), c.getSchoolClass().getName(),
                s.getDay(), s.getStartTime(), s.getEndTime(), s.getRoom());
    }
}
