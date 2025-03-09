import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoaderService {
  loader = new EventEmitter<boolean>();
  loaderDashboard = new EventEmitter<boolean>();
  constructor() {}

  showLoader() {
    this.loader.emit(true);
  }

  showLoaderDashboard() {
    this.loaderDashboard.emit(true);
  }

  hideLoader(random: boolean = false) {
    if (!random) {
      setTimeout(() => {
        this.loader.emit(false);
      }, Math.abs(10 - Math.random() * 10) * 1000);
    } else {
        this.loader.emit(false);
        this.loaderDashboard.emit(false);
    }
  }
}
