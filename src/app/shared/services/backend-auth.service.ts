import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { ApiClientService } from './api-client.service';
import type {
  BackendLoginResponseDto,
  BackendMeResponseDto,
  BackendAuthUserDto,
} from '../models/backend.dto';

@Injectable({
  providedIn: 'root',
})
export class BackendAuthService {
  private readonly currentUserSubject = new BehaviorSubject<BackendAuthUserDto | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(private api: ApiClientService) {}

  login(params: { email: string; password: string }): Observable<BackendAuthUserDto> {
    return this.api.post<BackendLoginResponseDto>('/api/auth/login', params).pipe(
      tap((res) => this.currentUserSubject.next(res.user)),
      map((res) => res.user),
    );
  }

  logout(): Observable<void> {
    // Backend returns 204 No Content
    return this.api.post<void>('/api/auth/logout', {}).pipe(
      tap(() => this.currentUserSubject.next(null)),
    );
  }

  me(): Observable<BackendAuthUserDto> {
    return this.api.get<BackendMeResponseDto>('/api/auth/me').pipe(
      tap((res) => this.currentUserSubject.next(res.user)),
      map((res) => res.user),
    );
  }

  clearLocalUser(): void {
    this.currentUserSubject.next(null);
  }
}


