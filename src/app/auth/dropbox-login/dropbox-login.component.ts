import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize, switchMap } from 'rxjs/operators';
import { DropboxAuthService } from 'src/app/shared/services/dropbox.auth.service';

@Component({
  selector: 'app-dropbox-login',
  templateUrl: './dropbox-login.component.html',
  styleUrls: ['./dropbox-login.component.scss'],
})
export class DropboxLoginComponent implements OnInit {
  isAuthenticated = false;
  isLoading = false;
  processing = false;
  hasSavedToken = false;
  returnUrl = '';
  userInfo: any = null;
  error: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService,
    private dropboxAuthService: DropboxAuthService
  ) {}

  ngOnInit(): void {
    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'] ||
      this.dropboxAuthService.getStoredReturnUrl();
    this.hasSavedToken = this.dropboxAuthService.hasAccessToken();

    const errorParam = this.route.snapshot.queryParamMap.get('error');
    const code = this.route.snapshot.queryParamMap.get('code');

    if (errorParam) {
      this.error = `Dropbox authorization failed: ${errorParam}`;
      return;
    }

    if (code) {
      this.handleAuthorizationCode(code);
    }
  }

  connect(): void {
    if (this.processing) return;

    this.error = null;
    this.processing = true;
    this.dropboxAuthService.startOAuth(this.returnUrl || '/dashboard/lessons');
  }

  disconnect(): void {
    this.dropboxAuthService.clearToken();
    this.isAuthenticated = false;
    this.userInfo = null;
    this.hasSavedToken = false;
    this.toastr.info('Disconnected from Dropbox');
  }

  continueToApp(): void {
    const destination =
      this.dropboxAuthService.getStoredReturnUrl() || '/dashboard/lessons';
    this.dropboxAuthService.clearStoredReturnUrl();
    this.router.navigateByUrl(destination);
  }

  verifyExistingConnection(): void {
    if (!this.dropboxAuthService.hasAccessToken()) {
      this.error =
        'No Dropbox access token found. Click "Connect Dropbox" to start.';
      return;
    }

    this.confirmAccount();
  }

  getUserName(): string {
    if (this.userInfo?.name) {
      return `${this.userInfo.name.given_name || ''} ${
        this.userInfo.name.surname || ''
      }`.trim();
    }
    return 'Dropbox User';
  }

  getUserEmail(): string {
    if (this.userInfo?.email) {
      return this.userInfo.email;
    }
    return '';
  }

  private handleAuthorizationCode(code: string): void {
    this.isLoading = true;
    this.processing = true;

    this.dropboxAuthService
      .exchangeCodeForToken(code)
      .pipe(
        switchMap(() => this.dropboxAuthService.fetchAccountInfo()),
        finalize(() => {
          this.isLoading = false;
          this.processing = false;
        })
      )
      .subscribe({
        next: (info) => {
          this.userInfo = info;
          this.isAuthenticated = true;
          this.hasSavedToken = true;
          this.toastr.success('Connected to Dropbox successfully!', 'Success');
          this.clearQueryParams();
          this.continueToApp();
        },
        error: (err) => {
          this.error =
            'Error completing Dropbox authentication: ' +
            (err?.message || 'Unknown error');
          this.dropboxAuthService.clearToken();
        },
      });
  }

  private confirmAccount(): void {
    this.isLoading = true;
    this.dropboxAuthService
      .fetchAccountInfo()
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (info) => {
          this.userInfo = info;
          this.isAuthenticated = true;
          this.hasSavedToken = true;
          this.toastr.success('Dropbox token verified', 'Connected');
        },
        error: (err) => {
          console.error('Dropbox token verification failed:', err);
          this.error =
            'Unable to verify Dropbox token. Please reconnect to continue.';
          this.dropboxAuthService.clearToken();
          this.isAuthenticated = false;
          this.hasSavedToken = false;
        },
      });
  }

  private clearQueryParams(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }
}
