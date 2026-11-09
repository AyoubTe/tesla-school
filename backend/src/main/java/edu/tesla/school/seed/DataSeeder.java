package edu.tesla.school.seed;

import edu.tesla.school.announcement.Announcement;
import edu.tesla.school.announcement.Announcement.Audience;
import edu.tesla.school.announcement.AnnouncementRepository;
import edu.tesla.school.attendance.Attendance;
import edu.tesla.school.attendance.AttendanceRepository;
import edu.tesla.school.attendance.AttendanceStatus;
import edu.tesla.school.course.Course;
import edu.tesla.school.course.CourseRepository;
import edu.tesla.school.course.ScheduleSlot;
import edu.tesla.school.course.ScheduleSlotRepository;
import edu.tesla.school.grade.Grade;
import edu.tesla.school.grade.GradeRepository;
import edu.tesla.school.grade.GradeType;
import edu.tesla.school.notification.Notification;
import edu.tesla.school.notification.NotificationRepository;
import edu.tesla.school.schoolclass.SchoolClass;
import edu.tesla.school.schoolclass.SchoolClassRepository;
import edu.tesla.school.student.Student;
import edu.tesla.school.student.StudentRepository;
import edu.tesla.school.teacher.Teacher;
import edu.tesla.school.teacher.TeacherRepository;
import edu.tesla.school.user.Role;
import edu.tesla.school.user.User;
import edu.tesla.school.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

/**
 * Fills an empty database with a believable school: 1 admin, 6 teachers, 4 classes, 32 students,
 * 20 courses with a weekly timetable, three weeks of attendance and a few graded assessments.
 * Disable with {@code SEED_DATA=false}.
 */
