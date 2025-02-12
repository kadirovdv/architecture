import { Component, OnInit } from '@angular/core';
import { CrudService } from '../../shared/services/crud.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard-seasons',
  templateUrl: './semester.page.html',
  styleUrls: ['./semester.page.scss'],
})
export class SemesterPage implements OnInit {
  semesters: any[] = [];
  semesterNameUz: string = '';
  semesterNameRu: string = '';
  semesterNameEn: string = '';
  collectionId: string = '';
  isNewSemester: boolean = false;
  isEditSemester: boolean = false;
  semesterIdToEdit: string = '';
  loader: boolean = false;
  exists: boolean = false;

  constructor(
    private crudService: CrudService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.getSemesters();
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Enter' && this.isNewSemester) {
        this.save();
      }
    });
  }

  getSemesters() {
    this.loader = true;
    this.semesters = [];
    this.crudService.getDocuments('semesters').subscribe((res) => {
      this.semesters = res;
      this.loader = false;
      this.semesters = this.semesters.sort((a, b) => {
        const dateA: any = new Date(a.createdAt);
        const dateB: any = new Date(b.createdAt);
        return dateA - dateB;
      });
    });
  }

  addSemester() {
    this.isNewSemester = true;
  }

  cancel() {
    this.isNewSemester = false;
    this.semesterIdToEdit = '';
    this.semesterNameUz = '';
    this.semesterNameRu = '';
    this.semesterNameEn = '';
    this.isEditSemester = false;
  }

  deleteSemester(id: string) {
    this.crudService.deleteDocument('semesters', id).then((res) => {
      this.getSemesters();
    });
  }

  editSemester(id: string, name: any) {
    this.semesterIdToEdit = id;
    this.semesterNameUz = name.semesterTitle.uz;
    this.semesterNameRu = name.semesterTitle.ru;
    this.semesterNameEn = name.semesterTitle.en;
    this.isEditSemester = true;
  }

  save() {
    if (
      this.semesterNameUz.trim() === '' &&
      this.semesterNameRu.trim() === '' &&
      this.semesterNameEn.trim() === ''
    ) {
      this.toastr.error('Semester nomini hamma tilda kiriting!');
      return;
    } else if (this.semesterNameUz.trim() === '') {
      this.toastr.error("Semester nomini o'zbek tilida kiriting!");
      return;
    } else if (this.semesterNameRu.trim() === '') {
      this.toastr.error('Semester nomini rus tilida kiriting!');
      return;
    } else if (this.semesterNameEn.trim() === '') {
      this.toastr.error('Semester nomini ingliz tilida kiriting!');
      return;
    }
    this.semesters.map((item) => {
      if (
        item.semesterTitle.uz === this.semesterNameUz &&
        item.semesterTitle.ru === this.semesterNameRu &&
        item.semesterTitle.en === this.semesterNameEn
      ) {
        this.toastr.warning("Semester ro'yhatda mavjud!");
        this.exists = true;
        return;
      }
    });
    if (this.isEditSemester && !this.exists) {
      this.crudService.updateDocument('semesters', this.semesterIdToEdit, {
        semesterTitle: {
          uz: this.semesterNameUz,
          ru: this.semesterNameRu,
          en: this.semesterNameEn,
        },
      });
      this.cancel();
    } else {
      if(!this.exists) {
        this.crudService.addDocument('semesters', {
          index: this.semesters.length + 1,
          semesterTitle: {
            uz: this.semesterNameUz,
            ru: this.semesterNameRu,
            en: this.semesterNameEn,
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.isNewSemester = false;
    this.semesterNameUz = '';
    this.semesterNameRu = '';
    this.semesterNameEn = '';
    this.getSemesters();
  }
}
