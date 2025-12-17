import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { DropboxAuthService } from '../services/dropbox.auth.service';

@Injectable({
  providedIn: 'root',
})
export class DropboxAuthGuard implements CanActivate {
  constructor(private dropboxAuthService: DropboxAuthService) {}

  canActivate(): boolean {
    // Do not trigger OAuth or network calls automatically; allow navigation.
    return this.dropboxAuthService.hasAccessToken();
  }
}
