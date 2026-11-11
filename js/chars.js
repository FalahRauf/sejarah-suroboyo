/* ============================================================
   KARAKTER: model manusia lebih detail + animasi
   ============================================================ */
const HG = {};
function hgeo(k, f) { if (!HG[k]) { HG[k] = f(); HG[k].userData.shared = true } return HG[k] }
const SKINS = [0x8d5a3b, 0x7a4a2e, 0xa06a45, 0x6b4428, 0xb07a50];
const SHIRTS = [0xefe8d6, 0xd6c7a1, 0xb5523b, 0x3d5a80, 0x7a6a4a, 0xe8e0c8, 0x5a6a3a, 0x8a3a2a];
const PANTS = [0x2f2a20, 0x3b3a30, 0x5a4a3a, 0x222222, 0x4a4030];

function human(o = {}) {
  const g = new R.Group();
  const skin = lam(o.skin ?? pick(SKINS)), shirt = lam(o.shirt ?? pick(SHIRTS)), pants = lam(o.pants ?? pick(PANTS));
  const shoe = lam(o.shoe ?? 0x2a1e14), hair = lam(o.hair ?? 0x141010), dark = lam(0x0d0d0d);
  const add = (geo, m, x, y, z, p = g) => { const me = new R.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; p.add(me); return me };
  // badan
  add(hgeo('hip', () => new R.BoxGeometry(.36, .2, .22)), pants, 0, .95, 0);
  add(hgeo('torso', () => { const t = new R.CylinderGeometry(.21, .17, .56, 10); t.scale(1, 1, .62); return t }), shirt, 0, 1.3, 0);
  add(hgeo('belt', () => new R.BoxGeometry(.37, .06, .25)), lam(o.belt ?? 0x3a2a1a), 0, 1.04, 0);
  if (o.vest) add(hgeo('vest', () => { const t = new R.CylinderGeometry(.215, .19, .4, 10); t.scale(1, 1, .66); return t }), lam(o.vest), 0, 1.35, 0);
  if (o.skirt) add(hgeo('skirt', () => new R.CylinderGeometry(.2, .3, .8, 10)), lam(o.skirt), 0, .55, 0);
  // kepala
  add(hgeo('neck', () => new R.CylinderGeometry(.055, .06, .1, 8)), skin, 0, 1.62, 0);
  add(hgeo('head', () => { const h = new R.SphereGeometry(.14, 14, 12); h.scale(1, 1.12, 1.02); return h }), skin, 0, 1.78, 0);
  if (!o.bald) add(hgeo('hair', () => new R.SphereGeometry(.148, 14, 8, 0, Math.PI * 2, 0, Math.PI * .5)), hair, 0, 1.8, -.012);
  if (o.longHair) add(hgeo('bun', () => new R.SphereGeometry(.08, 8, 6)), hair, 0, 1.78, -.15);
  add(hgeo('eye', () => new R.SphereGeometry(.018, 6, 4)), dark, -.05, 1.8, .127);
  add(hgeo('eye', () => new R.SphereGeometry(.018, 6, 4)), dark, .05, 1.8, .127);
  add(hgeo('nose', () => new R.BoxGeometry(.035, .05, .045)), skin, 0, 1.76, .145);
  if (o.mustache) add(hgeo('mus', () => new R.BoxGeometry(.08, .015, .02)), hair, 0, 1.72, .14);
  // tungkai
  const limb = (x, y) => { const p = new R.Group(); p.position.set(x, y, 0); g.add(p); return p };
  const legL = limb(-.1, .92), legR = limb(.1, .92);
  [legL, legR].forEach(p => {
    add(hgeo('thigh', () => new R.CylinderGeometry(.085, .068, .84, 8)), pants, 0, -.42, 0, p);
    add(hgeo('shoe', () => new R.BoxGeometry(.12, .08, .26)), o.barefoot ? skin : shoe, 0, -.86, .05, p);
  });
  const armL = limb(-.27, 1.52), armR = limb(.27, 1.52);
  [armL, armR].forEach(p => {
    add(hgeo('upper', () => new R.CylinderGeometry(.07, .06, .32, 8)), shirt, 0, -.16, 0, p);
    add(hgeo('fore', () => new R.CylinderGeometry(.055, .045, .3, 8)), o.longSleeve ? shirt : skin, 0, -.46, 0, p);
    add(hgeo('hand', () => new R.SphereGeometry(.05, 8, 6)), skin, 0, -.64, 0, p);
  });
  // penutup kepala
  const h = o.hat;
  if (h === 'peci') add(hgeo('peci', () => new R.CylinderGeometry(.148, .155, .12, 16)), lam(0x111111), 0, 1.9, 0);
  if (h === 'ikat') add(hgeo('ikat', () => new R.CylinderGeometry(.152, .152, .05, 16, 1, true)), lam(0xc8102e), 0, 1.84, 0);
  if (h === 'caping') add(hgeo('caping', () => new R.ConeGeometry(.42, .2, 16)), lam(0xc9a861), 0, 1.98, 0);
  if (h === 'helm') add(hgeo('helm', () => new R.SphereGeometry(.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), lam(0x4b5320), 0, 1.8, 0);
  if (h === 'brodie') { // helm pasukan Sekutu
    add(hgeo('brim', () => new R.CylinderGeometry(.27, .27, .025, 18)), lam(0x5a5e3a), 0, 1.9, 0);
    add(hgeo('helm', () => new R.SphereGeometry(.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), lam(0x5a5e3a), 0, 1.86, 0);
  }
  if (h === 'kepi') { // topi pejuang / TKR
    add(hgeo('kepi', () => new R.CylinderGeometry(.15, .15, .1, 14)), lam(o.hatColor ?? 0x5a5a3a), 0, 1.9, 0);
    add(hgeo('visor', () => new R.BoxGeometry(.2, .02, .1)), lam(0x222222), 0, 1.86, .13);
  }
  // senapan
  let gun = null;
  if (o.rifle) {
    gun = new R.Group();
    add(hgeo('gstock', () => new R.BoxGeometry(.05, .08, .8)), lam(0x5a3a1e), 0, 0, 0, gun);
    add(hgeo('gbar', () => { const c = new R.CylinderGeometry(.014, .014, .45, 6); c.rotateX(Math.PI / 2); return c }), lam(0x222222), 0, .03, .58, gun);
    g.add(gun);
  }
  if (o.bambu) { // bambu runcing
    gun = new R.Group();
    add(hgeo('bambu', () => { const c = new R.CylinderGeometry(.025, .03, 2.1, 6); c.rotateX(Math.PI / 2); return c }), lam(0xb8a060), 0, 0, .3, gun);
    add(hgeo('tip', () => { const c = new R.ConeGeometry(.03, .2, 6); c.rotateX(Math.PI / 2); return c }), lam(0xd8c080), 0, 0, 1.45, gun);
    g.add(gun);
  }
  if (o.name) g.add(label(o.name, o.labelColor));
  g.userData = { legL, legR, armL, armR, gun, ph: Math.random() * 6, pose: null };
  setPose(g, o.pose || 'idle');
  if (o.scale) g.scale.setScalar(o.scale);
  L.add(g); return g;
}
function setPose(h, p) {
  const u = h.userData; if (u.pose === p) return; u.pose = p;
  u.armL.rotation.set(0, 0, 0); u.armR.rotation.set(0, 0, 0);
  if (u.gun) {
    if (p === 'aim') { u.gun.position.set(.08, 1.47, .38); u.gun.rotation.set(0, 0, 0) }
    else { u.gun.position.set(.12, 1.12, .28); u.gun.rotation.set(.55, 0, 0) }
  }
  if (p === 'aim') { u.armR.rotation.x = -1.5; u.armL.rotation.x = -1.4; u.armL.rotation.z = .45 }
  else if (p === 'carry' || (u.gun && p === 'idle')) { u.armR.rotation.x = -.7; u.armL.rotation.x = -.9; u.armL.rotation.z = .3 }
  else if (p === 'cheer') { u.armL.rotation.x = -2.9; u.armR.rotation.x = -2.9 }
}
function animHuman(h, spd, dt) {
  const u = h.userData; u.ph += dt * (2 + spd * 2.2);
  const a = Math.sin(u.ph) * .7 * Math.min(1, spd / 2);
  u.legL.rotation.x = a; u.legR.rotation.x = -a;
  if (u.pose === 'walk' || (!u.gun && u.pose === 'idle')) { u.armL.rotation.x = -a * .8; u.armR.rotation.x = a * .8 }
  if (u.pose === 'cheer') { u.armL.rotation.x = -2.9 + Math.sin(T * 8) * .25; u.armR.rotation.x = -2.9 + Math.cos(T * 8) * .25 }
}
function walkTo(h, goal, dt, speed = 2.6) {
  const d = new R.Vector3(goal.x - h.position.x, 0, goal.z - h.position.z); const Ln = d.length();
  if (Ln > .25) {
    const s = Math.min(Ln, speed * dt); h.position.x += d.x / Ln * s; h.position.z += d.z / Ln * s;
    h.rotation.y = Math.atan2(d.x, d.z); h.position.y = W.groundH(h.position.x, h.position.z) + .02;
    animHuman(h, speed, dt); return false;
  }
  animHuman(h, 0, dt); return true;
}
