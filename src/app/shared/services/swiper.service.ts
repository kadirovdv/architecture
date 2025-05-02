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


  initializeSwiper(elementSelector: string, body: any = {}): any {
    //@ts-ignore
    if (typeof Swiper !== 'undefined') {
      //@ts-ignore
      let swiper = new Swiper(elementSelector, body);
      
      // Return the swiper instance for potential direct manipulation
      return swiper;
    } else {
      console.error('Swiper is not loaded!');
      return null;
    }
  }
  
  /**
   * Helper method to handle dynamic alignment changes based on scroll position
   * @param swiper The swiper instance
   * @param threshold Percentage threshold (0-1) to trigger centered alignment
   */
  updateSwiperAlignment(swiper: any, threshold: number = 0.25): void {
    if (!swiper) return;
    
    const totalSlides = swiper.slides.length;
    const thresholdIndex = Math.floor(totalSlides * threshold);
    
    if (swiper.activeIndex >= thresholdIndex && !swiper.params.centeredSlides) {
      // Add transition class for smoother animation
      swiper.el.classList.add('transition-active');
      
      // Save the current position/translation
      const currentPosition = swiper.getTranslate();
      
      // Switch to centered mode
      swiper.params.centeredSlides = true;
      
      // Apply smooth transition
      swiper.params.speed = 300; // Adjust transition speed (milliseconds)
      
      // Update swiper to apply new configuration
      swiper.update();
      
      // Force a smooth transition to the new position
      swiper.setTransition(300);
      
      // Slight delay to ensure the transition is visible
      setTimeout(() => {
        // Reset transition speed for normal sliding
        swiper.params.speed = 300;
        // Remove transition class when done
        swiper.el.classList.remove('transition-active');
      }, 350);
    } else if (swiper.activeIndex < thresholdIndex && swiper.params.centeredSlides) {
      // Add transition class for smoother animation
      swiper.el.classList.add('transition-active');
      
      // Save the current position
      const currentPosition = swiper.getTranslate();
      
      // Switch back to left-aligned mode
      swiper.params.centeredSlides = false;
      
      // Apply smooth transition
      swiper.params.speed = 300;
      
      // Update swiper to apply new configuration
      swiper.update();
      
      // Force a smooth transition
      swiper.setTransition(300);
      
      // Reset transition speed after transition
      setTimeout(() => {
        swiper.params.speed = 300;
        // Remove transition class when done
        swiper.el.classList.remove('transition-active');
      }, 350);
    }
  }
}