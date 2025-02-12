import { Component } from '@angular/core';
import { CrudService } from 'src/app/shared/services/crud.service';

@Component({
  selector: 'app-build',
  templateUrl: './build.page.html',
  styleUrls: ['./build.page.scss'],
})
export class BuildPage {
  loader = false;
  public globalVar: any = []

  constructor(private crudService: CrudService) {}

  ngOnInit(): void {
    this.getAll();
  }

  getAll() {
    this.crudService.getDocuments('globalVar').subscribe((res) => {
      this.globalVar = res
      this.globalVar = this.globalVar.sort((a: any, b: any) => {
        const dateA: any = new Date(a.createdAt);
        const dateB: any = new Date(b.createdAt);
        return dateA - dateB;
      })
    })
  }

  deleteBuild(id: string) {
    this.crudService.deleteDocument('globalVar', id).then((res) => {
      this.getAll();
    });
  }
}
