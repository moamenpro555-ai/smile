/* الحسابات والصلاحيات — للمؤسس بس */
(function () {
  'use strict';
  if (!Admin.init('users', 'الحسابات والصلاحيات')) return;
  var esc = Admin.esc, $ = function (s, r) { return (r || document).querySelector(s); };
  var DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var ROLE = { owner: 'مؤسس', reception: 'استقبال', doctor: 'دكتور' };
  var S = { users: [], doctors: [], features: [], defaults: {} };

  function fail(e) { Admin.toast(e.message || 'حصل خطأ', 'error'); }
  function load() {
    return DB.api('GET', '/api/admin/overview').then(function (o) { S = o; render(); }).catch(fail);
  }
  function docById(id) { return S.doctors.filter(function (d) { return d.id === id; })[0]; }
  function featLabel(k) { var f = S.features.filter(function (x) { return x.key === k; })[0]; return f ? f.label : k; }

  /* ---------- الجداول ---------- */
  function render() {
    $('#usersTable').innerHTML = '<table class="tbl"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>النوع</th><th>الدكتور المربوط</th><th>الصلاحيات</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      S.users.map(function (u) {
        var d = u.doctorId && docById(u.doctorId);
        return '<tr><td><strong>' + esc(u.name) + '</strong></td><td dir="ltr" style="text-align:right">' + esc(u.username) + '</td>' +
          '<td><span class="badge badge-' + (u.role === 'owner' ? 'info' : 'muted') + '">' + ROLE[u.role] + '</span></td>' +
          '<td>' + (d ? esc(d.name) : '—') + '</td>' +
          '<td>' + (u.role === 'owner' ? '<span class="chip-all badge badge-ok">كل الصلاحيات</span>' :
            '<div class="chips">' + (u.permissions.length ? u.permissions.map(function (k) { return '<span class="chip">' + esc(featLabel(k)) + '</span>'; }).join('') : '<span style="color:var(--muted)">من غير صلاحيات</span>') + '</div>') + '</td>' +
          '<td>' + (u.active ? '<span class="badge badge-ok">نشط</span>' : '<span class="badge badge-danger">موقوف</span>') + '</td>' +
          '<td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-edit-user="' + u.id + '">تعديل</button></td></tr>';
      }).join('') + '</tbody></table>';

    $('#doctorsTable').innerHTML = '<table class="tbl"><thead><tr><th>الدكتور</th><th>التخصص</th><th>مواعيد الدوام</th><th>الإجازة الأسبوعية</th><th>الحالة</th><th></th></tr></thead><tbody>' +
      S.doctors.map(function (d) {
        return '<tr><td><strong>' + esc(d.name) + '</strong></td><td>' + esc(d.specialty || '—') + '</td>' +
          '<td>' + DB.fmtTime(d.start) + ' – ' + DB.fmtTime(d.end) + '</td>' +
          '<td>' + (d.offDays.length ? d.offDays.map(function (n) { return DAYS[n]; }).join('، ') : '—') + '</td>' +
          '<td>' + (d.active ? '<span class="badge badge-ok">شغّال</span>' : '<span class="badge badge-muted">مخفي</span>') + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" data-edit-doc="' + d.id + '">تعديل</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  /* ---------- أجزاء النماذج ---------- */
  function permsHTML(selected) {
    return '<div class="perm-grid">' + S.features.map(function (f) {
      return '<label class="perm"><input type="checkbox" name="perm" value="' + f.key + '"' + (selected.indexOf(f.key) > -1 ? ' checked' : '') + '><span><strong>' + esc(f.label) + '</strong><small>' + esc(f.desc) + '</small></span></label>';
    }).join('') + '</div>';
  }
  function readPerms(root) {
    return Array.prototype.map.call(root.querySelectorAll('input[name=perm]:checked'), function (i) { return i.value; });
  }
  function setPerms(root, list) {
    Array.prototype.forEach.call(root.querySelectorAll('input[name=perm]'), function (i) { i.checked = list.indexOf(i.value) > -1; });
  }
  function daysHTML(off) {
    return '<div class="days">' + DAYS.map(function (n, i) {
      return '<label><input type="checkbox" name="off" value="' + i + '"' + (off.indexOf(i) > -1 ? ' checked' : '') + '> ' + n + '</label>';
    }).join('') + '</div>';
  }
  function readDays(root) {
    return Array.prototype.map.call(root.querySelectorAll('input[name=off]:checked'), function (i) { return Number(i.value); });
  }
  function doctorOptions(sel, withNew) {
    return '<option value="">— اختار —</option>' + S.doctors.filter(function (d) { return d.active || d.id === sel; }).map(function (d) {
      return '<option value="' + d.id + '"' + (d.id === sel ? ' selected' : '') + '>' + esc(d.name) + '</option>';
    }).join('') + (withNew ? '<option value="__new">+ دكتور جديد</option>' : '');
  }

  /* ---------- حساب جديد ---------- */
  function newUserForm() {
    var body = Admin.modal('حساب جديد',
      '<form id="nu"><div class="row2"><div class="field"><label>الاسم *</label><input name="name" required></div>' +
      '<div class="field"><label>اسم المستخدم * (إنجليزي)</label><input name="username" dir="ltr" style="text-align:right" autocomplete="off" required></div></div>' +
      '<div class="row2"><div class="field"><label>نوع الحساب</label><select name="role"><option value="reception">استقبال / موظف</option><option value="doctor">دكتور</option></select></div>' +
      '<div class="field"><label>كلمة المرور (اختياري)</label><input name="password" dir="ltr" style="text-align:right" placeholder="سيبها فاضية وهنولّد واحدة" autocomplete="new-password"></div></div>' +
      '<div class="field"><label>الدكتور المربوط بالحساب</label><select name="doctor">' + doctorOptions('', true) + '</select></div>' +
      '<div id="nd" hidden><div class="row2"><div class="field"><label>التخصص</label><input name="specialty"></div>' +
      '<div class="field"><label>الدوام</label><div style="display:flex;gap:8px"><input type="time" name="start" value="10:00"><input type="time" name="end" value="20:00"></div></div></div>' +
      '<label style="font-weight:700;font-size:13px">الإجازة الأسبوعية</label>' + daysHTML([5]) + '</div>' +
      '<h4 style="margin:6px 0 4px">الصلاحيات</h4>' + permsHTML(S.defaults.reception) +
      '<div class="field-error" id="nuErr"></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" type="submit">إنشاء الحساب</button><button class="btn btn-ghost" type="button" id="nuCancel">إلغاء</button></div></form>', true);
    var f = $('#nu', body);
    function sync() {
      var doc = f.role.value === 'doctor';
      f.doctor.closest('.field').hidden = !doc && f.doctor.value === '';
      $('#nd', body).hidden = f.doctor.value !== '__new';
    }
    f.role.addEventListener('change', function () {
      setPerms(body, S.defaults[f.role.value]);
      f.doctor.closest('.field').hidden = f.role.value !== 'doctor';
      sync();
    });
    f.doctor.addEventListener('change', sync);
    f.doctor.closest('.field').hidden = true;
    $('#nuCancel', body).addEventListener('click', Admin.closeModal);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = { name: f.name.value.trim(), username: f.username.value.trim(), role: f.role.value, permissions: readPerms(body) };
      if (f.password.value) payload.password = f.password.value;
      if (f.doctor.value === '__new') {
        payload.newDoctor = { specialty: f.specialty.value.trim(), start: f.start.value, end: f.end.value, offDays: readDays(body) };
      } else if (f.doctor.value) payload.doctorId = f.doctor.value;
      DB.api('POST', '/api/admin/users', payload).then(function (r) {
        showCredentials(payload.name, payload.username, r.password || payload.password, !!r.password);
        DB.refresh(); return load();
      }).catch(function (ex) { $('#nuErr', body).textContent = ex.message; });
    });
  }

  function showCredentials(name, username, password, generated) {
    var body = Admin.modal('تم إنشاء الحساب',
      '<p>ابعت البيانات دي للموظف (<strong>' + esc(name) + '</strong>):</p>' +
      '<div class="cred">اسم المستخدم: <code>' + esc(username) + '</code><br>كلمة المرور: <code>' + esc(password) + '</code></div>' +
      '<p style="color:var(--muted);font-size:13px">' + (generated ? 'كلمة المرور اتولّدت دلوقتي وبتظهر مرة واحدة بس. ' : '') + 'الموظف يقدر يغيّرها من «تغيير كلمة المرور» في القائمة الجانبية.</p>' +
      '<div class="modal-actions"><button class="btn btn-primary" id="cp">نسخ البيانات</button><button class="btn btn-ghost" id="cl">تم</button></div>');
    $('#cl', body).addEventListener('click', Admin.closeModal);
    $('#cp', body).addEventListener('click', function () {
      var txt = 'اسم المستخدم: ' + username + '\nكلمة المرور: ' + password;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { Admin.toast('اتنسخت'); }, function () { Admin.toast('انسخها يدوي من فوق', 'error'); });
    });
  }

  /* ---------- تعديل حساب ---------- */
  function editUserForm(id) {
    var u = S.users.filter(function (x) { return x.id === id; })[0]; if (!u) return;
    var self = u.id === Admin.user.id, owner = u.role === 'owner';
    var body = Admin.modal('تعديل: ' + u.name,
      '<form id="eu"><div class="row2"><div class="field"><label>الاسم</label><input name="name" value="' + esc(u.name) + '" required></div>' +
      '<div class="field"><label>اسم المستخدم</label><input value="' + esc(u.username) + '" dir="ltr" style="text-align:right" disabled></div></div>' +
      (owner ? '' : '<div class="field"><label>الدكتور المربوط بالحساب</label><select name="doctor">' + doctorOptions(u.doctorId || '', false) + '</select></div>') +
      (owner ? '<p style="color:var(--muted)">حساب المؤسس عنده كل الصلاحيات ومش ممكن يتقيّد أو يتوقف.</p>' :
        '<h4 style="margin:6px 0 4px">الصلاحيات</h4>' + permsHTML(u.permissions) +
        '<div style="margin:-6px 0 12px"><button type="button" class="btn btn-ghost btn-sm" id="defPerm">رجّع الصلاحيات الافتراضية للنوع ده</button></div>') +
      '<div class="field"><label>كلمة مرور جديدة (اتركها فاضية لو مش عايز تغيّرها)</label><input name="password" dir="ltr" style="text-align:right" autocomplete="new-password"></div>' +
      (owner ? '' : '<label class="perm" style="margin-bottom:14px"><input type="checkbox" name="active"' + (u.active ? ' checked' : '') + '><span><strong>الحساب نشط</strong><small>لو اتشال، الموظف مش هيقدر يدخل (حتى لو لسه فاتح اللوحة).</small></span></label>') +
      '<div class="field-error" id="euErr"></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" type="submit">حفظ</button><button class="btn btn-ghost" type="button" id="euCancel">إلغاء</button>' +
      (owner || self ? '' : '<button class="btn btn-danger" type="button" id="euDel" style="margin-inline-start:auto">حذف الحساب</button>') + '</div></form>', true);
    var f = $('#eu', body);
    $('#euCancel', body).addEventListener('click', Admin.closeModal);
    var dp = $('#defPerm', body); if (dp) dp.addEventListener('click', function () { setPerms(body, S.defaults[u.role] || []); });
    var del = $('#euDel', body);
    if (del) del.addEventListener('click', function () {
      if (!confirm('حذف حساب ' + u.name + ' نهائياً؟ (لو عايز توقفه مؤقتاً، شيل علامة «الحساب نشط»)')) return;
      DB.api('DELETE', '/api/admin/users/' + u.id).then(function () { Admin.closeModal(); Admin.toast('اتحذف'); return load(); }).catch(fail);
    });
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var patch = { name: f.name.value.trim() };
      if (f.password.value) patch.password = f.password.value;
      if (!owner) {
        patch.permissions = readPerms(body); patch.doctorId = f.doctor.value; patch.active = f.active.checked;
        if (self) delete patch.active;
      }
      DB.api('PATCH', '/api/admin/users/' + u.id, patch).then(function () {
        Admin.closeModal(); Admin.toast('تم الحفظ'); if (f.password.value) Admin.toast('كلمة المرور اتغيّرت'); return load();
      }).catch(function (ex) { $('#euErr', body).textContent = ex.message; });
    });
  }

  /* ---------- دكتور (جديد / تعديل) ---------- */
  function doctorForm(id) {
    var d = id ? docById(id) : { name: '', specialty: '', start: '10:00', end: '20:00', offDays: [5], active: true };
    var body = Admin.modal(id ? 'تعديل الدكتور' : 'دكتور جديد',
      '<form id="df"><div class="row2"><div class="field"><label>الاسم *</label><input name="name" value="' + esc(d.name) + '" required></div>' +
      '<div class="field"><label>التخصص</label><input name="specialty" value="' + esc(d.specialty) + '"></div></div>' +
      '<div class="row2"><div class="field"><label>بداية الدوام</label><input type="time" name="start" value="' + d.start + '"></div>' +
      '<div class="field"><label>نهاية الدوام</label><input type="time" name="end" value="' + d.end + '"></div></div>' +
      '<label style="font-weight:700;font-size:13px">الإجازة الأسبوعية</label>' + daysHTML(d.offDays) +
      '<label class="perm" style="margin-bottom:14px"><input type="checkbox" name="active"' + (d.active ? ' checked' : '') + '><span><strong>ظاهر في الحجز</strong><small>لو اتشال بيختفي من اختيارات الحجز، ومواعيده القديمة تفضل زي ما هي.</small></span></label>' +
      '<div class="field-error" id="dfErr"></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" type="submit">حفظ</button><button class="btn btn-ghost" type="button" id="dfCancel">إلغاء</button></div></form>');
    var f = $('#df', body);
    $('#dfCancel', body).addEventListener('click', Admin.closeModal);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var payload = { name: f.name.value.trim(), specialty: f.specialty.value.trim(), start: f.start.value, end: f.end.value, offDays: readDays(body), active: f.active.checked };
      DB.api(id ? 'PATCH' : 'POST', '/api/admin/doctors' + (id ? '/' + id : ''), payload)
        .then(function () { Admin.closeModal(); Admin.toast('تم الحفظ'); DB.refresh(); return load(); })
        .catch(function (ex) { $('#dfErr', body).textContent = ex.message; });
    });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-edit-user]'); if (a) editUserForm(a.dataset.editUser);
    var b = e.target.closest('[data-edit-doc]'); if (b) doctorForm(b.dataset.editDoc);
  });
  $('#addUser').addEventListener('click', newUserForm);
  $('#addDoctor').addEventListener('click', function () { doctorForm(null); });
  load();
})();
