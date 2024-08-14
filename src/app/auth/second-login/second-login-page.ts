import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-second-login',
  templateUrl: './second-login.page.html',
  styleUrls: ['./second-login.page.scss'],
})
export class SecondLoginPage {
  digits: Array<string> = new Array<string>(6);
  otp: string[] = new Array(6).fill('');

  @Output() otpChange = new EventEmitter<string>();

  constructor() {}

  onKeyUp(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' || event.keyCode === 8) {
        if (index <= 0) {
            return;
          }
      (
        document.querySelectorAll('.otp-input')[index - 1] as HTMLInputElement
      ).focus();
    }

    if (input.value.length === 1 && index < this.digits.length - 1) {
      //@ts-ignore
      (
        document.querySelectorAll('.otp-input')[index + 1] as HTMLInputElement
      ).focus();

      this.otp.join('');
    }
  }
}
