import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  imports: [RouterLink],
  template: `<h1>Access restricted</h1>
    <p>Your account does not have permission to open this page.</p>
    <a routerLink="/app">Back to dashboard</a>`,
})
export class Unauthorized {}
