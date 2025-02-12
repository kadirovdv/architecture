import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { ToggleNavVisibilityService } from '../../services/toggle.nav.visibility.service';
import { SearchService } from '../../services/search.global.service';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { i18nService } from '../../services/i18n.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent implements OnInit {
  @ViewChild('input') input!: ElementRef;
  public isInputFocused: boolean = false;
  currentState: any;
  currentNavState: any;
  searchQuery: string = '';
  open = false;
  loading = false;

  lang = localStorage.getItem('language') || 'uz';
  langDisplay = 'uz';

  constructor(
    public toggleNavVisibility: ToggleNavVisibilityService,
    private searchService: SearchService,
    private router: Router,
    private translateService: TranslateService,
    private i18n: i18nService,
    private loaderService: LoaderService
  ) {
    this.toggleNavVisibility.currentState.subscribe(
      (state) => (this.currentState = state)
    );

    this.toggleNavVisibility.currentNavState.subscribe(
      (state) => (this.currentNavState = state)
    );
  }

  ngOnInit(): void {
    this.i18n.currentData.subscribe((data) => {
      this.langDisplay = data;
    });
  }

  focusInput() {
    this.isInputFocused = !this.isInputFocused;
  }

  onSearch() {
    const route = this.searchService.getRouteForText(this.searchQuery);
    console.log(route);

    if (route) {
      this.router.navigate([route]);
    } else {
      // alert('No matching content found!');
    }
  }

  toggleNav() {
    this.open = !this.open;
  }

  changeLanguage(language: string) {
    this.loaderService.showLoader();
    localStorage.setItem('language', language);
    this.i18n.setLang(language);
    this.translateService.use(language);
    this.loaderService.hideLoader();
  }
}
