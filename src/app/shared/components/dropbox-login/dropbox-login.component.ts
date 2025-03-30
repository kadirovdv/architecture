import { Component, OnInit } from '@angular/core';
import { DropboxAuthService } from '../../services/dropbox.auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dropbox-login',
  templateUrl: './dropbox-login.component.html',
  styleUrls: ['./dropbox-login.component.scss'],
  standalone: false
})
export class DropboxLoginComponent implements OnInit {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  showPassword: boolean = false;
  returnUrl: string = '/dashboard';
  isAuthenticating: boolean = false;

  constructor(
    private dropboxAuthService: DropboxAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingService: LoadingService,
    private toastr: ToastrService
  ) { }

  ngOnInit(): void {
    // Store the current route for redirect after auth
    const currentUrl = this.router.url;
    sessionStorage.setItem('route', currentUrl);
    
    // Get return URL from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // Check if we have a token in the URL (after redirect from Dropbox)
    const fragment = window.location.hash;
    if (fragment && fragment.includes('access_token=')) {
      this.loadingService.show();
      try {
        this.dropboxAuthService.setAccessTokenFromUrl(window.location.href);
        this.toastr.success('Successfully authenticated with Dropbox');
        // Navigate back to the return URL
        this.router.navigateByUrl(this.returnUrl);
      } catch (error) {
        this.toastr.error('Authentication failed');
        console.error('Auth error:', error);
      } finally {
        this.loadingService.hide();
      }
    }
  }

  onSubmit(): void {
    // This is a placeholder method as we're using OAuth for authentication
    this.toastr.info('Please use the "Continue with Dropbox" option to authenticate');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  authenticateWithOAuth(): void {
    if (this.isAuthenticating) return;
    
    this.isAuthenticating = true;
    this.loadingService.show();
    
    // Save the current route for redirecting back after authentication
    sessionStorage.setItem('route', this.router.url);
    
    this.dropboxAuthService.signInWithPopup()
      .then(token => {
        if (token) {
          this.toastr.success('Successfully authenticated with Dropbox');
          this.router.navigateByUrl(this.returnUrl);
        } else {
          this.toastr.error('Authentication failed');
        }
      })
      .catch(error => {
        console.error('Authentication error:', error);
        if (error !== 'Popup closed by user') {
          this.toastr.error('Authentication failed: ' + error);
        }
      })
      .finally(() => {
        this.isAuthenticating = false;
        this.loadingService.hide();
      });
  }
}
