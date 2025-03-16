import { Component, Input, OnInit } from '@angular/core';
import { i18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-landing-content',
  templateUrl: './landing-content.component.html',
  styleUrls: ['./landing-content.component.scss'],
})
export class LandingContentComponent implements OnInit {
  locale: string = '';
  constructor(private i18n: i18nService) {}

  ngOnInit() {
    this.i18n.currentData.subscribe((data) => {
      this.locale = data;
    });
  }
}
