package edu.tesla.school.announcement;

import edu.tesla.school.announcement.Announcement.Audience;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    @EntityGraph(attributePaths = {"author", "schoolClass"})
    @Query("select a from Announcement a order by a.pinned desc, a.createdAt desc")
    List<Announcement> findAllOrdered(Pageable pageable);

    /**
     * Announcements a user may see: any whose audience is in {@code audiences}, class announcements
     * for {@code classId}, and anything they wrote themselves.
     */
    @EntityGraph(attributePaths = {"author", "schoolClass"})
    @Query("""
            select a from Announcement a left join a.schoolClass c
            where a.audience in :audiences
               or (a.audience = :classAudience and c.id = :classId)
               or a.author.id = :authorId
            order by a.pinned desc, a.createdAt desc
            """)
    List<Announcement> findVisible(Collection<Audience> audiences, Audience classAudience,
                                   Long classId, Long authorId, Pageable pageable);

    @Modifying
    @Query("delete from Announcement a where a.author.id = :authorId")
    void deleteByAuthorId(Long authorId);

    @Modifying
    @Query("update Announcement a set a.schoolClass = null, a.audience = :fallback where a.schoolClass.id = :classId")
    void detachClass(Long classId, Audience fallback);
}
