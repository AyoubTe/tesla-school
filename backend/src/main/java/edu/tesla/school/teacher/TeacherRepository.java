package edu.tesla.school.teacher;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    @EntityGraph(attributePaths = "user")
    @Query("select t from Teacher t order by t.user.lastName, t.user.firstName")
    List<Teacher> findAllWithUser();

    Optional<Teacher> findByUserEmailIgnoreCase(String email);

    Optional<Teacher> findByUserId(Long userId);

    @Query("select coalesce(max(t.id), 0) from Teacher t")
    long maxId();
}
