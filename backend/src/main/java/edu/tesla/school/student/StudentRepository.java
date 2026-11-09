package edu.tesla.school.student;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {

    @EntityGraph(attributePaths = {"user", "schoolClass"})
    @Query(value = """
            select s from Student s join s.user u left join s.schoolClass c
            where (:classId is null or c.id = :classId)
              and (:q = '' or lower(u.firstName) like :q or lower(u.lastName) like :q
                   or lower(u.email) like :q or lower(s.studentNumber) like :q)
            """,
            countQuery = """
            select count(s) from Student s join s.user u left join s.schoolClass c
            where (:classId is null or c.id = :classId)
              and (:q = '' or lower(u.firstName) like :q or lower(u.lastName) like :q
                   or lower(u.email) like :q or lower(s.studentNumber) like :q)
            """)
    Page<Student> search(String q, Long classId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "schoolClass"})
    @Query("select s from Student s where s.schoolClass.id = :classId order by s.user.lastName, s.user.firstName")
    List<Student> findByClassId(Long classId);

    @EntityGraph(attributePaths = {"user", "schoolClass"})
    Optional<Student> findByUserEmailIgnoreCase(String email);

    Optional<Student> findByUserId(Long userId);

    long countBySchoolClassId(Long classId);

    @Query("select s.schoolClass.id, count(s) from Student s where s.schoolClass is not null group by s.schoolClass.id")
    List<Object[]> countPerClass();

    @Query("select coalesce(max(s.id), 0) from Student s")
    long maxId();
}
