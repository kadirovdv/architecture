import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ToggleNavVisibilityService {
  public stateSource = new BehaviorSubject<boolean>(true);
  currentState = this.stateSource.asObservable();
  public navState = new BehaviorSubject<boolean>(false);
  currentNavState = this.navState.asObservable();

  changeState(newState: boolean) {
    this.stateSource.next(newState);
  }

  updateNavState(newState: boolean) {
    this.navState.next(newState);
  }
}
