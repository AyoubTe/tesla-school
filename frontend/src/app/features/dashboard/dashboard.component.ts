import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { Announcement, Dashboard, Slot, hhmm, isoDate, titleCase } from '../../core/models';
import { AnnouncementListComponent } from '../../shared/announcement-list.component';
import { DialComponent } from '../../shared/dial.component';
import { IconComponent } from '../../shared/icon.component';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe, IconComponent, DialComponent, AnnouncementListComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly data = signal<Dashboard | null>(null);
  readonly announcements = signal<Announcement[]>([]);
  readonly error = signal<string | null>(null);
  readonly today = new Date();
  readonly todayIso = isoDate();
  readonly hhmm = hhmm;
  readonly titleCase = titleCase;

  readonly gradedCourses = computed(() => this.data()?.student?.grades.courses.filter(c => c.count > 0).length ?? 0);
  readonly maxBucket = computed(() => Math.max(1, ...(this.data()?.admin?.gradeDistribution ?? [1])));

  constructor() {
    this.load();
  }

  load() {
    this.error.set(null);
    this.api.dashboard().subscribe({
      next: d => this.data.set(d),
      error: err => this.error.set(errorMessage(err, 'The dashboard could not be loaded.')),
    });
    this.api.announcements(4).subscribe({ next: a => this.announcements.set(a), error: () => {} });
  }

  isNow(s: Slot): boolean {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    return cur >= toMin(s.startTime) && cur < toMin(s.endTime);
  }

  isPast(s: Slot): boolean {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes() >= Number(s.endTime.slice(0, 2)) * 60 + Number(s.endTime.slice(3, 5));
  }

  pending(courseId: number): boolean {
    return this.data()?.teacher?.pendingRollCallCourseIds.includes(courseId) ?? false;
  }

  bucketLabel(i: number): string {
    return `${i * 10}–${i === 9 ? 100 : i * 10 + 9}%`;
  }
}
