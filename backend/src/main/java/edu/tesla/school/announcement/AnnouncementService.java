package edu.tesla.school.announcement;

import edu.tesla.school.announcement.Announcement.Audience;
import edu.tesla.school.auth.AuthDtos.MeDto;
import edu.tesla.school.auth.AuthService;
import edu.tesla.school.common.ApiExceptions.BadRequestException;
import edu.tesla.school.common.ApiExceptions.ForbiddenException;
import edu.tesla.school.common.ApiExceptions.NotFoundException;
import edu.tesla.school.common.CurrentUser;
import edu.tesla.school.events.SchoolEvents.AnnouncementPublished;
import edu.tesla.school.schoolclass.SchoolClass;
import edu.tesla.school.schoolclass.SchoolClassRepository;
import edu.tesla.school.user.Role;
import edu.tesla.school.user.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementRepository repository;
    private final SchoolClassRepository classRepository;
    private final CurrentUser currentUser;
    private final AuthService authService;
    private final ApplicationEventPublisher events;

    public record AnnouncementDto(Long id, String title, String content, Audience audience, Long classId,
                                  String className, Long authorId, String authorName, Role authorRole,
                                  boolean pinned, Instant createdAt) {
    }

    public record AnnouncementRequest(@NotBlank @Size(max = 160) String title,
                                      @NotBlank @Size(max = 5000) String content,
                                      @NotNull Audience audience,
                                      Long classId,
                                      boolean pinned) {
    }

    @Transactional(readOnly = true)
    public List<AnnouncementDto> visible(int limit) {
        MeDto me = authService.me(currentUser.email());
        PageRequest page = PageRequest.of(0, Math.min(Math.max(limit, 1), 100));
        List<Announcement> list = switch (me.role()) {
            case ADMIN -> repository.findAllOrdered(page);
            // Teachers see staff and school-wide posts plus every class board.
            case TEACHER -> repository.findVisible(EnumSet.of(Audience.ALL, Audience.TEACHERS, Audience.CLASS),
                    Audience.CLASS, null, me.id(), page);
            case STUDENT -> repository.findVisible(EnumSet.of(Audience.ALL, Audience.STUDENTS),
                    Audience.CLASS, me.classId(), me.id(), page);
        };
        return list.stream().map(AnnouncementService::toDto).toList();
    }

    @Transactional
    public AnnouncementDto publish(AnnouncementRequest r) {
        User author = currentUser.get();
        if (author.getRole() == Role.TEACHER && r.pinned()) {
            throw new ForbiddenException("Only administrators can pin announcements");
        }
        if (author.getRole() == Role.TEACHER && (r.audience() == Audience.ALL || r.audience() == Audience.TEACHERS)) {
            throw new ForbiddenException("Teachers can post to students or to a class");
        }
        Announcement a = new Announcement();
        a.setTitle(r.title().trim());
        a.setContent(r.content().trim());
        a.setAudience(r.audience());
        a.setPinned(r.pinned());
        a.setAuthor(author);
        if (r.audience() == Audience.CLASS) {
            if (r.classId() == null) {
                throw new BadRequestException("Choose the class this announcement is for.");
            }
            SchoolClass c = classRepository.findById(r.classId()).orElseThrow(() -> new NotFoundException("Class", r.classId()));
            a.setSchoolClass(c);
        }
        a = repository.save(a);
        if (a.getCreatedAt() == null) {
            a.setCreatedAt(Instant.now());
        }
        events.publishEvent(new AnnouncementPublished(a.getId()));
        return toDto(a);
    }

    @Transactional
    public void delete(Long id) {
        Announcement a = repository.findById(id).orElseThrow(() -> new NotFoundException("Announcement", id));
        boolean isAuthor = a.getAuthor().getEmail().equalsIgnoreCase(currentUser.email());
        if (!isAuthor && !currentUser.hasRole(Role.ADMIN)) {
            throw new ForbiddenException("Only the author or an administrator can delete this");
        }
        repository.delete(a);
    }

    private static AnnouncementDto toDto(Announcement a) {
        SchoolClass c = a.getSchoolClass();
        User author = a.getAuthor();
        return new AnnouncementDto(a.getId(), a.getTitle(), a.getContent(), a.getAudience(),
                c == null ? null : c.getId(), c == null ? null : c.getName(),
                author.getId(), author.fullName(), author.getRole(), a.isPinned(), a.getCreatedAt());
    }
}
