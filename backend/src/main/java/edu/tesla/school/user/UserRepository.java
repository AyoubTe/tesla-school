package edu.tesla.school.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByRoleAndEnabledTrue(Role role);

    List<User> findByEnabledTrue();

    long countByRole(Role role);

    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:q = '' or lower(u.firstName) like :q or lower(u.lastName) like :q or lower(u.email) like :q)
            """)
    Page<User> search(String q, Role role, Pageable pageable);
}
