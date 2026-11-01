(function () {
  'use strict';
  if (!Admin.init('patients', 'المرضى')) return;
  var esc = Admin.esc, $ = function (s) { return document.querySelector(s); };

  function lastVisit(p) {
    var done = DB.all('appointments').filter(function (a) { return a.patientId === p.id && a.date <= DB.today() && a.status !== 'cancelled' && a.status !== 'noshow'; }).sort(Admin.byTime);
    return done.length ? DB.fmtDate(done[done.length - 1].date, false) : '—';
  }

  function render() {
    var q = $('#q').value.trim().toLowerCase();
    var qd = DB.normPhone(q);
    var list = DB.all('patients').filter(function (p) {
      return !q || p.name.toLowerCase().indexOf(q) > -1 || (qd && p.phone.indexOf(qd) > -1);
    }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ar'); });
    var showBal = Admin.can('billing');
    $('#list').innerHTML = !list.length ? '<div class="empty">مفيش مرضى مطابقين.</div>' :
      '<table class="tbl"><thead><tr><th>الاسم</th><th>الموبايل</th><th>السن</th><th>آخر زيارة</th>' + (showBal ? '<th>المتبقي</th>' : '') + '</tr></thead><tbody>' +
      list.map(function (p) {
        var bal = DB.balance(p.id);
        return '<tr><td><a class="link" href="patient.html?id=' + p.id + '">' + esc(p.name) + '</a>' + Admin.alertChips(p) + '</td>' +
          '<td dir="ltr" style="text-align:right">' + esc(p.phone) + '</td><td>' + (DB.age(p.birth) || '—') + '</td><td>' + lastVisit(p) + '</td>' +
          (showBal ? '<td>' + (bal ? '<span class="badge badge-danger">' + DB.money(bal) + '</span>' : '<span class="badge badge-ok">لا يوجد</span>') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  $('#q').addEventListener('input', render);
  $('#addPatient').addEventListener('click', function () {
    Forms.patientForm(null, function (p) { location.href = 'patient.html?id=' + p.id; });
  });
  DB.onChange = render;
  render();
})();
