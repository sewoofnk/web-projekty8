// Svetlý/tmavý režim – spoločné pre všetky stránky.
// Načítať v <head> (bez defer), aby sa téma nastavila pred vykreslením.
(function () {
  var root = document.documentElement;

  function storedTheme() {
    try { return localStorage.getItem('theme'); } catch (e) { return null; }
  }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f6f6fb' : '#0f0f13');
  }

  var mq = window.matchMedia('(prefers-color-scheme: light)');
  var t = storedTheme();
  if (t !== 'light' && t !== 'dark') t = mq.matches ? 'light' : 'dark';
  root.setAttribute('data-theme', t);

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(root.getAttribute('data-theme'));

    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        applyTheme(next);
        try { localStorage.setItem('theme', next); } catch (e) {}
      });
    }
  });

  // Sleduj zmenu systémového režimu, ak používateľ nevybral ručne
  mq.addEventListener('change', function (e) {
    if (!storedTheme()) applyTheme(e.matches ? 'light' : 'dark');
  });
})();
