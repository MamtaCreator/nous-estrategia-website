import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { CreateProjectRequest, ProjectPillar, UpdateProjectRequest } from '../../../../core/models/project.model';
import { FormErrors } from '../../../../shared/form-errors';

function parseTeamIds(raw: string): string[] {
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, RouterLink, FormErrors],
  templateUrl: './project-form.html',
  styleUrl: './project-form.css',
})
export class ProjectForm {
  private readonly fb = inject(FormBuilder);
  private readonly projectService = inject(ProjectService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly projectId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = this.projectId !== null;
  protected readonly isLoading = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly loadFailed = signal(false);

  protected readonly pillars: ProjectPillar[] = ['Finance', 'Marketing', 'Processes', 'AI'];
  protected readonly hasDeliverables = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    description: ['', Validators.maxLength(4000)],
    pillar: this.fb.nonNullable.control<ProjectPillar>('Finance'),
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    budget: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(1_000_000_000_000)]),
    teamMemberIds: [''],
    progress: [0, [Validators.min(0), Validators.max(100)]],
  }, { validators: group => {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    return start && end && end < start ? { dateOrder: true } : null;
  } });

  constructor() {
    if (this.projectId) {
      this.isLoading.set(true);
      this.projectService.getProject(this.projectId).subscribe({
        next: (project) => {
          this.hasDeliverables.set(project.deliverables.length > 0);
          this.form.patchValue({
            name: project.name,
            description: project.description ?? '',
            pillar: project.pillar,
            startDate: project.startDate.slice(0, 10),
            endDate: project.endDate.slice(0, 10),
            budget: project.budget,
            teamMemberIds: project.teamMemberIds.join(', '),
            progress: project.progress,
          });
          this.isLoading.set(false);
        },
        error: () => { this.isLoading.set(false); this.loadFailed.set(true); },
      });
    }
  }

  protected onSubmit(): void {
    if (this.isSaving() || this.isLoading() || this.loadFailed()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const teamMemberIds = parseTeamIds(value.teamMemberIds);

    this.isSaving.set(true);

    if (this.isEdit) {
      const request: UpdateProjectRequest = {
        name: value.name,
        description: value.description || null,
        pillar: value.pillar,
        startDate: value.startDate,
        endDate: value.endDate,
        budget: value.budget,
        teamMemberIds,
        progress: value.progress,
      };
      this.projectService.updateProject(this.projectId!, request).subscribe({
        next: (project) => {
          this.notifications.success('Project updated.');
          this.router.navigate(['/app/clients', this.clientId, 'projects', project.id]);
        },
        error: () => this.isSaving.set(false),
      });
    } else {
      const request: CreateProjectRequest = {
        clientId: this.clientId,
        name: value.name,
        description: value.description || null,
        pillar: value.pillar,
        startDate: value.startDate,
        endDate: value.endDate,
        budget: value.budget,
        teamMemberIds,
        deliverables: [],
      };
      this.projectService.createProject(request).subscribe({
        next: (project) => {
          this.notifications.success('Project created.');
          this.router.navigate(['/app/clients', this.clientId, 'projects', project.id]);
        },
        error: () => this.isSaving.set(false),
      });
    }
  }
}
