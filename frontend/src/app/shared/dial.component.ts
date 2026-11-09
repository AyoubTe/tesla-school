import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * An analog meter in the spirit of a lab galvanometer: a 180° scale with ticks and a needle.
 * value is 0–100 (null renders an empty meter).
 */
@Component({
  selector: 'app-dial',
  template: `
    <figure>
      <svg viewBox="0 0 200 118" role="img" [attr.aria-label]="label() + ': ' + display()">
        <path [attr.d]="track" class="track" />
        @if (value() !== null) {
          <path [attr.d]="track" [style.stroke-dasharray]="arcLength"
                [style.stroke-dashoffset]="arcLength * (1 - (value() ?? 0) / 100)" [class]="'fill ' + tone()" />
        }
        @for (t of ticks; track t.v) {
          <line [attr.x1]="t.x1" [attr.y1]="t.y1" [attr.x2]="t.x2" [attr.y2]="t.y2" [class.major]="t.major" class="tick" />
        }
        <g class="needle" [style.transform]="'rotate(' + angle() + 'deg)'">
          <line x1="100" y1="100" x2="100" y2="34" />
        </g>
        <circle cx="100" cy="100" r="6" class="hub" />
      </svg>
      <figcaption>
        <strong class="display">{{ display() }}</strong>
        <span>{{ label() }}</span>
      </figcaption>
    </figure>
  `,
  styles: `
    figure { margin: 0; display: flex; flex-direction: column; align-items: center; }
    svg { width: 100%; max-width: 220px; overflow: visible; }
    .track { fill: none; stroke: var(--surface-3); stroke-width: 10; stroke-linecap: round; }
    .fill { fill: none; stroke-width: 10; stroke-linecap: round; transition: stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1); }
    .fill.good { stroke: var(--ok); } .fill.mid { stroke: var(--arc); } .fill.low { stroke: var(--spark); }
    .tick { stroke: var(--line-strong); stroke-width: 1; } .tick.major { stroke: var(--muted); stroke-width: 1.5; }
    .needle { transform-origin: 100px 100px; transition: transform 1s cubic-bezier(.3,1.4,.4,1); }
    .needle line { stroke: var(--text); stroke-width: 2.4; stroke-linecap: round; }
    .hub { fill: var(--surface); stroke: var(--text); stroke-width: 2.4; }
    figcaption { display: flex; flex-direction: column; align-items: center; margin-top: -2px; }
    strong { font-size: 1.7rem; line-height: 1.1; }
    span { font-size: .84rem; color: var(--muted); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialComponent {
  readonly value = input<number | null>(null);
  readonly label = input('');
  readonly suffix = input('%');

  /** Semicircle radius 78 centred at (100,100). */
  readonly track = 'M 22 100 A 78 78 0 0 1 178 100';
  readonly arcLength = Math.PI * 78;

  readonly ticks = Array.from({ length: 11 }, (_, i) => {
    const a = Math.PI - (i / 10) * Math.PI;
    const r1 = 62, r2 = i % 5 === 0 ? 52 : 56;
    return {
      v: i, major: i % 5 === 0,
      x1: 100 + r1 * Math.cos(a), y1: 100 - r1 * Math.sin(a),
      x2: 100 + r2 * Math.cos(a), y2: 100 - r2 * Math.sin(a),
    };
  });

  readonly angle = computed(() => ((this.value() ?? 0) / 100) * 180 - 90);
  readonly display = computed(() => this.value() === null ? '–' : `${this.value()}${this.suffix()}`);
  readonly tone = computed(() => {
    const v = this.value() ?? 0;
    return v >= 75 ? 'good' : v >= 55 ? 'mid' : 'low';
  });
}
