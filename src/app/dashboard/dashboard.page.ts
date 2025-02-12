import { Component, OnInit } from '@angular/core';
import { ToggleNavVisibilityService } from '../shared/services/toggle.nav.visibility.service';
import { DropboxService } from '../shared/services/dropbox.service';
import { DropboxAuthService } from '../shared/services/dropbox.auth.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  constructor(private navService: ToggleNavVisibilityService, private dropboxService: DropboxService, private dropboxAuthService: DropboxAuthService) {}

  ngOnInit(): void {
    this.navService.changeState(false);
  }
}