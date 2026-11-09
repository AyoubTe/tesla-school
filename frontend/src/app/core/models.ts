export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
export type GradeType = 'EXAM' | 'QUIZ' | 'HOMEWORK' | 'PROJECT' | 'LAB';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type Audience = 'ALL' | 'STUDENTS' | 'TEACHERS' | 'CLASS';
export type NotificationType = 'GRADE' | 'ATTENDANCE' | 'ANNOUNCEMENT' | 'ACCOUNT' | 'SCHEDULE' | 'SYSTEM';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Me {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  teacherId: number | null;
  studentId: number | null;
  classId: number | null;
  className: string | null;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: Me;
}

export interface UserAccount {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: Role;
  enabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Teacher {
  id: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  employeeNumber: string;
  specialty: string | null;
  phone: string | null;
  hireDate: string | null;
  bio: string | null;
  enabled: boolean;
  courseCount: number;
}

export interface Student {
  id: number;
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  studentNumber: string;
  dateOfBirth: string | null;
  phone: string | null;
  address: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  classId: number | null;
  className: string | null;
  enrollmentDate: string | null;
  enabled: boolean;
}

export interface SchoolClass {
  id: number;
  name: string;
  gradeLevel: number;
  academicYear: string;
  room: string | null;
  capacity: number;
  homeroomTeacherId: number | null;
  homeroomTeacherName: string | null;
  studentCount: number;
  courseCount: number;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  description: string | null;
  coefficient: number;
  color: string;
  teacherId: number | null;
  teacherName: string | null;
  classId: number;
  className: string;
}

export interface Slot {
  id: number;
  courseId: number;
  courseCode: string;
  courseName: string;
  color: string;
  teacherId: number | null;
  teacherName: string | null;
  classId: number;
  className: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string | null;
}

export interface Grade {
  id: number;
  studentId: number;
  studentName: string;
  courseId: number;
  courseCode: string;
  courseName: string;
  color: string;
  title: string;
  type: GradeType;
  score: number;
  maxScore: number;
  percent: number;
  date: string;
  comment: string | null;
}

export interface CourseAverage {
  courseId: number;
  courseCode: string;
  courseName: string;
  color: string;
  coefficient: number;
  average: number | null;
  count: number;
}

export interface GradeSummary {
  overall: number | null;
  courses: CourseAverage[];
}

export interface AttendanceRecord {
  id: number;
  studentId: number;
  studentName: string;
  courseId: number;
  courseName: string;
  color: string;
  date: string;
  status: AttendanceStatus;
  note: string | null;
}

export interface RollCallLine {
  studentId: number;
  studentName: string;
  studentNumber: string;
  status: AttendanceStatus | null;
  note: string | null;
}

export interface RollCallSheet {
  courseId: number;
  courseName: string;
  className: string;
  date: string;
  taken: boolean;
  lines: RollCallLine[];
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number | null;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  audience: Audience;
  classId: number | null;
  className: string | null;
  authorId: number;
  authorName: string;
  authorRole: Role;
  pinned: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface ClassStat {
  classId: number;
  name: string;
  students: number;
  capacity: number;
  average: number | null;
}

export interface Dashboard {
  role: Role;
  admin: {
    students: number;
    teachers: number;
    classes: number;
    courses: number;
    attendanceRate30d: number | null;
    averageGrade: number | null;
    classStats: ClassStat[];
    gradeDistribution: number[];
  } | null;
  teacher: {
    courses: Course[];
    students: number;
    gradesThisWeek: number;
    today: Slot[];
    pendingRollCallCourseIds: number[];
  } | null;
  student: {
    grades: GradeSummary;
    attendance: AttendanceSummary;
    recentGrades: Grade[];
    today: Slot[];
  } | null;
}

export const DAYS: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
export const GRADE_TYPES: GradeType[] = ['EXAM', 'QUIZ', 'HOMEWORK', 'PROJECT', 'LAB'];

export function titleCase(value: string | null | undefined): string {
  if (!value) return '';
  return value.charAt(0) + value.slice(1).toLowerCase();
}

/** Monday = 0 … Sunday = 6, matching DAYS. */
export function todayKey(): DayOfWeek {
  const all: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return all[new Date().getDay()];
}

export function isoDate(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function hhmm(time: string): string {
  return time.slice(0, 5);
}
