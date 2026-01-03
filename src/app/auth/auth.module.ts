import { NgModule } from '@angular/core';
import { AuthRoutingModule } from './auth.routing.module';
import { AuthPage } from './auth.page';
import { SharedModule } from '../shared/shared.module';
import { LoginPage } from './login/login.page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SecondLoginPage } from './second-login/second-login-page';
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
  declarations: [AuthPage, LoginPage, SecondLoginPage],
  exports: [AuthPage, LoginPage, SecondLoginPage],
})
export class AuthModule {}
