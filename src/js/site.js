/**
 * site.js: progressive enhancement only.
 *
 * Every page is complete, readable and navigable with this file blocked. What
 * it adds: the theme toggle, the mobile drawer (with a real focus trap), and
 * scroll reveals.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --------------------------------------------------------------- theme */

  var toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    // Light is the default for everyone. The operating system's preference is
    // deliberately not consulted: dark is a choice the reader makes here, and
    // it is remembered until they change it back.
    var themeColor = document.querySelector('meta[name="theme-color"]');
    var PAINT = { light: '#fbfaf7', dark: '#14171d' };

    var effective = function () {
      return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    };

    var syncLabel = function () {
      // Announce what the button will DO, not what the theme currently is.
      var next = effective() === 'dark' ? 'light' : 'dark';
      toggle.setAttribute('aria-label', toggle.dataset[next + 'Label'] || toggle.getAttribute('aria-label'));
      toggle.setAttribute('aria-pressed', effective() === 'dark' ? 'true' : 'false');
      if (themeColor) themeColor.setAttribute('content', PAINT[effective()]);
    };

    toggle.addEventListener('click', function () {
      var next = effective() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try {
        localStorage.setItem('theme', next);
      } catch (e) {}
      syncLabel();
    });

    syncLabel();
  }

  /* -------------------------------------------------------------- drawer */

  var drawer = document.getElementById('site-drawer');
  var scrim = document.querySelector('[data-drawer-scrim]');
  var openBtn = document.querySelector('[data-drawer-open]');
  var closeBtn = document.querySelector('[data-drawer-close]');

  if (drawer && openBtn) {
    var lastFocused = null;
    var FOCUSABLE =
      'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

    var openDrawer = function () {
      lastFocused = document.activeElement;
      drawer.hidden = false;
      if (scrim) scrim.hidden = false;
      // Force a frame so the transition runs from the hidden state.
      requestAnimationFrame(function () {
        drawer.setAttribute('data-open', '');
        if (scrim) scrim.setAttribute('data-open', '');
      });
      openBtn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var first = drawer.querySelector(FOCUSABLE);
      if (first) first.focus();
      document.addEventListener('keydown', onKeydown);
    };

    var closeDrawer = function () {
      drawer.removeAttribute('data-open');
      if (scrim) scrim.removeAttribute('data-open');
      openBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeydown);

      var finish = function () {
        drawer.hidden = true;
        if (scrim) scrim.hidden = true;
      };
      if (reduced.matches) finish();
      else setTimeout(finish, 320);

      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    var onKeydown = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }
      if (e.key !== 'Tab') return;
      // Focus trap: keep Tab inside the dialog while it is open.
      var items = Array.prototype.filter.call(drawer.querySelectorAll(FOCUSABLE), function (el) {
        return el.offsetParent !== null;
      });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (scrim) scrim.addEventListener('click', closeDrawer);

    // Resizing past the desktop breakpoint should not strand an open drawer.
    window.matchMedia('(min-width: 801px)').addEventListener('change', function (e) {
      if (e.matches && !drawer.hidden) closeDrawer();
    });
  }

  /* ------------------------------------------------------------- reveals */

  var revealables = document.querySelectorAll('[data-reveal]');
  if (revealables.length) {
    if (reduced.matches || !('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(revealables, function (el) {
        el.setAttribute('data-revealed', '');
      });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var i = parseFloat(el.getAttribute('data-reveal')) || 0;
            el.style.transitionDelay = Math.min(i, 6) * 0.07 + 's';
            el.setAttribute('data-revealed', '');
            io.unobserve(el);
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -6% 0px' }
      );
      Array.prototype.forEach.call(revealables, function (el) {
        io.observe(el);
      });
    }
  }
})();
