package edu.tesla.school.attendance;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    @EntityGraph(attributePaths = {"student", "student.user", "course"})
    @Query("select a from Attendance a where a.course.id = :courseId and a.date = :date")
    List<Attendance> findByCourseAndDate(Long courseId, LocalDate date);

    @EntityGraph(attributePaths = {"student", "student.user", "course"})
    @Query("select a from Attendance a where a.student.id = :studentId order by a.date desc")
    List<Attendance> findByStudentId(Long studentId);

    @EntityGraph(attributePaths = {"student", "student.user", "course"})
    @Query("select a from Attendance a where a.id in :ids")
    List<Attendance> findAllWithRelations(Collection<Long> ids);

    boolean existsByCourseIdAndDate(Long courseId, LocalDate date);

    long countByDateGreaterThanEqual(LocalDate from);

    long countByDateGreaterThanEqualAndStatusIn(LocalDate from, Collection<AttendanceStatus> statuses);

    void deleteByCourseId(Long courseId);

    void deleteByStudentId(Long studentId);
}
