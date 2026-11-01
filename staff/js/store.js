/* ============================================================
   store.js — طبقة البيانات (متصلة بالـ API / Neon)
   كل صفحات اللوحة بتتعامل مع البيانات من خلال DB بس، بنفس الدوال القديمة.
   - عند الفتح: بنجيب لقطة كاملة من السيرفر (DB.ready).
   - أي تعديل بيتحفظ محلياً فوراً وبيتبعت للسيرفر تلقائي (دفعة واحدة).
   - لو السيرفر رفض (مثلاً ميعاد متحجز) بنرجّع البيانات الصح ونطلع رسالة.
   ============================================================ */
(function (g) {
  'use strict';
  var C = g.CLINIC;
  var API = String(C.apiBase || '').replace(/\/+$/, '');
  var TOKEN_KEY = 'smileDental.token';
  var SESSION_KEY = 'smileDental.session';
  var COLLS = ['patients', 'appointments', 'invoices', 'requests'];
  var data = emptyData();
  var synced = {};          // "coll/id" -> JSON اللي السيرفر عنده
  var syncedSettings = '{}';
  var lastSnap = '';
  var busy = false, dirty = false, scheduled = false;

  function emptyData() {
    return { doctors: [], services: [], patients: [], appointments: [], invoices: [], requests: [], settings: {} };
  }

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


  /* ---------- الاتصال بالسيرفر ---------- */
  /* تخزين الجلسة: sessionStorage ثم localStorage ثم الذاكرة (لمتصفحات آيفون في الوضع الخاص) */
  var memStore = {};
  var store = {
    getItem: function (k) { try { var v = window.sessionStorage.getItem(k); if (v !== null) return v; } catch (e) { /* */ } try { var w = window.localStorage.getItem(k); if (w !== null) return w; } catch (e) { /* */ } return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null; },
    setItem: function (k, v) { memStore[k] = String(v); try { window.sessionStorage.setItem(k, v); return; } catch (e) { /* */ } try { window.localStorage.setItem(k, v); } catch (e) { /* */ } },
    removeItem: function (k) { delete memStore[k]; try { window.sessionStorage.removeItem(k); } catch (e) { /* */ } try { window.localStorage.removeItem(k); } catch (e) { /* */ } }
  };
  function token() { try { return store.getItem(TOKEN_KEY); } catch (e) { return null; } }

  function toLogin() {
    logout();
    if (!/login\.html$/.test(location.pathname)) location.href = 'login.html';
  }

  function request(method, path, body, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (token()) headers.Authorization = 'Bearer ' + token();
    var json = body === undefined ? undefined : JSON.stringify(body);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, opts.timeout || 70000) : null; // Render المجاني ممكن يصحى في ~50 ثانية
    return fetch(API + path, {
      method: method, headers: headers, body: json, signal: ctrl ? ctrl.signal : undefined,
      keepalive: !!json && json.length < 60000
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.status === 401 && !opts.noAuthRedirect) { toLogin(); throw new Error('انتهت الجلسة'); }
        if (!r.ok) { var e = new Error(j.error || 'حصل خطأ، حاول تاني.'); e.status = r.status; throw e; }
        return j;
      });
    }, function () {
      if (timer) clearTimeout(timer);
      throw new Error('مش قادر أوصل للسيرفر. اتأكد من النت وحاول تاني.');
    });
  }

  /* ---------- لقطة البيانات والمزامنة ---------- */
  function apply(snap) {
    data = {
      doctors: snap.doctors || [], services: snap.services || [], patients: snap.patients || [],
      appointments: snap.appointments || [], invoices: snap.invoices || [], requests: snap.requests || [],
      settings: snap.settings || {}
    };
    synced = {};
    COLLS.forEach(function (c) { data[c].forEach(function (o) { synced[c + '/' + o.id] = JSON.stringify(o); }); });
    syncedSettings = JSON.stringify(data.settings);
  }

  function fetchSnap() { return request('GET', '/api/snapshot'); }

  function setSession(u) { try { store.setItem(SESSION_KEY, JSON.stringify(u)); } catch (e) { /* */ } }

  function refresh() {
    return fetchSnap().then(function (snap) {
      lastSnap = JSON.stringify(snap); apply(snap);
      if (snap.me) setSession(snap.me); // الصلاحيات الحالية من السيرفر
    });
  }

  // بيحسب الفرق بين البيانات الحالية وآخر نسخة السيرفر عنده → مصفوفة عمليات
  function diff() {
    var puts = [], dels = [], seen = {};
    COLLS.forEach(function (c) {
      data[c].forEach(function (o) {
        var k = c + '/' + o.id, j = JSON.stringify(o); seen[k] = 1;
        if (synced[k] !== j) puts.push({ t: 'put', c: c, id: o.id, data: o, k: k, j: j });
      });
    });
    ['invoices', 'appointments', 'requests', 'patients'].forEach(function (c) {
      Object.keys(synced).forEach(function (k) {
        if (k.indexOf(c + '/') === 0 && !seen[k]) dels.push({ t: 'del', c: c, id: k.slice(c.length + 1), k: k });
      });
    });
    var ops = puts.concat(dels);
    var sj = JSON.stringify(data.settings);
    if (sj !== syncedSettings && Object.keys(data.settings).length) {
      ops.push({ t: 'put', c: 'settings', id: 'main', data: data.settings, k: 'settings', j: sj });
    }
    return ops;
  }

  function toast(msg) { if (g.Admin && Admin.toast) Admin.toast(msg, 'error'); else console.warn(msg); }

  function flush() {
    if (busy) { dirty = true; return; }
    var ops = diff();
    if (!ops.length) return;
    busy = true;
    var batch = ops.slice(0, 100);
    request('POST', '/api/sync', { ops: batch.map(function (o) { return { t: o.t, c: o.c, id: o.id, data: o.data }; }) })
      .then(function () {
        batch.forEach(function (o) {
          if (o.t === 'del') delete synced[o.k];
          else if (o.k === 'settings') syncedSettings = o.j;
          else synced[o.k] = o.j;
        });
      })
      .catch(function (e) {
        toast(e.message);
        return refresh().then(function () { if (typeof DB.onChange === 'function') DB.onChange(); });
      })
      .then(function () { busy = false; if (dirty || diff().length) { dirty = false; flush(); } });
  }

  function save() {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(function () { scheduled = false; flush(); });
  }

  // مزامنة دورية: حجز جديد من الموقع يظهر من غير ما تعمل ريفريش
  function poll() {
    if (!session() || document.hidden || busy || scheduled || diff().length || document.getElementById('modalOverlay')) return;
    fetchSnap().then(function (snap) {
      var s = JSON.stringify(snap);
      if (snap.me && JSON.stringify(snap.me) !== JSON.stringify(session())) { setSession(snap.me); location.reload(); return; } // المؤسس غيّر صلاحياتك
      if (s === lastSnap || busy || diff().length) return;
      lastSnap = s; apply(snap);
      if (typeof DB.onChange === 'function') DB.onChange();
    }).catch(function () { /* تجاهل أخطاء الشبكة المؤقتة */ });
  }

  /* ---------- CRUD (نفس الواجهة القديمة) ---------- */
  function newPatient(o) {
    return Object.assign({
      id: uid('p'), name: '', phone: '', birth: '', gender: '', address: '', createdAt: today(),
      medical: { pressure: false, diabetes: false, heart: false, anesthesia: false, pregnant: false, allergies: '', medications: '', notes: '' },
      chart: {}, works: []
    }, o || {});
  }
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
    var win = C.bookingWindow || { start: '10:00', end: '24:00' };
    var dStart = toMin(doc.start), dEnd = toMin(doc.end);
    var start = Math.min(dStart, toMin(win.start)), end = Math.max(dEnd, toMin(win.end));
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
      slots.push({ time: fromMin(t), available: !!ok, outside: t < dStart || t + need > dEnd });
    }
    return { closed: false, slots: slots, doctorStart: doc.start, doctorEnd: doc.end };
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
    return request('POST', '/api/auth/login', { username: username, password: password }, { noAuthRedirect: true, timeout: 70000 })
      .then(function (j) {
        store.setItem(TOKEN_KEY, j.token);
        store.setItem(SESSION_KEY, JSON.stringify(j.user));
        return j.user;
      });
  }
  function session() { try { return token() ? JSON.parse(store.getItem(SESSION_KEY)) : null; } catch (e) { return null; } }
  function logout() {
    try { store.removeItem(TOKEN_KEY); store.removeItem(SESSION_KEY); } catch (e) { /* */ }
  }

  function settings() {
    if (!data.settings.reminderTemplate && C.reminderTemplate) return Object.assign({}, data.settings, { reminderTemplate: C.reminderTemplate });
    return data.settings;
  }
  function saveSettings(patch) { Object.assign(data.settings, patch); save(); }

  // DB.ready: الصفحات المحمية بتستنى اللقطة الأولى قبل ما تشتغل
  var ready = session() ? refresh() : Promise.resolve();
  setInterval(poll, 30000);

  var DB = g.DB = {
    ready: ready, refresh: refresh, api: request,
    all: all, find: find, insert: insert, update: update, remove: remove, removePatient: removePatient, commit: save,
    newPatient: newPatient, getSlots: getSlots, createBooking: createBooking, isOffDay: isOffDay, apptLength: apptLength,
    paid: paid, remaining: remaining, invStatus: invStatus, balance: balance,
    login: login, session: session, logout: logout, settings: settings, saveSettings: saveSettings,
    today: today, addDays: addDays, dayOfWeek: dayOfWeek, toMin: toMin, fromMin: fromMin, uid: uid,
    fmtDate: fmtDate, fmtTime: fmtTime, money: money, age: age, normPhone: normPhone, waLink: waLink,
    onChange: null
  };
})(window);
