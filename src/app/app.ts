import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IconSetService } from '@coreui/icons-angular';
import { Toast } from 'primeng/toast';

import { iconSubset } from './layout/icon-subset';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly iconSetService = inject(IconSetService);

  constructor() {
    this.iconSetService.icons = { ...iconSubset };
  }
}
