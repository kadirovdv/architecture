import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { CrudService } from 'src/app/shared/services/crud.service';

@Component({
  selector: 'app-dashboard-themes',
  templateUrl: './themes.page.html',
  styleUrls: ['./themes.page.scss'],
})
export class ThemesPage {
  themes: any[] = [];
  themeNameUz: string = '';
  themeNameRu: string = '';
  themeNameEn: string = '';
  isNewTheme: boolean = false;
  isEditTheme: boolean = false;
  themeIdToEdit: string = '';
  loader: boolean = false;
  exists: boolean = false;

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.getSeasons();
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && this.isNewTheme) {
        this.save();
      }
    });
  }

  getSeasons() {
    this.loader = true;
    this.themes = [];
    this.crudService.getDocuments('themes').subscribe((res) => {
      this.themes = res;
      this.loader = false;
      this.themes = this.themes.sort((a, b) => {
        const dateA: any = new Date(a.createdAt);
        const dateB: any = new Date(b.createdAt);
        return dateA - dateB;
      });
    });
  }

  addSeason() {
    this.isNewTheme = true;
  }

  cancel() {
    this.isNewTheme = false;
    this.themeIdToEdit = '';
    this.themeNameUz = '';
    this.themeNameRu = '';
    this.themeNameEn = '';
    this.isEditTheme = false;
  }

  deleteSeason(id: string) {
    this.crudService.deleteDocument('themes', id).then((res) => {
      this.getSeasons();
    });
  }

  editSeason(id: string, name: any) {
    this.themeIdToEdit = id;
    this.themeNameUz = name.themeTitle.uz;
    this.themeNameRu = name.themeTitle.ru;
    this.themeNameEn = name.themeTitle.en;
    this.isEditTheme = true;
  }

  save() {
    if (
      this.themeNameUz.trim() === '' &&
      this.themeNameRu.trim() === '' &&
      this.themeNameEn.trim() === ''
    ) {
      this.toastr.warning('Mavzu nomini hamma tilda kiriting!');
      return;
    } else if (this.themeNameUz.trim() === '') {
      this.toastr.warning("Mavzu nomini o'zbek tilida kiriting!");
      return;
    } else if (this.themeNameRu.trim() === '') {
      this.toastr.warning('Mavzu nomini rus tilida kiriting!');
      return;
    } else if (this.themeNameEn.trim() === '') {
      this.toastr.warning('Mavzu nomini ingliz tilida kiriting!');
      return;
    }
    this.themes.map((item) => {
      if (
        item.themeTitle.uz === this.themeNameUz &&
        item.themeTitle.ru === this.themeNameRu &&
        item.themeTitle.en === this.themeNameEn
      ) {
        this.toastr.warning("Mavzu ro'yhatda mavjud!");
        this.exists = true;
        return;
      }
    });
    if (this.isEditTheme && !this.exists) {
      this.crudService.updateDocument('themes', this.themeIdToEdit, {
        themeTitle: {
          uz: this.themeNameUz,
          ru: this.themeNameRu,
          en: this.themeNameEn,
        },
      });
      this.cancel();
    } else {
      if (!this.exists) {
        this.crudService.addDocument('themes', {
          index: this.themes.length + 1,
          themeTitle: {
            uz: this.themeNameUz,
            ru: this.themeNameRu,
            en: this.themeNameEn,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.isNewTheme = false;
    this.themeNameUz = '';
    this.themeNameRu = '';
    this.themeNameEn = '';
    this.getSeasons();
  }
}
