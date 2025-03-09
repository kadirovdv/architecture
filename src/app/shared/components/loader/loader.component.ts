import { Component } from '@angular/core';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader',
  template: `<div *ngIf="loader" class="spinner-border">
    <span class="visually-hidden">Loading...</span>
  </div>`,
})
export class LoaderComponent {
  loader: boolean = false;
  constructor(private loaderService: LoaderService) {
    this.loaderService.loaderDashboard.subscribe((value) => {
      this.loader = value;
    });
  }
}
