import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProjectPillar, ProjectStatus } from '../../../../core/models/project.model';

@Component({
  selector: 'app-project-list',
  imports: [RouterLink, SlicePipe],
  templateUrl: './project-list.html',
  styleUrl: './project-list.css',
})
export class ProjectList {
  private readonly route = inject(ActivatedRoute);
  protected readonly projectService = inject(ProjectService);
  protected readonly auth = inject(AuthService);

  protected readonly clientId = this.route.snapshot.paramMap.get('clientId')!;
  protected readonly isLoading = signal(false);

  protected readonly statuses: ProjectStatus[] = ['Planning', 'InProgress', 'OnHold', 'Completed', 'Cancelled'];
  protected readonly pillars: ProjectPillar[] = ['Finance', 'Marketing', 'Processes', 'AI'];
  protected readonly statusFilter = signal<ProjectStatus | ''>('');
  protected readonly pillarFilter = signal<ProjectPillar | ''>('');

  protected readonly canWrite = this.auth.canWrite;

  constructor() {
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);
    this.projectService
      .loadByClient(this.clientId, {
        status: this.statusFilter() || undefined,
        pillar: this.pillarFilter() || undefined,
      })
      .subscribe({
        next: () => this.isLoading.set(false),
        error: () => this.isLoading.set(false),
      });
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value as ProjectStatus | '');
    this.load();
  }

  protected onPillarChange(value: string): void {
    this.pillarFilter.set(value as ProjectPillar | '');
    this.load();
  }
}
