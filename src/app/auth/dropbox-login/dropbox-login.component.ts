import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { environment } from 'src/environments/environment';
import { DropboxAuthService } from 'src/app/shared/services/dropbox.auth.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { TranslateService } from '@ngx-translate/core';

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
  manualToken: string = '';
  
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private dropboxAuthService: DropboxAuthService,
    private translate: TranslateService
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
    
    // Check if we have a valid token in session storage only (not environment)
    // This prevents trying to use an expired environment token
    const hasSessionToken = !!this.dropboxAuthService.getAccessToken(true);
    
    if (hasSessionToken) {
      // Verify the token from session storage
      this.verifyToken();
    } else {
      // If no session token, ensure we show the login form
      this.isLoggedIn = false;
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
      console.log('Handling Dropbox auth callback with URL fragment');
      
      // Extract and save the token from the URL
      const tokenFound = this.dropboxAuthService.setTokenFromUrl(window.location.href);
      
      // Check if token was successfully set
      if (tokenFound) {
        this.isLoggedIn = true;
        this.translate.get('dropbox.auth-success').subscribe(msg => {
          this.toastr.success(msg);
        });
        
        // Clear the fragment from URL without page reload
        if (window.history && window.history.replaceState) {
          const cleanUrl = window.location.pathname + window.location.search;
          window.history.replaceState({}, document.title, cleanUrl);
        }
        
        // Test the connection to ensure token works
        this.verifyTokenAndRedirect();
      } else {
        console.error('No token found in URL');
        this.translate.get('dropbox.auth-failed').subscribe(msg => {
          this.toastr.error(msg);
        });
      }
    } catch (error) {
      console.error('Error handling auth callback:', error);
      this.translate.get('dropbox.auth-failed').subscribe(msg => {
        this.toastr.error(msg);
      });
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
        this.translate.get('dropbox.errors.connection-failed').subscribe(msg => {
          this.toastr.error(msg + ': ' + error.message);
        });
        this.isLoggedIn = false;
        this.dropboxAuthService.clearToken();
      }
    });
  }
  
  login(): void {
    if (this.isAuthorizing) return;
    
    // When logging in, only check for session storage token, not environment token
    // by passing true to isAuthenticated
    const hasSessionToken = !!this.dropboxAuthService.getAccessToken(true);
    
    if (hasSessionToken) {
      this.verifyToken();
      return;
    }
    
    // No valid session token, proceed with OAuth
    this.loginWithRedirect();
  }
  
  loginWithRedirect(): void {
    this.isAuthorizing = true;
    try {
      console.log('Initiating Dropbox login via redirect');
      this.dropboxAuthService.loginWithRedirect();
      
      // The following code won't execute immediately as we're redirecting
      // It will only run if redirect fails for some reason
      this.isAuthorizing = false;
    } catch (error) {
      console.error('Error during login redirect:', error);
      this.isAuthorizing = false;
      this.translate.get('dropbox.errors.connection-failed').subscribe(msg => {
        this.toastr.error(msg);
      });
    }
  }
  
  /**
   * Log out from Dropbox
   */
  logout(): void {
    this.dropboxAuthService.clearToken();
    this.isLoggedIn = false;
    this.userAccountInfo = null;
    this.translate.get('dropbox.success.disconnected').subscribe(msg => {
      this.toastr.info(msg);
    });
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
        this.translate.get('dropbox.auth-success').subscribe(msg => {
          this.toastr.success(msg);
        });
        console.log('Dropbox account info:', accountInfo);
      },
      error => {
        this.translate.get('dropbox.errors.connection-failed').subscribe(msg => {
          this.toastr.error(msg + ': ' + error.message);
        });
        console.error('Dropbox test error:', error);
        
        // Check if token expired (based on error)
        if (error.status === 401) {
          this.logout();
          this.translate.get('dropbox.errors.session-expired').subscribe(msg => {
            this.toastr.warning(msg);
          });
        }
      }
    );
  }

  /**
   * Set a token manually that was copied from the Dropbox OAuth redirect
   */
  setManualToken(): void {
    if (!this.manualToken) {
      this.translate.get('dropbox.manual-token.token-required').subscribe(msg => {
        this.toastr.error(msg);
      });
      return;
    }

    // Clean up the token - users might copy the entire URL or the full fragment
    let token = this.manualToken.trim();
    
    // If they pasted a full URL, extract just the token
    if (token.includes('access_token=')) {
      const hashPart = token.substring(token.indexOf('#') + 1);
      const params = new URLSearchParams(hashPart);
      const extractedToken = params.get('access_token');
      
      if (extractedToken) {
        token = extractedToken;
        this.translate.get('dropbox.manual-token.token-extracted').subscribe(msg => {
          this.toastr.info(msg);
        });
      } else {
        this.translate.get('dropbox.manual-token.extraction-failed').subscribe(msg => {
          this.toastr.error(msg);
        });
        return;
      }
    }

    // Set the token
    this.dropboxAuthService.setToken(token);
    this.translate.get('dropbox.manual-token.token-set').subscribe(msg => {
      this.toastr.info(msg);
    });
    
    // Verify the token
    this.verifyToken();
    
    // Clear the input
    this.manualToken = '';
  }

  /**
   * Show instructions for getting a token manually
   */
  showTokenInstructions(): void {
    // Generate the auth URL
    const redirectUri = encodeURIComponent(window.location.origin + '/auth/callback');
    const authUrl = `https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=${environment.appKEY}&redirect_uri=${redirectUri}`;
    
    // Get translated instructions
    this.translate.get([
      'dropbox.instructions.step1',
      'dropbox.instructions.step2',
      'dropbox.instructions.step3',
      'dropbox.instructions.step4', 
      'dropbox.instructions.step5',
      'dropbox.instructions.note'
    ]).subscribe(texts => {
      // Create instructions with direct link
      const instructions = 
        `${texts['dropbox.instructions.step1']}\n\n` +
        `${authUrl}\n\n` +
        `${texts['dropbox.instructions.step2']}\n` +
        `${texts['dropbox.instructions.step3']}\n` +
        `${texts['dropbox.instructions.step4']}\n` +
        `${texts['dropbox.instructions.step5']}\n\n` +
        `${texts['dropbox.instructions.note']}`;
      
      // Show in an alert
      alert(instructions);
    });
    
    // Also try to open the URL
    const authWindow = window.open(authUrl, '_blank');
    if (!authWindow) {
      this.translate.get('dropbox.errors.popup-blocked').subscribe(msg => {
        this.toastr.warning(msg);
      });
    }
  }
} 