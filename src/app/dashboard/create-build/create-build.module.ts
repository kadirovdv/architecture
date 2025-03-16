import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateBuildPage } from './create-build.page';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FileListComponent } from './file-list/file-list.component';
import { CreateBuildRoutingModule } from './create-build-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { VideoUploadComponent } from './video-upload/video-upload.component';
import { LoaderComponent } from "../../shared/components/loader/loader.component";

@NgModule({
  declarations: [CreateBuildPage, FileListComponent, VideoUploadComponent],
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    NgbDropdownModule,
    CreateBuildRoutingModule,
    SharedModule,
    LoaderComponent
]
})
export class CreateBuildModule { }