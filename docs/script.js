// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Scroll-triggered fade-up animations
const fadeEls = document.querySelectorAll(
  '.case, .skill, .about__bio, .hero__bio, .company-pill, .contact__inner > *'
);

fadeEls.forEach(el => el.classList.add('fade-up'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

fadeEls.forEach(el => observer.observe(el));

// Flow map wireframe reveal
const flowMap = document.querySelector('.cs-flow-map');
if (flowMap) {
  new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); }
    });
  }, { threshold: 0.05 }).observe(flowMap);
}

// Stagger children inside groups
document.querySelectorAll('.cases, .skills__list, .companies__grid, .contact__inner').forEach(group => {
  [...group.children].forEach((child, i) => {
    child.style.transitionDelay = `${i * 0.07}s`;
  });
});
