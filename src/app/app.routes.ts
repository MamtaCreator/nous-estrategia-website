import { Routes } from '@angular/router';
import { PILLARS } from './core/pillars';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

const pillarSlugs = PILLARS.map((p) => p.slug);

export const routes: Routes = [
  { path: '', title: 'NOUS Estrategia', loadComponent: () => import('./pages/home/home').then((m) => m.Home) },
  { path: 'login', title: 'Sign in — NOUS Estrategia', loadComponent: () => import('./modules/auth/login').then((m) => m.Login) },
  {
    path: 'register',
    title: 'Create account — NOUS Estrategia',
    loadComponent: () => import('./modules/auth/register').then((m) => m.Register),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./shared/crm-shell').then((m) => m.CrmShell),
    children: [
      { path: 'unauthorized', loadComponent: () => import('./modules/auth/unauthorized').then((m) => m.Unauthorized) },
      { path: '', loadComponent: () => import('./modules/dashboard/dashboard').then((m) => m.Dashboard) },
      {
        path: 'clients',
        loadComponent: () => import('./modules/clients/components/client-list/client-list').then((m) => m.ClientList),
      },
      {
        path: 'clients/new',
        canActivate: [roleGuard], data: { roles: ['SuperAdmin', 'Admin', 'Consultant', 'Analyst'] },
        loadComponent: () => import('./modules/clients/components/client-form/client-form').then((m) => m.ClientForm),
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./modules/clients/components/client-detail/client-detail').then((m) => m.ClientDetail),
      },
      {
        path: 'clients/:id/edit',
        canActivate: [roleGuard], data: { roles: ['SuperAdmin', 'Admin', 'Consultant', 'Analyst'] },
        loadComponent: () => import('./modules/clients/components/client-form/client-form').then((m) => m.ClientForm),
      },
      {
        path: 'clients/:clientId/projects',
        loadComponent: () => import('./modules/projects/components/project-list/project-list').then((m) => m.ProjectList),
      },
      {
        path: 'clients/:clientId/projects/new',
        canActivate: [roleGuard], data: { roles: ['SuperAdmin', 'Admin', 'Consultant', 'Analyst'] },
        loadComponent: () => import('./modules/projects/components/project-form/project-form').then((m) => m.ProjectForm),
      },
      {
        path: 'clients/:clientId/projects/:id',
        loadComponent: () => import('./modules/projects/components/project-detail/project-detail').then((m) => m.ProjectDetail),
      },
      {
        path: 'clients/:clientId/projects/:id/edit',
        canActivate: [roleGuard], data: { roles: ['SuperAdmin', 'Admin', 'Consultant', 'Analyst'] },
        loadComponent: () => import('./modules/projects/components/project-form/project-form').then((m) => m.ProjectForm),
      },
      {
        path: 'clients/:clientId/finance',
        loadComponent: () => import('./modules/pillars/finance/components/finance-view/finance-view').then((m) => m.FinanceView),
      },
      {
        path: 'clients/:clientId/marketing',
        loadComponent: () =>
          import('./modules/pillars/marketing/components/campaign-list/campaign-list').then((m) => m.CampaignList),
      },
      {
        path: 'clients/:clientId/marketing/:id',
        loadComponent: () =>
          import('./modules/pillars/marketing/components/campaign-detail/campaign-detail').then((m) => m.CampaignDetail),
      },
      {
        path: 'clients/:clientId/processes',
        loadComponent: () =>
          import('./modules/pillars/processes/components/process-list/process-list').then((m) => m.ProcessList),
      },
      {
        path: 'clients/:clientId/processes/:id',
        loadComponent: () =>
          import('./modules/pillars/processes/components/process-detail/process-detail').then((m) => m.ProcessDetail),
      },
      {
        path: 'clients/:clientId/automations',
        loadComponent: () =>
          import('./modules/pillars/ai/components/automation-list/automation-list').then((m) => m.AutomationList),
      },
      {
        path: 'clients/:clientId/automations/:id',
        loadComponent: () =>
          import('./modules/pillars/ai/components/automation-detail/automation-detail').then((m) => m.AutomationDetail),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./modules/phase4/pages/notifications-page').then((m) => m.NotificationsPage),
      },
      {
        path: 'search',
        loadComponent: () => import('./modules/phase4/pages/search-page').then((m) => m.SearchPage),
      },
      {
        path: 'clients/:clientId/alerts',
        loadComponent: () => import('./modules/phase4/pages/alerts-page').then((m) => m.AlertsPage),
      },
      {
        path: 'clients/:clientId/insights',
        loadComponent: () => import('./modules/phase4/pages/insights-page').then((m) => m.InsightsPage),
      },
      {
        path: 'clients/:clientId/reports',
        loadComponent: () => import('./modules/phase4/pages/reports-page').then((m) => m.ReportsPage),
      },
      {
        path: 'clients/:clientId/audit',
        loadComponent: () => import('./modules/phase4/pages/audit-page').then((m) => m.AuditPage),
      },
      {
        path: 'assessments',
        loadComponent: () => import('./modules/assessments/pages/assessment-hub').then((x) => x.AssessmentHub),
      },
      {
        path: 'clients/:clientId/assessments',
        loadComponent: () => import('./modules/assessments/pages/assessment-list').then((m) => m.AssessmentList),
      },
      {
        path: 'clients/:clientId/assessments/:id/report',
        loadComponent: () => import('./modules/assessments/pages/assessment-report').then((m) => m.AssessmentReportPage),
      },
      {
        path: 'clients/:clientId/assessments/:id',
        loadComponent: () => import('./modules/assessments/pages/assessment-run').then((m) => m.AssessmentRun),
      },
      {
        path: 'clients/:clientId/kpis',
        loadComponent: () => import('./modules/kpis/components/kpi-list/kpi-list').then((m) => m.KpiList),
      },
      {
        path: 'clients/:clientId/kpis/:id',
        loadComponent: () => import('./modules/kpis/components/kpi-detail/kpi-detail').then((m) => m.KpiDetail),
      },
      {
        path: 'clients/:clientId/dashboards',
        loadComponent: () => import('./modules/dashboards/components/dashboard-list/dashboard-list').then((m) => m.DashboardList),
      },
      {
        path: 'clients/:clientId/dashboards/:id',
        loadComponent: () => import('./modules/dashboards/components/dashboard-view/dashboard-view').then((m) => m.DashboardView),
      },
    ],
  },
  {
    // /finance, /marketing, /process, /ai — one template, slug bound to the component input
    matcher: (segments) =>
      segments.length === 1 && pillarSlugs.includes(segments[0].path)
        ? { consumed: segments, posParams: { slug: segments[0] } }
        : null,
    title: (route) => `NOUS Estrategia — ${route.params['slug']}`,
    loadComponent: () => import('./pages/pillar/pillar').then((m) => m.Pillar),
  },
  { path: '**', redirectTo: '' },
];
