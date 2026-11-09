package edu.tesla.school.course;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {

    @EntityGraph(attributePaths = {"teacher", "teacher.user", "schoolClass"})
    @Query("select c from Course c order by c.schoolClass.gradeLevel, c.schoolClass.name, c.name")
    List<Course> findAllWithRelations();

    @EntityGraph(attributePaths = {"teacher", "teacher.user", "schoolClass"})
    @Query("select c from Course c where c.teacher.id = :teacherId order by c.schoolClass.name, c.name")
    List<Course> findByTeacherId(Long teacherId);

    @EntityGraph(attributePaths = {"teacher", "teacher.user", "schoolClass"})
    @Query("select c from Course c where c.schoolClass.id = :classId order by c.name")
    List<Course> findByClassId(Long classId);

    boolean existsByCodeIgnoreCase(String code);

    long countBySchoolClassId(Long classId);

    @Query("select c.teacher.id, count(c) from Course c where c.teacher is not null group by c.teacher.id")
    List<Object[]> countPerTeacher();

    @Query("select c.schoolClass.id, count(c) from Course c group by c.schoolClass.id")
    List<Object[]> countPerClass();
}
