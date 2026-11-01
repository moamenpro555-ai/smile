/* ================= admin-common.js — الهيكل المشترك للوحة ================= */
(function (g) {
  'use strict';

  // needs = لازم يكون عند المستخدم واحدة من الخصائص دي (المؤسس عنده كلهم) — owner = للمؤسس بس
  var NAV = [
    { id: 'dashboard', href: 'index.html', label: 'الرئيسية', icon: 'home' },
    { id: 'calendar', href: 'calendar.html', label: 'أجندة المواعيد', icon: 'calendar', needs: ['appointments', 'book'] },
    { id: 'patients', href: 'patients.html', label: 'المرضى', icon: 'users', needs: ['patients'] },
    { id: 'billing', href: 'billing.html', label: 'الحسابات والفواتير', icon: 'card', needs: ['billing'] },
    { id: 'reminders', href: 'reminders.html', label: 'تذكيرات واتساب', icon: 'bell', needs: ['reminders'] },
    { id: 'users', href: 'users.html', label: 'الحسابات والصلاحيات', icon: 'shield', owner: true }
  ];

  var STATUS = {
    pending: { label: 'جديد – محتاج تأكيد', cls: 'warn' },
    confirmed: { label: 'مؤكد', cls: 'info' },
    arrived: { label: 'حضر', cls: 'teal' },
    done: { label: 'تم الكشف', cls: 'ok' },
    cancelled: { label: 'اعتذر / ألغى', cls: 'danger' },
    noshow: { label: 'لم يحضر', cls: 'muted' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var Admin = {
    user: null, esc: esc, STATUS: STATUS,

    // يتحقق من الدخول والصلاحية ويرسم القائمة الجانبية والشريط العلوي
    init: function (pageId, title) {
      var u = DB.session();
      if (!u) { location.href = 'login.html'; return false; }
      var item = NAV.filter(function (n) { return n.id === pageId; })[0];
      Admin.user = u;
      if (item && !Admin.allowed(item)) { location.href = 'index.html'; return false; }
      document.body.classList.add('admin');

      var links = NAV.filter(Admin.allowed).map(function (n) {
        return '<a href="' + n.href + '" class="' + (n.id === pageId ? 'active' : '') + '">' + Icons.get(n.icon, 20) + n.label + '</a>';
      }).join('');
      var roleLabel = u.role === 'owner' ? 'المؤسس' : u.role === 'doctor' ? 'طبيب' : 'موظف استقبال';
      document.getElementById('sidebar').innerHTML =
        '<a class="brand" href="../index.html" title="الموقع العام"><img src="../images/logo.jpg" alt=""><div><strong>' + esc(CLINIC.name) + '</strong><small>لوحة الإدارة</small></div></a>' +
        '<nav class="side-nav">' + links + '</nav>' +
        '<div class="side-user"><strong>' + esc(u.name) + '</strong><small>' + roleLabel + '</small>' +
        '<button id="pwBtn">' + Icons.get('shield', 18) + 'تغيير كلمة المرور</button>' +
        '<button id="logoutBtn">' + Icons.get('logout', 18) + 'تسجيل الخروج</button></div>';
      document.getElementById('topbar').innerHTML =
        '<button class="menu-btn" id="menuBtn" aria-label="القائمة">' + Icons.get('menu', 26) + '</button>' +
        '<h1>' + esc(title) + '</h1><span class="date">' + DB.fmtDate(DB.today()) + '</span>';
      document.getElementById('logoutBtn').addEventListener('click', function () { DB.logout(); location.href = 'login.html'; });
      document.getElementById('pwBtn').addEventListener('click', Admin.passwordForm);
      document.getElementById('menuBtn').addEventListener('click', function () { document.getElementById('sidebar').classList.toggle('open'); });
      return true;
    },

    // الصلاحيات: المؤسس عنده كل الخصائص، والباقي حسب اللي المؤسس إداهم
    can: function (f) { var u = Admin.user; return !!u && (u.role === 'owner' || (u.permissions || []).indexOf(f) > -1); },
    canAny: function (list) { return list.some(Admin.can); },
    isOwner: function () { return !!Admin.user && Admin.user.role === 'owner'; },
    allowed: function (item) {
      if (item.owner) return Admin.isOwner();
      return !item.needs || Admin.canAny(item.needs);
    },
    // "نطاق الدكتور": من غير خاصية «مواعيد كل الدكاترة» بيشوف مواعيد الدكتور المربوط بحسابه بس
    isDoctor: function () { return !!Admin.user && !Admin.can('all_doctors'); },

    passwordForm: function () {
      var body = Admin.modal('تغيير كلمة المرور',
        '<form id="pwf"><div class="field"><label>كلمة المرور الحالية</label><input type="password" name="cur" autocomplete="current-password" required></div>' +
        '<div class="field"><label>كلمة المرور الجديدة (6 حروف على الأقل)</label><input type="password" name="nxt" autocomplete="new-password" minlength="6" required></div>' +
        '<div class="field-error" id="pwErr"></div><div class="modal-actions"><button class="btn btn-primary" type="submit">حفظ</button><button class="btn btn-ghost" type="button" id="pwCancel">إلغاء</button></div></form>');
      body.querySelector('#pwCancel').addEventListener('click', Admin.closeModal);
      body.querySelector('#pwf').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        DB.api('POST', '/api/auth/change-password', { current: f.cur.value, next: f.nxt.value })
          .then(function () { Admin.closeModal(); Admin.toast('تم تغيير كلمة المرور'); })
          .catch(function (ex) { body.querySelector('#pwErr').textContent = ex.message; });
      });
    },

    // مواعيد الدكتور بس لو المستخدم دكتور، وكل المواعيد للريسبشن
    myAppts: function () {
      return DB.all('appointments').filter(function (a) { return !Admin.isDoctor() || a.doctorId === Admin.user.doctorId; });
    },
    byTime: function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); },

    badge: function (status) {
      var s = STATUS[status] || { label: status, cls: 'muted' };
      return '<span class="badge badge-' + s.cls + '">' + s.label + '</span>';
    },
    statusOptions: function (current) {
      return Object.keys(STATUS).map(function (k) {
        return '<option value="' + k + '"' + (k === current ? ' selected' : '') + '>' + STATUS[k].label + '</option>';
      }).join('');
    },
    setStatus: function (id, status) { DB.update('appointments', id, { status: status }); },

    patientName: function (id) { var p = DB.find('patients', id); return p ? p.name : '—'; },
    doctorName: function (id) { var d = DB.find('doctors', id); return d ? d.name : '—'; },
    serviceName: function (id) { var s = DB.find('services', id); return s ? s.name : '—'; },
    alertChips: function (p) {
      var m = p.medical || {}, out = [];
      if (m.pressure) out.push('ضغط'); if (m.diabetes) out.push('سكر'); if (m.heart) out.push('قلب');
      if (m.anesthesia) out.push('حساسية بنج'); if (m.pregnant) out.push('حمل');
      if (m.allergies) out.push('حساسية');
      return out.map(function (x) { return '<span class="alert-chip">' + x + '</span>'; }).join('');
    },

    toast: function (msg, type) {
      var t = document.createElement('div');
      t.className = 'toast' + (type === 'error' ? ' error' : '');
      t.textContent = msg; document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 2600);
    },

    // يفتح نافذة ويرجّع عنصر الجسم عشان نحط فيه المحتوى
    modal: function (title, html, wide) {
      Admin.closeModal();
      var o = document.createElement('div');
      o.className = 'modal-overlay'; o.id = 'modalOverlay';
      o.innerHTML = '<div class="modal' + (wide ? ' wide' : '') + '"><div class="modal-head"><h3>' + esc(title) + '</h3>' +
        '<button type="button" aria-label="إغلاق">' + Icons.get('x', 22) + '</button></div><div class="modal-body">' + html + '</div></div>';
      document.body.appendChild(o);
      o.addEventListener('mousedown', function (e) { if (e.target === o) Admin.closeModal(); });
      o.querySelector('.modal-head button').addEventListener('click', Admin.closeModal);
      return o.querySelector('.modal-body');
    },
    closeModal: function () { var o = document.getElementById('modalOverlay'); if (o) o.remove(); }
  };

  g.Admin = Admin;
})(window);
