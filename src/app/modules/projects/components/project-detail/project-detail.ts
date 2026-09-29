import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  DeliverableRequest,
  DeliverableStatus,
  PROJECT_STATUS_TRANSITIONS,
  ProjectStatus,
  isProjectReadOnly,
} from '../../../../core/models/project.model';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, ReactiveFormsModule, SlicePipe],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css',
})
export class ProjectDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  protected readonly projectService = inject(ProjectService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  private readonly projectId = this.route.snapshot.paramMap.get('id')!;
  protected readonly isLoading = signal(true);
  protected readonly isChangingStatus = signal(false);

  protected readonly deliverableStatuses: DeliverableStatus[] = ['Pending', 'InProgress', 'Done'];
  protected readonly editingDeliverableId = signal<string | null>(null);
  protected readonly isAddingDeliverable = signal(false);
  protected readonly isSavingDeliverable = signal(false);

  protected readonly canWrite = this.auth.canWrite;
  protected readonly canDelete = this.auth.isAdmin;
  protected readonly isReadOnly = () => {
    const project = this.projectService.selectedProject();
    return project ? isProjectReadOnly(project.status) : false;
  };

  protected readonly deliverableForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    dueDate: ['', Validators.required],
    status: this.fb.nonNullable.control<DeliverableStatus>('Pending'),
    assigneeId: [''],
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.projectService.getProject(this.projectId).subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }

  protected allowedTransitions(): ProjectStatus[] {
    const project = this.projectService.selectedProject();
    return project ? PROJECT_STATUS_TRANSITIONS[project.status] : [];
  }

  protected changeStatus(status: ProjectStatus): void {
    if (!confirm(`Move this project to ${status}?`)) return;
    this.isChangingStatus.set(true);
    this.projectService.updateStatus(this.projectId, { status }).subscribe({
      next: () => {
        this.notifications.success(`Project moved to ${status}.`);
        this.isChangingStatus.set(false);
      },
      error: () => this.isChangingStatus.set(false),
    });
  }

  protected deleteProject(): void {
    const project = this.projectService.selectedProject();
    if (!project || !confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.notifications.success('Project deleted.');
        this.router.navigate(['/app/clients', this.clientId, 'projects']);
      },
    });
  }

  protected startAddDeliverable(): void {
    this.deliverableForm.reset({ name: '', description: '', dueDate: '', status: 'Pending', assigneeId: '' });
    this.editingDeliverableId.set(null);
    this.isAddingDeliverable.set(true);
  }

  protected startEditDeliverable(deliverableId: string): void {
    const deliverable = this.projectService.selectedProject()?.deliverables.find((d) => d.id === deliverableId);
    if (!deliverable) return;
    this.deliverableForm.reset({
      name: deliverable.name,
      description: deliverable.description,
      dueDate: deliverable.dueDate.slice(0, 10),
      status: deliverable.status,
      assigneeId: deliverable.assigneeId ?? '',
    });
    this.editingDeliverableId.set(deliverableId);
    this.isAddingDeliverable.set(true);
  }

  protected cancelDeliverableForm(): void {
    this.isAddingDeliverable.set(false);
    this.editingDeliverableId.set(null);
  }

  protected saveDeliverable(): void {
    if (this.deliverableForm.invalid) {
      this.deliverableForm.markAllAsTouched();
      return;
    }

    const value = this.deliverableForm.getRawValue();
    const request: DeliverableRequest = {
      name: value.name,
      description: value.description,
      dueDate: value.dueDate,
      status: value.status,
      assigneeId: value.assigneeId.trim() || null,
    };

    this.isSavingDeliverable.set(true);
    const editingId = this.editingDeliverableId();
    const save$ = editingId
      ? this.projectService.updateDeliverable(this.projectId, editingId, request)
      : this.projectService.addDeliverable(this.projectId, request);

    save$.subscribe({
      next: () => {
        this.notifications.success(editingId ? 'Deliverable updated.' : 'Deliverable added.');
        this.isSavingDeliverable.set(false);
        this.cancelDeliverableForm();
      },
      error: () => this.isSavingDeliverable.set(false),
    });
  }

  protected deleteDeliverable(deliverableId: string, name: string): void {
    if (!confirm(`Delete deliverable "${name}"?`)) return;
    this.projectService.removeDeliverable(this.projectId, deliverableId).subscribe({
      next: () => this.notifications.success('Deliverable deleted.'),
    });
  }
}
