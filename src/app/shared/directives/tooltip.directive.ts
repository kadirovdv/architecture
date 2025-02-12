import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    Renderer2,
    AfterViewInit,
  } from '@angular/core';
  
  @Directive({
    selector: '[appTooltip]',
  })
  export class TooltipDirective implements AfterViewInit {
    @Input('appTooltip') tooltipText = ''; 
    @Input() tooltipContainer!: string; 
  
    private tooltipElement!: HTMLElement;
    private containerElement!: HTMLElement;
  
    constructor(private el: ElementRef, private renderer: Renderer2) {}
  
    ngAfterViewInit() {
      if (this.tooltipContainer) {
        this.containerElement = document.querySelector(this.tooltipContainer)!;
      } else {
        this.containerElement = this.el.nativeElement.parentElement;
      }
    }
  
    @HostListener('mouseenter') onMouseEnter() {
      if (!this.tooltipElement && this.containerElement) {
        this.tooltipElement = this.renderer.createElement('span');
        this.renderer.appendChild(
          this.tooltipElement,
          this.renderer.createText(this.tooltipText)
        );
        this.renderer.addClass(this.tooltipElement, 'custom-tooltip');
  
        this.renderer.appendChild(this.containerElement, this.tooltipElement);
  
        const hostPos = this.el.nativeElement.getBoundingClientRect();
        const containerPos = this.containerElement.getBoundingClientRect();
  
        this.renderer.setStyle(
          this.tooltipElement,
          'top',
          `${hostPos.top - containerPos.top - 40}px`
        );
        this.renderer.setStyle(
          this.tooltipElement,
          'left',
          `${hostPos.left - containerPos.left + 80}px`
        );
      }
    }
  
    @HostListener('mouseleave') onMouseLeave() {
      if (this.tooltipElement) {
        this.renderer.removeChild(this.containerElement, this.tooltipElement);
        this.tooltipElement = null!;
      }
    }
  }
  