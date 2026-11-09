import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Announcement, AppNotification, AttendanceRecord, AttendanceStatus, AttendanceSummary, Audience, Course, Dashboard,
  DayOfWeek, Grade, GradeSummary, GradeType, Me, Page, Role, RollCallSheet, SchoolClass, Slot, Student, Teacher,
  UserAccount,
} from './models';

export const API = '/api';

type Params = Record<string, string | number | boolean | null | undefined>;

function params(p: Params): HttpParams {
  let hp = new HttpParams();
  for (const [k, v] of Object.entries(p)) {
    if (v !== null && v !== undefined && v !== '') hp = hp.set(k, String(v));
  }
  return hp;
}

/** Turns a Spring ProblemDetail (or anything else) into a sentence for the UI. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Can’t reach the server. Check that the backend is running.';
    const body = err.error as { detail?: string; errors?: Record<string, string> } | null;
    if (body?.errors) {
      const first = Object.entries(body.errors)[0];
      if (first) return `${first[0]}: ${first[1]}`;
    }
    if (body?.detail) return body.detail;
  }
  return fallback;
}

export interface StudentInput {
  firstName: string; lastName: string; email: string; dateOfBirth: string | null; phone: string | null;
  address: string | null; guardianName: string | null; guardianEmail: string | null; classId: number | null;
}
export interface TeacherInput {
  firstName: string; lastName: string; email: string; specialty: string | null; phone: string | null;
  hireDate: string | null; bio: string | null;
}
export interface ClassInput {
  name: string; gradeLevel: number; academicYear: string; room: string | null; capacity: number;
  homeroomTeacherId: number | null;
}
export interface CourseInput {
  code: string; name: string; description: string | null; coefficient: number; color: string;
  teacherId: number | null; classId: number;
}
export interface SlotInput { courseId: number; day: DayOfWeek; startTime: string; endTime: string; room: string | null; }
export interface BulkGradeInput {
  courseId: number; title: string; type: GradeType; maxScore: number; date: string;
  entries: { studentId: number; score: number | null; comment: string | null }[];
}
export interface GradeInput {
  studentId: number; courseId: number; title: string; type: GradeType; score: number; maxScore: number;
  date: string; comment: string | null;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // ---------------------------------------------------------------- auth
  login(email: string, password: string) {
    return this.http.post<{ token: string; expiresAt: string; user: Me }>(`${API}/auth/login`, { email, password });
  }
  me() { return this.http.get<Me>(`${API}/auth/me`); }
  updateProfile(firstName: string, lastName: string) { return this.http.put<Me>(`${API}/auth/me`, { firstName, lastName }); }
  forgotPassword(email: string) { return this.http.post<void>(`${API}/auth/forgot-password`, { email }); }
  resetPassword(token: string, newPassword: string) {
    return this.http.post<void>(`${API}/auth/reset-password`, { token, newPassword });
  }
  changePassword(currentPassword: string, newPassword: string) {
    return this.http.post<void>(`${API}/auth/change-password`, { currentPassword, newPassword });
  }

  dashboard() { return this.http.get<Dashboard>(`${API}/dashboard`); }

  // ------------------------------------------------------------- people
  students(q: string, classId: number | null, page: number, size = 20) {
    return this.http.get<Page<Student>>(`${API}/students`, { params: params({ q, classId, page, size }) });
  }
  student(id: number) { return this.http.get<Student>(`${API}/students/${id}`); }
  myStudent() { return this.http.get<Student>(`${API}/students/me`); }
  createStudent(body: StudentInput) { return this.http.post<Student>(`${API}/students`, body); }
  updateStudent(id: number, body: StudentInput) { return this.http.put<Student>(`${API}/students/${id}`, body); }
  deleteStudent(id: number) { return this.http.delete<void>(`${API}/students/${id}`); }

  teachers() { return this.http.get<Teacher[]>(`${API}/teachers`); }
  createTeacher(body: TeacherInput) { return this.http.post<Teacher>(`${API}/teachers`, body); }
  updateTeacher(id: number, body: TeacherInput) { return this.http.put<Teacher>(`${API}/teachers/${id}`, body); }
  deleteTeacher(id: number) { return this.http.delete<void>(`${API}/teachers/${id}`); }

  // ------------------------------------------------------------ classes
  classes() { return this.http.get<SchoolClass[]>(`${API}/classes`); }
  schoolClass(id: number) { return this.http.get<SchoolClass>(`${API}/classes/${id}`); }
  classStudents(id: number) { return this.http.get<Student[]>(`${API}/classes/${id}/students`); }
  createClass(body: ClassInput) { return this.http.post<SchoolClass>(`${API}/classes`, body); }
  updateClass(id: number, body: ClassInput) { return this.http.put<SchoolClass>(`${API}/classes/${id}`, body); }
  deleteClass(id: number) { return this.http.delete<void>(`${API}/classes/${id}`); }

  // ------------------------------------------------------------ courses
  courses(filter: { teacherId?: number | null; classId?: number | null } = {}) {
    return this.http.get<Course[]>(`${API}/courses`, { params: params(filter) });
  }
  myCourses() { return this.http.get<Course[]>(`${API}/courses/mine`); }
  createCourse(body: CourseInput) { return this.http.post<Course>(`${API}/courses`, body); }
  updateCourse(id: number, body: CourseInput) { return this.http.put<Course>(`${API}/courses/${id}`, body); }
  deleteCourse(id: number) { return this.http.delete<void>(`${API}/courses/${id}`); }

  schedule(filter: { classId?: number | null; teacherId?: number | null }) {
    return this.http.get<Slot[]>(`${API}/schedule`, { params: params(filter) });
  }
  mySchedule() { return this.http.get<Slot[]>(`${API}/schedule/mine`); }
  addSlot(body: SlotInput) { return this.http.post<Slot>(`${API}/schedule`, body); }
  deleteSlot(id: number) { return this.http.delete<void>(`${API}/schedule/${id}`); }

  // ------------------------------------------------------------- grades
  courseGrades(courseId: number) { return this.http.get<Grade[]>(`${API}/grades/course/${courseId}`); }
  studentGrades(studentId: number) { return this.http.get<Grade[]>(`${API}/grades/student/${studentId}`); }
  studentGradeSummary(studentId: number) { return this.http.get<GradeSummary>(`${API}/grades/student/${studentId}/summary`); }
  myGrades() { return this.http.get<Grade[]>(`${API}/grades/mine`); }
  myGradeSummary() { return this.http.get<GradeSummary>(`${API}/grades/mine/summary`); }
  postGrades(body: BulkGradeInput) { return this.http.post<Grade[]>(`${API}/grades/bulk`, body); }
  updateGrade(id: number, body: GradeInput) { return this.http.put<Grade>(`${API}/grades/${id}`, body); }
  deleteGrade(id: number) { return this.http.delete<void>(`${API}/grades/${id}`); }

  // --------------------------------------------------------- attendance
  rollCall(courseId: number, date: string) {
    return this.http.get<RollCallSheet>(`${API}/attendance/course/${courseId}`, { params: params({ date }) });
  }
  saveRollCall(courseId: number, date: string,
               entries: { studentId: number; status: AttendanceStatus; note: string | null }[]) {
    return this.http.post<RollCallSheet>(`${API}/attendance/roll-call`, { courseId, date, entries });
  }
  studentAttendance(studentId: number) { return this.http.get<AttendanceRecord[]>(`${API}/attendance/student/${studentId}`); }
  studentAttendanceSummary(studentId: number) {
    return this.http.get<AttendanceSummary>(`${API}/attendance/student/${studentId}/summary`);
  }
  myAttendance() { return this.http.get<AttendanceRecord[]>(`${API}/attendance/mine`); }
  myAttendanceSummary() { return this.http.get<AttendanceSummary>(`${API}/attendance/mine/summary`); }

  // ------------------------------------------------------ announcements
  announcements(limit = 30) { return this.http.get<Announcement[]>(`${API}/announcements`, { params: params({ limit }) }); }
  publishAnnouncement(body: { title: string; content: string; audience: Audience; classId: number | null; pinned: boolean }) {
    return this.http.post<Announcement>(`${API}/announcements`, body);
  }
  deleteAnnouncement(id: number) { return this.http.delete<void>(`${API}/announcements/${id}`); }

  // ------------------------------------------------------ notifications
  notifications(page = 0, size = 20) {
    return this.http.get<Page<AppNotification>>(`${API}/notifications`, { params: params({ page, size }) });
  }
  unreadCount(): Observable<{ count: number }> { return this.http.get<{ count: number }>(`${API}/notifications/unread-count`); }
  markRead(id: number) { return this.http.post<void>(`${API}/notifications/${id}/read`, {}); }
  markAllRead() { return this.http.post<{ updated: number }>(`${API}/notifications/read-all`, {}); }

  // ----------------------------------------------------------- accounts
  users(q: string, role: Role | null, page: number, size = 20) {
    return this.http.get<Page<UserAccount>>(`${API}/users`, { params: params({ q, role, page, size }) });
  }
  createAdmin(body: { email: string; firstName: string; lastName: string }) {
    return this.http.post<UserAccount>(`${API}/users/admins`, body);
  }
  setUserEnabled(id: number, enabled: boolean) { return this.http.patch<UserAccount>(`${API}/users/${id}/status`, { enabled }); }
  resetUserPassword(id: number) { return this.http.post<UserAccount>(`${API}/users/${id}/reset-password`, {}); }
}
