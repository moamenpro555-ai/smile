(function () {
  'use strict';
  if (!Admin.init('reminders', 'تذكيرات واتساب')) return;
  var esc = Admin.esc, $ = function (s) { return document.querySelector(s); };
  var day = $('#day'), tpl = $('#tpl');
  day.value = DB.addDays(DB.today(), 1); // الافتراضي: بكرة
  tpl.value = DB.settings().reminderTemplate || CLINIC.reminderTemplate;

  function message(a) {
    var p = DB.find('patients', a.patientId);
    return tpl.value
      .replace(/\{name\}/g, p.name).replace(/\{date\}/g, DB.fmtDate(a.date))
      .replace(/\{time\}/g, DB.fmtTime(a.time)).replace(/\{doctor\}/g, Admin.doctorName(a.doctorId))
      .replace(/\{clinic\}/g, CLINIC.name);
  }
  function list() {
    return DB.all('appointments').filter(function (a) {
      return a.date === day.value && (a.status === 'pending' || a.status === 'confirmed');
    }).sort(Admin.byTime);
  }

  function render() {
    var l = list();
    $('#list').innerHTML = !l.length ? '<div class="empty">مفيش مواعيد محتاجة تذكير في اليوم ده.</div>' :
      '<table class="tbl"><thead><tr><th>الوقت</th><th>المريض</th><th>الموبايل</th><th>الدكتور</th><th>التذكير</th><th></th></tr></thead><tbody>' +
      l.map(function (a) {
        var p = DB.find('patients', a.patientId);
        return '<tr><td><strong>' + DB.fmtTime(a.time) + '</strong></td><td>' + esc(p.name) + '</td><td dir="ltr" style="text-align:right">' + esc(p.phone) + '</td>' +
          '<td>' + esc(Admin.doctorName(a.doctorId)) + '</td>' +
          '<td>' + (a.reminded ? '<span class="badge badge-ok">اتبعت</span>' : '<span class="badge badge-warn">لسه</span>') + '</td>' +
          '<td><button class="btn btn-wa btn-sm" data-send="' + a.id + '">' + (a.reminded ? 'ابعت تاني' : 'ابعت واتساب') + '</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function send(id) {
    var a = DB.find('appointments', id), p = DB.find('patients', a.patientId);
    window.open(DB.waLink(p.phone, message(a)), '_blank', 'noopener');
    DB.update('appointments', id, { reminded: true });
    render();
  }

  $('#list').addEventListener('click', function (e) { var b = e.target.closest('[data-send]'); if (b) send(b.dataset.send); });
  $('#sendNext').addEventListener('click', function () {
    var next = list().filter(function (a) { return !a.reminded; })[0];
    if (!next) { Admin.toast('كل التذكيرات اتبعتت ✔'); return; }
    send(next.id);
  });
  $('#saveTpl').addEventListener('click', function () {
    DB.saveSettings({ reminderTemplate: tpl.value });
    Admin.toast('تم حفظ نص الرسالة');
  });
  day.addEventListener('change', render);
  DB.onChange = render;
  render();
})();
