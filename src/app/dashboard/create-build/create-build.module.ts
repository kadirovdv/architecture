import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateBuildPage } from './create-build.page';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FileListComponent } from './file-list/file-list.component';
import { CreateBuildRoutingModule } from './create-build-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { LoaderComponent } from "../../shared/components/loader/loader.component";
import { DeleteConfirmationComponent } from './delete-confirmation/delete-confirmation.component';

@NgModule({
  declarations: [
    CreateBuildPage, 
    FileListComponent, 
    VideoUploadComponent,
    DeleteConfirmationComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    NgbDropdownModule,
    NgbModalModule,
    CreateBuildRoutingModule,
    SharedModule,
    LoaderComponent
  ]
})
export class CreateBuildModule { }