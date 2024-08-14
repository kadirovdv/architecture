import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-manage',
  templateUrl: './manage.page.html',
  styleUrls: ['./manage.page.scss'],
})
export class ManagePage {
  constructor(private router: Router) {}
  ngOnInit() {
    this.router.navigate(['/dashboard/manage/sections']).then();
  }
}
