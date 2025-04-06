import { NgModule } from '@angular/core';
import { AuthRoutingModule } from './auth.routing.module';
import { AuthPage } from './auth.page';
import { SharedModule } from '../shared/shared.module';
import { LoginPage } from './login/login.page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SecondLoginPage } from './second-login/second-login-page';
import { DropboxLoginComponent } from './dropbox-login/dropbox-login.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    AuthRoutingModule,
    SharedModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    TranslateModule,
  ],
  declarations: [AuthPage, LoginPage, SecondLoginPage, DropboxLoginComponent],
  exports: [AuthPage, LoginPage, SecondLoginPage, DropboxLoginComponent],
})
export class AuthModule {}
