import { Component, OnInit } from '@angular/core';
import { CrudService } from "../../shared/services/crud.service";

@Component({
  selector: 'app-dashboard-sections',
  templateUrl: './sections.page.html',
  styleUrls: ['./sections.page.scss'],
})
export class SectionsPage implements OnInit {
  sections: any[] = [];
  sectionName: string = '';
  collectionId: string = '';
  isNewSection: boolean = false;
  isEditSection: boolean = false;
  sectionIdToEdit: string = '';
  loader: boolean = false;

  constructor(private crudService: CrudService) {
  }

  ngOnInit() {
    this.getSections();
  }

  getSections() {
    this.loader = true
    this.sections = [];
    this.crudService.getItems('sections').subscribe((res) => {
      this.sections = res;
      this.loader = false;
    });
  }

  addSection() {
    this.isNewSection = true;
  }

  cancel() {
    this.isNewSection = false;
    this.sectionIdToEdit = '';
    this.sectionName = ''
    this.isEditSection = false;
  }

  deleteSection(id: string) {
    this.crudService.deleteItem('sections', id).then((res) => {
      this.getSections();
    });
  }

  editSection(id: string, name: string) {
    this.sectionIdToEdit = id;
    this.sectionName = name;
    this.isEditSection = true;
  }

  save() {

    if(this.isEditSection) {
      this.crudService.updateItem('sections', this.sectionIdToEdit, { name: this.sectionName });
      this.cancel()
    } else {
      this.crudService.createIColelctionAndtem('sections', {
        name: this.sectionName,
      });
    }

    this.isNewSection = false;
    this.sectionName = '';
    this.getSections()
  }
}
