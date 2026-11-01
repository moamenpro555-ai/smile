(function () {
  'use strict';
  if (!Admin.init('dashboard', 'الرئيسية')) return;
  var esc = Admin.esc, $ = function (s) { return document.querySelector(s); };

  function stat(label, value, cls) { return '<div class="stat ' + (cls || '') + '"><small>' + label + '</small><strong>' + value + '</strong></div>'; }

  function apptTable(list, withDate) {
    if (!list.length) return '<div class="empty">مفيش مواعيد.</div>';
    return '<table class="tbl"><thead><tr>' + (withDate ? '<th>اليوم</th>' : '') + '<th>الوقت</th><th>المريض</th><th>الخدمة</th>' +
      (Admin.isDoctor() ? '' : '<th>الدكتور</th>') + '<th>الحالة</th><th></th></tr></thead><tbody>' +
      list.map(function (a) {
        var p = DB.find('patients', a.patientId);
        return '<tr>' + (withDate ? '<td>' + DB.fmtDate(a.date, false) + '</td>' : '') +
          '<td><strong>' + DB.fmtTime(a.time) + '</strong></td>' +
          '<td><a class="link" href="patient.html?id=' + p.id + '">' + esc(p.name) + '</a>' + Admin.alertChips(p) + '</td>' +
          '<td>' + esc(Admin.serviceName(a.serviceId)) + '</td>' +
          (Admin.isDoctor() ? '' : '<td>' + esc(Admin.doctorName(a.doctorId)) + '</td>') +
          '<td><select data-st="' + a.id + '">' + Admin.statusOptions(a.status) + '</select></td>' +
          '<td><button class="btn btn-ghost btn-sm" data-open="' + a.id + '">تفاصيل</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function requestsTable(list) {
    return '<table class="tbl"><thead><tr><th>الاسم</th><th>الموبايل</th><th>الخدمة</th><th>الموعد المفضل</th><th>ملاحظات</th><th></th></tr></thead><tbody>' +
      list.map(function (r) {
        var wa = DB.waLink(r.phone, 'أهلاً ' + r.name + '، معاك ' + CLINIC.name + '. وصلنا طلب الحجز بتاعك' + (r.service ? ' (' + r.service + ')' : '') + '، ينفع نأكد معاك الميعاد؟');
        return '<tr><td><strong>' + esc(r.name) + '</strong></td>' +
          '<td dir="ltr" style="text-align:right">' + esc(r.phone) + '</td>' +
          '<td>' + esc(r.service || '—') + '</td>' +
          '<td>' + (r.date ? DB.fmtDate(r.date, false) : '—') + '</td>' +
          '<td>' + esc(r.notes || '') + '</td>' +
          '<td style="white-space:nowrap"><a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + wa + '">واتساب</a> ' +
          '<button class="btn btn-primary btn-sm" data-req-book="' + r.id + '">حجز موعد</button> ' +
          '<button class="btn btn-ghost btn-sm" data-req-done="' + r.id + '">تم التعامل</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  function render() {
    var t = DB.today();
    var mine = Admin.myAppts();
    var todayList = mine.filter(function (a) { return a.date === t; }).sort(Admin.byTime);
    var active = todayList.filter(function (a) { return a.status !== 'cancelled' && a.status !== 'noshow'; });
    var pending = mine.filter(function (a) { return a.status === 'pending' && a.date >= t; }).sort(Admin.byTime);

    var html = stat('مواعيد النهارده', active.length) +
      stat('حجوزات محتاجة تأكيد', pending.length, pending.length ? 'warn' : '') +
      stat('تم كشفهم النهارده', todayList.filter(function (a) { return a.status === 'done'; }).length, 'ok');
    if (Admin.can('billing')) {
      var todayIncome = 0, owed = 0;
      DB.all('invoices').forEach(function (i) {
        (i.payments || []).forEach(function (p) { if (p.date === t) todayIncome += Number(p.amount); });
        owed += DB.remaining(i);
      });
      html += stat('إيراد النهارده', DB.money(todayIncome), 'ok') + stat('متبقي عند المرضى', DB.money(owed), owed ? 'danger' : '');
    } else {
      html += stat('إجمالي المرضى', DB.all('patients').length);
    }
    $('#stats').innerHTML = html;
    $('#todayTitle').textContent = 'مواعيد النهارده — ' + DB.fmtDate(t);
    $('#todayTable').innerHTML = apptTable(todayList, false);
    $('#pendingTable').innerHTML = apptTable(pending, true);
    var reqCard = $('#reqCard');
    if (Admin.can('requests')) {
      var newReqs = DB.all('requests').filter(function (r) { return r.status === 'new'; });
      reqCard.hidden = !newReqs.length;
      if (newReqs.length) $('#reqTable').innerHTML = requestsTable(newReqs);
    }
  }

  document.addEventListener('change', function (e) {
    var id = e.target.dataset && e.target.dataset.st;
    if (id) { Admin.setStatus(id, e.target.value); Admin.toast('تم تحديث الحالة'); render(); }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]');
    if (b) Forms.apptDetails(b.dataset.open, render);
    var done = e.target.closest('[data-req-done]');
    if (done) { DB.update('requests', done.dataset.reqDone, { status: 'handled' }); Admin.toast('تم'); render(); }
    var book = e.target.closest('[data-req-book]');
    if (book) {
      var r = DB.find('requests', book.dataset.reqBook); if (!r) return;
      var known = DB.all('patients').filter(function (p) { return p.phone === DB.normPhone(r.phone); })[0];
      var svc = DB.all('services').filter(function (x) { return r.service && (r.service.indexOf(x.name) > -1 || x.name.indexOf(r.service) > -1); })[0];
      Forms.appointmentForm({ patientId: known ? known.id : '', newName: r.name, newPhone: r.phone, serviceId: svc ? svc.id : '', date: r.date || DB.today(), notes: r.notes || '' }, function () {
        DB.update('requests', r.id, { status: 'handled' }); render();
      });
    }
  });
  var add = $('#addAppt');
  add.addEventListener('click', function () { Forms.appointmentForm({}, render); });
  if (!Admin.can('book')) add.style.display = 'none';

  DB.onChange = render;
  render();
})();
