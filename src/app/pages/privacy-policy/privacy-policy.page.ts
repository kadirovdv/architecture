import { Component } from '@angular/core';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.page.html',
  styleUrls: ['./privacy-policy.page.scss']
})
export class PrivacyPolicyPage {
  updatedDate = new Date();

  constructor(private navService: ToggleNavVisibilityService) {
    this.navService.updateNavState(false);
  }
}
