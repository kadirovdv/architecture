import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: "root",
})
export class NavbarService {
    constructor() {}

    public navState$ = new BehaviorSubject<boolean>(true);
    public navState = this.navState$.asObservable();

    updateState(state: boolean) {
        this.navState$.next(state);
    }
}