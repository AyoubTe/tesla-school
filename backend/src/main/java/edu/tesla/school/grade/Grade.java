package edu.tesla.school.grade;

import edu.tesla.school.course.Course;
import edu.tesla.school.student.Student;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(indexes = {
        @Index(name = "idx_grade_student", columnList = "student_id"),
        @Index(name = "idx_grade_course", columnList = "course_id")
})
@Getter
@Setter
@NoArgsConstructor
public class Grade {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(nullable = false, length = 120)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GradeType type;

    private double score;

    private double maxScore = 20;

    @Column(name = "graded_on", nullable = false)
    private LocalDate date;

    @Column(length = 500)
    private String comment;

    @CreationTimestamp
    private Instant createdAt;

    public double percent() {
        return maxScore <= 0 ? 0 : Math.round(score / maxScore * 1000.0) / 10.0;
    }
}
