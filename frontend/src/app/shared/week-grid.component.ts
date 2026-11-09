import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DAYS, DayOfWeek, Slot, hhmm, titleCase, todayKey } from '../core/models';
import { IconComponent } from './icon.component';

const START = 8 * 60;      // 08:00
const END = 16 * 60;       // 16:00
const PX_PER_MIN = 1.15;

/** Weekly timetable: day columns, time rows, lessons positioned by their start and end time. */
@Component({
  selector: 'app-week-grid',
  imports: [IconComponent],
  template: `
    <div class="week" [style.--h.px]="height">
      <div class="times" aria-hidden="true">
        @for (h of hours; track h) { <span [style.top.px]="(h * 60 - start) * scale">{{ h }}:00</span> }
      </div>
      @for (d of days; track d) {
        <div class="day" [class.today]="d === today">
          <div class="day-head">{{ titleCase(d).slice(0, 3) }}<span>{{ titleCase(d).slice(3) }}</span></div>
          <div class="lane">
            @for (h of hours; track h) { <i class="hline" [style.top.px]="(h * 60 - start) * scale"></i> }
            @for (s of byDay().get(d) ?? []; track s.id) {
              <div class="lesson" [style.top.px]="top(s)" [style.height.px]="height_(s)"
                   [style.--c]="s.color" [title]="s.courseName + ', ' + hhmm(s.startTime) + '–' + hhmm(s.endTime)">
                <strong>{{ s.courseName }}</strong>
                <span>{{ hhmm(s.startTime) }}–{{ hhmm(s.endTime) }}</span>
                <span>{{ perspective() === 'class' ? (s.teacherName ?? 'No teacher') : s.className }}{{ s.room ? ', ' + s.room : '' }}</span>
                @if (removable()) {
                  <button type="button" class="rm" (click)="remove.emit(s)" aria-label="Remove lesson">
                    <app-icon name="x" [size]="13" />
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .week { display: grid; grid-template-columns: 52px repeat(5, minmax(120px, 1fr)); min-width: 720px; padding-bottom: 16px; }
    .times { position: relative; margin-top: 44px; height: var(--h); }
    .times span { position: absolute; right: 10px; transform: translateY(-50%); font-size: .74rem; color: var(--muted); }
    .day { border-left: 1px solid var(--line); }
    .day-head { height: 44px; display: flex; align-items: center; justify-content: center; font-weight: 700;
                font-size: .9rem; border-bottom: 1px solid var(--line); }
    .day-head span { font-weight: 400; color: var(--muted); }
    .today .day-head { color: var(--arc); box-shadow: inset 0 -2px 0 var(--arc); }
    .today .lane { background: color-mix(in srgb, var(--arc-soft) 45%, transparent); }
    .lane { position: relative; height: var(--h); }
    .hline { position: absolute; left: 0; right: 0; border-top: 1px dashed var(--line); }
    .lesson {
      position: absolute; left: 6px; right: 6px; padding: 7px 9px; border-radius: 9px; overflow: hidden;
      display: flex; flex-direction: column; gap: 1px; font-size: .76rem; line-height: 1.3;
      background: color-mix(in srgb, var(--c) 14%, var(--surface)); border-left: 3px solid var(--c);
      color: var(--text);
    }
    .lesson strong { font-size: .84rem; color: color-mix(in srgb, var(--c) 60%, var(--text)); }
    .lesson span { color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rm { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border: 0; border-radius: 6px;
          display: none; place-items: center; background: var(--surface); color: var(--danger); cursor: pointer; }
    .lesson:hover .rm, .rm:focus-visible { display: grid; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekGridComponent {
  readonly slots = input.required<Slot[]>();
  /** 'class' shows the teacher on each lesson; 'teacher' shows the class. */
  readonly perspective = input<'class' | 'teacher'>('class');
  readonly removable = input(false);
  readonly remove = output<Slot>();

  readonly days = DAYS;
  readonly today = todayKey();
  readonly start = START;
  readonly scale = PX_PER_MIN;
  readonly height = (END - START) * PX_PER_MIN;
  readonly hours = Array.from({ length: (END - START) / 60 + 1 }, (_, i) => 8 + i);
  readonly hhmm = hhmm;
  readonly titleCase = titleCase;

  readonly byDay = computed(() => {
    const map = new Map<DayOfWeek, Slot[]>();
    for (const s of this.slots()) map.set(s.day, [...(map.get(s.day) ?? []), s]);
    return map;
  });

  private mins(t: string) { return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)); }
  top(s: Slot) { return Math.max(0, this.mins(s.startTime) - START) * PX_PER_MIN; }
  height_(s: Slot) { return Math.max(28, (this.mins(s.endTime) - this.mins(s.startTime)) * PX_PER_MIN - 3); }
}
