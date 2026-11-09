package edu.tesla.school.grade;

import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.ForbiddenException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.config.AsyncAndCacheConfig;
import edu.tesla.school.course.Course;
import edu.tesla.school.course.CourseDtos.CourseDto;
import edu.tesla.school.course.CourseService;
import edu.tesla.school.events.SchoolEvents.GradesPosted;
import edu.tesla.school.grade.GradeDtos.BulkGradeRequest;
import edu.tesla.school.grade.GradeDtos.CourseAverage;
import edu.tesla.school.grade.GradeDtos.GradeDto;
import edu.tesla.school.grade.GradeDtos.GradeRequest;
import edu.tesla.school.grade.GradeDtos.GradeSummary;
import edu.tesla.school.student.Student;
import edu.tesla.school.student.StudentRepository;
import edu.tesla.school.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GradeService {

    private final GradeRepository gradeRepository;
    private final StudentRepository studentRepository;
    private final CourseService courseService;
    private final CurrentUser currentUser;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public List<GradeDto> byCourse(Long courseId) {
        courseService.requireManageable(courseId);
        return gradeRepository.findByCourseId(courseId).stream().map(GradeService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<GradeDto> byStudent(Long studentId) {
        assertCanView(studentId);
        return gradeRepository.findByStudentId(studentId).stream().map(GradeService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public GradeSummary summary(Long studentId) {
        assertCanView(studentId);
        Student s = studentRepository.findById(studentId).orElseThrow(() -> new NotFoundException("Student", studentId));
        List<CourseDto> courses = s.getSchoolClass() == null ? List.of()
                : courseService.findAll().stream().filter(c -> Objects.equals(c.classId(), s.getSchoolClass().getId())).toList();
        return summarize(courses, gradeRepository.findByStudentId(studentId));
    }

    @Transactional
    @CacheEvict(value = AsyncAndCacheConfig.DASHBOARD, allEntries = true)
    public GradeDto create(GradeRequest r) {
        Course course = courseService.requireManageable(r.courseId());
        Student student = enrolledStudent(course, r.studentId());
        checkScore(r.score(), r.maxScore());
        Grade g = new Grade();
        g.setStudent(student);
        g.setCourse(course);
        apply(g, r.title(), r.type(), r.score(), r.maxScore(), r.date(), r.comment());
        g = gradeRepository.save(g);
        events.publishEvent(new GradesPosted(List.of(g.getId())));
        return toDto(g);
    }

    @Transactional
    @CacheEvict(value = AsyncAndCacheConfig.DASHBOARD, allEntries = true)
    public List<GradeDto> createBulk(BulkGradeRequest r) {
        Course course = courseService.requireManageable(r.courseId());
        List<Grade> saved = new ArrayList<>();
        for (BulkGradeRequest.Entry e : r.entries()) {
            if (e.score() == null) {
                continue; // blank cell = not graded
            }
            checkScore(e.score(), r.maxScore());
            Grade g = new Grade();
            g.setStudent(enrolledStudent(course, e.studentId()));
            g.setCourse(course);
            apply(g, r.title(), r.type(), e.score(), r.maxScore(), r.date(), e.comment());
            saved.add(gradeRepository.save(g));
        }
        if (saved.isEmpty()) {
            throw new BadRequestException("Enter at least one score.");
        }
        events.publishEvent(new GradesPosted(saved.stream().map(Grade::getId).toList()));
        return saved.stream().map(GradeService::toDto).toList();
    }

    @Transactional
    @CacheEvict(value = AsyncAndCacheConfig.DASHBOARD, allEntries = true)
    public GradeDto update(Long id, GradeRequest r) {
        Grade g = find(id);
        courseService.requireManageable(g.getCourse().getId());
        checkScore(r.score(), r.maxScore());
        apply(g, r.title(), r.type(), r.score(), r.maxScore(), r.date(), r.comment());
        return toDto(g);
    }

    @Transactional
    @CacheEvict(value = AsyncAndCacheConfig.DASHBOARD, allEntries = true)
    public void delete(Long id) {
        Grade g = find(id);
        courseService.requireManageable(g.getCourse().getId());
        gradeRepository.delete(g);
    }

    /** Per-course and overall averages (percent), overall weighted by course coefficient. */
    public static GradeSummary summarize(List<CourseDto> courses, List<Grade> grades) {
        Map<Long, List<Grade>> byCourse = grades.stream()
                .collect(Collectors.groupingBy(g -> g.getCourse().getId(), LinkedHashMap::new, Collectors.toList()));
        List<CourseAverage> averages = new ArrayList<>();
        double weighted = 0;
        double weights = 0;
        for (CourseDto c : courses) {
            List<Grade> list = byCourse.getOrDefault(c.id(), List.of());
            Double avg = average(list);
            if (avg != null) {
                weighted += avg * c.coefficient();
                weights += c.coefficient();
            }
            averages.add(new CourseAverage(c.id(), c.code(), c.name(), c.color(), c.coefficient(), avg, list.size()));
        }
        return new GradeSummary(weights == 0 ? null : round(weighted / weights), averages);
    }

    /** Average of score/max ratios, so a 9/10 quiz and an 18/20 exam count the same. */
    public static Double average(List<Grade> grades) {
        if (grades.isEmpty()) {
            return null;
        }
        return round(grades.stream().mapToDouble(g -> g.getScore() / g.getMaxScore() * 100).average().orElse(0));
    }

    private static double round(double v) {
        return Math.round(v * 10) / 10.0;
    }

    private void assertCanView(Long studentId) {
        if (currentUser.hasRole(Role.STUDENT)) {
            Student s = studentRepository.findById(studentId).orElseThrow(() -> new NotFoundException("Student", studentId));
            if (!s.getUser().getEmail().equalsIgnoreCase(currentUser.email())) {
                throw new ForbiddenException("Students can only view their own grades");
            }
        }
    }

    private Student enrolledStudent(Course course, Long studentId) {
        Student s = studentRepository.findById(studentId).orElseThrow(() -> new NotFoundException("Student", studentId));
        if (s.getSchoolClass() == null || !Objects.equals(s.getSchoolClass().getId(), course.getSchoolClass().getId())) {
            throw new BadRequestException(s.getUser().fullName() + " is not in " + course.getSchoolClass().getName() + ".");
        }
        return s;
    }

    private static void checkScore(double score, double max) {
        if (score < 0 || score > max) {
            throw new BadRequestException("Scores must be between 0 and " + max + ".");
        }
    }

    private static void apply(Grade g, String title, GradeType type, double score, double max,
                              java.time.LocalDate date, String comment) {
        g.setTitle(title.trim());
        g.setType(type);
        g.setScore(score);
        g.setMaxScore(max);
        g.setDate(date);
        g.setComment(comment == null || comment.isBlank() ? null : comment.trim());
    }

    private Grade find(Long id) {
        return gradeRepository.findById(id).orElseThrow(() -> new NotFoundException("Grade", id));
    }

    public static GradeDto toDto(Grade g) {
        Course c = g.getCourse();
        return new GradeDto(g.getId(), g.getStudent().getId(), g.getStudent().getUser().fullName(), c.getId(),
                c.getCode(), c.getName(), c.getColor(), g.getTitle(), g.getType(), g.getScore(), g.getMaxScore(),
                g.percent(), g.getDate(), g.getComment());
    }
}
