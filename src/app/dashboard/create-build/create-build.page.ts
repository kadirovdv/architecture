import { Component, HostListener, OnInit } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';
import { DropboxService } from 'src/app/shared/services/dropbox.service';
import { FormGroup, FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { concatMap, from, Observable, tap, timer } from 'rxjs';
import { Location } from '@angular/common';
import { Lesson } from 'src/app/shared/interfaces/interfaces';

@Component({
  selector: 'app-create-build',
  templateUrl: './create-build.page.html',
  styleUrls: ['./create-build.page.scss'],
})
export class CreateBuildPage implements OnInit {
  lessons: Lesson[] = [];
  lesson: Lesson | null = null;

  task: Task | null = null;

  loading: boolean = false;

  // filesToUploadByCategory: FileGroups = {}

  constructor(
    private crudService: CrudService,
    private dropboxService: DropboxService,
    private toastr: ToastrService,
    private location: Location
  ) {}


  ngOnInit(): void {
    this.getLessons();
  }

  getLessons() {
    this.lessons = [];
    this.crudService.getDocuments('lessons').subscribe((res) => {
      this.lessons = res as Lesson[];
      this.lessons = this.lessons.sort((a: Lesson, b: Lesson) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    });
  }

  onFileSelected(event: Event) {
    
  }

  createBuild() {

  }
}
