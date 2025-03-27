import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditBuildPage } from './edit-build.page';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FileListComponent } from './file-list/file-list.component';
import { EditBuildRoutingModule } from './edit-build-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { DeleteConfirmationComponent } from '../create-build/delete-confirmation/delete-confirmation.component';

@NgModule({
  declarations: [
    EditBuildPage,
    FileListComponent,
    VideoUploadComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    NgbDropdownModule,
    NgbModalModule,
    EditBuildRoutingModule,
    SharedModule
  ]
})
export class EditBuildModule { } 