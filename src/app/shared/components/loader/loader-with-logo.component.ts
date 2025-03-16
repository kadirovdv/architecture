import { Component } from '@angular/core';
import { LoadingService } from '../../services/loading.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader-with-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-overlay" *ngIf="loading$ | async">
      <div class="loader">
        <div class="spinner"></div>
        <img src="assets/images/logo.png" alt="Logo" class="logo" *ngIf="hasLogo">
      </div>
    </div>
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
    }

    .loader {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .logo {
      width: 100px;
      height: auto;
      opacity: 0.8;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoaderWithLogoComponent {
  loading$ = this.loadingService.loading$;
  hasLogo = false;

  constructor(private loadingService: LoadingService) {
    // Check if logo exists
    const img = new Image();
    img.src = 'assets/images/logo.png';
    img.onload = () => this.hasLogo = true;
  }
}
