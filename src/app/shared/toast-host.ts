import { Component, inject } from '@angular/core';
import { NotificationService } from '../core/services/notification.service';

@Component({
  selector: 'app-toast-host',
  imports: [],
  template: `
    <div class="toast-host" aria-live="polite" aria-atomic="false">
      @for (toast of notifications.toasts(); track toast.id) {
        <button type="button" class="toast" [class]="toast.kind" (click)="notifications.dismiss(toast.id)" aria-label="Dismiss notification">
          {{ toast.message }}
        </button>
      }
    </div>
  `,
  styles: `
    .toast-host {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 360px;
    }
    .toast {
      padding: 12px 16px;
      border-radius: 6px;
      color: #fff;
      font-size: 14px;
      line-height: 1.4;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      cursor: pointer;
    }
    .toast.success {
      background: #1e8e4a;
    }
    .toast.error {
      background: #c62828;
    }
    .toast.warning {
      background: #b8790b;
      color: #1a1a1a;
    }
    .toast.info {
      background: #2b5fb0;
    }
  `,
})
export class ToastHost {
  protected readonly notifications = inject(NotificationService);
}
