/* ============================================================
   store.js — طبقة البيانات (localStorage)
   كل صفحات الموقع واللوحة بتتعامل مع البيانات من خلال DB بس.
   لما تربطه بسيرفر حقيقي (Express + Postgres) بدّل الدوال اللي
   جوه الملف ده بطلبات fetch، وباقي الملفات مش هتتغير.
   ============================================================ */
(function (g) {
  'use strict';
  var C = g.CLINIC;
  var KEY = 'smileDental.v1';
  var SESSION_KEY = 'smileDental.session';
  var data = null;
  var memory = null;

  /* ---------- أدوات ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return toISO(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d); }
  function dayOfWeek(iso) { return new Date(iso + 'T00:00:00').getDay(); }
  function uid(p) { return (p || 'x') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toMin(t) { var p = t.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }

  function fmtDate(iso, long) {
    var o = long === false ? { day: 'numeric', month: 'short' } : { weekday: 'long', day: 'numeric', month: 'long' };
    return new Date(iso + 'T00:00:00').toLocaleDateString('ar-EG-u-nu-latn', o);
  }
  function fmtTime(t) {
    if (!t) return '';
    var h = +t.slice(0, 2), m = t.slice(3, 5);
    return ((h % 12) || 12) + ':' + m + ' ' + (h >= 12 ? 'م' : 'ص');
  }
  function money(n) { return Number(n || 0).toLocaleString('ar-EG-u-nu-latn') + ' ج.م'; }
  function age(birth) {
    if (!birth) return '';
    var b = new Date(birth), n = new Date();
    var a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  function normPhone(p) {
    p = String(p || '').replace(/[^\d]/g, '');
    if (p.indexOf('0020') === 0) p = p.slice(4);
    else if (p.indexOf('20') === 0 && p.length === 12) p = p.slice(2);
    if (p.charAt(0) !== '0' && p.length === 10) p = '0' + p;
    return p;
  }
  function waLink(phone, text) {
    var p = normPhone(phone);
    if (p.charAt(0) === '0') p = '2' + p;
    return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text || '');
  }

  /* ---------- تخزين ---------- */
  function readStore() {
    try { var r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; }
    catch (e) { return memory; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { memory = data; }
  }

  function newPatient(o) {
    return Object.assign({
      id: uid('p'), name: '', phone: '', birth: '', gender: '', address: '', createdAt: today(),
      medical: { pressure: false, diabetes: false, heart: false, anesthesia: false, pregnant: false, allergies: '', medications: '', notes: '' },
      chart: {}, works: []
    }, o || {});
  }

  /* ---------- بيانات تجريبية ---------- */
  function seed() {
    var t = today();
    var d = {
      version: 1,
      settings: { reminderTemplate: C.reminderTemplate },
      doctors: [
        { id: 'd1', name: 'د. أحمد سمير', specialty: 'تجميل وزراعة الأسنان', start: '10:00', end: '20:00', offDays: [5] },
        { id: 'd2', name: 'د. منى حسن', specialty: 'أسنان الأطفال والتقويم', start: '12:00', end: '22:00', offDays: [5] },
        { id: 'd3', name: 'د. كريم عادل', specialty: 'علاج الجذور والحشو', start: '10:00', end: '18:00', offDays: [5] }
      ],
      services: [
        { id: 's0', name: 'كشف واستشارة', price: 200, duration: 30, icon: 'tooth', site: false },
        { id: 's1', name: 'التبييض والفينيرز', price: 1500, duration: 60, icon: 'tooth', site: true, desc: 'ابتسامة أفتح بنتيجة طبيعية، وتصميم فينيرز على حسب شكل وجهك.' },
        { id: 's2', name: 'تجميل الابتسامة', price: 2500, duration: 60, icon: 'sparkles', site: true, desc: 'تغيير كامل للابتسامة بخطة مصممة على حالتك، وحالات قبل وبعد بتتكلم عن نفسها.' },
        { id: 's3', name: 'التركيبات', price: 1200, duration: 60, icon: 'shield', site: true, desc: 'زيركون وسيراميك وإي ماكس، نختار معاك الأنسب لحالتك.' },
        { id: 's4', name: 'الجسور والزراعة', price: 6000, duration: 90, icon: 'implant', site: true, desc: 'عوّض الأسنان الناقصة بحل ثابت ومريح يرجّعلك الثقة في الأكل والضحك.' },
        { id: 's5', name: 'أسنان الأطفال', price: 300, duration: 30, icon: 'smile', site: true, desc: 'زيارة لطيفة بتخلّي طفلك يحب الدكتور، وبداية صحيحة لعادات العناية.' },
        { id: 's6', name: 'العلاج والحشو', price: 400, duration: 45, icon: 'plus', site: true, desc: 'كشف وتشخيص دقيق وعلاج للتسوس والعصب بأدوات معقمة.' },
        { id: 's7', name: 'تقويم الأسنان', price: 15000, duration: 45, icon: 'braces', site: true, desc: 'تقويم معدني أو شفاف بخطة واضحة ومتابعة دورية لحد ما توصل للابتسامة اللي عاوزها.' },
        { id: 's8', name: 'تنظيف وتلميع', price: 350, duration: 30, icon: 'drop', site: true, desc: 'إزالة الجير والتصبغات وتلميع الأسنان لثة صحية ونفس منعش.' },
        { id: 's9', name: 'الخلع والجراحة', price: 500, duration: 30, icon: 'cross', site: true, desc: 'خلع بسيط أو جراحي بتخدير موضعي مريح وبأقل ألم ممكن.' }
      ],
      users: [
        { id: 'u1', username: 'reception', password: '1234', name: 'الريسبشن', role: 'reception' },
        { id: 'u2', username: 'dr.ahmed', password: '1234', name: 'د. أحمد سمير', role: 'doctor', doctorId: 'd1' },
        { id: 'u3', username: 'dr.mona', password: '1234', name: 'د. منى حسن', role: 'doctor', doctorId: 'd2' },
        { id: 'u4', username: 'dr.karim', password: '1234', name: 'د. كريم عادل', role: 'doctor', doctorId: 'd3' }
      ],
      reviews: [
        { id: 'r1', name: 'سارة محمود', text: 'تجربة ممتازة، الدكتور شرحلي كل خطوة قبل ما يبدأ ومحسيتش بأي وجع. النتيجة فاقت توقعاتي.', rating: 5 },
        { id: 'r2', name: 'محمد علي', text: 'جبت ابني الصغير وكان خايف جداً، وطلع من العيادة مبسوط وعاوز يرجع تاني. شكراً لكل الفريق.', rating: 5 },
        { id: 'r3', name: 'نورهان أحمد', text: 'عملت تبييض وفينيرز والنتيجة طبيعية جداً. العيادة نضيفة والمواعيد منظمة.', rating: 5 }
      ],
      patients: [], appointments: [], invoices: []
    };
    var p1 = newPatient({ id: 'p1', name: 'سارة محمود', phone: '01012345678', birth: '1994-05-12', gender: 'f' });
    p1.medical.anesthesia = true; p1.medical.allergies = 'حساسية من البنسلين';
    p1.chart = { 16: { status: 'filling', note: 'حشو ضرس سفلي', date: addDays(t, -20) }, 26: { status: 'cavity', note: 'تسوس محتاج حشو', date: addDays(t, -20) } };
    p1.works = [{ id: 'w1', date: addDays(t, -20), doctorId: 'd3', tooth: '16', procedure: 'العلاج والحشو', notes: 'حشو ضوئي' }];
    var p2 = newPatient({ id: 'p2', name: 'محمد علي', phone: '01123456789', birth: '1985-11-03', gender: 'm' });
    p2.medical.pressure = true; p2.medical.diabetes = true; p2.medical.medications = 'أدوية ضغط وسكر صباحاً';
    p2.chart = { 36: { status: 'root', note: 'علاج عصب — الجلسة التانية', date: addDays(t, -7) }, 48: { status: 'missing', note: 'مخلوع', date: addDays(t, -60) } };
    var p3 = newPatient({ id: 'p3', name: 'نورهان أحمد', phone: '01234567890', birth: '2000-02-20', gender: 'f' });
    var p4 = newPatient({ id: 'p4', name: 'يوسف خالد', phone: '01512345678', birth: '2016-08-09', gender: 'm' });
    d.patients = [p1, p2, p3, p4];
    d.appointments = [
      { id: 'a1', patientId: 'p1', doctorId: 'd1', serviceId: 's1', date: t, time: '11:00', status: 'confirmed', notes: '', source: 'admin', reminded: false, createdAt: t },
      { id: 'a2', patientId: 'p2', doctorId: 'd3', serviceId: 's6', date: t, time: '12:00', status: 'pending', notes: 'جلسة عصب تانية', source: 'site', reminded: false, createdAt: t },
      { id: 'a3', patientId: 'p4', doctorId: 'd2', serviceId: 's5', date: t, time: '14:00', status: 'confirmed', notes: '', source: 'site', reminded: false, createdAt: t },
      { id: 'a4', patientId: 'p3', doctorId: 'd1', serviceId: 's2', date: addDays(t, 1), time: '13:00', status: 'confirmed', notes: '', source: 'site', reminded: false, createdAt: t },
      { id: 'a5', patientId: 'p2', doctorId: 'd3', serviceId: 's8', date: addDays(t, 1), time: '11:00', status: 'pending', notes: '', source: 'site', reminded: false, createdAt: t },
      { id: 'a6', patientId: 'p1', doctorId: 'd2', serviceId: 's7', date: addDays(t, 2), time: '16:00', status: 'pending', notes: '', source: 'site', reminded: false, createdAt: t }
    ];
    d.invoices = [
      { id: 'i1', patientId: 'p1', date: addDays(t, -20), description: 'حشو ضوئي', total: 400, payments: [{ id: 'pay1', date: addDays(t, -20), amount: 400, method: 'cash' }] },
      { id: 'i2', patientId: 'p2', date: addDays(t, -7), description: 'علاج عصب (3 جلسات)', total: 1800, payments: [{ id: 'pay2', date: addDays(t, -7), amount: 600, method: 'cash' }] }
    ];
    return d;
  }

  function load() {
    var d = readStore();
    if (!d || !d.version) { d = seed(); data = d; save(); }
    data = d;
  }

  /* ---------- CRUD ---------- */
  function all(name) { return data[name]; }
  function find(name, id) { return data[name].find(function (x) { return x.id === id; }) || null; }
  function insert(name, obj) { if (!obj.id) obj.id = uid(name.charAt(0)); data[name].push(obj); save(); return obj; }
  function update(name, id, patch) { var o = find(name, id); if (!o) return null; Object.assign(o, patch); save(); return o; }
  function remove(name, id) { data[name] = data[name].filter(function (x) { return x.id !== id; }); save(); }
  function removePatient(id) {
    data.appointments = data.appointments.filter(function (a) { return a.patientId !== id; });
    data.invoices = data.invoices.filter(function (i) { return i.patientId !== id; });
    remove('patients', id);
  }

  /* ---------- المواعيد المتاحة ---------- */
  function isOffDay(doc, date) {
    var off = doc.offDays || C.offDays || [];
    return off.indexOf(dayOfWeek(date)) > -1;
  }
  function apptLength(a) {
    var s = find('services', a.serviceId), step = C.slotMinutes || 30;
    return Math.max(step, s ? s.duration : step);
  }
  // opts.ignoreNow: السماح بحجز مواعيد عدّت النهارده (للريسبشن) — opts.exceptId: تجاهل موعد بعينه (للتعديل)
  function getSlots(doctorId, date, serviceId, opts) {
    opts = opts || {};
    var doc = find('doctors', doctorId);
    if (!doc || !date || isOffDay(doc, date)) return { closed: true, slots: [] };
    var svc = serviceId ? find('services', serviceId) : null;
    var step = C.slotMinutes || 30;
    var need = Math.max(step, svc ? svc.duration : step);
    var start = toMin(doc.start), end = toMin(doc.end);
    var busy = data.appointments.filter(function (a) {
      return a.doctorId === doctorId && a.date === date && a.id !== opts.exceptId &&
        a.status !== 'cancelled' && a.status !== 'noshow';
    }).map(function (a) { var s = toMin(a.time); return [s, s + apptLength(a)]; });
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), isToday = date === today();
    var slots = [];
    for (var t = start; t + need <= end; t += step) {
      var ok = true;
      if (!opts.ignoreNow && (date < today() || (isToday && t <= nowMin))) ok = false;
      for (var i = 0; i < busy.length; i++) { if (t < busy[i][1] && t + need > busy[i][0]) ok = false; }
      slots.push({ time: fromMin(t), available: !!ok });
    }
    return { closed: false, slots: slots };
  }

  function createBooking(b) {
    var phone = normPhone(b.phone);
    var chk = getSlots(b.doctorId, b.date, b.serviceId, { ignoreNow: b.ignoreNow });
    var slot = chk.slots.filter(function (s) { return s.time === b.time; })[0];
    if (!slot || !slot.available) throw new Error('الميعاد ده اتحجز من شوية، اختار ميعاد تاني.');
    var p = b.patientId ? find('patients', b.patientId) : data.patients.filter(function (x) { return x.phone === phone; })[0];
    if (!p) p = insert('patients', newPatient({ name: b.name, phone: phone }));
    return insert('appointments', {
      patientId: p.id, doctorId: b.doctorId, serviceId: b.serviceId, date: b.date, time: b.time,
      status: b.status || 'pending', notes: b.notes || '', source: b.source || 'site', reminded: false, createdAt: today()
    });
  }

  /* ---------- الحسابات ---------- */
  function paid(inv) { return (inv.payments || []).reduce(function (s, p) { return s + Number(p.amount || 0); }, 0); }
  function remaining(inv) { return Math.max(0, Number(inv.total) - paid(inv)); }
  function invStatus(inv) { var p = paid(inv); return p >= Number(inv.total) ? 'paid' : (p > 0 ? 'partial' : 'unpaid'); }
  function balance(patientId) {
    return data.invoices.filter(function (i) { return i.patientId === patientId; })
      .reduce(function (s, i) { return s + remaining(i); }, 0);
  }

  /* ---------- الدخول ---------- */
  function login(username, password) {
    var u = data.users.filter(function (x) { return x.username === String(username).trim() && x.password === password; })[0];
    if (!u) return null;
    var s = { id: u.id, username: u.username, name: u.name, role: u.role, doctorId: u.doctorId || null };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
  }
  function session() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) { return null; } }
  function logout() { sessionStorage.removeItem(SESSION_KEY); }

  function settings() { return data.settings || (data.settings = {}); }
  function saveSettings(patch) { Object.assign(settings(), patch); save(); }

  function resetDemo() { data = seed(); save(); }

  load();

  // مزامنة بين التابات (مثلاً حجز جديد من الموقع يظهر في اللوحة فوراً)
  g.addEventListener('storage', function (e) {
    if (e.key === KEY && e.newValue) {
      try { data = JSON.parse(e.newValue); } catch (err) { return; }
      if (typeof DB.onChange === 'function') DB.onChange();
    }
  });

  var DB = g.DB = {
    all: all, find: find, insert: insert, update: update, remove: remove, removePatient: removePatient, commit: save,
    newPatient: newPatient, getSlots: getSlots, createBooking: createBooking, isOffDay: isOffDay, apptLength: apptLength,
    paid: paid, remaining: remaining, invStatus: invStatus, balance: balance,
    login: login, session: session, logout: logout, resetDemo: resetDemo, settings: settings, saveSettings: saveSettings,
    today: today, addDays: addDays, dayOfWeek: dayOfWeek, toMin: toMin, fromMin: fromMin, uid: uid,
    fmtDate: fmtDate, fmtTime: fmtTime, money: money, age: age, normPhone: normPhone, waLink: waLink,
    onChange: null
  };
})(window);
