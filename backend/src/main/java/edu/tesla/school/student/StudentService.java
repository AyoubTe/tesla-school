package edu.tesla.school.student;

import edu.tesla.school.attendance.AttendanceRepository;
import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.ForbiddenException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.common.PageResponse;
import edu.tesla.school.config.AsyncAndCacheConfig;
import edu.tesla.school.grade.GradeRepository;
import edu.tesla.school.schoolclass.SchoolClass;
import edu.tesla.school.schoolclass.SchoolClassRepository;
import edu.tesla.school.student.StudentDtos.StudentDto;
import edu.tesla.school.student.StudentDtos.StudentRequest;
import edu.tesla.school.user.Role;
import edu.tesla.school.user.User;
import edu.tesla.school.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final StudentRepository studentRepository;
    private final SchoolClassRepository classRepository;
    private final GradeRepository gradeRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserService userService;
    private final CurrentUser currentUser;

    @Transactional(readOnly = true)
    public PageResponse<StudentDto> search(String q, Long classId, int page, int size) {
        String term = q == null || q.isBlank() ? "" : "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
        var pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("user.lastName", "user.firstName"));
        return PageResponse.of(studentRepository.search(term, classId, pageable), StudentService::toDto);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> byClass(Long classId) {
        return studentRepository.findByClassId(classId).stream().map(StudentService::toDto).toList();
    }

    /** Admins and teachers can open any student; a student can only open their own record. */
    @Transactional(readOnly = true)
    public StudentDto findById(Long id) {
        Student s = find(id);
        if (currentUser.hasRole(Role.STUDENT) && !s.getUser().getEmail().equalsIgnoreCase(currentUser.email())) {
            throw new ForbiddenException("Students can only view their own record");
        }
        return toDto(s);
    }

    @Transactional(readOnly = true)
    public StudentDto mine() {
        return toDto(current());
    }

    @Transactional(readOnly = true)
    public Student current() {
        return studentRepository.findByUserEmailIgnoreCase(currentUser.email())
                .orElseThrow(() -> new NotFoundException("Student profile for", currentUser.email()));
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public StudentDto create(StudentRequest request) {
        User user = userService.createAccount(request.email(), request.firstName(), request.lastName(), Role.STUDENT);
        Student s = new Student();
        s.setUser(user);
        s.setStudentNumber(nextStudentNumber());
        s.setEnrollmentDate(LocalDate.now());
        apply(s, request);
        return toDto(studentRepository.save(s));
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public StudentDto update(Long id, StudentRequest request) {
        Student s = find(id);
        userService.changeEmail(s.getUser(), request.email());
        s.getUser().setFirstName(request.firstName().trim());
        s.getUser().setLastName(request.lastName().trim());
        apply(s, request);
        return toDto(s);
    }

    @Transactional
    @CacheEvict(cacheNames = {AsyncAndCacheConfig.CLASSES, AsyncAndCacheConfig.DASHBOARD}, allEntries = true)
    public void delete(Long id) {
        Student s = find(id);
        gradeRepository.deleteByStudentId(id);
        attendanceRepository.deleteByStudentId(id);
        userService.purgeLinks(s.getUser().getId());
        studentRepository.delete(s);
    }

    private void apply(Student s, StudentRequest r) {
        s.setDateOfBirth(r.dateOfBirth());
        s.setPhone(r.phone());
        s.setAddress(r.address());
        s.setGuardianName(r.guardianName());
        s.setGuardianEmail(r.guardianEmail() == null || r.guardianEmail().isBlank() ? null : r.guardianEmail().trim());

        Long currentClassId = s.getSchoolClass() == null ? null : s.getSchoolClass().getId();
        if (r.classId() == null) {
            s.setSchoolClass(null);
        } else if (!Objects.equals(currentClassId, r.classId())) {
            SchoolClass c = classRepository.findById(r.classId())
                    .orElseThrow(() -> new NotFoundException("Class", r.classId()));
            if (studentRepository.countBySchoolClassId(c.getId()) >= c.getCapacity()) {
                throw new BadRequestException(c.getName() + " is full (" + c.getCapacity() + " students).");
            }
            s.setSchoolClass(c);
        }
    }

    private Student find(Long id) {
        return studentRepository.findById(id).orElseThrow(() -> new NotFoundException("Student", id));
    }

    private String nextStudentNumber() {
        return "S%d-%04d".formatted(LocalDate.now().getYear(), studentRepository.maxId() + 1);
    }

    public static StudentDto toDto(Student s) {
        User u = s.getUser();
        SchoolClass c = s.getSchoolClass();
        return new StudentDto(s.getId(), u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.fullName(),
                s.getStudentNumber(), s.getDateOfBirth(), s.getPhone(), s.getAddress(), s.getGuardianName(),
                s.getGuardianEmail(), c == null ? null : c.getId(), c == null ? null : c.getName(),
                s.getEnrollmentDate(), u.isEnabled());
    }
}
