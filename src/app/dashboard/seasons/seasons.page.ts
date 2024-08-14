import { Component } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';

@Component({
  selector: 'app-dashboard-seasons',
  templateUrl: './seasons.page.html',
  styleUrls: ['./seasons.page.scss'],
})
export class SeasonsPage {
  seasons: any[] = [];
  seasonName: string = '';
  isNewSeason: boolean = false;
  isEditSeason: boolean = false;
  seasonIdToEdit: string = '';
  loader: boolean = false;

  constructor(private crudService: CrudService) {}

  ngOnInit() {
    this.getSeasons();
  }

  getSeasons() {
    this.loader = true;
    this.seasons = [];
    this.crudService.getItems('seasons').subscribe((res) => {
      this.seasons = res;
      this.loader = false;
    });
  }

  addSeason() {
    this.isNewSeason = true;
  }

  cancel() {
    this.isNewSeason = false;
    this.seasonIdToEdit = '';
    this.seasonName = '';
    this.isEditSeason = false;
  }

  deleteSeason(id: string) {
    this.crudService.deleteItem('seasons', id).then((res) => {
      this.getSeasons();
    });
  }

  editSeason(id: string, name: string) {
    this.seasonIdToEdit = id;
    this.seasonName = name;
    this.isEditSeason = true;
  }

  save() {
    if (this.isEditSeason) {
      this.crudService.updateItem('seasons', this.seasonIdToEdit, {
        name: this.seasonName,
      });
      this.cancel();
    } else {
      this.crudService.createIColelctionAndtem('seasons', {
        name: this.seasonName,
      });
    }

    this.isNewSeason = false;
    this.seasonName = '';
    this.getSeasons();
  }
}
