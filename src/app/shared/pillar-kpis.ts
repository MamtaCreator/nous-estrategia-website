import { Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface PillarMetric { label: string; value: number | null; unit?: string; }
@Component({
  selector: 'app-pillar-kpis',
  imports: [DecimalPipe],
  template: `<div class="kpis">@for (metric of metrics(); track metric.label) {
    <div><span>{{ metric.label }}</span><strong>{{ metric.value === null ? '—' : (metric.value | number:'1.0-2') }}{{ metric.value === null ? '' : metric.unit }}</strong></div>
  }</div>`,
  styles: `.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0}.kpis div{padding:20px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;border-top:3px solid #2b5fb0}.kpis span{display:block;color:#667085;font-size:12px}.kpis strong{display:block;margin-top:8px;font-size:25px;font-variant-numeric:tabular-nums}`,
})
export class PillarKpis { readonly metrics = input<PillarMetric[]>([]); }
