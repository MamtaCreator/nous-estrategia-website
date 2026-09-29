import { Component, computed, input, signal } from '@angular/core';
import { ProcessFlow } from '../../../../../core/models/process.model';

@Component({
  selector: 'app-process-visualization',
  template: `<section aria-label="Process flow"><h2>Workflow</h2>
    <p>Select a step to inspect its owner, duration and cost. Bottlenecks are marked explicitly.</p>
    <ol>@for (step of steps(); track step.id; let last = $last) {
      <li><button type="button" [class.bottleneck]="step.isBottleneck" [attr.aria-pressed]="selected() === step.id" (click)="selected.set(step.id)">
        <span>Step {{ step.sequence }}</span><strong>{{ step.name }}</strong><span>{{ step.durationMinutes }} min</span>
        @if (step.isBottleneck) { <b>Bottleneck</b> }
      </button>@if (!last) { <span class="arrow" aria-hidden="true">→</span> }</li>
    }</ol>
    @if (active(); as step) { <div class="detail" aria-live="polite"><h3>{{ step.name }}</h3><p>{{ step.description || 'No description recorded.' }}</p><p>Owner: {{ step.owner || 'Unassigned' }} · Duration: {{ step.durationMinutes }} min · Cost per execution: {{ step.costPerExecution }}</p></div> }
  </section>`,
  styles: `section{background:white;padding:20px;border:1px solid #e2e8f0;border-radius:12px;margin:20px 0}h2{font-size:18px}p{font-size:13px;color:#475467}ol{list-style:none;display:flex;overflow-x:auto;padding:8px 0;gap:8px}li{display:flex;align-items:center}button{width:170px;min-height:120px;border:2px solid #c4d5eb;background:#f1f6fd;border-radius:10px;padding:14px;text-align:left;cursor:pointer}button span,button strong,button b{display:block;margin:5px 0;overflow-wrap:anywhere}button span{font-size:12px}button.bottleneck{border-color:#c46b19;background:#fff5e8}button[aria-pressed=true]{outline:3px solid #2b5fb0;outline-offset:2px}.arrow{font-size:25px;padding:8px}.detail{border-top:1px solid #e2e8f0;margin-top:12px}`,
})
export class ProcessVisualization {
  readonly process = input.required<ProcessFlow>();
  protected readonly selected = signal<string | null>(null);
  protected readonly steps = computed(() => [...this.process().steps].sort((a,b) => a.sequence - b.sequence));
  protected readonly active = computed(() => this.steps().find(step => step.id === this.selected()));
}
