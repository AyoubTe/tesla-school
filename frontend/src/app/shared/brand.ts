import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The school mark: a Tesla coil drawn like a patent figure, with one amber spark. */
@Component({
  selector: 'app-logo',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 48 48" role="img" aria-label="Tesla School">
      <ellipse cx="24" cy="12" rx="12.5" ry="4.8" fill="none" stroke="var(--logo-arc, #2fc4de)" stroke-width="2.6"/>
      <path d="M19 17v20M29 17v20" stroke="var(--logo-ink, currentColor)" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M19 22h10M19 26.5h10M19 31h10" stroke="var(--logo-ink, currentColor)" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>
      <path d="M15 41h18" stroke="var(--logo-ink, currentColor)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M37.5 3.5 34 8.5h4.2L34.4 14" fill="none" stroke="var(--spark)" stroke-width="2.2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
  styles: `:host { display: inline-flex; line-height: 0; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  readonly size = input(36);
}

/** Initials on a colour derived from the name, so people are recognisable at a glance. */
@Component({
  selector: 'app-avatar',
  template: `{{ initials() }}`,
  styles: `
    :host {
      display: inline-grid; place-items: center; flex: none; border-radius: 50%;
      font-weight: 700; font-stretch: 110%; letter-spacing: .02em;
      background: hsl(var(--h) 55% 50% / 16%); color: hsl(var(--h) 45% var(--avatar-l, 32%));
    }
  `,
  host: {
    '[style.--h]': 'hue()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'size() * 0.38',
    '[attr.title]': 'name()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
  readonly name = input.required<string>();
  readonly size = input(36);

  readonly initials = computed(() =>
    this.name().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join(''));

  readonly hue = computed(() => {
    let h = 0;
    for (const ch of this.name()) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return h;
  });
}
