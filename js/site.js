/* ================= site.js — منطق واجهة المرضى ================= */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var C = window.CLINIC;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- بيانات العيادة في الصفحة ---------- */
  function fillClinic() {
    var hoursShort = C.hours.map(function (h) { return h.days + ' ' + h.time; }).join(' · ');
    var map = { phone: C.phone, address: C.address, hoursShort: hoursShort };
    document.querySelectorAll('[data-clinic]').forEach(function (el) { el.textContent = map[el.dataset.clinic] || ''; });
    document.querySelectorAll('[data-tel]').forEach(function (el) { el.href = 'tel:' + C.phone; });
    var wa = 'https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent('أهلاً، عايز أحجز موعد في ' + C.name);
    document.querySelectorAll('[data-wa]').forEach(function (el) { el.href = wa; });
    document.querySelectorAll('[data-icon]').forEach(function (el) { el.innerHTML = Icons.get(el.dataset.icon, +el.dataset.size || 22); });
    $('#hoursList').innerHTML = C.hours.map(function (h) { return '<li><span>' + esc(h.days) + '</span><strong>' + esc(h.time) + '</strong></li>'; }).join('');
    $('#phonesList').innerHTML = (C.phones || [C.phone]).map(function (n) { return '<li style="padding:3px 0"><a href="tel:' + n + '" dir="ltr">' + n + '</a></li>'; }).join('');
    $('#mapFrame').src = C.mapEmbed;
  }

  /* ---------- الخدمات والتقييمات ---------- */
  function renderServices() {
    var list = DB.all('services').filter(function (s) { return s.site !== false; });
    $('#servicesGrid').innerHTML = list.map(function (s, i) {
      return '<a href="#booking" class="service-card" data-service="' + s.id + '">' +
        '<span class="num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="si">' + Icons.get(s.icon, 22) + '</div>' +
        '<h3>' + esc(s.name) + '</h3><p>' + esc(s.desc) + '</p>' +
        '<span class="price">يبدأ من ' + DB.money(s.price) + '</span></a>';
    }).join('');
    $('#servicesGrid').addEventListener('click', function (e) {
      var card = e.target.closest('.service-card');
      if (card) { $('#bService').value = card.dataset.service; renderSlots(); }
    });
  }

  function renderReviews() {
    $('#reviewsGrid').innerHTML = DB.all('reviews').map(function (r) {
      var stars = '';
      for (var i = 0; i < (r.rating || 5); i++) stars += Icons.get('star', 16);
      return '<div class="review"><div class="stars">' + stars + '</div><p>' + esc(r.text) + '</p>' +
        '<div class="who"><span class="avatar">' + esc(r.name.charAt(0)) + '</span>' + esc(r.name) + '</div></div>';
    }).join('');
  }

  /* ---------- الحجز ---------- */
  var selectedTime = '';
  var form, sService, sDoctor, iDate, slotsBox, errBox;

  function fillSelects() {
    sService.innerHTML = '<option value="">اختار الخدمة</option>' + DB.all('services').map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name) + '</option>';
    }).join('');
    sDoctor.innerHTML = '<option value="">اختار الدكتور</option>' + DB.all('doctors').map(function (d) {
      return '<option value="' + d.id + '">' + esc(d.name) + ' — ' + esc(d.specialty) + '</option>';
    }).join('');
    var t = DB.today();
    iDate.min = t; iDate.max = DB.addDays(t, 60);
  }

  function renderSlots() {
    selectedTime = '';
    var d = sDoctor.value, date = iDate.value, s = sService.value;
    if (!d || !date || !s) {
      slotsBox.innerHTML = '<div class="slots-msg">اختار الخدمة والدكتور والتاريخ عشان تشوف المواعيد المتاحة</div>';
      return;
    }
    var res = DB.getSlots(d, date, s);
    if (res.closed) { slotsBox.innerHTML = '<div class="slots-msg">الدكتور في إجازة اليوم ده، اختار يوم تاني.</div>'; return; }
    var any = res.slots.some(function (x) { return x.available; });
    if (!any) { slotsBox.innerHTML = '<div class="slots-msg">مفيش مواعيد متاحة في اليوم ده، جرّب يوم تاني.</div>'; return; }
    slotsBox.innerHTML = '<div class="slots">' + res.slots.map(function (x) {
      return '<button type="button" class="slot" data-time="' + x.time + '"' + (x.available ? '' : ' disabled') + '>' + DB.fmtTime(x.time) + '</button>';
    }).join('') + '</div>';
  }

  function validate() {
    var name = $('#bName').value.trim();
    var phone = DB.normPhone($('#bPhone').value);
    if (name.length < 3) return 'اكتب اسمك بالكامل.';
    if (!/^01[0125]\d{8}$/.test(phone)) return 'رقم الموبايل غير صحيح (مثال: 01012345678).';
    if (!sService.value) return 'اختار الخدمة.';
    if (!sDoctor.value) return 'اختار الدكتور.';
    if (!iDate.value) return 'اختار التاريخ.';
    if (!selectedTime) return 'اختار الوقت المناسب.';
    return '';
  }

  function showSuccess(appt) {
    var svc = DB.find('services', appt.serviceId), doc = DB.find('doctors', appt.doctorId);
    var msg = 'أهلاً، أنا ' + $('#bName').value.trim() + '. حجزت موعد في ' + C.name + ':\n' +
      'الخدمة: ' + svc.name + '\nالدكتور: ' + doc.name + '\nالتاريخ: ' + DB.fmtDate(appt.date) + '\nالوقت: ' + DB.fmtTime(appt.time);
    var box = $('#bookingSuccess');
    box.innerHTML = '<div class="success"><div class="ok-ico">' + Icons.get('check', 32) + '</div>' +
      '<h3>تم استلام طلب الحجز</h3><p>هنتواصل معاك على واتساب لتأكيد الميعاد.</p>' +
      '<div class="sum"><div><span>الخدمة</span><strong>' + esc(svc.name) + '</strong></div>' +
      '<div><span>الدكتور</span><strong>' + esc(doc.name) + '</strong></div>' +
      '<div><span>التاريخ</span><strong>' + DB.fmtDate(appt.date) + '</strong></div>' +
      '<div><span>الوقت</span><strong>' + DB.fmtTime(appt.time) + '</strong></div></div>' +
      '<div class="actions"><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/' + C.whatsapp + '?text=' + encodeURIComponent(msg) + '">أكّد الحجز على واتساب</a>' +
      '<button type="button" class="btn btn-ghost" id="newBooking">حجز موعد تاني</button></div></div>';
    form.hidden = true; box.hidden = false;
    $('#newBooking').addEventListener('click', function () {
      form.reset(); selectedTime = ''; renderSlots(); box.hidden = true; form.hidden = false;
    });
  }

  function initBooking() {
    form = $('#bookingForm'); sService = $('#bService'); sDoctor = $('#bDoctor');
    iDate = $('#bDate'); slotsBox = $('#slots'); errBox = $('#bError');
    fillSelects(); renderSlots();
    [sService, sDoctor, iDate].forEach(function (el) { el.addEventListener('change', renderSlots); });
    slotsBox.addEventListener('click', function (e) {
      var b = e.target.closest('.slot'); if (!b || b.disabled) return;
      slotsBox.querySelectorAll('.slot').forEach(function (x) { x.classList.remove('active'); });
      b.classList.add('active'); selectedTime = b.dataset.time; errBox.textContent = '';
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = validate();
      if (err) { errBox.textContent = err; return; }
      try {
        var appt = DB.createBooking({
          name: $('#bName').value.trim(), phone: $('#bPhone').value, serviceId: sService.value, doctorId: sDoctor.value,
          date: iDate.value, time: selectedTime, notes: $('#bNotes').value.trim(), source: 'site'
        });
        errBox.textContent = '';
        showSuccess(appt);
      } catch (ex) { errBox.textContent = ex.message; renderSlots(); }
    });
  }

  /* ---------- القائمة في الموبايل ---------- */
  function initNav() {
    var nav = $('#nav');
    $('#navToggle').addEventListener('click', function () { nav.classList.toggle('open'); });
    nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') nav.classList.remove('open'); });
  }

  fillClinic(); renderServices(); renderReviews(); initBooking(); initNav();
  DB.onChange = function () { renderSlots(); };
})();
