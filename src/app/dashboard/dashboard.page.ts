import { Component, OnInit } from '@angular/core';
import { ToggleNavVisibilityService } from '../shared/services/toggle.nav.visibility.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  constructor(private navService: ToggleNavVisibilityService) {}

  ngOnInit(): void {
    // this.navService.changeState(false);
  }
}