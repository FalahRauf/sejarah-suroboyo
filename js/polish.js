/* ============================================================
   POLISH: rasa tembak (bidik, efek kena, recoil), dunia hidup
   (teriakan, warga, burung, abu/debu, rumput), klimaks yang
   dimainkan (robek bendera, pemicu dinamit), senapan mesin,
   grading warna, bintang per babak, koleksi kartu fakta
   ============================================================ */

/* ================= STATISTIK & BINTANG ================= */
const ST = { act: 0 };
function beginStats(n) { Object.assign(ST, { act: n, t0: T, shots: 0, hits: 0, deaths: 0, caught: 0 }) }
function getStars() { try { return JSON.parse(localStorage.getItem('arek_stars')) || {} } catch (e) { return {} } }
function saveStars(n, s) { try { const b = getStars(); if (!(b[n] >= s)) { b[n] = s; localStorage.setItem('arek_stars', JSON.stringify(b)) } } catch (e) {} }
function calcStars(n) {
  const time = T - ST.t0, acc = ST.shots ? Math.min(1, ST.hits / ST.shots) : 0, rows = [['Babak diselesaikan', true]];
  if (n === 1) rows.push(['Tidak pernah ketahuan penjaga', ST.caught === 0], ['Selesai di bawah 7 menit', time < 420]);
  else rows.push(['Tidak pernah gugur', ST.deaths === 0], ['Akurasi tembakan minimal 35%', acc >= .35]);
  return { rows, stars: rows.filter(r => r[1]).length, time, acc };
}
function showResult(n, next) {
  const r = calcStars(n); saveStars(n, r.stars);
  mode = 'busy'; stopVO();
  if (!TOUCH && document.exitPointerLock) document.exitPointerLock();
  $('#resTitle').textContent = 'BABAK ' + ROMAN[n] + ' SELESAI';
  $('#resStars').textContent = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  $('#resRows').innerHTML = r.rows.map(([t, ok]) => `<li class="${ok ? 'ok' : ''}">${ok ? '★' : '☆'} ${t}</li>`).join('');
  const m = Math.floor(r.time / 60), s = Math.floor(r.time % 60);
  $('#resStats').textContent = `Waktu ${m}:${String(s).padStart(2, '0')}` + (n > 1 ? ` · Akurasi ${Math.round(r.acc * 100)}% · Gugur ${ST.deaths}x` : ` · Ketahuan ${ST.caught}x`) + ` · Total musuh dilumpuhkan ${C.kills}`;
  $('#result').hidden = false; SFX.ok();
  $('#resNext').onclick = () => { $('#result').hidden = true; lock(); next() };
}
// bungkus fungsi cerita supaya statistik tercatat
{
  const _intro = intro; intro = () => { beginStats(1); _intro() };
  const _s2 = startAct2; startAct2 = () => { if (ST.act === 1) showResult(1, () => { beginStats(2); _s2() }); else { beginStats(2); _s2() } };
  const _s3 = startAct3; startAct3 = () => { if (ST.act === 2) showResult(2, () => { beginStats(3); _s3() }); else { beginStats(3); _s3() } };
  const _end = ending; ending = () => { if (ST.act === 3) showResult(3, _end); else _end() };
  const _caught = caught; caught = () => { ST.caught++; _caught() };
  const _die = die; die = msg => { if (msg !== 'KEMBALI KE CHECKPOINT') ST.deaths++; P.mg = false; _die(msg) };
  const _fire = fire; fire = () => { const a = C.ammo; _fire(); if (C.ammo < a) { ST.shots++; scareBirds() } };
  const _ds = damageSoldier; damageSoldier = (s, n, bp) => { if (bp && s.team === 'enemy' && s.alive) ST.hits++; _ds(s, n, bp) };
}

