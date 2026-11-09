import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input } from '@angular/core';
import {
  AlarmClock, ArrowLeft, Bell, BellRing, BookOpen, CalendarDays, Check, CheckCheck, ChevronLeft, ChevronRight,
  CircleAlert, ClipboardCheck, Clock, Download, GraduationCap, House, IdCard, KeyRound, LayoutGrid, LogOut, Mail,
  Megaphone, Menu, Moon, Pencil, Phone, Pin, Plus, School, Search, Settings, ShieldCheck, Sparkles, Sun, Trash2,
  TrendingUp, UserCog, UserRound, Users, X, Zap, type IconNode,
} from 'lucide';

const ICONS: Record<string, IconNode> = {
  'alarm': AlarmClock, 'back': ArrowLeft, 'bell': Bell, 'bell-ring': BellRing, 'book': BookOpen,
  'calendar': CalendarDays, 'check': Check, 'check-all': CheckCheck, 'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight, 'alert': CircleAlert, 'clipboard': ClipboardCheck, 'clock': Clock,
  'download': Download, 'cap': GraduationCap, 'home': House, 'id': IdCard, 'key': KeyRound, 'grid': LayoutGrid,
  'logout': LogOut, 'mail': Mail, 'megaphone': Megaphone, 'menu': Menu, 'moon': Moon, 'pencil': Pencil,
  'phone': Phone, 'pin': Pin, 'plus': Plus, 'school': School, 'search': Search, 'settings': Settings,
  'shield': ShieldCheck, 'sparkles': Sparkles, 'sun': Sun, 'trash': Trash2, 'trend': TrendingUp,
  'user-cog': UserCog, 'user': UserRound, 'users': Users, 'x': X, 'zap': Zap,
};

export type IconName = keyof typeof ICONS;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Renders a Lucide icon as inline SVG (stroke = currentColor). */
@Component({
  selector: 'app-icon',
  template: '',
  styles: `:host { display: inline-flex; flex: none; line-height: 0; } :host ::ng-deep svg { display: block; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly stroke = input(2);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly node = computed(() => ICONS[this.name()] ?? ICONS['alert']);

  constructor() {
    effect(() => {
      const svg = document.createElementNS(SVG_NS, 'svg');
      const size = String(this.size());
      const attrs: Record<string, string> = {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
        'stroke-width': String(this.stroke()), 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      };
      Object.entries(attrs).forEach(([k, v]) => svg.setAttribute(k, v));
      for (const [tag, childAttrs] of this.node()) {
        const el = document.createElementNS(SVG_NS, tag);
        Object.entries(childAttrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
        svg.appendChild(el);
      }
      this.host.nativeElement.replaceChildren(svg);
    });
  }
}
