import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SaveRouteService } from 'src/app/shared/services/save.route';
import { ToggleNavVisibilityService } from 'src/app/shared/services/toggle.nav.visibility.service';

@Component({
  selector: 'app-dashboard-manage',
  templateUrl: './manage.page.html',
  styleUrls: ['./manage.page.scss'],
})
export class ManagePage {
  constructor(
    private router: Router,
    public saveRouteSrc: SaveRouteService,
    private navigate: Location
  ) {}
  ngOnInit() {
    this.router.navigate([
      this.saveRouteSrc.getRoute() === 'null'
        ? '/dashboard/manage/semester'
        : this.saveRouteSrc.getRoute(),
    ])    
    .then((route) => {});
  }

  goBack() {
    this.navigate.historyGo(-1);
  }
}
