import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, RenderMode, withRoutes } from '@angular/ssr';
import { App } from './app/app';
import { appConfig } from './app/app.config';

const config = mergeApplicationConfig(appConfig, {
  providers: [provideServerRendering(withRoutes([
    ...['', 'finance', 'marketing', 'process', 'ai'].map(path => ({ path, renderMode: RenderMode.Prerender as const })),
    { path: '**', renderMode: RenderMode.Client },
  ]))],
});

export default (context: BootstrapContext) => bootstrapApplication(App, config, context);
