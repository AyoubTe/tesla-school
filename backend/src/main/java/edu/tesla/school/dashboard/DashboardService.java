package edu.tesla.school.dashboard;

import edu.tesla.school.attendance.AttendanceDtos.AttendanceSummary;
import edu.tesla.school.attendance.AttendanceRepository;
import edu.tesla.school.attendance.AttendanceStatus;
import edu.tesla.school.auth.AuthDtos.MeDto;
import edu.tesla.school.config.AsyncAndCacheConfig;
import edu.tesla.school.course.CourseDtos.CourseDto;
import edu.tesla.school.course.CourseDtos.SlotDto;
import edu.tesla.school.course.CourseService;
import edu.tesla.school.grade.Grade;
import edu.tesla.school.grade.GradeDtos.GradeDto;
import edu.tesla.school.grade.GradeDtos.GradeSummary;
import edu.tesla.school.grade.GradeRepository;
import edu.tesla.school.grade.GradeService;
import edu.tesla.school.schoolclass.SchoolClassDtos.ClassDto;
import edu.tesla.school.schoolclass.SchoolClassService;
import edu.tesla.school.student.StudentRepository;
import edu.tesla.school.teacher.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final GradeRepository gradeRepository;
    private final AttendanceRepository attendanceRepository;
    private final SchoolClassService classService;
    private final CourseService courseService;

    public record ClassStat(Long classId, String name, long students, int capacity, Double average) {
    }

    public record AdminStats(long students, long teachers, long classes, long courses, Double attendanceRate30d,
                             Double averageGrade, List<ClassStat> classStats, int[] gradeDistribution) {
    }

    public record TeacherStats(List<CourseDto> courses, long students, long gradesThisWeek, List<SlotDto> today,
                               List<Long> pendingRollCallCourseIds) {
    }

    public record StudentStats(GradeSummary grades, AttendanceSummary attendance, List<GradeDto> recentGrades,
                               List<SlotDto> today) {
    }

    public record DashboardDto(String role, AdminStats admin, TeacherStats teacher, StudentStats student) {
    }

    @Transactional(readOnly = true)
    @Cacheable(value = AsyncAndCacheConfig.DASHBOARD, key = "'admin'")
    public AdminStats admin() {
        List<ClassDto> classes = classService.findAll();
        List<Grade> grades = gradeRepository.findAllWithRelations();

        Map<Long, List<Grade>> byClass = grades.stream()
                .filter(g -> g.getStudent().getSchoolClass() != null)
                .collect(Collectors.groupingBy(g -> g.getStudent().getSchoolClass().getId()));
        List<ClassStat> classStats = classes.stream()
                .map(c -> new ClassStat(c.id(), c.name(), c.studentCount(), c.capacity(),
                        GradeService.average(byClass.getOrDefault(c.id(), List.of()))))
                .toList();

        // Ten buckets: 0–9%, 10–19%, … 90–100%.
        int[] distribution = new int[10];
        for (Grade g : grades) {
            distribution[Math.min(9, (int) (g.getScore() / g.getMaxScore() * 10))]++;
        }

        LocalDate from = LocalDate.now().minusDays(30);
        long total = attendanceRepository.countByDateGreaterThanEqual(from);
        long excused = attendanceRepository.countByDateGreaterThanEqualAndStatusIn(from, EnumSet.of(AttendanceStatus.EXCUSED));
        long attended = attendanceRepository.countByDateGreaterThanEqualAndStatusIn(from,
                EnumSet.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE));
        Double rate = total - excused == 0 ? null : Math.round(attended * 1000.0 / (total - excused)) / 10.0;

        return new AdminStats(studentRepository.count(), teacherRepository.count(), classes.size(),
                courseService.findAll().size(), rate, GradeService.average(grades), classStats, distribution);
    }

    @Transactional(readOnly = true)
    public TeacherStats teacher(MeDto me) {
        Long teacherId = me.teacherId();
        List<CourseDto> courses = courseService.findAll().stream()
                .filter(c -> Objects.equals(c.teacherId(), teacherId)).toList();
        long students = courses.stream().map(CourseDto::classId).distinct()
                .mapToLong(studentRepository::countBySchoolClassId).sum();
        long gradesThisWeek = gradeRepository.countByCourseTeacherIdAndCreatedAtAfter(teacherId,
                Instant.now().minus(7, ChronoUnit.DAYS));
        LocalDate today = LocalDate.now();
        List<SlotDto> todaySlots = courseService.scheduleForTeacher(teacherId).stream()
                .filter(s -> s.day() == today.getDayOfWeek()).toList();
        List<Long> pending = todaySlots.stream().map(SlotDto::courseId).distinct()
                .filter(id -> !attendanceRepository.existsByCourseIdAndDate(id, today)).toList();
        return new TeacherStats(courses, students, gradesThisWeek, todaySlots, pending);
    }

    @Transactional(readOnly = true)
    public StudentStats student(MeDto me) {
        Long studentId = me.studentId();
        List<Grade> grades = gradeRepository.findByStudentId(studentId);
        List<CourseDto> courses = me.classId() == null ? List.of() : courseService.findAll().stream()
                .filter(c -> Objects.equals(c.classId(), me.classId())).toList();
        LocalDate today = LocalDate.now();
        List<SlotDto> todaySlots = me.classId() == null ? List.of() : courseService.scheduleForClass(me.classId()).stream()
                .filter(s -> s.day() == today.getDayOfWeek()).toList();
        return new StudentStats(
                GradeService.summarize(courses, grades),
                AttendanceSummary.of(attendanceRepository.findByStudentId(studentId)),
                grades.stream().limit(5).map(GradeService::toDto).toList(),
                todaySlots);
    }
}
