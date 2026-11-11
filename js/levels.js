/* ============================================================
   MAP: Babak I Jl. Tunjungan, Babak II Kampung & Jembatan Merah,
        Babak III Gunungsari
   ============================================================ */
const H = { x0: 10, x1: 40, z0: -38, z1: -22, h: 12 };
const groundDraw = (base, dots, green) => (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h); speckle(g, w, h, dots, .25);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${green},${Math.random() * .4})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3) }
};
const roadDraw = (g, w, h) => { g.fillStyle = '#4a4740'; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, .35); g.fillStyle = '#d8d0b0'; g.fillRect(w / 2 - 3, 0, 6, h / 2) };
function road(x, z, w, len, draw = roadDraw, rep = 20) {
  const t = canvasTex(128, 256, draw); t.repeat.set(1, rep);
  const m = new R.Mesh(new R.PlaneGeometry(w, len), new R.MeshLambertMaterial({ map: t }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, .03, z); m.receiveShadow = true; L.add(m); return m;
}
const SIGNS = ['TOKO ROTI', 'APOTEK', 'TOKO KAIN', 'BIOSCOOP', 'TOKO EMAS', 'RUMAH MAKAN', 'TOKO BUKU', 'KANTOR POS', 'TOKO SEPEDA', 'PENJAHIT', 'TOKO OBAT', 'WARUNG KOPI', 'TOKO JAM', 'PERCETAKAN'];
const WALLCOL = ['#e8dcc0', '#d9c9a3', '#efe6d2', '#c9b48a', '#e2d5b5', '#d0c2a0', '#e6d0b0', '#cfd6c4'];
/* ruko kolonial. face = +1 muka menghadap +x, -1 menghadap -x */
function shop(x, z, w, d, h, face, sign) {
  box(w, h, d, x, 0, z, wallMat(pick(WALLCOL), '#2a3540', Math.max(1, Math.round(d / 3.5)), Math.max(1, Math.round(h / 3.6)), pick(['#5b3a1e', '#3a4a3a', '#6e4a2a']), Math.random() < .4 ? 1 : 0));
  const fx = x + face * w / 2;
  if (Math.random() < .55) hipRoof(x, z, w, d, h, pick([0x8c3b22, 0x9a4a2a, 0x7a3520]), 2.2);
  else { box(w + .4, .5, d + .4, x, h, z, lam(0xe8e0cc), false); box(.3, 1.2, d * .6, fx, h + .5, z, lam(0xe8e0cc), false) }
  box(.25, .3, d, fx + face * .12, h * .55, z, lam(0xd8ccb0), false); // list lantai 2
  const aw = box(1.8, .08, d * .85, fx + face * .9, 3.1, z, lam(pick([0x7a3020, 0x2f5a3a, 0x8a6a2a, 0x3a4a6a])), false);
  aw.rotation.z = -face * .28;
  if (sign) { const s = textPlane(sign, Math.min(d * .8, 6), 1, pick(['#2b1d10', '#1d2b20', '#3a1a10']), '#f2d98a'); s.position.set(fx + face * .03, 4.3, z); s.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2; L.add(s) }
}
function shopRow(xc, w, zStart, zEnd, face) {
  let z = zStart;
  while (z > zEnd + .1) { let d = Math.min(rand(9, 13), z - zEnd); if (z - d - zEnd < 5) d = z - zEnd; shop(xc, z - d / 2, w, d, rand(6, 11), face, Math.random() < .7 ? pick(SIGNS) : null); z -= d }
}
function lamp(x, z) { box(.15, 4.5, .15, x, 0, z, lam(0x222222)); box(.5, .35, .5, x, 4.5, z, new R.MeshBasicMaterial({ color: 0xfff2c0 }), false) }
function becak(x, z, rot = 0) {
  const g = new R.Group(), add = (geo, c, px, py, pz) => { const m = new R.Mesh(geo, lam(c)); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m };
  add(new R.BoxGeometry(1, .5, .8), 0x8a2a1a, 0, .7, .3); add(new R.BoxGeometry(1, .7, .08), 0x8a2a1a, 0, 1.05, -.05);
  const hood = new R.CylinderGeometry(.55, .55, 1, 10, 1, true, 0, Math.PI); hood.rotateZ(Math.PI / 2); add(hood, 0x2a2a2a, 0, 1.2, .3);
  const wh = new R.TorusGeometry(.32, .04, 6, 14); [[-.55, .32, .4], [.55, .32, .4], [0, .32, -1.3]].forEach(p => { const m = add(wh, 0x111111, ...p); m.rotation.y = Math.PI / 2 });
  add(new R.BoxGeometry(.06, .06, 1.6), 0x333333, 0, .5, -.6); add(new R.BoxGeometry(.25, .06, .3), 0x3a2a1a, 0, 1, -1.2);
  g.position.set(x, 0, z); g.rotation.y = rot; L.add(g);
  colliders.push({ x0: x - 1, x1: x + 1, z0: z - 1.2, z1: z + 1.2, y0: 0, y1: 1.4 });
}
function crate(x, z, s = 1, y = 0, collide = true) { return box(1.1 * s, .8 * s, .8 * s, x, y, z, lam(0x7a5a35), collide) }
function poles(x, zs) { // tiang telegraf dengan kabel
  zs.forEach(z => { box(.18, 7, .18, x, 0, z, lam(0x4a3a2a), true); box(1.4, .1, .1, x, 6.6, z, lam(0x4a3a2a), false) });
  const pts = []; for (let i = 0; i < zs.length - 1; i++) for (const o of [-.6, .6]) { pts.push(V([x + o, 6.65, zs[i]]), V([x + o, 6.3, (zs[i] + zs[i + 1]) / 2]), V([x + o, 6.3, (zs[i] + zs[i + 1]) / 2]), V([x + o, 6.65, zs[i + 1]])) }
  L.add(new R.LineSegments(new R.BufferGeometry().setFromPoints(pts), new R.LineBasicMaterial({ color: 0x222222 })));
}
function oldCar(x, z, rot = 0, c = 0x1e2a22) {
  const g = new R.Group(), add = (geo, col, px, py, pz) => { const m = new R.Mesh(geo, lam(col)); m.position.set(px, py, pz); m.castShadow = true; g.add(m); return m };
  add(new R.BoxGeometry(1.7, .6, 4), c, 0, .7, 0); add(new R.BoxGeometry(1.5, .65, 1.8), c, 0, 1.3, -.3);
  add(new R.BoxGeometry(1.4, .5, .05), 0x8aa0aa, 0, 1.35, .62);
  const wh = new R.CylinderGeometry(.38, .38, .25, 12); wh.rotateZ(Math.PI / 2);
  [[-.85, .38, 1.3], [.85, .38, 1.3], [-.85, .38, -1.3], [.85, .38, -1.3]].forEach(p => add(wh, 0x111111, ...p));
  g.position.set(x, 0, z); g.rotation.y = rot; L.add(g);
  const a = Math.abs(Math.sin(rot)) > .7; colliders.push({ x0: x - (a ? 2.1 : 1), x1: x + (a ? 2.1 : 1), z0: z - (a ? 1 : 2.1), z1: z + (a ? 1 : 2.1), y0: 0, y1: 1.7 });
  return g;
}

/* ===================== BABAK I : JALAN TUNJUNGAN ===================== */
function buildAct1() {
  newLevel();
  env({ fog: 0xd9d2bd, near: 40, far: 190, sky: ['#4d86c4', '#a9c6df', '#efe2c0'], hemi: [0xe8f0ff, 0x6b5a40, .75], sun: [0xfff0d0, 1.05], sunPos: [50, 90, 35] });
  A.scale = 'act1';
  makeGround(groundDraw('#8a7a5a', 3000, '70,100,40'), 400, 70);
  road(0, 0, 12, 150);
  const sw = lam(0xb8ad94);
  box(4, .15, 150, -8, 0, 0, sw, false, false); box(4, .15, 150, 8, 0, 0, sw, false, false);
  // deretan ruko rapat kiri-kanan (tanpa celah aneh)
  shopRow(-16, 12, 75, -75, 1);
  shopRow(16, 12, 75, -15, -1);
  shopRow(16, 12, -38, -75, -1);
  // gedung penutup ujung jalan
  box(56, 13, 6, 0, 0, 78, wallMat('#efe6d2', '#2a3540', 14, 3, '#6e4a2a', 1));
  const s1 = textPlane('PASAR BESAR', 10, 1.6); s1.position.set(0, 7, 74.97); s1.rotation.y = Math.PI; L.add(s1);
  box(56, 13, 6, 0, 0, -78, wallMat('#e2d5b5', '#2a3540', 14, 3, '#5b3a1e', 1));
  const s2 = textPlane('KANTOR KARESIDENAN', 12, 1.6); s2.position.set(0, 7, -74.97); L.add(s2);
  // halaman belakang hotel + gang samping (pagar tembok)
  const brick = wallMat('#9a5a3a', '#9a5a3a', 6, 1, '#7a4a2a', 0);
  wall(22, -15, 46, -15, 2.8, brick); wall(46, -15, 46, -45, 2.8, brick); wall(22, -45, 46, -45, 2.8, brick);
  oldCar(43, -18, 0); crate(43, -40); crate(43.2, -41.2); crate(43, -40, .8, .8, false); tree(30, -18, .8); tree(44, -27, .7);
  box(1.4, .9, 1.4, 26, 0, -42, lam(0x7a7a70)); // sumur
  // HOTEL YAMATO
  const hm = (rw, rh) => wallMat('#f3ecdc', '#3a3a32', rw, rh, '#6e4a2a', 1);
  box(.6, H.h, 7, 10.3, 0, -34.5, hm(2, 3)); box(.6, H.h, 7, 10.3, 0, -25.5, hm(2, 3));
  box(.6, H.h - 3, 2, 10.3, 3, -30, hm(1, 2), false);
  box(.6, H.h, 4.6, 39.7, 0, -35.7, hm(1, 3)); box(.6, H.h, 7.6, 39.7, 0, -26.2, hm(2, 3));
  box(.6, H.h - 3, 3.4, 39.7, 3, -31.7, hm(1, 2), false);
  box(30, H.h, .6, 25, 0, -37.7, hm(7, 3)); box(30, H.h, .6, 25, 0, -22.3, hm(7, 3));
  const roofM = lam(0xa49a88);
  box(30.4, .4, 16.4, 25, H.h, -30, roofM, false);
  box(30.4, 1, .3, 25, H.h + .4, -37.9, roofM, false); box(30.4, 1, .3, 25, H.h + .4, -22.1, roofM, false);
  box(.3, 1, 16.4, 10.05, H.h + .4, -30, roofM, false); box(.3, 1, 16.4, 39.95, H.h + .4, -30, roofM, false);
  // portico depan
  box(2.5, .35, 6, 8.8, 4.2, -30, lam(0xe8e0cc), false);
  [-32.6, -27.4].forEach(z => box(.4, 4.2, .4, 7.8, 0, z, lam(0xf3ecdc)));
  const sign = textPlane('HOTEL YAMATO', 8, 1.5); sign.position.set(9.95, 5.4, -30); sign.rotation.y = -Math.PI / 2; L.add(sign);
  // menara
  box(5, 6, 5, 37, H.h, -35, hm(1, 1), true);
  const cap = new R.Mesh(new R.ConeGeometry(3.6, 3, 4), lam(0x7a3b22)); cap.rotation.y = Math.PI / 4; cap.position.set(37, H.h + 7.5, -35); L.add(cap);
  // interior
  box(29, .05, 15, 25, .02, -30, lam(0x7b4a2e), false, false);
  const ll = new R.PointLight(0xffd59a, .9, 30); ll.position.set(25, 7, -30); L.add(ll);
  box(4, 1.1, 1, 18, 0, -26.5, lam(0x4a2e1a));
  [[20, -34], [28, -25.5], [27, -35], [33, -29], [16, -31.5]].forEach(([x, z]) => crate(x, z, 1.3));
  [[15, -27], [15, -33], [24, -27], [24, -33], [32, -33]].forEach(([x, z]) => box(.6, H.h - .1, .6, x, 0, z, lam(0xe8e0cc)));
  const stairsPos = V([12.6, 0, -36]);
  for (let i = 0; i < 6; i++) box(2.2, .3 + i * .3, .5, 12.4, 0, -33.6 - i * .5, lam(0x5b3d22), false);
  const ss = label('TANGGA ↑', '#ffffff'); ss.position.set(12.5, 2.6, -35.5); L.add(ss);
  door(10.3, -31, 2, Math.PI / 2, 'pintu depan');
  door(39.7, -33.4, 3.4, -Math.PI / 2, 'pintu belakang');
  // bendera besar
  const pole = V([14, H.h, -30]);
  box(.12, 8, .12, pole.x, H.h, pole.z, lam(0xcccccc), false);
  const bigFlag = makeFlag(['#ae1c28', '#ffffff', '#21468b'], 3, 2);
  bigFlag.position.set(pole.x, H.h + 7, pole.z); bigFlag.rotation.y = Math.PI / 2;
  // pos pemuda
  box(1.6, .8, .9, -9.3, 0, 21, lam(0x6b4a2a));
  const radio = box(.6, .4, .35, -9.3, .8, 21, lam(0x3a2a1a), false);
  const tent = new R.Mesh(new R.ConeGeometry(3, 2.4, 4), lam(0x5d6b3a)); tent.position.set(-8.6, 3.3, 20); tent.rotation.y = Math.PI / 4; L.add(tent);
  box(.1, 2.2, .1, -7, 0, 18, lam(0x5b3d22)); box(.1, 2.2, .1, -7, 0, 22, lam(0x5b3d22));
  box(.06, 3.6, .06, -7, 0, 26, lam(0xdddddd)); const pf = makeFlag(['#c8102e', '#ffffff'], 1.2, .8); pf.position.set(-7, 3.2, 26);
  const ps = label('POS PEMUDA'); ps.position.set(-8, 3.6, 20); L.add(ps);
  // perabot jalan
  for (let z = 66; z > -72; z -= 18) lamp(-6.6, z);
  poles(6.6, [70, 52, 34, 16, -2, -50, -68]);
  for (let z = 62; z > -72; z -= 15) { if (z > -14 || z < -46) tree(9.4, z - 4, .9); tree(-9.4, z + 3, .9) }
  becak(4, 30, .2); becak(-4.5, -10, Math.PI - .3); becak(5, -60, .1);
  oldCar(-3.5, 50, 0, 0x2a2018); crate(-9, 40); crate(-9.1, 41); crate(9, 2);
  // pejalan kaki
  const walkers = [];
  for (let i = 0; i < 8; i++) {
    const x = pick([-8.5, -7.5, 7.5, 8.5]), za = rand(-10, 70), zb = rand(-10, 70);
    const h = human({ hat: pick(['peci', null, 'caping', null]), skirt: i % 3 === 0 ? pick([0x7a3a2a, 0x3a5a6a, 0x6a4a2a]) : null, longHair: i % 3 === 0 });
    h.position.set(x, .15, za); walkers.push({ h, a: V([x, 0, za]), b: V([x, 0, zb]), to: 1 });
  }
  W.update = dt => walkers.forEach(w => { setPose(w.h, 'walk'); if (walkTo(w.h, w.to ? w.b : w.a, dt, 1.4)) w.to = 1 - w.to; w.h.position.y = .15 });
  return { stairsPos, pole, bigFlag, radio };
}

/* ===================== BABAK II : KAMPUNG & JEMBATAN MERAH ===================== */
function rumah(x, z) {
  const rot = Math.random() < .5, w = rand(5, 6.3), d = rand(5, 6.3), h = rand(2.8, 3.3), ww = rot ? d : w, dd = rot ? w : d;
  box(ww, h, dd, x, 0, z, wallMat(pick(['#8a6a48', '#9a7a55', '#7a5a3a', '#b09070', '#a08060']), '#1e1a14', 2, 1, '#4a3020', 2));
  hipRoof(x, z, ww + 1, dd + 1, h, pick([0x8c3b22, 0x7a3520, 0x9a5a3a]), 2);
}
function buildAct2() {
  newLevel();
  env({ fog: 0x5a3a2a, near: 18, far: 125, sky: ['#2a1a1a', '#7a3a1e', '#c8682a'], hemi: [0xffb38a, 0x3a2a20, .6], sun: [0xff9a5a, .8], sunPos: [-60, 55, 40] });
  A.scale = 'act2';
  makeGround(groundDraw('#6a5a42', 3500, '50,70,30'), 400, 80);
  road(0, 33, 8, 90, (g, w, h) => { g.fillStyle = '#6e604a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, .3) }, 12);
  road(0, -8, 84, 8, (g, w, h) => { g.fillStyle = '#4a4740'; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, .35) }, 1);
  // Kali Mas
  const water = new R.Mesh(new R.PlaneGeometry(220, 15), new R.MeshLambertMaterial({ color: 0x2f3e3a, transparent: true, opacity: .92 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -1.3, -20); L.add(water);
  box(220, 2, 15, 0, -3.4, -20, lam(0x1e2a26), false, false);
  const stone = lam(0x8a8478);
  box(220, 1.6, .6, 0, -1.6, -12.4, stone, false); box(220, 1.6, .6, 0, -1.6, -27.6, stone, false);
  // pagar tepi sungai (pembatas yang terlihat jelas)
  [[-110, -3.6], [3.6, 110]].forEach(([a, b]) => { box(b - a, 1, .3, (a + b) / 2, 0, -12.5, stone); box(b - a, 1, .3, (a + b) / 2, 0, -27.5, stone, false) });
  colliders.push({ x0: -110, x1: -3.6, z0: -27.6, z1: -12.4, y0: -3, y1: 1 }, { x0: 3.6, x1: 110, z0: -27.6, z1: -12.4, y0: -3, y1: 1 });
  // Jembatan Merah
  const red = lam(0xa8281e);
  box(7.2, .4, 16, 0, -.4, -20, lam(0x6a5a4a), false);
  [-3.5, 3.5].forEach(x => { box(.25, 1.2, 16, x, 0, -20, red); for (let i = 0; i < 5; i++) box(.3, 3.2, .3, x, 0, -27 + i * 3.5, red, false); box(.3, .3, 16, x, 3.2, -20, red, false) });
  for (let i = 0; i < 5; i++) box(7.2, .25, .25, 0, 3.2, -27 + i * 3.5, red, false);
  const jm = textPlane('JEMBATAN MERAH', 5, .8, '#a8281e', '#ffffff'); jm.position.set(0, 3.9, -12); jm.rotation.y = Math.PI; L.add(jm);
  const jm2 = jm.clone(); jm2.rotation.y = 0; jm2.position.z = -12.2; L.add(jm2);
  // ujung utara jembatan ditutup bangkai truk terbakar + kawat
  oldCar(0, -30.5, Math.PI / 2, 0x2a2a24); addFire(0, 1, -30.5, .7);
  sandbagLine(-3.4, -28.4, 3.4, -28.4, 2, 0x6a6050);
  // seberang: gedung kolonial (wilayah musuh)
  box(26, 14, 12, -24, 0, -46, wallMat('#d8d0bc', '#2a3540', 7, 4, '#5b3a1e', 1), false);
  const gi = textPlane('INTERNATIO', 9, 1.4); gi.position.set(-24, 10, -39.97); gi.rotation.y = Math.PI; L.add(gi);
  box(22, 11, 12, 22, 0, -48, wallMat('#e2d5b5', '#2a3540', 6, 3, '#6e4a2a', 0), false); hipRoof(22, -48, 22, 12, 11, 0x7a3520, 3);
  box(16, 9, 10, 50, 0, -44, wallMat('#c9b48a', '#2a3540', 4, 3, '#5b3a1e', 0), false);
  box(16, 9, 10, -55, 0, -45, wallMat('#efe6d2', '#2a3540', 4, 3, '#5b3a1e', 1), false);
  addFire(-30, 14, -46, 1.3); addFire(25, 11, -50, 1.1);
  // barikade tepi selatan
  sandbagLine(-18, -6.2, -1.6, -6.2, 3); sandbagLine(1.6, -6.2, 18, -6.2, 3);
  const cart = box(2.6, 1.2, 1.4, 0, 0, -6.4, lam(0x5a3a1e)); cart.rotation.z = .3;
  // pagar keliling kampung
  const bamboo = wallMat('#b8a070', '#b8a070', 30, 1, '#8a7040', 2);
  wall(-42, -12, -42, 78, 2.4, bamboo); wall(42, -12, 42, 78, 2.4, bamboo); wall(-42, 78, 42, 78, 2.4, bamboo);
  // rumah kampung (grid dengan gang)
  const skip = new Set(['9,23', '-27,59', '18,14', '27,14', '36,14']);
  [-36, -27, -18, -9, 9, 18, 27, 36].forEach(x => [14, 23, 32, 50, 59, 68].forEach(z => {
    if (skip.has(x + ',' + z)) return;
    if (Math.random() < .14) { tree(x + rand(-1, 1), z + rand(-1, 1), rand(.8, 1.1)); return }
    rumah(x + rand(-.7, .7), z + rand(-.7, .7));
    if (Math.random() < .18) addFire(x, 3.5, z, .8);
  }));
  // langgar (tempat aman)
  box(9, 4.5, 7, -27, 0, 61, wallMat('#f2efe6', '#3a4a3a', 3, 1, '#2f5a3a', 1));
  const dome = new R.Mesh(new R.SphereGeometry(2.6, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam(0x2f7a4a)); dome.position.set(-27, 4.5, 61); L.add(dome);
  const lg = label('LANGGAR (AMAN)', '#8cff9c'); lg.position.set(-27, 3, 56.5); lg.scale.set(4, 1, 1); L.add(lg);
  // gudang timur (tempat warga terjebak)
  const gud = wallMat('#8a8070', '#3a3a32', 3, 1, '#4a3a2a', 0);
  wall(24, -10, 40, -10, 3.5, gud); wall(40, -10, 40, 6, 3.5, gud); wall(24, 6, 33, 6, 3.5, gud);
  crate(30, -6); crate(31.2, -6); crate(36, 2); addFire(38, 3.5, -8, .8);
  // pos pemuda
  box(1.6, .8, .9, 9.5, 0, 22, lam(0x6b4a2a));
  const radio = box(.6, .4, .35, 9.5, .8, 22, lam(0x3a2a1a), false);
  const tent = new R.Mesh(new R.ConeGeometry(3, 2.4, 4), lam(0x5d6b3a)); tent.position.set(9.5, 3.3, 23); tent.rotation.y = Math.PI / 4; L.add(tent);
  sandbagLine(6.2, 19, 6.2, 27, 2);
  box(.06, 3.6, .06, 6.5, 0, 28, lam(0xdddddd)); const pf = makeFlag(['#c8102e', '#ffffff'], 1.2, .8); pf.position.set(6.5, 3.2, 28);
  const ps = label('POS PEMUDA'); ps.position.set(9.5, 3.6, 22); L.add(ps);
  const ammo = crate(-7, -3); const al = label('AMUNISI', '#ffffff'); al.position.set(-7, 1.6, -3); L.add(al);
  addI(V([-7, 0, -3]), 'Ambil amunisi & granat', refill, 2.4);
  for (let z = 70; z > 0; z -= 18) lamp(-4.6, z);
  becak(-3, 40, 1.2); oldCar(3, 5, .2, 0x3a2a1a);
  const fl = new R.PointLight(0xff5a1a, 2, 70); fl.position.set(0, 10, -30); L.add(fl);
  W.update = dt => { fl.intensity = 1.6 + Math.sin(T * 17) * .4 + Math.random() * .3 };
  return { radio, langgar: V([-27, 0, 56]) };
}

/* ===================== BABAK III : GUNUNGSARI ===================== */
let bridgeUp = true;
function hAct3(x, z) {
  if (z > 36 && z < 48) { if (Math.abs(x) < 3.2 && bridgeUp) return .35; return -2.6 }
  let h = Math.sin(x * .07) * Math.cos(z * .06) * .5 + Math.sin(x * .023 + 1) * .6 + .6;
  const ex = Math.max(0, Math.abs(x) - 36); h += ex * ex * .06;
  if (z < -70) h += (-70 - z) * .35;
  if (z > 60) h += (z - 60) * .35;
  if (Math.abs(z + 1) < 3) h -= .25;
  return Math.max(h, 0);
}
function buildAct3() {
  newLevel(); bridgeUp = true;
  env({ fog: 0xb8ad98, near: 30, far: 160, sky: ['#7a8a9a', '#c0b8a8', '#d8c8a8'], hemi: [0xf0e8d8, 0x5a5a3a, .7], sun: [0xffe0b0, .95], sunPos: [-40, 70, -60] });
  A.scale = 'act3';
  W.groundH = hAct3;
  makeGround(groundDraw('#6f7a45', 2500, '120,100,60'), 300, 50, 150, hAct3);
  // sungai Brantas
  const water = new R.Mesh(new R.PlaneGeometry(300, 12), new R.MeshLambertMaterial({ color: 0x4a5a4a, transparent: true, opacity: .9 }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, -1.5, 42); L.add(water);
  colliders.push({ x0: -150, x1: -3.3, z0: 36.4, z1: 47.6, y0: -4, y1: 4 }, { x0: 3.3, x1: 150, z0: 36.4, z1: 47.6, y0: -4, y1: 4 });
  const bridge = new R.Group(); L.add(bridge);
  const steel = lam(0x5a5a58);
  box(6.6, .4, 14, 0, -.05, 42, lam(0x6a5a4a), false, true, bridge);
  [-3.2, 3.2].forEach(x => { box(.3, 1.1, 14, x, .35, 42, steel, true, true, bridge); for (let i = 0; i < 4; i++) box(.3, 3, .3, x, .35, 36 + i * 4, steel, false, true, bridge); box(.3, .3, 14, x, 3.3, 42, steel, false, true, bridge) });
  const bridgeCols = colliders.slice(-2);
  // parit pertahanan
  sandbagLine(-34, -2.2, 34, -2.2, 3, 0x8a7a55);
  [-20, 0, 20].forEach(x => { const l = label('POS', '#ffffff'); l.position.set(x, 1.8, -.5); L.add(l) });
  // depot amunisi
  [[-4, 25], [-2.6, 25], [-3.3, 25.9]].forEach(([x, z]) => crate(x, z, 1, hAct3(x, z)));
  const tent = new R.Mesh(new R.ConeGeometry(3.4, 2.6, 4), lam(0x5d6b3a)); tent.position.set(4, hAct3(4, 26) + 1.3, 26); tent.rotation.y = Math.PI / 4; L.add(tent);
  oldCar(9, 24, .4, 0x3a4030);
  const dl = label('DEPOT AMUNISI', '#ffffff'); dl.position.set(-3.3, 2.8, 25.5); L.add(dl);
  // pepohonan & pembatas
  for (let z = -90; z < 60; z += 6) { tree(-43 + rand(-1, 1), z, rand(.9, 1.3)); tree(43 + rand(-1, 1), z, rand(.9, 1.3)) }
  colliders.push({ x0: -50, x1: -41, z0: -120, z1: 120, y0: -5, y1: 20 }, { x0: 41, x1: 50, z0: -120, z1: 120, y0: -5, y1: 20 }, { x0: -50, x1: 50, z0: 62, z1: 70, y0: -5, y1: 30 });
  for (let i = 0; i < 26; i++) { const x = rand(-36, 36), z = rand(-80, -12); if (Math.abs(x) > 5) tree(x, z, rand(.8, 1.2), false) }
  for (let i = 0; i < 10; i++) { const x = rand(-34, 34), z = rand(5, 33); if (Math.abs(x) > 8) tree(x, z, rand(.8, 1.1)) }
  // reruntuhan rumah di wilayah musuh (tempat berlindung musuh)
  [[-18, -32], [14, -38], [-6, -55], [24, -22], [-28, -20]].forEach(([x, z]) => {
    const y = hAct3(x, z); box(6, 2.4, .5, x, y, z, lam(0x8a7a60), false); box(.5, 1.6, 4, x - 2.8, y, z - 2, lam(0x8a7a60), false); addFire(x + 1, y, z - 1, .6);
  });
  // desa di seberang sungai
  for (let i = 0; i < 6; i++) { const x = -30 + i * 12, z = 56; if (Math.abs(x) > 6) { const y = hAct3(x, z); box(5, 3, 5, x, y, z, wallMat('#9a7a55', '#1e1a14', 2, 1, '#4a3020', 2), true); hipRoof(x, z, 6, 6, y + 3, 0x8c3b22, 2) } }
  const pf = makeFlag(['#c8102e', '#ffffff'], 1.5, 1); box(.06, 4.5, .06, 6, hAct3(6, 0), 0, lam(0xdddddd)); pf.position.set(6, hAct3(6, 0) + 4, 0);
  return { bridge, bridgeCols, depot: V([-3.3, 0, 25]) };
}
