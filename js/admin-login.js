(function () {
  'use strict';
  if (DB.session()) { location.href = 'index.html'; return; }
  var f = document.getElementById('loginForm');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var s = DB.login(document.getElementById('u').value, document.getElementById('p').value);
    if (!s) { document.getElementById('err').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة.'; return; }
    location.href = 'index.html';
  });
  document.querySelectorAll('[data-u]').forEach(function (b) {
    b.addEventListener('click', function () {
      document.getElementById('u').value = b.dataset.u;
      document.getElementById('p').value = '1234';
    });
  });
})();
