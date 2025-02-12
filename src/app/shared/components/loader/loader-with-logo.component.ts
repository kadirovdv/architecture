import { Component } from '@angular/core';
import { i18nService } from '../../services/i18n.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-loader-with-logo',
  template: `<div class="loader-content" *ngIf="loading">
    <div class="loader-box">
      <img src="/assets/img/logo.png" alt="" />
      <h4 [class.logo-text-uz]="langDisplay === 'uz'"></h4>
      <h4 [class.logo-text-ru]="langDisplay === 'ru'"></h4>
      <h4 [class.logo-text-en]="langDisplay === 'en'"></h4>
    </div>
  </div> `,
  styles: [
    `
      .loader-content {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99;
        background: rgba(120, 120, 120, 0.8);
        backdrop-filter: blur(7px);
        z-index: 9999;
      }

      .loader-content .loader-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }

      .logo-text-uz,
      .logo-text-ru,
      .logo-text-en {
        display: inline-block;
        font-size: 2.4rem;
        font-weight: bold;
        font-family: 'Inter';
        font-style: normal;
        overflow: hidden;
        color: #fff;
      }

      .logo-text-uz::after {
        content: '';
        display: inline-block;
        animation: abomination1 2.235s linear infinite;
        animation-fill-mode: forwards;
      }

      .logo-text-ru::after {
        content: '';
        display: inline-block;
        animation: abomination2 2.235s linear infinite;
        animation-fill-mode: forwards;
      }

      .logo-text-en::after {
        content: '';
        display: inline-block;
        animation: abomination3 2.235s linear infinite;
        animation-fill-mode: forwards;
      }

      // MUHANDISLIK GRAFIKASI
      @keyframes abomination1 {
        0% {
          content: 'M';
        }
        5.26% {
          content: 'MU';
        }
        10.53% {
          content: 'MUH';
        }
        15.79% {
          content: 'MUHA';
        }
        21.05% {
          content: 'MUHAND';
        }
        26.32% {
          content: 'MUHANDI';
        }
        31.58% {
          content: 'MUHANDIS';
        }
        36.84% {
          content: 'MUHANDISL';
        }
        42.11% {
          content: 'MUHANDISLI';
        }
        47.37% {
          content: 'MUHANDISLIK';
        }
        52.63% {
          content: 'MUHANDISLIK G';
        }
        57.89% {
          content: 'MUHANDISLIK GR';
        }
        63.16% {
          content: 'MUHANDISLIK GRA';
        }
        68.42% {
          content: 'MUHANDISLIK GRAF';
        }
        73.68% {
          content: 'MUHANDISLIK GRAFI';
        }
        78.95% {
          content: 'MUHANDISLIK GRAFIK';
        }
        84.21% {
          content: 'MUHANDISLIK GRAFIKA';
        }
        89.47% {
          content: 'MUHANDISLIK GRAFIKAS';
        }
        94.74% {
          content: 'MUHANDISLIK GRAFIKASI';
        }
      }

      @keyframes abomination2 {
        0% {
          content: 'И';
        }
        5.26% {
          content: 'ИН';
        }
        10.53% {
          content: 'ИНЖ';
        }
        15.79% {
          content: 'ИНЖЕ';
        }
        21.05% {
          content: 'ИНЖЕН';
        }
        26.32% {
          content: 'ИНЖЕНЕ';
        }
        31.58% {
          content: 'ИНЖЕНЕР';
        }
        36.84% {
          content: 'ИНЖЕНЕРН';
        }
        42.11% {
          content: 'ИНЖЕНЕРНА';
        }
        47.37% {
          content: 'ИНЖЕНЕРНАЯ';
        }
        52.63% {
          content: 'ИНЖЕНЕРНАЯ Г';
        }
        57.89% {
          content: 'ИНЖЕНЕРНАЯ ГР';
        }
        63.16% {
          content: 'ИНЖЕНЕРНАЯ ГРА';
        }
        68.42% {
          content: 'ИНЖЕНЕРНАЯ ГРАФ';
        }
        73.68% {
          content: 'ИНЖЕНЕРНАЯ ГРАФИ';
        }
        78.95% {
          content: 'ИНЖЕНЕРНАЯ ГРАФИК';
        }
        84.21% {
          content: 'ИНЖЕНЕРНАЯ ГРАФИКА';
        }
      }

      @keyframes abomination3 {
        0% {
          content: 'E';
        }
        5% {
          content: 'EN';
        }
        10% {
          content: 'ENG';
        }
        15% {
          content: 'ENGI';
        }
        20% {
          content: 'ENGIN';
        }
        25% {
          content: 'ENGINE';
        }
        30% {
          content: 'ENGINEE';
        }
        35% {
          content: 'ENGINEER';
        }
        40% {
          content: 'ENGINEERIN';
        }
        45% {
          content: 'ENGINEERING';
        }
        50% {
          content: 'ENGINEERING ';
        }
        55% {
          content: 'ENGINEERING G';
        }
        60% {
          content: 'ENGINEERING GR';
        }
        65% {
          content: 'ENGINEERING GRA';
        }
        70% {
          content: 'ENGINEERING GRAP';
        }
        75% {
          content: 'ENGINEERING GRAPH';
        }
        80% {
          content: 'ENGINEERING GRAPHI';
        }
        85% {
          content: 'ENGINEERING GRAPHIC';
        }
        90% {
          content: 'ENGINEERING GRAPHICS';
        }
      }

      @media screen and (max-width: 500px) {
        .loader-content {
          img {
            width: 100% !important;
          }
        }
      }

      @media screen and (max-width: 500px) {
        .loader-content {
          .logo-text-uz,
          .logo-text-ru,
          .logo-text-en {
            display: inline-block;
            font-size: 1.4rem;
            font-weight: bold;
            font-family: 'Inter';
            font-style: normal;
            overflow: hidden;
            color: #fff;
          }
        }
      }
    `,
  ],
})
export class LoaderWithLogoComponent {
  langDisplay = '';
  loading = false;
  constructor(
    private i18n: i18nService,
    private loaderService: LoaderService
  ) {}
  ngOnInit(): void {
    this.i18n.currentData.subscribe((res) => {
      this.langDisplay = res;
    });

    this.loaderService.loader.subscribe((res) => {
      this.loading = res;
    });
  }
}
