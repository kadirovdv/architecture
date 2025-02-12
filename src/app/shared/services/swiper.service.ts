import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
  })
  export class SwiperService {
    private renderer: Renderer2;
    private stateSubject: BehaviorSubject<number> = new BehaviorSubject<number>(
      0
    );
  
    state$: Observable<number> = this.stateSubject.asObservable();
  
    constructor(rendererFactory: RendererFactory2) {
      this.renderer = rendererFactory.createRenderer(null, null);
    }


  initializeSwiper(elementSelector: string, body: any = {}): void {
    //@ts-ignore
    if (typeof Swiper !== 'undefined') {
      //@ts-ignore
      let swiper = new Swiper(elementSelector, body);
    } else {
      console.error('Swiper is not loaded!');
    }
  }
}