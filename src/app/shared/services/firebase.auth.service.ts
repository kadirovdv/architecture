// auth.service.ts
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import {
  catchError,
  from,
  Observable,
  switchMap,
  take,
  throwError,
} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private afAuth: AngularFireAuth) {}

  signInWithGoogle(): Observable<any> {
    const provider = new GoogleAuthProvider();
    return from(this.afAuth.signInWithPopup(provider));
  }

  signOut(): Promise<void> {
    return this.afAuth.signOut();
  }

  getCurrentUser(): Observable<firebase.User | null> {
    return this.afAuth.authState;
  }

  getToken(): Observable<string | null> {
    return this.afAuth.idToken;
  }

  createUser(email: string, password: string): Observable<any> {
    return from(this.afAuth.createUserWithEmailAndPassword(email, password));
  }

  deleteUser(): Observable<void> {
    return this.afAuth.user.pipe(
      take(1),
      switchMap((user) => {
        if (user) {
          return from(user.delete());
        } else {
          return throwError(() => new Error('No user is currently logged in.'));
        }
      }),
      catchError((error) => {
        console.error('Error deleting user:', error);
        return throwError(() => error);
      })
    );
  }
}
