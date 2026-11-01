/* ================= admin-forms.js — نوافذ الإدخال المشتركة ================= */
(function (g) {
  'use strict';
  var esc = Admin.esc;
  var METHODS = { cash: 'نقدي', card: 'فيزا', wallet: 'محفظة إلكترونية', instapay: 'إنستا باي' };

  function $(s, r) { return (r || document).querySelector(s); }
  function opts(list, sel, labelFn) {
    return list.map(function (x) { return '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(labelFn(x)) + '</option>'; }).join('');
  }

  var Forms = {
    METHODS: METHODS,

    /* ---------- التاريخ المرضي ---------- */
    medicalHTML: function (m) {
      m = m || {};
      function chk(k, label) { return '<label class="check"><input type="checkbox" name="' + k + '"' + (m[k] ? ' checked' : '') + '>' + label + '</label>'; }
      return '<div class="checks">' + chk('pressure', 'ضغط') + chk('diabetes', 'سكر') + chk('heart', 'أمراض قلب') +
        chk('anesthesia', 'حساسية من البنج') + chk('pregnant', 'حمل / رضاعة') + '</div>' +
        '<div class="field"><label>حساسية من أدوية أو مواد أخرى</label><input name="allergies" value="' + esc(m.allergies) + '" placeholder="مثلاً: بنسلين، لاتكس"></div>' +
        '<div class="field"><label>أدوية بيتناولها حالياً</label><input name="medications" value="' + esc(m.medications) + '"></div>' +
        '<div class="field"><label>ملاحظات طبية</label><textarea name="notes">' + esc(m.notes) + '</textarea></div>';
    },
    readMedical: function (root) {
      var m = {};
      ['pressure', 'diabetes', 'heart', 'anesthesia', 'pregnant'].forEach(function (k) { m[k] = root.querySelector('[name=' + k + ']').checked; });
      ['allergies', 'medications', 'notes'].forEach(function (k) { m[k] = root.querySelector('[name=' + k + ']').value.trim(); });
      return m;
    },

    /* ---------- مريض جديد / تعديل ---------- */
    patientForm: function (id, onSaved) {
      var p = id ? DB.find('patients', id) : null;
      var body = Admin.modal(p ? 'تعديل بيانات المريض' : 'مريض جديد',
        '<form id="pf"><div class="row2"><div class="field"><label>الاسم *</label><input name="name" value="' + esc(p && p.name) + '" required></div>' +
        '<div class="field"><label>رقم الموبايل *</label><input name="phone" dir="ltr" style="text-align:right" value="' + esc(p && p.phone) + '" required></div></div>' +
        '<div class="row2"><div class="field"><label>تاريخ الميلاد</label><input type="date" name="birth" value="' + esc(p && p.birth) + '"></div>' +
        '<div class="field"><label>النوع</label><select name="gender"><option value="">—</option><option value="m"' + (p && p.gender === 'm' ? ' selected' : '') + '>ذكر</option><option value="f"' + (p && p.gender === 'f' ? ' selected' : '') + '>أنثى</option></select></div></div>' +
        '<div class="field"><label>العنوان</label><input name="address" value="' + esc(p && p.address) + '"></div>' +
        (p ? '' : '<h4 style="margin:6px 0 10px">التاريخ المرضي</h4>' + Forms.medicalHTML(null)) +
        '<div class="field-error" id="pfErr"></div>' +
        '<div class="modal-actions"><button class="btn btn-primary" type="submit">حفظ</button><button class="btn btn-ghost" type="button" id="pfCancel">إلغاء</button></div></form>');
      $('#pfCancel', body).addEventListener('click', Admin.closeModal);
      $('#pf', body).addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target, name = f.name.value.trim(), phone = DB.normPhone(f.phone.value);
        if (name.length < 2) { $('#pfErr', body).textContent = 'اكتب اسم المريض.'; return; }
        if (!/^01[0125]\d{8}$/.test(phone)) { $('#pfErr', body).textContent = 'رقم الموبايل غير صحيح.'; return; }
        var dup = DB.all('patients').filter(function (x) { return x.phone === phone && (!p || x.id !== p.id); })[0];
        if (dup) { $('#pfErr', body).textContent = 'الرقم ده مسجل قبل كده باسم: ' + dup.name; return; }
        var base = { name: name, phone: phone, birth: f.birth.value, gender: f.gender.value, address: f.address.value.trim() };
        var saved;
        if (p) saved = DB.update('patients', p.id, base);
        else { var np = DB.newPatient(base); np.medical = Forms.readMedical(f); saved = DB.insert('patients', np); }
        Admin.closeModal(); Admin.toast('تم حفظ بيانات المريض');
        if (onSaved) onSaved(saved);
      });
    },

    /* ---------- حجز / تعديل موعد ---------- */
    appointmentForm: function (def, onSaved) {
      def = def || {};
      var a = def.id ? DB.find('appointments', def.id) : null;
      var doctors = DB.all('doctors').filter(function (d) { return (d.active !== false || d.id === (a ? a.doctorId : def.doctorId)) && (!Admin.isDoctor() || d.id === Admin.user.doctorId); });
      var patients = DB.all('patients').slice().sort(function (x, y) { return x.name.localeCompare(y.name, 'ar'); });
      var cur = a || def;
      var body = Admin.modal(a ? 'تعديل الموعد' : 'موعد جديد',
        '<form id="af">' +
        '<div class="field"><label>المريض</label><select name="patient">' +
        (a ? '' : '<option value="__new">+ مريض جديد</option>') +
        opts(patients, cur.patientId, function (p) { return p.name + ' — ' + p.phone; }) + '</select></div>' +
        '<div id="newPat" class="row2"' + (cur.patientId ? ' hidden' : '') + '><div class="field"><label>اسم المريض</label><input name="newName" value="' + esc(def.newName) + '"></div>' +
        '<div class="field"><label>الموبايل</label><input name="newPhone" dir="ltr" style="text-align:right" value="' + esc(def.newPhone) + '"></div></div>' +
        '<div class="row2"><div class="field"><label>الخدمة</label><select name="service">' + opts(DB.all('services'), cur.serviceId || 's0', function (s) { return s.name; }) + '</select></div>' +
        '<div class="field"><label>الدكتور</label><select name="doctor">' + opts(doctors, cur.doctorId || (doctors[0] && doctors[0].id), function (d) { return d.name; }) + '</select></div></div>' +
        '<div class="row2"><div class="field"><label>التاريخ</label><input type="date" name="date" value="' + esc(cur.date || DB.today()) + '"></div>' +
        '<div class="field"><label>الوقت</label><select name="time"></select><small id="slotHint" style="color:var(--muted);display:block;margin-top:4px"></small></div></div>' +
        '<div class="field"><label>ملاحظات</label><textarea name="notes" rows="2">' + esc(cur.notes) + '</textarea></div>' +
        '<div class="field-error" id="afErr"></div>' +
        '<div class="modal-actions"><button class="btn btn-primary" type="submit">حفظ</button><button class="btn btn-ghost" type="button" id="afCancel">إلغاء</button></div></form>');
      var f = $('#af', body);
      function refreshSlots() {
        var res = DB.getSlots(f.doctor.value, f.date.value, f.service.value, { ignoreNow: true, exceptId: a && a.id });
        var hint = $('#slotHint', body);
        if (res.closed) { f.time.innerHTML = '<option value="">الدكتور في إجازة اليوم ده</option>'; hint.textContent = ''; return; }
        hint.textContent = 'دوام الدكتور: ' + DB.fmtTime(res.doctorStart) + ' – ' + DB.fmtTime(res.doctorEnd) + ' (تقدر تحجز برا الدوام لحد 12 بليل)';
        var want = f.time.value || cur.time;
        f.time.innerHTML = res.slots.map(function (s) {
          return '<option value="' + s.time + '"' + (s.available ? '' : ' disabled') + (s.time === want ? ' selected' : '') + '>' + DB.fmtTime(s.time) + (s.available ? (s.outside ? ' · خارج دوام الدكتور' : '') : ' (محجوز)') + '</option>';
        }).join('');
      }
      f.patient.addEventListener('change', function () { $('#newPat', body).hidden = f.patient.value !== '__new'; });
      ['doctor', 'date', 'service'].forEach(function (k) { f[k].addEventListener('change', function () { f.time.value = ''; refreshSlots(); }); });
      refreshSlots();
      $('#afCancel', body).addEventListener('click', Admin.closeModal);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = $('#afErr', body); err.textContent = '';
        if (!f.time.value) { err.textContent = 'اختار وقت متاح.'; return; }
        try {
          if (a) {
            DB.update('appointments', a.id, { serviceId: f.service.value, doctorId: f.doctor.value, date: f.date.value, time: f.time.value, notes: f.notes.value.trim(), reminded: false });
          } else {
            var b = { serviceId: f.service.value, doctorId: f.doctor.value, date: f.date.value, time: f.time.value, notes: f.notes.value.trim(), source: 'admin', status: 'confirmed', ignoreNow: true };
            if (f.patient.value === '__new') {
              var nm = f.newName.value.trim(), ph = DB.normPhone(f.newPhone.value);
              if (nm.length < 2 || !/^01[0125]\d{8}$/.test(ph)) { err.textContent = 'اكتب اسم ورقم موبايل صحيح للمريض الجديد.'; return; }
              b.name = nm; b.phone = ph;
            } else b.patientId = f.patient.value;
            DB.createBooking(b);
          }
        } catch (ex) { err.textContent = ex.message; refreshSlots(); return; }
        Admin.closeModal(); Admin.toast('تم حفظ الموعد');
        if (onSaved) onSaved();
      });
    },

    /* ---------- تفاصيل موعد ---------- */
    apptDetails: function (id, onChange) {
      var a = DB.find('appointments', id); if (!a) return;
      var p = DB.find('patients', a.patientId);
      var body = Admin.modal('تفاصيل الموعد',
        '<div class="detail-list">' +
        '<div><span>المريض</span><strong>' + esc(p.name) + Admin.alertChips(p) + '</strong></div>' +
        '<div><span>الموبايل</span><strong dir="ltr">' + esc(p.phone) + '</strong></div>' +
        '<div><span>الخدمة</span><strong>' + esc(Admin.serviceName(a.serviceId)) + '</strong></div>' +
        '<div><span>الدكتور</span><strong>' + esc(Admin.doctorName(a.doctorId)) + '</strong></div>' +
        '<div><span>الموعد</span><strong>' + DB.fmtDate(a.date) + ' — ' + DB.fmtTime(a.time) + '</strong></div>' +
        (a.notes ? '<div><span>ملاحظات</span><strong>' + esc(a.notes) + '</strong></div>' : '') +
        '<div><span>الحالة</span>' + Admin.badge(a.status) + '</div></div>' +
        '<div class="field" style="margin-top:14px"><label>تغيير الحالة</label><select id="stSel">' + Admin.statusOptions(a.status) + '</select></div>' +
        '<div class="modal-actions"><a class="btn btn-primary btn-sm" href="patient.html?id=' + p.id + '">فتح ملف المريض</a>' +
        '<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="' + DB.waLink(p.phone, 'أهلاً ' + p.name + '، معاك ' + CLINIC.name) + '">واتساب</a>' +
        (Admin.can('book') ? '<button class="btn btn-ghost btn-sm" id="edAppt">تعديل</button>' : '') + (Admin.can('delete') ? '<button class="btn btn-danger btn-sm" id="delAppt">حذف</button>' : '') + '</div>');
      $('#stSel', body).addEventListener('change', function (e) {
        Admin.setStatus(id, e.target.value); Admin.closeModal(); Admin.toast('تم تحديث الحالة'); if (onChange) onChange();
      });
      var ed = $('#edAppt', body), del = $('#delAppt', body);
      if (ed) ed.addEventListener('click', function () { Forms.appointmentForm({ id: id }, onChange); });
      if (del) del.addEventListener('click', function () {
        if (confirm('متأكد إنك عاوز تحذف الموعد ده؟')) { DB.remove('appointments', id); Admin.closeModal(); Admin.toast('تم حذف الموعد'); if (onChange) onChange(); }
      });
    },

    /* ---------- فاتورة جديدة ---------- */
    invoiceForm: function (patientId, onSaved) {
      var patients = DB.all('patients').slice().sort(function (x, y) { return x.name.localeCompare(y.name, 'ar'); });
      var body = Admin.modal('فاتورة جديدة',
        '<form id="inf"><div class="field"><label>المريض</label><select name="patient"' + (patientId ? ' disabled' : '') + '>' +
        opts(patients, patientId, function (p) { return p.name + ' — ' + p.phone; }) + '</select></div>' +
        '<div class="field"><label>الخدمة / الوصف</label><select name="svc"><option value="">وصف مخصص</option>' + opts(DB.all('services'), '', function (s) { return s.name + ' — ' + DB.money(s.price); }) + '</select></div>' +
        '<div class="field"><label>وصف الفاتورة *</label><input name="desc" placeholder="مثلاً: علاج عصب — 3 جلسات"></div>' +
        '<div class="row2"><div class="field"><label>التكلفة الإجمالية *</label><input type="number" min="0" name="total"></div>' +
        '<div class="field"><label>المدفوع الآن</label><input type="number" min="0" name="paid" value="0"></div></div>' +
        '<div class="field"><label>طريقة الدفع</label><select name="method">' +
        Object.keys(METHODS).map(function (k) { return '<option value="' + k + '">' + METHODS[k] + '</option>'; }).join('') + '</select></div>' +
        '<p class="hint" style="color:var(--muted);font-size:13px;margin-bottom:10px">لو الدفع على أقساط أو جلسات، سجّل المبلغ المدفوع دلوقتي وضيف باقي الدفعات بعدين من تفاصيل الفاتورة.</p>' +
        '<div class="field-error" id="infErr"></div>' +
        '<div class="modal-actions"><button class="btn btn-primary" type="submit">حفظ الفاتورة</button><button class="btn btn-ghost" type="button" id="infCancel">إلغاء</button></div></form>');
      var f = $('#inf', body);
      f.svc.addEventListener('change', function () {
        var s = DB.find('services', f.svc.value);
        if (s) { f.desc.value = s.name; f.total.value = s.price; }
      });
      $('#infCancel', body).addEventListener('click', Admin.closeModal);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var total = Number(f.total.value), paid = Number(f.paid.value || 0), err = $('#infErr', body);
        if (!f.desc.value.trim()) { err.textContent = 'اكتب وصف الفاتورة.'; return; }
        if (!(total > 0)) { err.textContent = 'اكتب التكلفة الإجمالية.'; return; }
        if (paid < 0 || paid > total) { err.textContent = 'المبلغ المدفوع لازم يكون بين صفر والإجمالي.'; return; }
        var inv = { patientId: patientId || f.patient.value, date: DB.today(), description: f.desc.value.trim(), total: total, payments: [] };
        if (paid > 0) inv.payments.push({ id: DB.uid('pay'), date: DB.today(), amount: paid, method: f.method.value });
        DB.insert('invoices', inv);
        Admin.closeModal(); Admin.toast('تم حفظ الفاتورة'); if (onSaved) onSaved();
      });
    },

    /* ---------- تفاصيل فاتورة + دفعات ---------- */
    invoiceDetails: function (id, onChange) {
      var inv = DB.find('invoices', id); if (!inv) return;
      var p = DB.find('patients', inv.patientId);
      var rem = DB.remaining(inv);
      var rows = (inv.payments || []).map(function (x) {
        return '<tr><td>' + DB.fmtDate(x.date, false) + '</td><td>' + DB.money(x.amount) + '</td><td>' + (METHODS[x.method] || '') + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" data-del="' + x.id + '">حذف</button></td></tr>';
      }).join('') || '<tr><td colspan="4" class="empty">مفيش دفعات لسه</td></tr>';
      var body = Admin.modal('فاتورة — ' + p.name,
        '<div class="detail-list"><div><span>الوصف</span><strong>' + esc(inv.description) + '</strong></div>' +
        '<div><span>الإجمالي</span><strong>' + DB.money(inv.total) + '</strong></div>' +
        '<div><span>المدفوع</span><strong style="color:var(--ok)">' + DB.money(DB.paid(inv)) + '</strong></div>' +
        '<div><span>المتبقي</span><strong style="color:' + (rem ? 'var(--danger)' : 'var(--ok)') + '">' + DB.money(rem) + '</strong></div></div>' +
        '<h4 style="margin:16px 0 6px">الدفعات</h4><div class="table-wrap"><table class="tbl"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>الطريقة</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (rem > 0 ? '<form id="payf" style="margin-top:16px"><div class="row2"><div class="field"><label>دفعة جديدة</label><input type="number" min="1" max="' + rem + '" name="amount" value="' + rem + '"></div>' +
          '<div class="field"><label>الطريقة</label><select name="method">' + Object.keys(METHODS).map(function (k) { return '<option value="' + k + '">' + METHODS[k] + '</option>'; }).join('') + '</select></div></div>' +
          '<div class="field-error" id="payErr"></div><button class="btn btn-primary btn-sm" type="submit">تسجيل الدفعة</button></form>' : '') +
        '<div class="modal-actions" style="margin-top:18px"><button class="btn btn-danger btn-sm" id="delInv">حذف الفاتورة</button></div>', true);
      var pf = $('#payf', body);
      if (pf) pf.addEventListener('submit', function (e) {
        e.preventDefault();
        var amt = Number(pf.amount.value);
        if (!(amt > 0) || amt > rem) { $('#payErr', body).textContent = 'المبلغ لازم يكون بين 1 و ' + rem; return; }
        inv.payments.push({ id: DB.uid('pay'), date: DB.today(), amount: amt, method: pf.method.value });
        DB.commit(); Admin.toast('تم تسجيل الدفعة'); if (onChange) onChange(); Forms.invoiceDetails(id, onChange);
      });
      body.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (!confirm('حذف الدفعة دي؟')) return;
          inv.payments = inv.payments.filter(function (x) { return x.id !== b.dataset.del; });
          DB.commit(); if (onChange) onChange(); Forms.invoiceDetails(id, onChange);
        });
      });
      $('#delInv', body).addEventListener('click', function () {
        if (confirm('حذف الفاتورة نهائياً؟')) { DB.remove('invoices', id); Admin.closeModal(); Admin.toast('تم حذف الفاتورة'); if (onChange) onChange(); }
      });
    }
  };

  g.Forms = Forms;
})(window);
