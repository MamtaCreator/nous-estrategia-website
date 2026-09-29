import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
@Component({
  selector: 'app-pillar-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `<nav aria-label="Client service pillars">@for (item of items; track item.path) {
    <a [routerLink]="['/app/clients', clientId(), item.path]" routerLinkActive="active">{{ item.label }}</a>
  }</nav>`,
  styles: `nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}a{padding:9px 14px;border:1px solid #dae1ed;border-radius:8px;text-decoration:none;color:#344054;font-size:13px}.active{background:#2b5fb0;color:#fff}`,
})
export class PillarNav {
  readonly clientId = input.required<string>();
  protected readonly items = [{path:'finance',label:'Finance'},{path:'marketing',label:'Marketing'},{path:'processes',label:'Processes'},{path:'automations',label:'AI automation'}];
}
