import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class SaveRouteService {
  constructor(private router: Router) {}

  getRoute(): string {
    const route = sessionStorage.getItem('route');
    return route || '/dashboard/manage/semester';
  }

  saveRoute(route: string) {
    sessionStorage.setItem('route', route.toString());
  }
}
