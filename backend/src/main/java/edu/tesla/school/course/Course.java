package edu.tesla.school.course;

import edu.tesla.school.schoolclass.SchoolClass;
import edu.tesla.school.teacher.Teacher;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** A subject taught to one class by one teacher, e.g. "Electromagnetism — 11-A Induction". */
@Entity
@Getter
@Setter
@NoArgsConstructor
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 1000)
    private String description;

    /** Weight of this course in the student's overall average. */
    private double coefficient = 1.0;

    /** Hex color used in the timetable and grade views. */
    @Column(length = 9)
    private String color = "#1F8FB8";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_id")
    private SchoolClass schoolClass;
}
