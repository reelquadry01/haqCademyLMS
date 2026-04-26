// Haq-Cademy Motion Design — scroll reveals + counters + micro-interactions

(function () {
  // ── Scroll reveal observer ──
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  function initReveal() {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach((el) => {
      revealObserver.observe(el);
    });
  }

  // ── Animated counter ──
  function animateCounter(el, target, duration) {
    const isPercent = typeof target === 'string' && target.endsWith('%');
    const numTarget = parseInt(target);
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * numTarget);
      el.textContent = current + (isPercent ? '%' : el.dataset.suffix || '');
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    }
    requestAnimationFrame(tick);
  }

  function initCounters() {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const target = el.dataset.target;
            if (target) animateCounter(el, target, 1200);
            counterObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.5 }
    );
    document.querySelectorAll('.count-target').forEach((el) => counterObserver.observe(el));
  }

  // ── Stagger children of a parent ──
  function staggerChildren(selector, baseDelay) {
    document.querySelectorAll(selector).forEach((parent) => {
      Array.from(parent.children).forEach((child, i) => {
        child.classList.add('reveal');
        child.style.transitionDelay = (baseDelay + i * 0.08) + 's';
        revealObserver.observe(child);
      });
    });
  }

  // ── Toast dismiss on click ──
  function initToastDismiss() {
    document.addEventListener('click', (e) => {
      const toast = e.target.closest('.toast');
      if (toast) {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
      }
    });
  }

  // ── Smooth anchor scrolling ──
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // ── Init on DOM ready ──
  function init() {
    initReveal();
    initCounters();
    staggerChildren('.features-grid', 0.05);
    staggerChildren('.testimonials-grid', 0.05);
    staggerChildren('.courses-catalog', 0.05);
    initToastDismiss();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
