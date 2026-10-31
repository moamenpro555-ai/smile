(function () {
  'use strict';
  if (!Admin.init('calendar', 'أجندة المواعيد')) return;
  var esc = Admin.esc, $ = function (s) { return document.querySelector(s); };
  var view = 'day', cur = DB.today();
  var docSel = $('#docFilter');

  // فلتر الدكتور — الدكتور بيشوف جدوله بس
  var doctors = DB.all('doctors');
  if (Admin.isDoctor()) {
    doctors = doctors.filter(function (d) { return d.id === Admin.user.doctorId; });
    docSel.innerHTML = doctors.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + '</option>'; }).join('');
    docSel.disabled = true; $('#addAppt').style.display = 'none';
  } else {
    docSel.innerHTML = '<option value="">كل الدكاترة</option>' + doctors.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + '</option>'; }).join('');
  }

  function weekStart(iso) { var dow = DB.dayOfWeek(iso); return DB.addDays(iso, -((dow + 1) % 7)); } // السبت أول الأسبوع
  function appts(date) {
    return DB.all('appointments').filter(function (a) {
      return a.date === date && (!docSel.value || a.doctorId === docSel.value) && (!Admin.isDoctor() || a.doctorId === Admin.user.doctorId);
    }).sort(Admin.byTime);
  }
  function card(a) {
    var p = DB.find('patients', a.patientId);
    return '<div class="appt s-' + a.status + '" data-id="' + a.id + '"><strong>' + DB.fmtTime(a.time) + ' — ' + esc(p.name) + '</strong>' +
      '<small>' + esc(Admin.serviceName(a.serviceId)) + (Admin.isDoctor() ? '' : ' · ' + esc(Admin.doctorName(a.doctorId))) + '</small></div>';
  }

  function dayView() {
    var step = CLINIC.slotMinutes || 30;
    var ds = doctors.filter(function (d) { return !docSel.value || d.id === docSel.value; });
    var start = Math.min.apply(null, ds.map(function (d) { return DB.toMin(d.start); }));
    var end = Math.max.apply(null, ds.map(function (d) { return DB.toMin(d.end); }));
    var list = appts(cur), html = '';
    var off = ds.every(function (d) { return DB.isOffDay(d, cur); });
    if (off) html += '<div class="card empty">إجازة — العيادة مقفولة في اليوم ده.</div>';
    html += '<div class="day-grid">';
    for (var t = start; t < end; t += step) {
      var cells = list.filter(function (a) { var m = DB.toMin(a.time); return m >= t && m < t + step; });
      html += '<div class="day-row"><div class="t">' + DB.fmtTime(DB.fromMin(t)) + '</div><div class="cells" data-time="' + DB.fromMin(t) + '">' + cells.map(card).join('') + '</div></div>';
    }
    html += '</div>';
    $('#calBody').innerHTML = html;
    $('#calTitle').textContent = DB.fmtDate(cur);
  }

  function weekView() {
    var s = weekStart(cur), html = '<div class="week-grid">';
    for (var i = 0; i < 7; i++) {
      var d = DB.addDays(s, i), list = appts(d);
      html += '<div class="week-col' + (d === DB.today() ? ' today' : '') + '" data-date="' + d + '"><h4><span>' + new Date(d + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long' }) + '</span><span>' + DB.fmtDate(d, false) + '</span></h4>' +
        (list.length ? list.map(card).join('') : '<small style="color:var(--muted)">—</small>') + '</div>';
    }
    $('#calBody').innerHTML = html + '</div>';
    $('#calTitle').textContent = DB.fmtDate(s, false) + ' → ' + DB.fmtDate(DB.addDays(s, 6), false);
  }

  function render() {
    $('#jump').value = cur;
    $('#vDay').classList.toggle('on', view === 'day');
    $('#vWeek').classList.toggle('on', view === 'week');
    if (view === 'day') dayView(); else weekView();
  }

  $('#vDay').addEventListener('click', function () { view = 'day'; render(); });
  $('#vWeek').addEventListener('click', function () { view = 'week'; render(); });
  $('#prev').addEventListener('click', function () { cur = DB.addDays(cur, view === 'day' ? -1 : -7); render(); });
  $('#next').addEventListener('click', function () { cur = DB.addDays(cur, view === 'day' ? 1 : 7); render(); });
  $('#todayBtn').addEventListener('click', function () { cur = DB.today(); render(); });
  $('#jump').addEventListener('change', function (e) { if (e.target.value) { cur = e.target.value; render(); } });
  docSel.addEventListener('change', render);
  $('#addAppt').addEventListener('click', function () { Forms.appointmentForm({ date: cur, doctorId: docSel.value || undefined }, render); });

  $('#calBody').addEventListener('click', function (e) {
    var c = e.target.closest('.appt');
    if (c) { Forms.apptDetails(c.dataset.id, render); return; }
    if (!Admin.isReception()) return;
    var cell = e.target.closest('.cells');
    if (cell) Forms.appointmentForm({ date: cur, time: cell.dataset.time, doctorId: docSel.value || undefined }, render);
    var col = e.target.closest('.week-col');
    if (col && !cell) Forms.appointmentForm({ date: col.dataset.date, doctorId: docSel.value || undefined }, render);
  });

  DB.onChange = render;
  render();
})();
