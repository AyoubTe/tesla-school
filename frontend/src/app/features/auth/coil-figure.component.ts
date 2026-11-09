import { ChangeDetectionStrategy, Component } from '@angular/core';

/** "Fig. 1": a resonant transformer drawn in the style of an 1890s patent plate. Arcs strike once on load. */
@Component({
  selector: 'app-coil-figure',
  template: `
    <svg viewBox="0 0 420 520" role="img" aria-label="Line drawing of a Tesla coil">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" class="thin" />
        </pattern>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <!-- base -->
      <rect x="120" y="440" width="180" height="34" rx="3" class="line" fill="url(#hatch)" />
      <line x1="96" y1="474" x2="324" y2="474" class="line" />

      <!-- primary coil (flat spiral seen in perspective) -->
      <ellipse cx="210" cy="420" rx="104" ry="17" class="line" />
      <ellipse cx="210" cy="420" rx="88" ry="13" class="thin" />
      <ellipse cx="210" cy="420" rx="72" ry="10" class="thin" />

      <!-- secondary coil -->
      <rect x="180" y="160" width="60" height="262" class="line" />
      @for (y of windings; track y) {
        <line x1="180" [attr.y1]="y" x2="240" [attr.y2]="y + 2" class="thin" />
      }

      <!-- toroid -->
      <ellipse cx="210" cy="128" rx="116" ry="36" class="line" />
      <ellipse cx="210" cy="124" rx="74" ry="18" class="thin" />
      <path d="M94 128 Q210 196 326 128" class="thin" />

      <!-- arcs -->
      <g class="arcs" filter="url(#glow)">
        <path class="arc a1" d="M98 116 L70 92 L78 80 L44 58 L52 44 L18 30" />
        <path class="arc a2" d="M320 112 L348 86 L340 70 L378 52 L370 36 L404 14" />
        <path class="arc a3" d="M226 94 L236 64 L224 52 L240 22 L232 6" />
        <path class="arc a4" d="M120 142 L88 170 L96 186 L60 214" />
      </g>

      <!-- callouts -->
      <g class="callout">
        <line x1="300" y1="146" x2="360" y2="196" class="thin" /><text x="366" y="206">A</text>
        <line x1="240" y1="300" x2="330" y2="300" class="thin" /><text x="338" y="305">B</text>
        <line x1="120" y1="424" x2="66" y2="388" class="thin" /><text x="48" y="386">C</text>
      </g>
      <text x="210" y="508" text-anchor="middle" class="fig">Fig. 1.</text>
    </svg>
  `,
  styles: `
    :host { display: block; }
    svg { width: 100%; height: auto; overflow: visible; }
    .line { fill-opacity: 1; fill: none; stroke: #c9d8e8; stroke-width: 1.6; }
    rect.line { fill: url(#hatch); }
    .thin { fill: none; stroke: #8aa3bd; stroke-width: 1; }
    .callout text, .fig { fill: #c9d8e8; font-family: var(--font); font-size: 15px; font-style: italic; }
    .arc {
      fill: none; stroke: #8fe9fb; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round;
      stroke-dasharray: 160; stroke-dashoffset: 160; animation: strike .5s ease-out forwards, settle 1.6s ease-out .5s forwards;
    }
    .a2 { animation-delay: .25s, .75s; }
    .a3 { animation-delay: .45s, .95s; }
    .a4 { animation-delay: .65s, 1.15s; }
    @keyframes strike { to { stroke-dashoffset: 0; } }
    @keyframes settle { from { opacity: 1; } to { opacity: .55; } }
    @media (prefers-reduced-motion: reduce) { .arc { stroke-dashoffset: 0; opacity: .55; animation: none; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoilFigureComponent {
  readonly windings = Array.from({ length: 42 }, (_, i) => 166 + i * 6);
}