@Slf4j
@Component
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    public static final String DOMAIN = "tesla-school.edu";
    private static final String YEAR = "2026–2027";
    private static final LocalTime[][] PERIODS = {
            {LocalTime.of(8, 30), LocalTime.of(10, 0)},
            {LocalTime.of(10, 15), LocalTime.of(11, 45)},
            {LocalTime.of(13, 30), LocalTime.of(15, 0)}};
    private static final DayOfWeek[] WEEKDAYS = {DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY, DayOfWeek.FRIDAY};

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final SchoolClassRepository classRepository;
    private final CourseRepository courseRepository;
    private final ScheduleSlotRepository slotRepository;
    private final GradeRepository gradeRepository;
    private final AttendanceRepository attendanceRepository;
    private final AnnouncementRepository announcementRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;

    private record Subject(String code, String name, String color, double coefficient, String description) {
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            return;
        }
        log.info("Seeding Tesla School demo data…");
        Random rnd = new Random(1856); // Tesla's birth year keeps the demo data stable between runs
        String adminHash = passwordEncoder.encode("Admin@123");
        String teacherHash = passwordEncoder.encode("Teacher@123");
        String studentHash = passwordEncoder.encode("Student@123");

        // ------------------------------------------------------------- people
        User admin = userRepository.save(new User("admin@" + DOMAIN, adminHash, "Helena", "Brandt", Role.ADMIN));

        String[][] teacherData = {
                {"Marcus", "Hale", "Physics & electromagnetism"},
                {"Lena", "Okafor", "Mathematics"},
                {"Tomás", "Varga", "Chemistry"},
                {"Priya", "Raman", "Computer science"},
                {"Julien", "Moreau", "History & literature"},
                {"Sofia", "Lindqvist", "Biology"}};
        List<Teacher> teachers = new ArrayList<>();
        for (int i = 0; i < teacherData.length; i++) {
            String[] d = teacherData[i];
            User u = new User(email(d[0], d[1]), teacherHash, d[0], d[1], Role.TEACHER);
            Teacher t = new Teacher();
            t.setUser(u);
            t.setEmployeeNumber("T-%04d".formatted(1001 + i));
            t.setSpecialty(d[2]);
            t.setPhone("+33 5 56 %02d %02d %02d".formatted(10 + i, 20 + i, 30 + i));
            t.setHireDate(LocalDate.of(2014 + i, 9, 1));
            t.setBio("Teaches " + d[2].toLowerCase(Locale.ROOT) + " at Tesla School.");
            teachers.add(teacherRepository.save(t));
        }
        Teacher hale = teachers.get(0), okafor = teachers.get(1), varga = teachers.get(2),
                raman = teachers.get(3), moreau = teachers.get(4), lindqvist = teachers.get(5);

        String[][] classData = {{"10-A Coil", "10", "Lab 1"}, {"10-B Arc", "10", "B-204"},
                {"11-A Induction", "11", "B-310"}, {"12-A Radiant", "12", "C-101"}};
        Teacher[] homerooms = {hale, okafor, varga, raman};
        List<SchoolClass> classes = new ArrayList<>();
        for (int i = 0; i < classData.length; i++) {
            SchoolClass c = new SchoolClass();
            c.setName(classData[i][0]);
            c.setGradeLevel(Integer.parseInt(classData[i][1]));
            c.setAcademicYear(YEAR);
            c.setRoom(classData[i][2]);
            c.setCapacity(28);
            c.setHomeroomTeacher(homerooms[i]);
            classes.add(classRepository.save(c));
        }

        String[][] studentNames = {
                {"Amélie", "Laurent"}, {"Noah", "Fischer"}, {"Yasmin", "Haddad"}, {"Leo", "Marchetti"},
                {"Inès", "Dubois"}, {"Kenji", "Watanabe"}, {"Maya", "Kowalski"}, {"Elias", "Novak"},
                {"Chloé", "Bernard"}, {"Omar", "Benali"}, {"Freya", "Nilsen"}, {"Lucas", "Petit"},
                {"Zara", "Mensah"}, {"Hugo", "Lefèvre"}, {"Anaya", "Kapoor"}, {"Mateo", "Ruiz"},
                {"Clara", "Schmidt"}, {"Ethan", "Rossi"}, {"Lina", "Moreno"}, {"Adam", "Girard"},
                {"Sara", "Lindholm"}, {"Nils", "Andersen"}, {"Léa", "Fontaine"}, {"Ivan", "Petrov"},
                {"Jade", "Rousseau"}, {"Samuel", "Costa"}, {"Nadia", "Karimi"}, {"Felix", "Weber"},
                {"Rose", "Martin"}, {"Arjun", "Mehta"}, {"Emma", "Vidal"}, {"Theo", "Blanc"}};
        List<List<Student>> studentsByClass = new ArrayList<>();
        int n = 0;
        for (SchoolClass c : classes) {
            List<Student> roster = new ArrayList<>();
            for (int k = 0; k < 8; k++, n++) {
                String[] name = studentNames[n];
                User u = new User(email(name[0], name[1]), studentHash, name[0], name[1], Role.STUDENT);
                Student s = new Student();
                s.setUser(u);
                s.setStudentNumber("S2026-%04d".formatted(n + 1));
                s.setDateOfBirth(LocalDate.of(2021 - c.getGradeLevel(), 1 + rnd.nextInt(12), 1 + rnd.nextInt(28)));
                s.setPhone("+33 6 %02d %02d %02d %02d".formatted(rnd.nextInt(100), rnd.nextInt(100), rnd.nextInt(100), rnd.nextInt(100)));
                s.setAddress((10 + rnd.nextInt(80)) + " rue de la Science, Bordeaux");
                s.setGuardianName("Parent " + name[1]);
                s.setGuardianEmail("guardian." + slug(name[1]) + "@example.com");
                s.setSchoolClass(c);
                s.setEnrollmentDate(LocalDate.of(2026, 9, 1));
                roster.add(studentRepository.save(s));
            }
            studentsByClass.add(roster);
        }

        // ------------------------------------------------------------ courses
        Subject physics = new Subject("PHY", "Physics", "#1F8FB8", 3, "Mechanics, waves and electromagnetism, from Faraday to alternating current.");
        Subject maths = new Subject("MAT", "Mathematics", "#5B6CD9", 3, "Algebra, analysis and the mathematics behind circuits.");
        Subject chemistry = new Subject("CHE", "Chemistry", "#C7782A", 2, "Matter, reactions and laboratory practice.");
        Subject biology = new Subject("BIO", "Biology", "#4F9A3A", 2, "Living systems, from cells to ecosystems.");
        Subject computing = new Subject("CSC", "Computer science", "#2E9E6A", 2, "Programming, algorithms and how machines compute.");
        Subject history = new Subject("HIS", "History & literature", "#A05472", 1, "The people and ideas that shaped the modern world.");

        List<Course> allCourses = new ArrayList<>();
        for (int ci = 0; ci < classes.size(); ci++) {
            SchoolClass c = classes.get(ci);
            boolean senior = ci == 3;
            Subject[] subjects = {physics, maths, senior ? biology : chemistry, computing, history};
            Teacher[] subjectTeachers = {hale, okafor, senior ? lindqvist : varga, raman, moreau};
            for (int k = 0; k < subjects.length; k++) {
                Subject sub = subjects[k];
                Course course = new Course();
                course.setCode(sub.code() + "-" + c.getName().substring(0, 4).replace("-", ""));
                course.setName(sub.name());
                course.setDescription(sub.description());
                course.setColor(sub.color());
                course.setCoefficient(sub.coefficient());
                course.setTeacher(subjectTeachers[k]);
                course.setSchoolClass(c);
                course = courseRepository.save(course);
                allCourses.add(course);

                // Latin-square timetable: no class or teacher is ever double-booked.
                String room = k == 0 ? "Lab 1" : c.getRoom();
                slot(course, WEEKDAYS[(k + ci) % 5], 0, room);
                slot(course, WEEKDAYS[(k + ci + 2) % 5], 1, room);
                if (k <= 1) {
                    slot(course, WEEKDAYS[(k + ci + 4) % 5], 2, room);
                }
            }
        }

        // ------------------------------------------- grades and attendance
        LocalDate today = LocalDate.now();
        String[][] assessments = {{"Diagnostic quiz", "QUIZ", "21"}, {"Lab report", "LAB", "14"}, {"Unit test", "EXAM", "6"}};
        for (int ci = 0; ci < classes.size(); ci++) {
            List<Student> roster = studentsByClass.get(ci);
            double[] ability = roster.stream().mapToDouble(s -> 0.55 + rnd.nextDouble() * 0.4).toArray();
            for (Course course : allCourses) {
                if (!course.getSchoolClass().getId().equals(classes.get(ci).getId())) {
                    continue;
                }
                for (String[] a : assessments) {
                    GradeType type = GradeType.valueOf(a[1]);
                    double max = type == GradeType.QUIZ ? 10 : 20;
                    for (int si = 0; si < roster.size(); si++) {
                        double pct = Math.max(0.2, Math.min(1, ability[si] + (rnd.nextGaussian() * 0.08)));
                        Grade g = new Grade();
                        g.setStudent(roster.get(si));
                        g.setCourse(course);
                        g.setTitle(a[0]);
                        g.setType(type);
                        g.setMaxScore(max);
                        g.setScore(Math.round(pct * max * 2) / 2.0);
                        g.setDate(today.minusDays(Long.parseLong(a[2])));
                        gradeRepository.save(g);
                    }
                }
            }
        }

        for (ScheduleSlot slot : slotRepository.findAll()) {
            Course course = slot.getCourse();
            Long classId = course.getSchoolClass().getId();
            int classIndex = 0;
            while (!classes.get(classIndex).getId().equals(classId)) {
                classIndex++;
            }
            List<Student> roster = studentsByClass.get(classIndex);
            for (int week = 0; week < 3; week++) {
                LocalDate date = today.with(TemporalAdjusters.previous(slot.getDay())).minusWeeks(week);
                for (Student s : roster) {
                    double r = rnd.nextDouble();
                    AttendanceStatus status = r < 0.90 ? AttendanceStatus.PRESENT
                            : r < 0.95 ? AttendanceStatus.LATE
                            : r < 0.985 ? AttendanceStatus.ABSENT : AttendanceStatus.EXCUSED;
                    attendanceRepository.save(new Attendance(s, course, date, status));
                }
            }
        }

        // ------------------------------------------------- announcements
        announcement(admin, "Welcome to the 2026–2027 school year",
                "Classes start on Monday at 8:30. Timetables, grades and attendance are all available on this portal. "
                        + "Check your notifications for anything that needs your attention.", Audience.ALL, null, true);
        announcement(admin, "Staff meeting on Thursday",
                "Short staff meeting in the library on Thursday at 16:00 to plan the science fair.", Audience.TEACHERS, null, false);
        announcement(hale.getUser(), "Bring safety goggles to Lab 1",
                "Next week we build a small induction coil. Safety goggles are required for everyone.",
                Audience.CLASS, classes.get(0), false);
        announcement(admin, "Science fair registrations are open",
                "Teams of two to four can register a project until the end of the month. "
                        + "This year's theme is \"Energy for everyone\".", Audience.STUDENTS, null, false);

        notify(admin, Notification.NotificationType.SYSTEM, "Demo data loaded",
                "32 students, 6 teachers and 4 classes are ready to explore.", "/");
        notify(hale.getUser(), Notification.NotificationType.SCHEDULE, "Your timetable is ready",
                "You teach Physics to all four classes this year.", "/timetable");
        Student first = studentsByClass.get(0).getFirst();
        notify(first.getUser(), Notification.NotificationType.GRADE, "New grade in Physics",
                "Unit test results are available.", "/grades");

        log.info("Seed complete. Sign in as admin@{} / Admin@123, {} / Teacher@123 or {} / Student@123",
                DOMAIN, hale.getUser().getEmail(), first.getUser().getEmail());
    }

    private void slot(Course course, DayOfWeek day, int period, String room) {
        slotRepository.save(new ScheduleSlot(course, day, PERIODS[period][0], PERIODS[period][1], room));
    }

    private void announcement(User author, String title, String content, Audience audience, SchoolClass c, boolean pinned) {
        Announcement a = new Announcement();
        a.setAuthor(author);
        a.setTitle(title);
        a.setContent(content);
        a.setAudience(audience);
        a.setSchoolClass(c);
        a.setPinned(pinned);
        announcementRepository.save(a);
    }

    private void notify(User user, Notification.NotificationType type, String title, String message, String link) {
        Notification n = new Notification();
        n.setRecipient(user);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setLink(link);
        notificationRepository.save(n);
    }

    private static String email(String first, String last) {
        return slug(first) + "." + slug(last) + "@" + DOMAIN;
    }

    private static String slug(String s) {
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).replaceAll("[^a-z]", "");
    }
}
