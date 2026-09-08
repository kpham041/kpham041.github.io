/**
 * desk.js — turns the desk scene's anchors into a dialog.
 *
 * Without this file the scene still works: every hotspot is an <a href="#desk-…">
 * pointing at a real panel in the page, and CSS reveals the targeted one. This
 * script upgrades that to a modal using the native <dialog> element, which gives
 * the focus trap, Escape handling and background inertness for free.
 *
 * Opening pushes a history entry so the phone back-gesture closes the panel
 * rather than leaving the page. That makes closing a two-step dance: every exit
 * funnels through the dialog's own `close` event, and focus is only restored
 * once the history traversal has finished — a same-document navigation resets
 * focus to <body>, so restoring it any earlier is silently undone.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-desk]');
  if (!root) return;

  var dialog = root.querySelector('[data-desk-dialog]');
  var body = root.querySelector('[data-desk-dialogbody]');
  var closeBtn = root.querySelector('[data-desk-close]');
  if (!dialog || !body || typeof dialog.showModal !== 'function') return;

  var TITLE_ID = 'desk-dialog-title';

  var panels = {};
  Array.prototype.forEach.call(root.querySelectorAll('.desk__panel'), function (p) {
    panels[p.dataset.panel] = p;
  });

  var opener = null; // element to hand focus back to
  var pendingFocus = null;
  var pushed = false; // did WE add the history entry we are sitting on?

  function fill(id) {
    var panel = panels[id];
    if (!panel) return false;
    body.textContent = '';
    var clone = panel.cloneNode(true);
    // The clone would duplicate every id in the panel; keep only the title's,
    // which the dialog needs for its accessible name.
    Array.prototype.forEach.call(clone.querySelectorAll('[id]'), function (el) {
      el.removeAttribute('id');
    });
    clone.removeAttribute('id');
    var title = clone.querySelector('.desk__title');
    if (title) {
      title.id = TITLE_ID;
      clone.setAttribute('aria-labelledby', TITLE_ID);
      dialog.setAttribute('aria-labelledby', TITLE_ID);
    }
    body.appendChild(clone);
    return true;
  }

  function open(id, trigger) {
    if (!fill(id)) return false;
    opener = trigger || null;
    dialog.showModal();
    if (window.history && history.pushState) {
      history.pushState({ desk: id }, '', '#desk-' + id);
      pushed = true;
    }
    return true;
  }

  function restoreFocus() {
    var el = pendingFocus;
    pendingFocus = null;
    if (el && el.focus) el.focus();
  }

  // Every exit — close button, backdrop click, Escape — ends up here.
  dialog.addEventListener('close', function () {
    body.textContent = '';
    pendingFocus = opener;
    opener = null;
    if (pushed) {
      pushed = false;
      history.back(); // popstate restores focus once the URL has gone back
    } else {
      if (window.history && history.replaceState && location.hash.indexOf('#desk-') === 0) {
        history.replaceState(null, '', location.pathname + location.search);
      }
      restoreFocus();
    }
  });

  window.addEventListener('popstate', function () {
    if (dialog.open) {
      // Back was pressed while open: close, and let the handler above run
      // without pushing or popping any further history.
      pushed = false;
      dialog.close();
    } else {
      restoreFocus();
    }
  });

  root.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('[data-panel]') : null;
    if (!link || !root.contains(link) || link.classList.contains('desk__panel')) return;
    // Let modified clicks behave like ordinary link clicks.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (open(link.dataset.panel, link)) e.preventDefault();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      dialog.close();
    });
  }

  // Clicking the backdrop — i.e. the dialog element itself, outside its content.
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  // Deep link: /about/#desk-writing opens that panel on load. The page load
  // already made the history entry, so this one is not ours to pop.
  if (location.hash.indexOf('#desk-') === 0) {
    var id = location.hash.slice('#desk-'.length);
    if (panels[id] && fill(id)) {
      pushed = false;
      dialog.showModal();
    }
  }
})();
