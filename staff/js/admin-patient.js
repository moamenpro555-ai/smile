(function () {
  'use strict';
  if (!Admin.init('patients', 'ملف المريض')) return;
  var esc = Admin.esc, $ = function (s) { return document.querySelector(s); };
  var id = new URLSearchParams(location.search).get('id');
  var p = id && DB.find('patients', id);
  if (!p) { document.querySelector('.content').innerHTML = '<div class="card empty">المريض غير موجود. <a class="link" href="patients.html">الرجوع للقائمة</a></div>'; return; }
  var tab = 'info';
  var isDoc = Admin.isDoctor();

  var TOOTH = {
    healthy: 'سليم', cavity: 'تسوس', filling: 'حشو', root: 'عصب',
    crown: 'تلبيسة / تركيبة', implant: 'زراعة', missing: 'خلع / مفقود'
  };
  var COLORS = { healthy: '#ffffff', cavity: '#ef4444', filling: '#3b82f6', root: '#f59e0b', crown: '#a855f7', implant: '#14b8c6', missing: '#d6d8e8' };
  var UP = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  var LOW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  var TABS = [['info', 'البيانات الأساسية'], ['medical', 'التاريخ المرضي'], ['chart', 'مخطط الأسنان'], ['works', 'الشغل السابق'], ['visits', 'الزيارات']];
  if (Admin.can('billing')) TABS.push(['billing', 'الحسابات']);

  function renderHead() {
    var a = DB.age(p.birth);
    $('#head').innerHTML = '<div class="profile-head"><div class="avatar-lg">' + esc(p.name.charAt(0)) + '</div>' +
      '<div style="flex:1"><h2>' + esc(p.name) + '</h2><div class="meta">' + esc(p.phone) + (a ? ' · ' + a + ' سنة' : '') + '</div>' +
      '<div style="margin-top:6px">' + (Admin.alertChips(p) || '<span class="meta">مفيش تنبيهات طبية مسجلة</span>') + '</div></div>' +
      '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + DB.waLink(p.phone, 'أهلاً ' + p.name) + '">واتساب</a>' +
      '<a class="btn btn-ghost btn-sm" href="patients.html">← كل المرضى</a></div>';
  }

  function renderTabs() {
    $('#tabs').innerHTML = TABS.map(function (t) { return '<button data-tab="' + t[0] + '" class="' + (t[0] === tab ? 'on' : '') + '">' + t[1] + '</button>'; }).join('');
  }

  /* ---------- البيانات ---------- */
  function paneInfo() {
    $('#pane').innerHTML = '<div class="card"><div class="card-head"><h2>البيانات الأساسية</h2><div><button class="btn btn-ghost btn-sm" id="editP">تعديل</button> ' +
      (Admin.can('delete') ? '<button class="btn btn-danger btn-sm" id="delP">حذف المريض</button>' : '') + '</div></div><div class="detail-list">' +
      '<div><span>الاسم</span><strong>' + esc(p.name) + '</strong></div><div><span>الموبايل</span><strong dir="ltr">' + esc(p.phone) + '</strong></div>' +
      '<div><span>تاريخ الميلاد</span><strong>' + (p.birth ? DB.fmtDate(p.birth) + ' (' + DB.age(p.birth) + ' سنة)' : '—') + '</strong></div>' +
      '<div><span>النوع</span><strong>' + (p.gender === 'm' ? 'ذكر' : p.gender === 'f' ? 'أنثى' : '—') + '</strong></div>' +
      '<div><span>العنوان</span><strong>' + esc(p.address || '—') + '</strong></div>' +
      '<div><span>تاريخ التسجيل</span><strong>' + DB.fmtDate(p.createdAt, false) + '</strong></div></div></div>';
    $('#editP').addEventListener('click', function () { Forms.patientForm(p.id, function () { renderAll(); }); });
    var d = $('#delP');
    if (d) d.addEventListener('click', function () {
      if (confirm('حذف المريض هيحذف كل مواعيده وفواتيره كمان. متأكد؟')) { DB.removePatient(p.id); location.href = 'patients.html'; }
    });
  }

  /* ---------- التاريخ المرضي ---------- */
  function paneMedical() {
    $('#pane').innerHTML = '<div class="card"><div class="card-head"><h2>التاريخ المرضي</h2></div><form id="medf">' + Forms.medicalHTML(p.medical) +
      '<button class="btn btn-primary" type="submit">حفظ التاريخ المرضي</button></form></div>';
    $('#medf').addEventListener('submit', function (e) {
      e.preventDefault();
      p.medical = Forms.readMedical(e.target); DB.commit(); Admin.toast('تم حفظ التاريخ المرضي'); renderHead();
    });
  }

  /* ---------- مخطط الأسنان ---------- */
  function toothBtn(n) {
    var st = (p.chart[n] || {}).status || 'healthy';
    return '<button class="tooth st-' + st + '" data-t="' + n + '" title="' + TOOTH[st] + '">' + Icons.get('tooth', 30) + '<span>' + n + '</span></button>';
  }
  function paneChart() {
    var problems = Object.keys(p.chart).sort(function (a, b) { return a - b; });
    $('#pane').innerHTML = '<div class="card"><div class="card-head"><h2>مخطط الأسنان</h2><small style="color:var(--muted)">' +
      (isDoc ? 'اضغط على السنة عشان تعلّم عليها' : 'العرض فقط — التعديل للدكتور') + '</small></div>' +
      '<div class="jaw-wrap">' + JawChart.render(function (n) { return (p.chart[n] || {}).status || 'healthy'; }, function (st) { return TOOTH[st]; }) + '</div>' +
      '<div class="legend">' + Object.keys(TOOTH).map(function (k) { return '<span><i style="background:' + COLORS[k] + '"></i>' + TOOTH[k] + '</span>'; }).join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><h2>الأسنان المعلّم عليها</h2></div>' +
      (problems.length ? '<table class="tbl"><thead><tr><th>السنة</th><th>الحالة</th><th>ملاحظة</th><th>التاريخ</th></tr></thead><tbody>' +
        problems.map(function (n) { var c = p.chart[n]; return '<tr><td><strong>' + n + '</strong></td><td>' + TOOTH[c.status] + '</td><td>' + esc(c.note || '—') + '</td><td>' + DB.fmtDate(c.date, false) + '</td></tr>'; }).join('') + '</tbody></table>'
        : '<div class="empty">مفيش أسنان معلّم عليها.</div>') + '</div>';
  }
  function toothModal(n) {
    var c = p.chart[n] || { status: 'healthy', note: '' };
    if (!isDoc) { Admin.toast('سنة ' + n + ': ' + TOOTH[c.status] + (c.note ? ' — ' + c.note : '')); return; }
    var body = Admin.modal('السنة رقم ' + n,
      '<form id="tf"><div class="st-picker">' + Object.keys(TOOTH).map(function (k) {
        return '<label><input type="radio" name="st" value="' + k + '"' + (k === c.status ? ' checked' : '') + '>' + TOOTH[k] + '</label>';
      }).join('') + '</div><div class="field"><label>ملاحظة للزيارة الجاية</label><input name="note" value="' + esc(c.note) + '" placeholder="مثلاً: محتاج جلسة تانية"></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" type="submit">حفظ</button><button class="btn btn-ghost" type="button" id="tc">إلغاء</button></div></form>');
    $('#tc').addEventListener('click', Admin.closeModal);
    body.querySelector('#tf').addEventListener('submit', function (e) {
      e.preventDefault();
      var st = e.target.st.value;
      if (st === 'healthy' && !e.target.note.value.trim()) delete p.chart[n];
      else p.chart[n] = { status: st, note: e.target.note.value.trim(), date: DB.today() };
      DB.commit(); Admin.closeModal(); paneChart();
    });
  }

  /* ---------- الشغل السابق ---------- */
  function paneWorks() {
    var rows = p.works.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).map(function (w) {
      return '<tr><td>' + DB.fmtDate(w.date, false) + '</td><td>' + esc(w.tooth || '—') + '</td><td>' + esc(w.procedure) + '</td><td>' + esc(w.notes || '—') + '</td><td>' + esc(Admin.doctorName(w.doctorId)) + '</td>' +
        (isDoc ? '<td><button class="btn btn-ghost btn-sm" data-delw="' + w.id + '">حذف</button></td>' : '') + '</tr>';
    }).join('');
    $('#pane').innerHTML = (isDoc ? '<div class="card"><div class="card-head"><h2>تسجيل شغل جديد</h2></div><form id="wf"><div class="row2">' +
      '<div class="field"><label>الإجراء *</label><input name="proc" list="svcs" required placeholder="مثلاً: حشو ضوئي"><datalist id="svcs">' + DB.all('services').map(function (s) { return '<option value="' + esc(s.name) + '">'; }).join('') + '</datalist></div>' +
      '<div class="field"><label>رقم السنة</label><input name="tooth" placeholder="مثلاً 16"></div></div>' +
      '<div class="field"><label>ملاحظات</label><input name="notes"></div><button class="btn btn-primary btn-sm" type="submit">إضافة</button></form></div>' : '') +
      '<div class="card"><div class="card-head"><h2>سجل الشغل</h2></div>' + (rows ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>السنة</th><th>الإجراء</th><th>ملاحظات</th><th>الدكتور</th>' + (isDoc ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div class="empty">مفيش شغل مسجل.</div>') + '</div>';
    var wf = $('#wf');
    if (wf) wf.addEventListener('submit', function (e) {
      e.preventDefault();
      p.works.push({ id: DB.uid('w'), date: DB.today(), doctorId: Admin.user.doctorId, tooth: wf.tooth.value.trim(), procedure: wf.proc.value.trim(), notes: wf.notes.value.trim() });
      DB.commit(); Admin.toast('تم تسجيل الشغل'); paneWorks();
    });
    document.querySelectorAll('[data-delw]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (confirm('حذف السجل ده؟')) { p.works = p.works.filter(function (w) { return w.id !== b.dataset.delw; }); DB.commit(); paneWorks(); }
      });
    });
  }

  /* ---------- الزيارات ---------- */
  function paneVisits() {
    var list = DB.all('appointments').filter(function (a) { return a.patientId === p.id && (!isDoc || a.doctorId === Admin.user.doctorId); }).sort(function (a, b) { return -Admin.byTime(a, b); });
    $('#pane').innerHTML = '<div class="card"><div class="card-head"><h2>المواعيد والزيارات</h2>' + (Admin.can('book') ? '<button class="btn btn-primary btn-sm" id="newA">+ موعد جديد</button>' : '') + '</div>' +
      (list.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>الوقت</th><th>الخدمة</th><th>الدكتور</th><th>الحالة</th></tr></thead><tbody>' +
        list.map(function (a) { return '<tr><td>' + DB.fmtDate(a.date, false) + '</td><td>' + DB.fmtTime(a.time) + '</td><td>' + esc(Admin.serviceName(a.serviceId)) + '</td><td>' + esc(Admin.doctorName(a.doctorId)) + '</td><td>' + Admin.badge(a.status) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="empty">مفيش زيارات.</div>') + '</div>';
    var b = $('#newA'); if (b) b.addEventListener('click', function () { Forms.appointmentForm({ patientId: p.id }, paneVisits); });
  }

  /* ---------- الحسابات ---------- */
  function paneBilling() {
    var inv = DB.all('invoices').filter(function (i) { return i.patientId === p.id; }).sort(function (a, b) { return b.date.localeCompare(a.date); });
    var total = 0, paid = 0; inv.forEach(function (i) { total += Number(i.total); paid += DB.paid(i); });
    var ST = { paid: ['ok', 'مسدد'], partial: ['warn', 'مسدد جزئياً'], unpaid: ['danger', 'غير مسدد'] };
    $('#pane').innerHTML = '<div class="stats"><div class="stat"><small>إجمالي الفواتير</small><strong>' + DB.money(total) + '</strong></div><div class="stat ok"><small>المدفوع</small><strong>' + DB.money(paid) + '</strong></div>' +
      '<div class="stat ' + (total - paid ? 'danger' : '') + '"><small>المتبقي</small><strong>' + DB.money(total - paid) + '</strong></div></div>' +
      '<div class="card"><div class="card-head"><h2>الفواتير</h2><button class="btn btn-primary btn-sm" id="newInv">+ فاتورة جديدة</button></div>' +
      (inv.length ? '<div class="table-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>الوصف</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th></th></tr></thead><tbody>' +
        inv.map(function (i) { var s = ST[DB.invStatus(i)]; return '<tr><td>' + DB.fmtDate(i.date, false) + '</td><td>' + esc(i.description) + '</td><td>' + DB.money(i.total) + '</td><td>' + DB.money(DB.paid(i)) + '</td><td>' + DB.money(DB.remaining(i)) + '</td><td><span class="badge badge-' + s[0] + '">' + s[1] + '</span></td><td><button class="btn btn-ghost btn-sm" data-inv="' + i.id + '">تفاصيل</button></td></tr>'; }).join('') + '</tbody></table></div>'
        : '<div class="empty">مفيش فواتير.</div>') + '</div>';
    $('#newInv').addEventListener('click', function () { Forms.invoiceForm(p.id, paneBilling); });
    document.querySelectorAll('[data-inv]').forEach(function (b) { b.addEventListener('click', function () { Forms.invoiceDetails(b.dataset.inv, paneBilling); }); });
  }

  var PANES = { info: paneInfo, medical: paneMedical, chart: paneChart, works: paneWorks, visits: paneVisits, billing: paneBilling };
  function renderAll() { p = DB.find('patients', id); renderHead(); renderTabs(); PANES[tab](); }

  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; renderTabs(); PANES[tab](); } });
  $('#pane').addEventListener('click', function (e) { var t = e.target.closest('.jaw-tooth'); if (t) toothModal(t.getAttribute('data-t')); });
  $('#pane').addEventListener('keydown', function (e) { var t = e.target.closest && e.target.closest('.jaw-tooth'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toothModal(t.getAttribute('data-t')); } });

  renderAll();
})();
