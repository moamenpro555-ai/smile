/* سن ثلاثي الأبعاد في الهيرو — three.js (بيتحمّل من CDN). لو فشل التحميل بيفضل الشعار عادي. */
(function () {
  var host = document.getElementById('tooth3d');
  if (!host || typeof THREE === 'undefined') return;
  var rings = host.parentElement;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { return; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  host.appendChild(renderer.domElement);
  rings.classList.add('has-3d');

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 11.5);

  /* ---------- شكل السن (مقطع جانبي متماثل ثم Extrude بحواف ناعمة) ---------- */
  var s = new THREE.Shape();
  s.moveTo(0, 0.82);
  s.bezierCurveTo(0.35, 1.15, 1.0, 1.22, 1.25, 0.8);
  s.bezierCurveTo(1.5, 0.35, 1.2, -0.2, 1.02, -0.6);
  s.bezierCurveTo(0.9, -1.1, 0.88, -1.85, 0.56, -1.92);
  s.bezierCurveTo(0.3, -1.97, 0.26, -1.2, 0, -0.78);
  s.bezierCurveTo(-0.26, -1.2, -0.3, -1.97, -0.56, -1.92);
  s.bezierCurveTo(-0.88, -1.85, -0.9, -1.1, -1.02, -0.6);
  s.bezierCurveTo(-1.2, -0.2, -1.5, 0.35, -1.25, 0.8);
  s.bezierCurveTo(-1.0, 1.22, -0.35, 1.15, 0, 0.82);

  var geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.7, curveSegments: 64,
    bevelEnabled: true, bevelThickness: 0.42, bevelSize: 0.3, bevelOffset: -0.12, bevelSegments: 16
  });
  geo.center();
  geo.computeVertexNormals();

  var mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.22, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.12, reflectivity: 0.6
  });
  var tooth = new THREE.Mesh(geo, mat);

  var group = new THREE.Group();
  group.add(tooth);
  scene.add(group);

  /* ---------- إضاءة ---------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8ff, 0.85));
  var key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(-4, 6, 8); scene.add(key);
  var teal = new THREE.PointLight(0x14b8c6, 0.9, 40); teal.position.set(7, -2, 5); scene.add(teal);
  var violet = new THREE.PointLight(0x7a6cff, 0.8, 40); violet.position.set(-7, -3, 3); scene.add(violet);
  var rim = new THREE.PointLight(0xffffff, 0.6, 40); rim.position.set(0, 7, -6); scene.add(rim);

  /* ---------- لمعان (sparkles) ---------- */
  function sparkTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(180,240,248,.9)'); grd.addColorStop(1, 'rgba(20,184,198,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(32, 4); g.lineTo(32, 60); g.moveTo(4, 32); g.lineTo(60, 32); g.stroke();
    return new THREE.CanvasTexture(c);
  }
  var tex = sparkTexture();
  var sparks = [];
  [[-1.9, 1.7, 0.5, 0.9], [2.0, 1.2, 0.8, 0.7], [1.7, -1.4, 0.6, 0.8], [-1.8, -0.9, 0.7, 0.6], [0.4, 2.3, 0.4, 0.55]].forEach(function (p, i) {
    var m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    var sp = new THREE.Sprite(m);
    sp.position.set(p[0], p[1], p[2]); sp.userData = { base: p[3], phase: i * 1.3 };
    sp.scale.setScalar(p[3]); scene.add(sp); sparks.push(sp);
  });

  /* ---------- تفاعل بالماوس / اللمس ---------- */
  var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  function onMove(e) {
    var r = host.getBoundingClientRect();
    var cx = (e.clientX - (r.left + r.width / 2)) / Math.max(r.width, 300);
    var cy = (e.clientY - (r.top + r.height / 2)) / Math.max(r.height, 300);
    target.x = Math.max(-1, Math.min(1, cx * 1.6));
    target.y = Math.max(-1, Math.min(1, cy * 1.6));
  }
  window.addEventListener('pointermove', onMove, { passive: true });

  /* ---------- الحجم ---------- */
  function resize() {
    var w = host.clientWidth || 300, h = host.clientHeight || 300;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host); else window.addEventListener('resize', resize);

  /* ---------- الحركة ---------- */
  var running = true, t0 = performance.now();
  function frame(now) {
    if (running) requestAnimationFrame(frame);
    var t = (now - t0) / 1000;
    cur.x += (target.x - cur.x) * 0.06; cur.y += (target.y - cur.y) * 0.06;
    group.rotation.y = Math.sin(t * 0.7) * 0.55 + cur.x * 0.6;
    group.rotation.x = cur.y * 0.35 + Math.sin(t * 0.9) * 0.05;
    group.rotation.z = Math.sin(t * 0.5) * 0.04;
    group.position.y = Math.sin(t * 1.2) * 0.12;
    sparks.forEach(function (sp) {
      var k = 0.5 + 0.5 * Math.sin(t * 2 + sp.userData.phase);
      sp.material.opacity = 0.25 + 0.75 * k;
      sp.scale.setScalar(sp.userData.base * (0.7 + 0.5 * k));
    });
    renderer.render(scene, camera);
  }

  if (reduce) {
    group.rotation.y = -0.35; renderer.render(scene, camera);
  } else {
    requestAnimationFrame(frame);
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(frame); }
        else if (!vis) running = false;
      }).observe(host);
    }
  }
})();
