import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { DropboxAuthService } from 'src/app/shared/services/dropbox.auth.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';

@Component({
  selector: 'app-dropbox-login',
  templateUrl: './dropbox-login.component.html',
  styleUrls: ['./dropbox-login.component.scss']
})
export class DropboxLoginComponent implements OnInit {
  isAuthorizing = false;
  isLoggedIn = false;
  returnUrl: string = '/dashboard';
  userAccountInfo: any = null;
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private dropboxAuthService: DropboxAuthService
  ) {}

  ngOnInit(): void {
    // Get returnUrl from route parameters or from stored original path
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || this.dropboxAuthService.getOriginalPath();
    });
    
    // Check if we have a token in URL hash (for OAuth callback)
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      this.handleAuthCallback();
      return;
    }
    
    // Check if we already have a valid token
    if (this.dropboxAuthService.isAuthenticated() && !this.dropboxAuthService.isTokenExpired()) {
      this.isLoggedIn = true;
      // If we already have a valid token and there's a return URL, go there directly
      if (this.returnUrl && this.returnUrl !== '/auth/dropbox-login') {
        this.continueToApp();
      } else {
        // Verify the token and get user info
        this.verifyToken();
      }
      return;
    }
    
    // Try the environment token as a last resort
    const envToken = environment.dropboxToken;
    if (envToken) {
      this.dropboxAuthService.setToken(envToken, 'environment');
      this.verifyToken();
    }
  }
  
  /**
   * Verify if the current token is valid
   */
  private verifyToken(): void {
    this.dropboxService.validateToken().subscribe({
      next: (accountInfo) => {
        this.isLoggedIn = true;
        this.userAccountInfo = accountInfo;
        console.log('Account info:', accountInfo);
        
        // Auto-redirect if we just validated the token and have a return URL
        if (this.returnUrl && this.returnUrl !== '/auth/dropbox-login') {
          this.continueToApp();
        }
      },
      error: () => {
        this.isLoggedIn = false;
        this.dropboxAuthService.clearToken();
      }
    });
  }
  
  /**
   * Handles the OAuth callback with token in URL fragment
   */
  private handleAuthCallback(): void {
    try {
      // Extract and save the token from the URL
      this.dropboxAuthService.setAccessTokenFromUrl(window.location.href);
      
      // Check if token was successfully set
      if (this.dropboxAuthService.isAuthenticated()) {
        this.isLoggedIn = true;
        this.toastr.success('Successfully authenticated with Dropbox');
        
        // Clear the fragment from URL without page reload
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        
        // Test the connection to ensure token works
        this.verifyTokenAndRedirect();
      } else {
        this.toastr.error('Failed to authenticate with Dropbox');
      }
    } catch (error) {
      console.error('Error handling auth callback:', error);
      this.toastr.error('Failed to authenticate with Dropbox');
    }
  }
  
  /**
   * Verify token and redirect if valid
   */
  private verifyTokenAndRedirect(): void {
    this.dropboxService.validateToken().subscribe({
      next: (accountInfo) => {
        this.userAccountInfo = accountInfo;
        // Automatically continue to app if we just got a valid token from login
        if (this.returnUrl) {
          this.continueToApp();
        }
      },
      error: (error) => {
        this.toastr.error('Failed to verify Dropbox token: ' + error.message);
        this.isLoggedIn = false;
        this.dropboxAuthService.clearToken();
      }
    });
  }
  
  /**
   * Initiate login process with Dropbox
   */
  login(): void {
    if (this.isAuthorizing) return;
    
    // First try with existing token if available
    if (this.dropboxAuthService.isAuthenticated() && !this.dropboxAuthService.isTokenExpired()) {
      this.verifyToken();
      return;
    }
    
    // Open Dropbox auth in a new tab
    this.loginWithRedirect();
  }
  
  /**
   * Initiate login process with Dropbox via redirect
   */
  loginWithRedirect(): void {
    this.isAuthorizing = true;
    this.dropboxAuthService.loginWithRedirect();
    this.isAuthorizing = false;
  }
  
  /**
   * Log out from Dropbox
   */
  logout(): void {
    this.dropboxAuthService.clearToken();
    this.isLoggedIn = false;
    this.userAccountInfo = null;
    this.toastr.info('Disconnected from Dropbox');
  }
  
  /**
   * Continue to application
   */
  continueToApp(): void {
    // Clear the stored original path as we're now navigating to it
    this.dropboxAuthService.clearOriginalPath();
    
    // Navigate to the return URL
    this.router.navigateByUrl(this.returnUrl);
  }
  
  /**
   * Test Dropbox connection
   */
  testConnection(): void {
    this.dropboxService.validateToken().subscribe(
      accountInfo => {
        this.userAccountInfo = accountInfo;
        this.toastr.success('Successfully connected to Dropbox API');
        console.log('Dropbox account info:', accountInfo);
      },
      error => {
        this.toastr.error('Failed to connect to Dropbox API: ' + error.message);
        console.error('Dropbox test error:', error);
        
        // Check if token expired (based on error)
        if (error.status === 401) {
          this.logout();
          this.toastr.warning('Your Dropbox session has expired. Please log in again.');
        }
      }
    );
  }
} 