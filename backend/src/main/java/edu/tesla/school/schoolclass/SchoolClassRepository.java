package edu.tesla.school.schoolclass;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Long> {

    @EntityGraph(attributePaths = {"homeroomTeacher", "homeroomTeacher.user"})
    @Query("select c from SchoolClass c order by c.gradeLevel, c.name")
    List<SchoolClass> findAllOrdered();

    boolean existsByNameIgnoreCase(String name);
}
