import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/shared/services/firebase.auth.service';

@Component({
  selector: 'app-login-page',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  user: any = {};
  email: string = '';
  password: string = '';
  constructor(
    public authService: AuthService,
    private afAuth: AngularFireAuth,
    private router: Router,
    private toastr: ToastrService,
    private location: Location
  ) {
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && this.email.includes('@') && this.password) {
        this.login();
      }
    });
  }

  ngOnInit() {
    this.authService.signOut();
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        this.location.historyGo(-1);
      }
    });
  }

  login(): void {
    if (!this.email && !this.password) {
      this.toastr.warning('Email va parol kiritilmadi!');
      return;
    } else if (!this.email) {
      this.toastr.warning('Email kiritilmadi!');
      return;
    } else if (!this.password) {
      this.toastr.warning('Parol kiritilmadi!');
      return;
    } else if (!this.email.includes('@')) {
      this.toastr.warning('Email manzil xato kiritildi!');
      return;
    }

    this.afAuth
      .signInWithEmailAndPassword(this.email, this.password)
      .then(() => this.router.navigate(['/dashboard']))
      .catch((error) => this.toastr.error('Xato malumotlar kiritildi!'));
  }

  signInWithGoogle(): void {
    this.authService.signInWithGoogle();
  }
}
