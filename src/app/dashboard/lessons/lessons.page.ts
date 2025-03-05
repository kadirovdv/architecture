import { Component } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ToastrService } from 'ngx-toastr';
import { of, switchMap } from 'rxjs';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';

@Component({
  selector: 'app-dashboard-lessons',
  templateUrl: './lessons.page.html',
  styleUrls: ['./lessons.page.scss'],
})
export class LessonsPage {
  lessons: any[] = [];
  loader: boolean = false;
  selectedIndex: number = -1;

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService,
    private dropboxService: DropboxService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.getLessons();
  }

  getLessons() {
    this.loader = true;
    this.lessons = [];
    this.crudService.getDocuments('lessons').subscribe((res) => {
      this.lessons = res;
      this.loader = false;
      this.lessons = this.lessons.sort((a, b) => {
        const dateA: any = new Date(a.createdAt);
        const dateB: any = new Date(b.createdAt);
        return dateA - dateB;
      });
    });
  }


  openDropdown(index: number) {
    if(this.selectedIndex !== index) {
      this.selectedIndex = index;
    } else {
      this.selectedIndex = -1;
    }
  }
}
