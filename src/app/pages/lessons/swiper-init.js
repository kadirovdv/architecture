/**
 * Initialize the lessons swiper with proper mobile centering
 */
function initLessonsSwiper() {
  // Check if we're on mobile
  const isMobile = window.innerWidth <= 768;
  
  // Initialize the swiper
  const lessonsSwiper = new Swiper('.lessonsSwiper', {
    slidesPerView: 'auto',
    spaceBetween: isMobile ? 10 : 30,
    centeredSlides: true,
    initialSlide: Math.floor(document.querySelectorAll('.lessonsSwiper .swiper-slide').length / 2), // Start with middle slide
    grabCursor: true,
    loop: false,
    speed: 600,
    effect: 'slide',
    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
    breakpoints: {
      // Mobile breakpoints
      320: {
        slidesPerView: 'auto',
        centeredSlides: true,
        spaceBetween: 10,
        initialSlide: Math.floor(document.querySelectorAll('.lessonsSwiper .swiper-slide').length / 2),
      },
      576: {
        slidesPerView: 'auto',
        centeredSlides: true,
        spaceBetween: 15,
        initialSlide: Math.floor(document.querySelectorAll('.lessonsSwiper .swiper-slide').length / 2),
      },
      768: {
        slidesPerView: 'auto',
        centeredSlides: true,
        spaceBetween: 20,
        initialSlide: Math.floor(document.querySelectorAll('.lessonsSwiper .swiper-slide').length / 2),
      },
      992: {
        slidesPerView: 'auto',
        centeredSlides: true,
        spaceBetween: 25,
        initialSlide: Math.floor(document.querySelectorAll('.lessonsSwiper .swiper-slide').length / 2),
      },
    },
    on: {
      init: function() {
        // Force centering on init
        this.slideTo(this.params.initialSlide, 0, false);
        
        // Add a class to signify initialization is complete
        document.querySelector('.lessonsSwiper').classList.add('swiper-initialized');
      },
      resize: function() {
        // Re-center on resize
        const centerIndex = Math.floor(document.querySelectorAll('.lessonsSwiper .swiper-slide').length / 2);
        this.slideTo(centerIndex, 300, false);
      }
    }
  });
  
  return lessonsSwiper;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initLessonsSwiper();
});

// Export the init function for use in Angular components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initLessonsSwiper };
} 