import { Component } from '@angular/core';

@Component({
  selector: 'app-main',
  templateUrl: './main.page.html',
})
export class MainPage {
  constructor() {
    window.scroll(0, 0);
  }
}