/* ================= RASA TEMBAK ================= */
C.ads = 0; let adsHold = false;
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousedown', e => {
  if (e.button === 2) adsHold = true;
  if (e.button === 0) { MG.hold = true; if (mode === 'mash') mashPress() }
});
addEventListener('mouseup', e => { if (e.button === 2) adsHold = false; if (e.button === 0) MG.hold = false });
const muzzleLight = new R.PointLight(0xffb060, 0, 14); muzzleLight.position.set(.2, -.1, -1); camera.add(muzzleLight);
function muzzleFlash() { muzzleLight.intensity = 3.5 }
const decals = [];
const decalMat = new R.MeshBasicMaterial({ color: 0x1a1410, transparent: true, opacity: .85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
const decalGeo = new R.CircleGeometry(.07, 8); decalGeo.userData.shared = true;
function impactFx(pt, kind) {
  if (kind === 'world') {
    for (let i = 0; i < 5; i++) puff(pt.clone(), 0x9a8a6a, .22, .5, V([rand(-2, 2), rand(1, 3), rand(-2, 2)]), 1);
    const m = new R.Mesh(decalGeo, decalMat); m.position.copy(pt).lerp(camera.position, .004); m.lookAt(camera.position); L.add(m); decals.push(m);
    if (decals.length > 60) L.remove(decals.shift());
    nz(.04, 'highpass', 2200, .08);
  } else {
    for (let i = 0; i < 4; i++) puff(pt.clone(), 0xd8cfb8, .3, .35, V([rand(-1, 1), rand(.5, 1.6), rand(-1, 1)]), 2);
  }
}
function killFx() {
  tone(90, .25, .25, 'sine', 50); setTimeout(() => tone(1500, .09, .09, 'triangle'), 40);
  const h = $('#hit'); h.style.transform = 'translate(-50%,-50%) scale(1.7)'; setTimeout(() => h.style.transform = 'translate(-50%,-50%)', 160);
  const k = $('#killfeed'); k.textContent = '+1 MUSUH DILUMPUHKAN'; k.style.opacity = 1; clearTimeout(killFx.h); killFx.h = setTimeout(() => k.style.opacity = 0, 900);
}
function updateGunFeel(dt) {
  const want = adsHold && C.hasGun && mode === 'play' && !paused && !P.carry && !P.mg && C.reloading <= 0 ? 1 : 0;
  C.ads += (want - C.ads) * Math.min(1, dt * 12);
  const fov = P.mg ? 62 : 72 - 28 * C.ads;
  if (Math.abs(camera.fov - fov) > .05) { camera.fov = fov; camera.updateProjectionMatrix() }
  if (viewGun.visible && C.ads > .01) {
    viewGun.position.x += (0 - viewGun.position.x) * C.ads;
    viewGun.position.y += (-.168 - viewGun.position.y) * C.ads;
    viewGun.position.z += (-.36 - viewGun.position.z) * C.ads * .6;
  }
  muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 40);
  // crosshair dinamis
  const cr = $('#cross');
  if (!C.hasGun || P.carry) { cr.className = '' }
  else {
    const sp = (P.crouch ? .004 : P.moving ? .02 : .009) * (1 - .8 * C.ads) + C.kick * .012;
    const sz = Math.round(10 + sp * 1300); cr.className = 'ring'; cr.style.width = cr.style.height = sz + 'px'; cr.style.margin = (-sz / 2) + 'px';
    cr.style.opacity = C.ads > .7 ? .35 : 1;
  }
}

/* ================= MINIGAME TEKAN BERULANG ================= */
let mashS = null;
function mash(text, onProg, done) { mode = 'mash'; mashS = { p: 0, onProg, done }; $('#mash').hidden = false; $('#mashText').textContent = text }
function mashPress() {
  if (!mashS) return;
  mashS.p = Math.min(1, mashS.p + .085); nz(.08, 'highpass', rand(2200, 3200), .18); shake = Math.max(shake, .08);
  if (mashS.p >= 1) { const d = mashS.done; mashS = null; $('#mash').hidden = true; mode = 'busy'; d() }
}
function updateMash(dt) {
  if (!mashS) return;
  mashS.p = Math.max(0, mashS.p - dt * .12);
  $('#mashBar').style.width = (mashS.p * 100) + '%';
  mashS.onProg && mashS.onProg(mashS.p);
}

/* ================= SENAPAN MESIN (BABAK III) ================= */
const MG = { pivot: null, hold: false, heat: 0, over: 0, cd: 0, spot: null };
function buildMG() {
  const y = hAct3(0, -1.4), g = new R.Group(); g.position.set(0, y, -1.45); L.add(g);
  const dk = lam(0x2a2a26), ol = lam(0x4a4e32), add = (geo, mat, x, yy, z, p) => { const m = new R.Mesh(geo, mat); m.position.set(x, yy, z); m.castShadow = true; p.add(m); return m };
  [[-.35, .25], [.35, .25], [0, -.4]].forEach(([x, z]) => { const l = add(new R.BoxGeometry(.05, 1.1, .05), dk, x * .5, .5, z * .5, g); l.rotation.set(z * .5, 0, -x * .6) });
  const pv = new R.Group(); pv.position.y = 1.05; pv.rotation.order = 'YXZ'; g.add(pv);
  add(new R.BoxGeometry(.14, .16, .7), dk, 0, 0, .05, pv);
  const jk = new R.CylinderGeometry(.06, .06, .6, 10); jk.rotateX(Math.PI / 2); add(jk, ol, 0, .01, -.55, pv);
  const br = new R.CylinderGeometry(.018, .018, .35, 6); br.rotateX(Math.PI / 2); add(br, dk, 0, .01, -1, pv);
  add(new R.BoxGeometry(.18, .14, .22), ol, .16, -.04, 0, pv);
  add(new R.BoxGeometry(.04, .12, .04), dk, -.07, -.1, .38, pv); add(new R.BoxGeometry(.04, .12, .04), dk, .07, -.1, .38, pv);
  const fl = new R.Sprite(new R.SpriteMaterial({ map: smokeTex, color: 0xffd070, transparent: true, depthWrite: false })); fl.scale.setScalar(.5); fl.position.set(0, .01, -1.25); fl.visible = false; pv.add(fl);
  MG.pivot = pv; MG.flash = fl; MG.spot = V([0, y, -.35]);
  const lb = label('SENAPAN MESIN', '#ffffff'); lb.position.set(0, 2, 0); g.add(lb);
  addI(MG.spot, () => P.mg ? 'Lepas senapan mesin' : 'Pakai senapan mesin', () => {
    P.mg = !P.mg; adsHold = false;
    if (P.mg) { P.crouch = false; $('#stance').textContent = 'BERDIRI'; P.yaw = 0; P.pitch = 0; toast('TAHAN KLIK KIRI UNTUK MENEMBAK', 1800) }
  }, 2.2);
}
function mgShoot() {
  MG.cd = .085; MG.heat += .03; ST.shots++; scareBirds();
  if (MG.heat >= 1) { MG.over = 2.5; toast('SENAPAN PANAS! TUNGGU DINGIN', 1500); tone(300, .6, .15, 'sawtooth', 120) }
  SFX.shot(4); tone(110, .1, .3, 'sine', 50); shake = Math.max(shake, .07); muzzleFlash();
  MG.flash.visible = true; MG.flash.material.rotation = Math.random() * 6; setTimeout(() => MG.flash.visible = false, 40);
  const o = camera.getWorldPosition(new R.Vector3()), d = new R.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  d.x += rand(-.018, .018); d.y += rand(-.012, .012); d.normalize();
  let best = rayWorld(o, d, 160), hitE = null, head = false;
  for (const e of enemies) {
    if (!e.alive) continue; const p = e.m.position;
    const th = raySphere(o, d, V([p.x, p.y + 1.78, p.z]), .2), tb = raySphere(o, d, V([p.x, p.y + 1.15, p.z]), .42);
    if (th !== null && th < best.t) { best = { t: th }; hitE = e; head = true }
    if (tb !== null && tb < best.t) { best = { t: tb }; hitE = e; head = false }
  }
  const pt = o.clone().addScaledVector(d, best.t);
  tracer(MG.flash.getWorldPosition(new R.Vector3()), pt);
  if (hitE) { damageSoldier(hitE, head ? 4 : 1.2, true); impactFx(pt, 'body'); SFX.hit(); hitmark(head); if (!hitE.alive) killFx() }
  else if (!best.tank) impactFx(pt, 'world');
  P.pitch = Math.min(.35, P.pitch + .006); P.yaw += rand(-.004, .004);
}
function updateMG(dt) {
  const show = !!P.mg;
  $('#heat').hidden = !show;
  if (MG.over > 0) { MG.over -= dt; if (MG.over <= 0) MG.heat = .5 }
  else MG.heat = Math.max(0, MG.heat - dt * (MG.hold && P.mg ? .05 : .35));
  $('#heat div').style.width = Math.min(100, MG.heat * 100) + '%';
  $('#heat div').style.background = MG.over > 0 ? '#ff3b30' : MG.heat > .7 ? '#ffa030' : '#ffd84a';
  if (!show || !MG.pivot) return;
  P.pos.set(MG.spot.x, 0, MG.spot.z); P.floor = W.groundH(P.pos.x, P.pos.z);
  P.yaw = Math.max(-1.1, Math.min(1.1, P.yaw)); P.pitch = Math.max(-.3, Math.min(.35, P.pitch));
  camera.position.set(MG.spot.x, P.floor + 1.42, MG.spot.z); camera.rotation.set(P.pitch, P.yaw, 0);
  MG.pivot.rotation.set(P.pitch, P.yaw, 0);
  viewGun.visible = false;
  MG.cd -= dt;
  if (MG.hold && MG.over <= 0 && MG.cd <= 0 && mode === 'play') mgShoot();
}

/* ================= DUNIA HIDUP ================= */
let extrasFor = null;
const FX = { birds: [], scare: 0, pts: null, ptsV: null, kind: 'a1', civ: [], shouts: [], shoutT: 3 };
function levelKind() { return refs.bridge ? 'a3' : refs.langgar ? 'a2' : 'a1' }
function setupExtras() {
  extrasFor = refs; FX.kind = levelKind(); FX.birds = []; FX.civ = []; FX.shouts = []; decals.length = 0; P.mg = false; MG.pivot = null;
  const k = FX.kind;
  // grading warna per babak
  const grade = { a1: 'saturate(1.12) contrast(1.06)', a2: 'contrast(1.12) saturate(1.22) sepia(.12)', a3: 'contrast(1.08) saturate(.92) sepia(.18)' }[k];
  canvas.style.filter = S.gfx === 'rendah' ? 'none' : grade;
  // burung (babak I & III)
  if (k !== 'a2') for (let i = 0; i < 10; i++) {
    const g = new R.Group(), m = lam(0x1a1a1a);
    g.add(new R.Mesh(new R.BoxGeometry(.12, .1, .35), m));
    const wl = new R.Group(), wr = new R.Group(); g.add(wl, wr);
    const wg = new R.BoxGeometry(.5, .02, .2); const a = new R.Mesh(wg, m); a.position.x = -.25; wl.add(a); const b = new R.Mesh(wg, m); b.position.x = .25; wr.add(b);
    L.add(g); FX.birds.push({ g, wl, wr, o: i * .63, r: rand(22, 34), h: rand(28, 38) });
  }
  // abu (babak II) / debu melayang (I & III)
  const n = S.gfx === 'rendah' ? 250 : k === 'a2' ? 900 : 400;
  const pos = new Float32Array(n * 3), vel = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = rand(-25, 25); pos[i * 3 + 1] = rand(0, 22); pos[i * 3 + 2] = rand(-25, 25); vel[i] = rand(.3, 1) }
  const geo = new R.BufferGeometry(); geo.setAttribute('position', new R.BufferAttribute(pos, 3));
  FX.pts = new R.Points(geo, new R.PointsMaterial({ color: k === 'a2' ? 0xbfb8b0 : 0xfff0c8, size: k === 'a2' ? .1 : .06, transparent: true, opacity: k === 'a2' ? .85 : .55, depthWrite: false }));
  FX.pts.frustumCulled = false; FX.ptsV = vel; L.add(FX.pts);
  // rumput (babak III)
  if (k === 'a3') {
    const tex = canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); for (let i = 0; i < 14; i++) { g.strokeStyle = `hsl(${rand(70, 95)},45%,${rand(22, 38)}%)`; g.lineWidth = rand(2, 4); g.beginPath(); const x = rand(8, 56); g.moveTo(x, h); g.quadraticCurveTo(x + rand(-6, 6), h * .5, x + rand(-12, 12), rand(4, 24)); g.stroke() } });
    const cnt = S.gfx === 'rendah' ? 600 : 2200;
    const im = new R.InstancedMesh(new R.PlaneGeometry(.9, .7), new R.MeshLambertMaterial({ map: tex, alphaTest: .4, side: R.DoubleSide }), cnt);
    const mtx = new R.Matrix4(), q = new R.Quaternion(), sc = new R.Vector3(), p = new R.Vector3();
    for (let i = 0; i < cnt; i++) {
      let x, z; do { x = rand(-40, 40); z = rand(-85, 62) } while (z > 33 && z < 50);
      const s = rand(.7, 1.5); p.set(x, hAct3(x, z) + .3 * s, z); q.setFromAxisAngle(V([0, 1, 0]), rand(0, Math.PI)); sc.set(s, s, s);
      mtx.compose(p, q, sc); im.setMatrixAt(i, mtx);
    }
    L.add(im); buildMG(); buildDetonator();
  }
  // warga berlarian (babak II)
  if (k === 'a2') for (let i = 0; i < 6; i++) {
    const h = human({ skirt: i % 2 ? pick([0x7a3a2a, 0x3a5a6a, 0x6a4a2a]) : null, longHair: i % 2 === 1, hat: i % 3 === 0 ? 'caping' : null, barefoot: true });
    h.position.set(rand(-3, 3), .02, rand(15, 70)); FX.civ.push({ h, goal: civGoal() });
  }
  spawnCards(k);
}
function civGoal() { return Math.random() < .5 ? V([rand(-3, 3), 0, rand(12, 72)]) : V([rand(-38, 38), 0, rand(38.5, 43.5)]) }
function scareBirds() { FX.scare = 6 }
const ALLY_LINES = ['Merdeka!', 'Maju, Rek!', 'Tembak!', 'Allahu Akbar!', 'Ayo, Rek!', 'Awas kiri!', 'Jangan mundur!', 'Merdeka atau mati!'];
const ENEMY_LINES = ['Fire!', 'Move up!', 'Take cover!', 'Over there!', 'Advance!'];
function shout(obj, text, ally) {
  const t = canvasTex(256, 64, (g, w, h) => { g.font = 'bold 30px Oswald, sans-serif'; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText(text, w / 2, 42); g.fillStyle = ally ? '#ffe27a' : '#ff9a8a'; g.fillText(text, w / 2, 42) });
  const s = new R.Sprite(new R.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); s.scale.set(2.2, .55, 1);
  s.position.copy(obj.position).add(V([0, 2.4, 0])); L.add(s); FX.shouts.push({ s, t: 1.8 });
  const d = obj.position.distanceTo(camera.position), v = Math.max(0, .09 - d / 500);
  if (v > 0) { tone(ally ? rand(170, 240) : rand(120, 160), .22, v, 'sawtooth', ally ? rand(130, 170) : rand(90, 110)); nz(.2, 'bandpass', rand(700, 1100), v * .8, 3) }
}
function updateWorld(dt) {
  if (extrasFor !== refs) setupExtras();
  const cp = camera.position;
  // burung
  FX.scare = Math.max(0, FX.scare - dt);
  FX.birds.forEach((b, i) => {
    const a = T * (.25 + FX.scare * .08) + b.o, r = b.r + FX.scare * 6, h = b.h + FX.scare * 3;
    b.g.position.set(Math.cos(a) * r, h + Math.sin(T * 2 + i) * 1.2, -15 + Math.sin(a) * r);
    b.g.rotation.y = -a; const f = Math.sin(T * (10 + FX.scare * 3) + i) * .7; b.wl.rotation.z = f; b.wr.rotation.z = -f;
  });
  // abu / debu
  if (FX.pts) {
    const p = FX.pts.geometry.attributes.position, a = p.array, ash = FX.kind === 'a2';
    for (let i = 0; i < FX.ptsV.length; i++) {
      const j = i * 3;
      a[j + 1] -= FX.ptsV[i] * dt * (ash ? .9 : .12); a[j] += Math.sin(T * .7 + i) * dt * (ash ? .4 : .15);
      if (a[j + 1] < cp.y - 6) a[j + 1] += 26; if (a[j + 1] > cp.y + 20) a[j + 1] -= 26;
      if (a[j] - cp.x > 25) a[j] -= 50; if (cp.x - a[j] > 25) a[j] += 50;
      if (a[j + 2] - cp.z > 25) a[j + 2] -= 50; if (cp.z - a[j + 2] > 25) a[j + 2] += 50;
    }
    p.needsUpdate = true;
  }
  // warga berlarian
  if (mode !== 'menu') FX.civ.forEach(c => { setPose(c.h, 'walk'); if (walkTo(c.h, c.goal, dt, 4.6)) c.goal = civGoal() });
  // teriakan dalam pertempuran
  if (mode === 'play' && aliveEnemies() > 0) {
    FX.shoutT -= dt;
    if (FX.shoutT < 0) {
      FX.shoutT = rand(1.8, 4);
      const pool = Math.random() < .65 ? allies : enemies, cand = pool.filter(s => s.alive && s.m.position.distanceTo(cp) < 40);
      if (cand.length) { const s = pick(cand); shout(s.m, pick(s.team === 'ally' ? ALLY_LINES : ENEMY_LINES), s.team === 'ally') }
    }
  }
  for (let i = FX.shouts.length - 1; i >= 0; i--) { const s = FX.shouts[i]; s.t -= dt; s.s.position.y += dt * .5; s.s.material.opacity = Math.min(1, s.t); if (s.t <= 0) { L.remove(s.s); FX.shouts.splice(i, 1) } }
  // kartu fakta berputar
  FX.cards && FX.cards.forEach(c => { c.s.position.y = c.y + Math.sin(T * 2 + c.y) * .12; c.s.material.rotation = Math.sin(T * 1.5) * .15 });
}

