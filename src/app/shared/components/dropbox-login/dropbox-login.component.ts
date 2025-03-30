import { Component, OnInit } from '@angular/core';
import { DropboxAuthService } from '../../services/dropbox.auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from '../../services/loading.service';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';

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
  tokenProcessed: boolean = false; // Track if we've already processed a token

  constructor(
    private dropboxAuthService: DropboxAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingService: LoadingService,
    private toastr: ToastrService,
    private translate: TranslateService
  ) { }

  ngOnInit(): void {
    // Get return URL from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    console.log('Return URL:', this.returnUrl);
    
    // Store the return URL for redirect after auth
    sessionStorage.setItem('route', this.returnUrl);
    
    // First check for URL fragment tokens (higher priority)
    const fragment = window.location.hash;
    if (fragment && fragment.includes('access_token=') && !this.tokenProcessed) {
      this.tokenProcessed = true;
      this.loadingService.show();
      console.log('Found access token in URL fragment');
      
      try {
        this.dropboxAuthService.setAccessTokenFromUrl(window.location.href);
        
        this.translate.get('dropbox.auth-success').subscribe((res: string) => {
          this.toastr.success(res || 'Successfully authenticated with Dropbox');
        });
        
        // Clear the fragment from the URL without triggering a page reload
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.href.split('#')[0];
          window.history.replaceState({}, document.title, cleanUrl);
        }
        
        // Short timeout to ensure token is saved before redirecting
        setTimeout(() => {
          console.log('Redirecting to:', this.returnUrl);
          this.router.navigateByUrl(this.returnUrl);
          this.loadingService.hide();
        }, 300);
        
        return; // Exit early
      } catch (error) {
        console.error('Auth error:', error);
        this.translate.get('dropbox.auth-failed').subscribe((res: string) => {
          this.toastr.error(res || 'Authentication failed');
        });
        this.loadingService.hide();
      }
    }
    
    // Then check if already authenticated (lower priority)
    if (this.dropboxAuthService.isAuthenticated() && !this.tokenProcessed) {
      console.log('Already authenticated, redirecting to:', this.returnUrl);
      // Don't redirect to login page again if we're already on it
      if (this.returnUrl !== '/dropbox-login') {
        this.router.navigateByUrl(this.returnUrl);
      }
    }
  }

  onSubmit(): void {
    // This is a placeholder method as we're using OAuth for authentication
    this.translate.get('dropbox.use-oauth').subscribe((res: string) => {
      this.toastr.info(res || 'Please use the "Continue with Dropbox" option to authenticate');
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  authenticateWithOAuth(): void {
    if (this.isAuthenticating) return;
    
    this.isAuthenticating = true;
    this.loadingService.show();
    
    // Save the current route for redirecting back after authentication
    sessionStorage.setItem('route', this.returnUrl);
    console.log('Starting OAuth flow, return URL:', this.returnUrl);
    
    this.dropboxAuthService.signInWithPopup()
      .then(token => {
        if (token) {
          console.log('Authentication successful');
          this.translate.get('dropbox.auth-success').subscribe((res: string) => {
            this.toastr.success(res || 'Successfully authenticated with Dropbox');
          });
          
          // Short timeout to ensure token is saved before redirecting
          setTimeout(() => {
            this.router.navigateByUrl(this.returnUrl);
          }, 300);
        } else {
          console.error('No token received');
          this.translate.get('dropbox.auth-failed').subscribe((res: string) => {
            this.toastr.error(res || 'Authentication failed');
          });
        }
      })
      .catch(error => {
        console.error('Authentication error:', error);
        if (error !== 'Popup closed by user') {
          this.translate.get('dropbox.auth-failed').subscribe((res: string) => {
            this.toastr.error(res + ': ' + error || 'Authentication failed: ' + error);
          });
        }
      })
      .finally(() => {
        this.isAuthenticating = false;
        this.loadingService.hide();
      });
  }
}
