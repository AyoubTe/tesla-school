package edu.tesla.school.attendance;

import edu.tesla.school.attendance.AttendanceDtos.AttendanceDto;
import edu.tesla.school.attendance.AttendanceDtos.AttendanceSummary;
import edu.tesla.school.attendance.AttendanceDtos.RollCallLine;
import edu.tesla.school.attendance.AttendanceDtos.RollCallRequest;
import edu.tesla.school.attendance.AttendanceDtos.RollCallSheet;
import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.ForbiddenException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.config.AsyncAndCacheConfig;
import edu.tesla.school.course.Course;
import edu.tesla.school.course.CourseService;
import edu.tesla.school.events.SchoolEvents.AttendanceTaken;
import edu.tesla.school.student.Student;
import edu.tesla.school.student.StudentRepository;
import edu.tesla.school.user.Role;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceService {

    private static final Set<AttendanceStatus> FLAGGED = EnumSet.of(AttendanceStatus.ABSENT, AttendanceStatus.LATE);

    private final AttendanceRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final CourseService courseService;
    private final CurrentUser currentUser;
    private final ApplicationEventPublisher events;

    /** The class roster for one course session, with any status already recorded. */
    @Transactional(readOnly = true)
    public RollCallSheet sheet(Long courseId, LocalDate date) {
        Course course = courseService.requireManageable(courseId);
        Map<Long, Attendance> existing = attendanceRepository.findByCourseAndDate(courseId, date).stream()
                .collect(Collectors.toMap(a -> a.getStudent().getId(), Function.identity()));
        List<RollCallLine> lines = studentRepository.findByClassId(course.getSchoolClass().getId()).stream()
                .map(s -> {
                    Attendance a = existing.get(s.getId());
                    return new RollCallLine(s.getId(), s.getUser().fullName(), s.getStudentNumber(),
                            a == null ? null : a.getStatus(), a == null ? null : a.getNote());
                })
                .toList();
        return new RollCallSheet(course.getId(), course.getName(), course.getSchoolClass().getName(), date,
                !existing.isEmpty(), lines);
    }

    @Transactional
    @CacheEvict(value = AsyncAndCacheConfig.DASHBOARD, allEntries = true)
    public RollCallSheet save(RollCallRequest request) {
        Course course = courseService.requireManageable(request.courseId());
        Map<Long, Attendance> existing = attendanceRepository.findByCourseAndDate(course.getId(), request.date()).stream()
                .collect(Collectors.toMap(a -> a.getStudent().getId(), Function.identity()));
        Map<Long, Student> roster = studentRepository.findByClassId(course.getSchoolClass().getId()).stream()
                .collect(Collectors.toMap(Student::getId, Function.identity()));

        List<Attendance> newlyFlagged = new ArrayList<>();
        for (RollCallRequest.Entry e : request.entries()) {
            Student student = roster.get(e.studentId());
            if (student == null) {
                throw new BadRequestException("Student " + e.studentId() + " is not in " + course.getSchoolClass().getName() + ".");
            }
            Attendance a = existing.get(e.studentId());
            AttendanceStatus previous = a == null ? null : a.getStatus();
            if (a == null) {
                a = attendanceRepository.save(new Attendance(student, course, request.date(), e.status()));
            } else {
                a.setStatus(e.status());
            }
            a.setNote(e.note() == null || e.note().isBlank() ? null : e.note().trim());
            if (FLAGGED.contains(e.status()) && previous != e.status()) {
                newlyFlagged.add(a);
            }
        }
        attendanceRepository.flush();
        events.publishEvent(new AttendanceTaken(course.getId(), request.date(),
                newlyFlagged.stream().map(Attendance::getId).toList()));
        return sheet(course.getId(), request.date());
    }

    @Transactional(readOnly = true)
    public List<AttendanceDto> byStudent(Long studentId) {
        if (currentUser.hasRole(Role.STUDENT)) {
            Student s = studentRepository.findById(studentId).orElseThrow(() -> new NotFoundException("Student", studentId));
            if (!s.getUser().getEmail().equalsIgnoreCase(currentUser.email())) {
                throw new ForbiddenException("Students can only view their own attendance");
            }
        }
        return attendanceRepository.findByStudentId(studentId).stream().map(AttendanceService::toDto).toList();
    }

    @Transactional(readOnly = true)
    public AttendanceSummary summary(Long studentId) {
        byStudent(studentId); // access check
        return AttendanceSummary.of(attendanceRepository.findByStudentId(studentId));
    }

    public static AttendanceDto toDto(Attendance a) {
        return new AttendanceDto(a.getId(), a.getStudent().getId(), a.getStudent().getUser().fullName(),
                a.getCourse().getId(), a.getCourse().getName(), a.getCourse().getColor(), a.getDate(),
                a.getStatus(), a.getNote());
    }
}