/* ================= PEMICU DINAMIT (BABAK III) ================= */
function buildDetonator() {
  const x = 4.5, z = 54, y = hAct3(x, z), g = new R.Group(); g.position.set(x, y, z); L.add(g);
  const bx = new R.Mesh(new R.BoxGeometry(.55, .4, .4), lam(0x6a2a1a)); bx.position.y = .2; bx.castShadow = true; g.add(bx);
  const h = new R.Group(); h.position.y = .65; g.add(h);
  h.add(new R.Mesh(new R.BoxGeometry(.04, .5, .04), lam(0x333333))); const t = new R.Mesh(new R.BoxGeometry(.4, .06, .06), lam(0x222222)); t.position.y = .25; h.add(t);
  const lb = label('PEMICU DINAMIT', '#ff9a8a'); lb.position.y = 1.4; g.add(lb);
  const pts = [V([x, y + .2, z]), V([2, .4, 49]), V([1, .3, 46]), V([-1, .3, 40])];
  L.add(new R.Line(new R.BufferGeometry().setFromPoints(pts), new R.LineBasicMaterial({ color: 0x111111 })));
  refs.det = { pos: V([x, y, z]), handle: h };
}
function armDetonator() {
  toast('MUSUH MENGEJAR KE JEMBATAN!', 1800); SFX.alert();
  setObj('Tekan pemicu dinamit, ledakkan jembatan!', () => refs.det.pos);
  enemies.filter(e => e.alive).slice(0, 5).forEach(e => { e.cover = V([rand(-2.2, 2.2), 0, rand(37, 46)]); e.speed = 4 });
  const it = addI(refs.det.pos, 'Tekan pemicu dinamit', () => {
    remI(it); refs.det.handle.position.y = .4; tone(500, .1, .2, 'square'); setTimeout(() => tone(800, .3, .15, 'square', 1600), 120);
    setTimeout(bridgeScene, 450);
  }, 2.4);
}

