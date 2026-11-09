package edu.tesla.school.course;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.DayOfWeek;
import java.util.List;

public interface ScheduleSlotRepository extends JpaRepository<ScheduleSlot, Long> {

    @EntityGraph(attributePaths = {"course", "course.teacher", "course.teacher.user", "course.schoolClass"})
    @Query("select s from ScheduleSlot s where s.course.schoolClass.id = :classId")
    List<ScheduleSlot> findByClassId(Long classId);

    @EntityGraph(attributePaths = {"course", "course.teacher", "course.teacher.user", "course.schoolClass"})
    @Query("select s from ScheduleSlot s where s.course.teacher.id = :teacherId")
    List<ScheduleSlot> findByTeacherId(Long teacherId);

    @EntityGraph(attributePaths = {"course", "course.teacher", "course.teacher.user", "course.schoolClass"})
    @Query("select s from ScheduleSlot s where s.day = :day")
    List<ScheduleSlot> findByDay(DayOfWeek day);

    @Modifying
    @Query("delete from ScheduleSlot s where s.course.id = :courseId")
    void deleteByCourseId(Long courseId);
}
