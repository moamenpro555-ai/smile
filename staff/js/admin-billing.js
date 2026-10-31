(function () {
  'use strict';
  if (!Admin.init('billing', 'الحسابات والفواتير')) return;
  var esc = Admin.esc, $ = function (s) { return document.querySelector(s); };
  var ST = { paid: ['ok', 'مسدد'], partial: ['warn', 'مسدد جزئياً'], unpaid: ['danger', 'غير مسدد'] };

  function render() {
    var all = DB.all('invoices'), t = DB.today();
    var total = 0, paid = 0, today = 0;
    all.forEach(function (i) {
      total += Number(i.total); paid += DB.paid(i);
      (i.payments || []).forEach(function (p) { if (p.date === t) today += Number(p.amount); });
    });
    $('#stats').innerHTML =
      '<div class="stat ok"><small>إيراد النهارده</small><strong>' + DB.money(today) + '</strong></div>' +
      '<div class="stat"><small>إجمالي الفواتير</small><strong>' + DB.money(total) + '</strong></div>' +
      '<div class="stat ok"><small>إجمالي المحصّل</small><strong>' + DB.money(paid) + '</strong></div>' +
      '<div class="stat ' + (total - paid ? 'danger' : '') + '"><small>المتبقي عند المرضى</small><strong>' + DB.money(total - paid) + '</strong></div>';

    var q = $('#q').value.trim().toLowerCase(), sf = $('#statusF').value;
    var list = all.filter(function (i) {
      var name = Admin.patientName(i.patientId).toLowerCase();
      return (!q || name.indexOf(q) > -1 || i.description.toLowerCase().indexOf(q) > -1) && (!sf || DB.invStatus(i) === sf);
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });

    $('#list').innerHTML = !list.length ? '<div class="empty">مفيش فواتير مطابقة.</div>' :
      '<table class="tbl"><thead><tr><th>التاريخ</th><th>المريض</th><th>الوصف</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      list.map(function (i) {
        var s = ST[DB.invStatus(i)];
        return '<tr><td>' + DB.fmtDate(i.date, false) + '</td><td><a class="link" href="patient.html?id=' + i.patientId + '">' + esc(Admin.patientName(i.patientId)) + '</a></td>' +
          '<td>' + esc(i.description) + '</td><td>' + DB.money(i.total) + '</td><td>' + DB.money(DB.paid(i)) + '</td>' +
          '<td><strong>' + DB.money(DB.remaining(i)) + '</strong></td><td><span class="badge badge-' + s[0] + '">' + s[1] + '</span></td>' +
          '<td><button class="btn btn-ghost btn-sm" data-inv="' + i.id + '">' + (DB.remaining(i) ? 'دفعة / تفاصيل' : 'تفاصيل') + '</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  $('#q').addEventListener('input', render);
  $('#statusF').addEventListener('change', render);
  $('#newInv').addEventListener('click', function () { Forms.invoiceForm(null, render); });
  $('#list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-inv]'); if (b) Forms.invoiceDetails(b.dataset.inv, render);
  });
  DB.onChange = render;
  render();
})();