/* ================= KOLEKSI KARTU FAKTA ================= */
const CARDS = {
  a1: [
    { id: 'tunjungan', pos: [-9.3, 55], t: 'Jalan Tunjungan', x: 'Sejak zaman Belanda, Jalan Tunjungan menjadi pusat pertokoan dan salah satu jalan paling ramai di Surabaya. Lagu "Rek Ayo Rek" pun menyebut jalan ini.' },
    { id: 'arek', pos: [43.5, -43], t: 'Arek Suroboyo', x: '"Arek" dalam dialek Suroboyoan berarti anak atau orang. "Arek Suroboyo" adalah sebutan bangga untuk warga Surabaya yang dikenal berani dan blak-blakan.' },
    { id: 'peci', pos: [8.6, -66], t: 'Peci Hitam', x: 'Peci atau kopiah hitam dipopulerkan Bung Karno sebagai simbol identitas nasional. Banyak pemuda pejuang memakainya.' },
  ],
  a2: [
    { id: 'jembatanmerah', pos: [-38, 72], t: 'Jembatan Merah', x: 'Jembatan di atas Kali Mas ini sudah menjadi kawasan dagang penting sejak masa kolonial. Di sekitarnya terjadi pertempuran sengit tahun 1945.' },
    { id: 'bambu', pos: [38, -7], t: 'Bambu Runcing', x: 'Karena senjata api terbatas, banyak rakyat bertempur dengan bambu yang ujungnya diruncingkan. Bambu runcing menjadi simbol semangat perjuangan rakyat.' },
    { id: 'internatio', pos: [-21, 41], t: 'Gedung Internatio', x: 'Gedung milik perusahaan dagang Belanda di dekat Jembatan Merah. Pada 30 Oktober 1945, Brigjen Mallaby tewas dalam baku tembak di sekitar gedung ini.' },
  ],
  a3: [
    { id: 'brantas', pos: [-36, 26], t: 'Kali Brantas', x: 'Kali Brantas adalah sungai terpanjang kedua di Pulau Jawa setelah Bengawan Solo. Alirannya melewati Malang, Kediri, Mojokerto, hingga ke Surabaya.' },
    { id: 'tugu', pos: [30, -24], t: 'Tugu Pahlawan', x: 'Monumen setinggi 41 meter di Surabaya ini diresmikan Presiden Soekarno pada 10 November 1952 untuk mengenang Pertempuran 10 November 1945.' },
    { id: 'museum', pos: [-10, 57], t: 'Museum Sepuluh Nopember', x: 'Museum di bawah Tugu Pahlawan ini menyimpan diorama pertempuran, peninggalan para pejuang, dan rekaman pidato Bung Tomo.' },
  ],
};
const ALL_CARDS = ['a1', 'a2', 'a3'].flatMap((k, i) => CARDS[k].map(c => ({ ...c, act: i + 1 })));
function getCards() { try { return JSON.parse(localStorage.getItem('arek_cards')) || [] } catch (e) { return [] } }
function saveCard(id) { try { const c = getCards(); if (!c.includes(id)) { c.push(id); localStorage.setItem('arek_cards', JSON.stringify(c)) } } catch (e) {} }
const cardTex = canvasTex(64, 80, (g, w, h) => { g.fillStyle = 'rgba(255,216,74,.35)'; g.fillRect(0, 0, w, h); g.fillStyle = '#efe4c8'; g.fillRect(8, 8, w - 16, h - 16); g.fillStyle = '#c8102e'; g.fillRect(8, 8, w - 16, 12); g.fillStyle = '#555'; for (let i = 0; i < 5; i++) g.fillRect(14, 28 + i * 8, w - 28, 3) });
function spawnCards(k) {
  FX.cards = [];
  const have = getCards();
  CARDS[k].forEach(c => {
    if (have.includes(c.id)) return;
    const y = W.groundH(c.pos[0], c.pos[1]) + 1.1;
    const s = new R.Sprite(new R.SpriteMaterial({ map: cardTex, transparent: true })); s.scale.set(.5, .62, 1); s.position.set(c.pos[0], y, c.pos[1]); L.add(s);
    const o = { s, y }; FX.cards.push(o);
    const it = addI(V([c.pos[0], y - 1.1, c.pos[1]]), 'Ambil kartu fakta', () => {
      remI(it); L.remove(s); FX.cards = FX.cards.filter(x => x !== o); saveCard(c.id);
      fact(`Kartu Fakta (${getCards().length}/${ALL_CARDS.length}): ${c.t}`, c.x, null);
    }, 2);
  });
}
function openKoleksi() {
  const have = getCards();
  $('#kolCount').textContent = `${have.length} / ${ALL_CARDS.length} kartu ditemukan`;
  $('#kolList').innerHTML = ALL_CARDS.map(c => have.includes(c.id)
    ? `<div class="kc got"><b>${c.t}</b><p>${c.x}</p></div>`
    : `<div class="kc"><b>???</b><p>Tersembunyi di Babak ${ROMAN[c.act]}. Cari kertas bercahaya kuning!</p></div>`).join('');
  $('#koleksi').hidden = false;
}
$('#btnKoleksi').onclick = openKoleksi;
{ // bintang terbaik tampil di Pilih Babak
  const _rm = refreshMenu;
  refreshMenu = () => { _rm(); const st = getStars(); document.querySelectorAll('#chapSel [data-act]').forEach(b => { const n = +b.dataset.act; if (!b.disabled) b.querySelector('small').textContent = b.dataset.sub + '  ·  ' + '★'.repeat(st[n] || 0) + '☆'.repeat(3 - (st[n] || 0)) }) };
  refreshMenu();
}
$('#btnChap').onclick = () => { refreshMenu(); $('#chapSel').hidden = false };

/* ================= KONTROL SENTUH TAMBAHAN ================= */
if (TOUCH) {
  const ads = document.querySelector('#tbtns [data-t="ads"]'), fb = document.querySelector('#tbtns [data-t="fire"]');
  ads.addEventListener('touchstart', e => { e.preventDefault(); adsHold = !adsHold; ads.classList.toggle('on', adsHold) }, { passive: false });
  fb.addEventListener('touchstart', () => { MG.hold = true }); fb.addEventListener('touchend', () => { MG.hold = false });
}

/* ================= UPDATE UTAMA POLISH ================= */
function polishUpdate(dt) {
  updateWorld(dt); updateMash(dt); updateMG(dt); updateGunFeel(dt);
}
