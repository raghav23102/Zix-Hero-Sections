/**
 * Zix Hero Sections — Storefront JavaScript
 * Minimal, dependency-free, performant.
 * Handles: animations, countdown timers, before/after sliders.
 * Version: 1.0.0
 */

(function () {
  'use strict';

  // ============================================================
  // INTERSECTION OBSERVER — trigger animations when in view
  // ============================================================
  function initAnimations() {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    var elements = document.querySelectorAll('[data-zix-animate]');
    if (!elements.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  // ============================================================
  // COUNTDOWN TIMERS
  // ============================================================
  function initCountdowns() {
    var countdowns = document.querySelectorAll('[data-zix-countdown]');
    countdowns.forEach(function (el) {
      var endDate = el.getAttribute('data-zix-countdown');
      var completionMsg = el.getAttribute('data-zix-completion') || 'The offer has ended.';
      if (!endDate) return;

      var target = new Date(endDate).getTime();
      var daysEl = el.querySelector('[data-zix-days]');
      var hoursEl = el.querySelector('[data-zix-hours]');
      var minutesEl = el.querySelector('[data-zix-minutes]');
      var secondsEl = el.querySelector('[data-zix-seconds]');

      function pad(n) {
        return String(n).padStart(2, '0');
      }

      function tick() {
        var now = Date.now();
        var diff = target - now;

        if (diff <= 0) {
          el.innerHTML = '<p class="zix-hero__heading">' + completionMsg + '</p>';
          return;
        }

        var days = Math.floor(diff / 86400000);
        var hours = Math.floor((diff % 86400000) / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        var seconds = Math.floor((diff % 60000) / 1000);

        if (daysEl) daysEl.textContent = pad(days);
        if (hoursEl) hoursEl.textContent = pad(hours);
        if (minutesEl) minutesEl.textContent = pad(minutes);
        if (secondsEl) secondsEl.textContent = pad(seconds);

        requestAnimationFrame(function () {
          setTimeout(tick, 1000);
        });
      }

      tick();
    });
  }

  // ============================================================
  // BEFORE / AFTER SLIDER
  // ============================================================
  function initBeforeAfterSliders() {
    var sliders = document.querySelectorAll('.zix-before-after');

    sliders.forEach(function (slider) {
      var beforeWrap = slider.querySelector('.zix-ba__before-wrap');
      var handle = slider.querySelector('.zix-ba__handle');
      if (!beforeWrap || !handle) return;

      var isDragging = false;

      function setPosition(clientX) {
        var rect = slider.getBoundingClientRect();
        var x = Math.max(0, Math.min(clientX - rect.left, rect.width));
        var pct = (x / rect.width) * 100;
        beforeWrap.style.width = pct + '%';
        handle.style.left = pct + '%';
      }

      // Mouse events
      handle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        isDragging = true;
      });

      document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
        setPosition(e.clientX);
      });

      document.addEventListener('mouseup', function () {
        isDragging = false;
      });

      // Touch events
      handle.addEventListener('touchstart', function (e) {
        isDragging = true;
        e.preventDefault();
      }, { passive: false });

      slider.addEventListener('touchmove', function (e) {
        if (!isDragging) return;
        e.preventDefault();
        var touch = e.touches[0];
        if (touch) setPosition(touch.clientX);
      }, { passive: false });

      document.addEventListener('touchend', function () {
        isDragging = false;
      });

      // Keyboard accessibility
      handle.setAttribute('tabindex', '0');
      handle.addEventListener('keydown', function (e) {
        var rect = slider.getBoundingClientRect();
        var currentX = parseFloat(beforeWrap.style.width || '50') / 100 * rect.width;
        if (e.key === 'ArrowLeft') {
          setPosition(slider.getBoundingClientRect().left + currentX - 10);
        } else if (e.key === 'ArrowRight') {
          setPosition(slider.getBoundingClientRect().left + currentX + 10);
        }
      });
    });
  }

  // ============================================================
  // INIT on DOMContentLoaded
  // ============================================================
  function init() {
    initAnimations();
    initCountdowns();
    initBeforeAfterSliders();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init after Shopify section events (theme editor)
  document.addEventListener('shopify:section:load', init);
  document.addEventListener('shopify:block:select', init);

})();
