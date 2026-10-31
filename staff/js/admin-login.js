(function () {
  'use strict';
  if (DB.session()) { location.href = 'index.html'; return; }
  var f = document.getElementById('loginForm');
  var err = document.getElementById('err');
  var btn = f.querySelector('button[type=submit]');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true; var label = btn.textContent; btn.textContent = 'جاري الدخول…';
    DB.login(document.getElementById('u').value, document.getElementById('p').value)
      .then(function () { location.href = 'index.html'; })
      .catch(function (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = label; });
  });
})();
