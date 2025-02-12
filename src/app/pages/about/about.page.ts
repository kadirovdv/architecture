import { Component } from '@angular/core';
import { i18nService } from 'src/app/shared/services/i18n.service';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage {
  lang = '';
  constructor(private navService: ToggleNavVisibilityService, private i18n: i18nService) {
    window.scroll(0, 0);
    this.navService.updateNavState(false);
  }

  ngOnInit(): void {
    this.i18n.currentData.subscribe((data) => {
      this.lang = data;
    });
  }
}
