import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class i18nService {
  public dataSource = new BehaviorSubject<string>(
    localStorage.getItem('language') || 'uz'
  );

  currentData = this.dataSource.asObservable();

  setLang(newValue: string) {
    this.dataSource.next(newValue);
  }
  constructor() {}

  getLang(): string {
    return localStorage.getItem('language') || 'uz';
  }
}
