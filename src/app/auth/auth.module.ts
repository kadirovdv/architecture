import { NgModule } from '@angular/core';
import { AuthRoutingModule } from './auth.routing.module';
import { AuthPage } from './auth.page';
import { SharedModule } from '../shared/shared.module';
import { LoginPage } from './login/login.page';
import { SecondLoginPage } from './second-login/second-login-page';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [AuthRoutingModule, SharedModule, ReactiveFormsModule, CommonModule, FormsModule],
  declarations: [AuthPage, LoginPage, SecondLoginPage],
  exports: [AuthPage, LoginPage, SecondLoginPage],
})
export class AuthModule {}
