import { Component, OnInit, NgZone } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, finalize, delay } from 'rxjs/operators';
import { of, Observable } from 'rxjs';
import { DropboxAuthService } from 'src/app/shared/services/dropbox.auth.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dropbox-login',
  templateUrl: './dropbox-login.component.html',
  styleUrls: ['./dropbox-login.component.scss'],
})
export class DropboxLoginComponent implements OnInit {
  isAuthenticated = false;
  isLoading = true;
  isConnecting = false;
  returnUrl: string = '';
  userInfo: any = null;
  error: string | null = null;
  processing = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private zone: NgZone,
    private http: HttpClient,
    private dropboxAuthService: DropboxAuthService
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    
    // Show loading indicator
    this.isLoading = true;
    
    // Check for hash fragment in URL (Dropbox OAuth redirect)
    if (window.location.hash) {
      // Add a small delay to ensure the component is fully loaded
      setTimeout(() => {
        this.extractTokenAndValidate();
      }, 500);
    } else {
      setTimeout(() => {
        this.isLoading = false;
      }, 1500);

      this.checkAuthenticated();
    }
  }

  
  connect(): void {
    this.isConnecting = true;
    this.error = null;
    
    if (this.returnUrl) {
      sessionStorage.setItem('dropbox_auth_return_url', this.returnUrl);
    }
    
    this.toastr.info('Initiating Dropbox authentication...', 'Connecting');
    
    window.open(this.getDropboxAuthUrl(), '_blank');
    
    this.toastr.info('Please complete authorization in the new tab, then return to this page and click "Refresh".', 'Authorization Started');
    this.isConnecting = false;
  }


  private getDropboxAuthUrl(): string {
    const redirectUri = window.location.origin + window.location.pathname;
    const appKey = this.getAppKey();
    return `https://www.dropbox.com/oauth2/authorize?response_type=token&client_id=${appKey}&redirect_uri=${redirectUri}`;
  }

  
  private getAppKey(): string {
    return environment.appKEY;
  }

  connectDirect(): void {
    this.isConnecting = true;
    this.error = null;
    this.processing = true;

    if (this.returnUrl) {
      sessionStorage.setItem('dropbox_auth_return_url', this.returnUrl);
    }
    
    this.toastr.info('Redirecting to Dropbox...', 'Please wait');
    
    this.dropboxAuthService.startOAuth();
  }

  
  disconnect(): void {
    sessionStorage.removeItem('accessToken');
    this.isAuthenticated = false;
    this.userInfo = null;
    this.toastr.info('Disconnected from Dropbox');
  }

  
  continueToApp(): void {
    const returnUrl = sessionStorage.getItem('dropbox_auth_return_url') || '/';
    this.router.navigateByUrl(returnUrl);
  }


  private checkAuthenticated(): void {
    this.isLoading = true;
    
    this.dropboxAuthService.validateToken().subscribe(
      isValid => {
        this.isAuthenticated = isValid;
        if (isValid) {
          this.fetchUserInfo();
        } else {
          this.isLoading = false;
        }
      },
      error => {
        this.error = 'Error validating token: ' + error.message;
        this.isLoading = false;
      }
    );
  }

  private fetchUserInfo(): void {
    const token = this.dropboxAuthService.getAccessToken();
    if (!token) {
      this.isLoading = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
    });

    this.http.post('https://api.dropboxapi.com/2/users/get_current_account', null, { headers })
      .subscribe(
        (data: any) => {
          this.userInfo = data;
          this.isLoading = false;
        },
        error => {
          this.error = 'Error fetching user info: ' + error.message;
          this.isLoading = false;
        }
      );
  }

  private extractTokenAndValidate(): void {
    this.isLoading = true;
    this.error = null;
    
    try {
      // Extract and store the access_token from the URL hash
      this.extractTokenFromUrl();
      
      // Add a delay before validation to ensure token is properly stored
      setTimeout(() => {
        // Then validate it using the service
        this.dropboxAuthService.validateToken().subscribe(
          isValid => {
            this.isAuthenticated = isValid;
            if (isValid) {
              this.fetchUserInfo();
              this.toastr.success('Connected to Dropbox successfully!', 'Success');
            } else {
              this.error = 'Invalid or expired token. Please try connecting again.';
              this.isLoading = false;
            }
          },
          error => {
            this.error = 'Error validating token: ' + error.message;
            this.isLoading = false;
          }
        );
      }, 1500); // Add 1.5 second delay to ensure token is stored
    } catch (err) {
      this.error = 'Error processing authentication: ' + (err instanceof Error ? err.message : String(err));
      this.isLoading = false;
    }
  }

  private extractTokenFromUrl(): void {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken: any = encodeURIComponent(params.get('access_token') || '');
    
    setTimeout(() => {
        sessionStorage.setItem('accessToken', accessToken);
        // Add debugging to check if token was properly stored
        console.log('Token stored in session storage:', accessToken);
        this.debugCheckToken();
      if (accessToken?.length) {
      } else {
        // If we have a hash but no access_token, show an error
        this.error = 'Authentication failed: No access token received from Dropbox';
        this.isLoading = false;
        console.error('No access_token found in URL hash:', hash);
      }
    }, 1000);
  }
  
  /**
   * Debug method to check if token is correctly stored in session storage
   */
  private debugCheckToken(): void {
    setTimeout(() => {
      const storedToken = sessionStorage.getItem('accessToken');
      console.log('Token in session storage after delay:', storedToken);
    }, 1200);
  }

  refreshAuthStatus(): void {
    this.isLoading = true;
    this.error = null;
    
    if (window.location.hash) {
      this.extractTokenAndValidate();
    } else {
      this.checkAuthenticated();
    }
  }

  getUserName(): string {
    if (this.userInfo && this.userInfo.name) {
      return `${this.userInfo.name.given_name || ''} ${this.userInfo.name.surname || ''}`.trim();
    }
    return 'Dropbox User';
  }

  getUserEmail(): string {
    if (this.userInfo && this.userInfo.email) {
      return this.userInfo.email;
    }
    return '';
  }

  redirectToReturnUrl(): void {
    const returnUrl = sessionStorage.getItem('dropbox_auth_return_url') || '/';
    this.zone.run(() => {
      this.router.navigateByUrl(returnUrl);
    });
  }
}
