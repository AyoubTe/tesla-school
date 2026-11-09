package edu.tesla.school.grade;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.Instant;
import java.util.List;

public interface GradeRepository extends JpaRepository<Grade, Long> {

    @EntityGraph(attributePaths = {"student", "student.user", "course"})
    @Query("select g from Grade g where g.course.id = :courseId order by g.date desc, g.id desc")
    List<Grade> findByCourseId(Long courseId);

    @EntityGraph(attributePaths = {"student", "student.user", "course"})
    @Query("select g from Grade g where g.student.id = :studentId order by g.date desc, g.id desc")
    List<Grade> findByStudentId(Long studentId);

    @EntityGraph(attributePaths = {"student", "student.user", "course", "course.schoolClass"})
    @Query("select g from Grade g")
    List<Grade> findAllWithRelations();

    long countByCourseTeacherIdAndCreatedAtAfter(Long teacherId, Instant after);

    void deleteByCourseId(Long courseId);

    void deleteByStudentId(Long studentId);
}
