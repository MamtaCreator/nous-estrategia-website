import { Component, computed, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

export interface ChartSeries { name: string; values: number[]; }
@Component({
  selector: 'app-pillar-chart',
  imports: [DecimalPipe],
  template: `
    <section class="chart" [attr.aria-label]="title()">
      <h3>{{ title() }}</h3>
      <div class="legend" aria-label="Visible series">
        @for (item of series(); track item.name; let i = $index) {
          <button type="button" [attr.aria-pressed]="!hidden().includes(item.name)" (click)="toggle(item.name)">
            <span [style.background]="colors[i % colors.length]"></span>{{ item.name }}
          </button>
        }
      </div>
      @if (!labels().length) { <p>No data in this selection.</p> }
      @for (label of labels(); track $index; let row = $index) {
        <div class="group"><strong>{{ label }}</strong>
          @for (item of series(); track item.name; let i = $index) {
            @if (!hidden().includes(item.name)) {
              <div class="bar-row" [attr.aria-label]="label + ', ' + item.name + ': ' + item.values[row] + ' ' + unit()">
                <span class="name">{{ item.name }}</span>
                <div class="track"><div class="bar" [class.negative]="item.values[row] < 0"
                  [style.width.%]="width(item.values[row])" [style.background]="colors[i % colors.length]"></div></div>
                <span class="value">{{ item.values[row] | number:'1.0-2' }}{{ unit() }}</span>
              </div>
            }
          }
        </div>
      }
      <p class="note">Bars compare magnitudes; signed values are shown alongside. Toggle a series to compare.</p>
    </section>`,
  styles: `
    :host { display: block; margin: 20px 0; }
    .chart { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
    h3 { margin: 0 0 16px; } .legend { display: flex; gap: 8px; flex-wrap: wrap; }
    button { display:flex; gap:8px; align-items:center; border:1px solid #ccd5e3; border-radius:20px; background:white; padding:7px 12px; cursor:pointer; }
    button[aria-pressed=false] { opacity:.45; } .legend span { width:10px; height:10px; border-radius:50%; }
    .group { margin-top:16px; } strong { font-size:13px; overflow-wrap:anywhere; }
    .bar-row { display:grid; grid-template-columns:110px 1fr 110px; gap:12px; align-items:center; margin-top:7px; font-size:12px; }
    .track { height:12px; background:#edf1f7; border-radius:4px; overflow:hidden; }
    .bar { height:100%; border-radius:4px; min-width:0; } .negative { background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,#ffffff88 4px,#ffffff88 8px)!important; }
    .value { text-align:right; } .note { font-size:11px; color:#667085; margin:16px 0 0; }
    @media(max-width:600px) { .bar-row { grid-template-columns:70px 1fr 80px; gap:5px; } .chart { padding:12px; } }
  `,
})
export class PillarChart {
  readonly title = input.required<string>();
  readonly labels = input<string[]>([]);
  readonly series = input<ChartSeries[]>([]);
  readonly unit = input('');
  protected readonly colors = ['#2b5fb0', '#0e8578', '#ad4b79'];
  protected readonly hidden = signal<string[]>([]);
  private readonly max = computed(() => Math.max(1, ...this.series().filter(s => !this.hidden().includes(s.name)).flatMap(s => s.values.map(Math.abs))));
  protected width(value: number): number { return Number.isFinite(value) ? Math.abs(value) / this.max() * 100 : 0; }
  protected toggle(name: string): void { this.hidden.update(values => values.includes(name) ? values.filter(v => v !== name) : [...values, name]); }
}
