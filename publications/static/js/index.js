window.HELP_IMPROVE_VIDEOJS = false;


$(document).ready(function() {
    // Check for click events on the navbar burger icon

    var options = {
			slidesToScroll: 1,
			slidesToShow: 1,
			loop: true,
			infinite: true,
			autoplay: true,
			autoplaySpeed: 5000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);
	
    bulmaSlider.attach();

})

document.addEventListener('DOMContentLoaded', () => {
	const slider = document.getElementById('ssp-slider');
	const slides = Array.from(slider.querySelectorAll('.slide'));
	let idx = 0;
  
	function showSlide(n) {
	  slides[idx].classList.remove('active');
	  idx = (n + slides.length) % slides.length;
	  slides[idx].classList.add('active');
	}
  
	slider.querySelector('.next').addEventListener('click', () => showSlide(idx + 1));
	slider.querySelector('.prev').addEventListener('click', () => showSlide(idx - 1));
  });