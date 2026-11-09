import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { OverlaysComponent } from './shared/overlays.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, OverlaysComponent],
  template: `<router-outlet /><app-overlays />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
