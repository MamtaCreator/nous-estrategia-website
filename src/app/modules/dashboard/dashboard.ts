import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { KpiAnalytics } from '../../shared/kpi-analytics';

@Component({
  selector: 'app-dashboard',
  imports: [KpiAnalytics],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly auth = inject(AuthService);
}
