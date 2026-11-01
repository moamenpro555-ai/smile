/* boot.js — بيستنى بيانات السيرفر (DB.ready) وبعدين يحمّل سكربتات الصفحة بالترتيب.
   الاستخدام: <script src="js/boot.js" data-scripts="admin-common,admin-forms,admin-dashboard"></script> */
(function () {
  'use strict';
  var me = document.currentScript;
  var list = (me.getAttribute('data-scripts') || '').split(',').filter(Boolean);

  var box = document.createElement('div');
  box.id = 'bootBox';
  box.setAttribute('style', 'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#f2f4ff;color:#1d1b4b;font-family:Cairo,system-ui,sans-serif;text-align:center;padding:24px');
  box.innerHTML = '<div><div style="width:42px;height:42px;margin:0 auto 14px;border-radius:50%;border:4px solid #d8dbf5;border-top-color:#4a3fcf;animation:bootspin .9s linear infinite"></div>' +
    '<strong id="bootMsg">جاري الاتصال بالسيرفر…</strong><div id="bootSub" style="color:#6b6f93;font-size:14px;margin-top:6px;min-height:20px"></div></div>' +
    '<style>@keyframes bootspin{to{transform:rotate(360deg)}}</style>';
  document.body.appendChild(box);
  var slow = setTimeout(function () {
    var s = document.getElementById('bootSub');
    if (s) s.textContent = 'السيرفر بيصحى من السكون، ممكن ياخد لحد دقيقة أول مرة.';
  }, 4000);

  function load(i) {
    if (i >= list.length) { box.remove(); return; }
    var s = document.createElement('script');
    s.src = 'js/' + list[i] + '.js';
    s.onload = function () { load(i + 1); };
    s.onerror = function () { fail('تعذر تحميل ' + list[i] + '.js'); };
    document.body.appendChild(s);
  }
  function fail(msg) {
    clearTimeout(slow);
    box.innerHTML = '<div><strong>' + String(msg).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }) + '</strong><div style="margin-top:14px"><button id="retryBtn" style="padding:10px 22px;border-radius:10px;border:0;background:#4a3fcf;color:#fff;font:inherit;cursor:pointer">إعادة المحاولة</button> ' +
      '<a href="login.html" style="margin-inline-start:10px;color:#4a3fcf">تسجيل الدخول</a></div></div>';
    document.getElementById('retryBtn').addEventListener('click', function () { location.reload(); });
  }

  DB.ready.then(function () { clearTimeout(slow); load(0); }, function (e) { fail(e && e.message ? e.message : 'حصل خطأ'); });
})();
