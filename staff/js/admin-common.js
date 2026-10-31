/* ================= admin-common.js — الهيكل المشترك للوحة ================= */
(function (g) {
  'use strict';

  var NAV = [
    { id: 'dashboard', href: 'index.html', label: 'الرئيسية', icon: 'home', roles: ['reception', 'doctor'] },
    { id: 'calendar', href: 'calendar.html', label: 'أجندة المواعيد', icon: 'calendar', roles: ['reception', 'doctor'] },
    { id: 'patients', href: 'patients.html', label: 'المرضى', icon: 'users', roles: ['reception', 'doctor'] },
    { id: 'billing', href: 'billing.html', label: 'الحسابات والفواتير', icon: 'card', roles: ['reception'] },
    { id: 'reminders', href: 'reminders.html', label: 'تذكيرات واتساب', icon: 'bell', roles: ['reception'] }
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
      if (item && item.roles.indexOf(u.role) < 0) { location.href = 'index.html'; return false; }
      Admin.user = u;
      document.body.classList.add('admin');

      var links = NAV.filter(function (n) { return n.roles.indexOf(u.role) > -1; }).map(function (n) {
        return '<a href="' + n.href + '" class="' + (n.id === pageId ? 'active' : '') + '">' + Icons.get(n.icon, 20) + n.label + '</a>';
      }).join('');
      var roleLabel = u.role === 'doctor' ? 'طبيب' : 'استقبال وحسابات';
      document.getElementById('sidebar').innerHTML =
        '<a class="brand" href="../index.html" title="الموقع العام"><img src="../images/logo.jpg" alt=""><div><strong>' + esc(CLINIC.name) + '</strong><small>لوحة الإدارة</small></div></a>' +
        '<nav class="side-nav">' + links + '</nav>' +
        '<div class="side-user"><strong>' + esc(u.name) + '</strong><small>' + roleLabel + '</small>' +
        '<button id="logoutBtn">' + Icons.get('logout', 18) + 'تسجيل الخروج</button></div>';
      document.getElementById('topbar').innerHTML =
        '<button class="menu-btn" id="menuBtn" aria-label="القائمة">' + Icons.get('menu', 26) + '</button>' +
        '<h1>' + esc(title) + '</h1><span class="date">' + DB.fmtDate(DB.today()) + '</span>';
      document.getElementById('logoutBtn').addEventListener('click', function () { DB.logout(); location.href = 'login.html'; });
      document.getElementById('menuBtn').addEventListener('click', function () { document.getElementById('sidebar').classList.toggle('open'); });
      return true;
    },

    isDoctor: function () { return !!Admin.user && Admin.user.role === 'doctor'; },
    isReception: function () { return !!Admin.user && Admin.user.role === 'reception'; },

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
