/* ============================================================
   SISTEM TEMPUR: senapan, granat, musuh, pejuang, tank, pesawat
   ============================================================ */
const enemies = [], allies = [], tanks = [], nades = [], tracers = [], planes = [];
const C = { hasGun: false, ammo: 10, mag: 10, reserve: 50, gren: 0, cd: 0, reloading: 0, lastHurt: -99, kick: 0, kills: 0 };

/* ---------- senapan di tangan (view model) ---------- */
const viewGun = new R.Group();
(() => {
  const wood = lam(0x6b4423), metal = lam(0x2a2a2a), skin = lam(0x8d5a3b);
  const m = (geo, mat, x, y, z) => { const me = new R.Mesh(geo, mat); me.position.set(x, y, z); viewGun.add(me); return me };
  m(new R.BoxGeometry(.07, .1, .6), wood, 0, -.02, .05);
  m(new R.BoxGeometry(.06, .07, .28), metal, 0, .03, -.15);
  const bar = new R.CylinderGeometry(.016, .016, .55, 8); bar.rotateX(Math.PI / 2); m(bar, metal, 0, .04, -.52);
  const bolt = new R.CylinderGeometry(.012, .012, .08, 6); bolt.rotateZ(Math.PI / 2); m(bolt, metal, .06, .05, -.06);
  m(new R.SphereGeometry(.05, 8, 6), skin, -.02, -.07, -.3);
  m(new R.SphereGeometry(.05, 8, 6), skin, .03, -.07, .12);
  const fl = new R.Sprite(new R.SpriteMaterial({ map: smokeTex, color: 0xffd070, transparent: true, depthWrite: false }));
  fl.scale.setScalar(.35); fl.position.set(0, .04, -.85); fl.visible = false; viewGun.add(fl); viewGun.userData.flash = fl;
  viewGun.position.set(.22, -.24, -.45); viewGun.visible = false; camera.add(viewGun);
  viewGun.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.depthTest = true } });
})();
function giveGun(gren = 3) { C.hasGun = true; C.ammo = C.mag; C.reserve = Math.max(C.reserve, 50); C.gren = Math.max(C.gren, gren); $('#combatHud').hidden = false }
function refill() { C.reserve = 60; C.gren = Math.max(C.gren, 4); P.hp = 100; SFX.reload(); toast('AMUNISI & GRANAT TERISI', 1200) }

/* ---------- ray utils ---------- */
function rayAABB(o, d, c) {
  let t0 = 0, t1 = 1e9;
  const mn = [c.x0, c.y0, c.z0], mx = [c.x1, c.y1, c.z1], oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-8) { if (oo[i] < mn[i] || oo[i] > mx[i]) return null; continue }
    let a = (mn[i] - oo[i]) / dd[i], b = (mx[i] - oo[i]) / dd[i]; if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return null;
  }
  return t0;
}
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z, b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - cc;
  if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t > 0 ? t : null;
}
function rayWorld(o, d, max) { // tembok, tanah, tank
  let best = { t: max };
  for (const c of colliders) { if (c.off) continue; const t = rayAABB(o, d, c); if (t !== null && t < best.t) best = { t, tank: c.tank } }
  for (let s = 1; s < Math.min(best.t, 120); s += 1) { const px = o.x + d.x * s, pz = o.z + d.z * s, py = o.y + d.y * s; if (py < W.groundH(px, pz)) { if (s < best.t) best = { t: s, ground: true }; break } }
  return best;
}
function los(a, b) { const d = new R.Vector3().subVectors(b, a); const dist = d.length(); d.normalize(); return rayWorld(a, d, dist).t >= dist - .4 }

/* ---------- tracer peluru ---------- */
const tracerGeo = (() => { const g = new R.BoxGeometry(.025, .025, 1); g.translate(0, 0, .5); g.userData.shared = true; return g })();
const tracerMat = new R.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .9 });
function tracer(a, b) {
  const m = new R.Mesh(tracerGeo, tracerMat); m.position.copy(a); m.lookAt(b); m.scale.z = a.distanceTo(b); L.add(m); tracers.push({ m, t: .06 });
}

/* ---------- menembak ---------- */
function fire() {
  if (!C.hasGun || mode !== 'play' || C.cd > 0 || C.reloading > 0 || P.carry) return;
  if (C.ammo <= 0) { tone(1200, .03, .1, 'square'); if (C.reserve > 0) reload(); return }
  C.ammo--; C.cd = .32; C.kick = 1; SFX.rifle(); shake = Math.max(shake, .05);
  const fl = viewGun.userData.flash; fl.visible = true; fl.material.rotation = Math.random() * 6; setTimeout(() => fl.visible = false, 50);
  const o = camera.getWorldPosition(new R.Vector3());
  const d = new R.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new R.Quaternion()));
  const sp = P.crouch ? .004 : P.moving ? .02 : .009; d.x += rand(-sp, sp); d.y += rand(-sp, sp); d.z += rand(-sp, sp); d.normalize();
  P.pitch = Math.min(1.45, P.pitch + .022);
  let best = rayWorld(o, d, 150), hitE = null, head = false;
  for (const e of enemies) {
    if (!e.alive) continue; const p = e.m.position;
    const th = raySphere(o, d, V([p.x, p.y + 1.78, p.z]), .2), tb = raySphere(o, d, V([p.x, p.y + 1.15, p.z]), .42);
    if (th !== null && th < best.t) { best = { t: th }; hitE = e; head = true }
    if (tb !== null && tb < best.t) { best = { t: tb }; hitE = e; head = false }
  }
  const pt = o.clone().addScaledVector(d, best.t);
  tracer(fl.getWorldPosition(new R.Vector3()), pt);
  if (hitE) { damageSoldier(hitE, head ? 5 : 1.3, true); SFX.hit(); hitmark(head) }
  else if (best.tank) { for (let i = 0; i < 4; i++) puff(pt.clone(), 0xffc060, .3, .2, V([rand(-3, 3), rand(1, 4), rand(-3, 3)]), 0); tone(2400, .05, .08, 'square') }
  else puff(pt, 0x8a7a5a, .6, .6, V([0, .8, 0]), 2);
  if (C.ammo === 0 && C.reserve > 0) setTimeout(reload, 350);
}
function reload() {
  if (!C.hasGun || C.reloading > 0 || C.ammo === C.mag || C.reserve <= 0) return;
  C.reloading = 1.6; SFX.reload();
}
function hitmark(head) { const h = $('#hit'); h.style.opacity = 1; h.style.color = head ? '#ff4b40' : '#fff'; setTimeout(() => h.style.opacity = 0, 120) }

/* ---------- granat ---------- */
const nadeGeo = new R.SphereGeometry(.09, 8, 6);
function throwGrenade() {
  if (C.gren <= 0 || mode !== 'play' || P.carry) { if (C.gren <= 0 && C.hasGun) toast('GRANAT HABIS', 800); return }
  C.gren--; SFX.pin();
  const o = camera.getWorldPosition(new R.Vector3());
  const d = new R.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new R.Quaternion()));
  const m = new R.Mesh(nadeGeo, lam(0x3a4a2a)); m.position.copy(o).addScaledVector(d, .6); m.castShadow = true; L.add(m);
  nades.push({ m, v: d.multiplyScalar(16).add(V([0, 4.5, 0])), t: 2.3 });
}
function updateNades(dt) {
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i], p = n.m.position, old = p.clone();
    n.v.y -= 20 * dt; p.addScaledVector(n.v, dt); n.m.rotation.x += dt * 10;
    const gy = W.groundH(p.x, p.z) + .09;
    if (p.y < gy) { p.y = gy; n.v.y *= -.3; n.v.x *= .6; n.v.z *= .6 }
    for (const c of colliders) if (!c.off && p.x > c.x0 && p.x < c.x1 && p.z > c.z0 && p.z < c.z1 && p.y < c.y1 && p.y > c.y0) { p.x = old.x; p.z = old.z; n.v.x *= -.4; n.v.z *= -.4; break }
    n.t -= dt;
    if (n.t <= 0) { L.remove(n.m); nades.splice(i, 1); boomFx(p.clone(), 1.2); blastDamage(p.clone(), 6, true, 75) }
  }
}
function blastDamage(p, r, byPlayer, playerDmg = 60) {
  enemies.forEach(e => { if (!e.alive) return; const d = e.m.position.distanceTo(p); if (d < r) { damageSoldier(e, 6 * (1 - d / r) + 1.2, byPlayer); e.m.rotation.z = rand(-.5, .5) } });
  tanks.forEach(tk => { if (tk.alive && tk.g.position.distanceTo(p) < r + 1.8 && byPlayer) damageTank(tk) });
  const dp = Math.hypot(P.pos.x - p.x, P.pos.z - p.z);
  if (dp < r * .85 && !W.roof) damagePlayer(playerDmg * (1 - dp / r) + 10);
}

/* ---------- prajurit (musuh & pejuang) ---------- */
function spawnSoldier(team, pos, cover, o = {}) {
  const m = team === 'enemy'
    ? human({ shirt: 0x8a7d55, pants: 0x7a6d48, skin: pick([0xe2b896, 0x8d5a3b, 0xa06a45, 0x6b4428]), hat: 'brodie', rifle: true, belt: 0x5a4a2a, longSleeve: Math.random() < .5, vest: Math.random() < .4 ? 0x6a6040 : null })
    : human({ hat: pick(['ikat', 'peci', null, 'kepi', 'ikat']), rifle: !o.bambu && Math.random() < .8, bambu: o.bambu, shirt: pick(SHIRTS), barefoot: Math.random() < .3 });
  m.position.set(pos.x, W.groundH(pos.x, pos.z), pos.z);
  const s = { m, team, hp: team === 'enemy' ? 2 : 4, alive: true, cover: (cover || pos).clone(), fireT: rand(.5, 3), deadT: 0, speed: rand(2.2, 3), tgt: null, tgtT: 0, wave: o.wave, acc: o.acc || (team === 'enemy' ? .2 : .055) };
  s.melee = !m.userData.gun || !!o.bambu;
  (team === 'enemy' ? enemies : allies).push(s); return s;
}
function damageSoldier(s, n, byPlayer) {
  if (!s.alive) return; s.hp -= n;
  if (s.hp <= 0) {
    s.alive = false; s.deadT = 0; setPose(s.m, 'idle'); s.m.rotation.x = 0;
    if (s.team === 'enemy' && byPlayer) C.kills++;
    tone(s.team === 'enemy' ? 180 : 220, .3, .15, 'sawtooth', 90);
  }
}
function chooseTarget(s) {
  s.tgtT -= .1; if (s.tgtT > 0 && s.tgt && (s.tgt.kind === 'player' || s.tgt.ref.alive)) return s.tgt;
  s.tgtT = rand(1.5, 3);
  const foes = s.team === 'enemy' ? allies : enemies; let best = null, bd = s.team === 'enemy' ? 70 : 75;
  for (const f of foes) { if (!f.alive) continue; const d = f.m.position.distanceTo(s.m.position); if (d < bd) { bd = d; best = f } }
  const dp = Math.hypot(P.pos.x - s.m.position.x, P.pos.z - s.m.position.z);
  if (s.team === 'enemy' && !W.roof && dp < 60 && (!best || Math.random() < .55 || dp < bd)) return s.tgt = { kind: 'player' };
  return s.tgt = best ? { kind: 'soldier', ref: best } : null;
}
function aimPoint(t) { if (t.kind === 'player') return V([P.pos.x, P.floor + P.eye - .15, P.pos.z]); const p = t.ref.m.position; return V([p.x, p.y + 1.25, p.z]) }
function soldierShoot(s, t) {
  const fwd = V([Math.sin(s.m.rotation.y), 0, Math.cos(s.m.rotation.y)]);
  const mz = s.m.position.clone().add(V([0, 1.48, 0])).addScaledVector(fwd, .9);
  const tp = aimPoint(t); if (!los(mz, tp)) return;
  const dist = mz.distanceTo(tp);
  let ch = s.acc * Math.max(.15, 1 - dist / 70);
  if (t.kind === 'player') { if (P.crouch) ch *= .55; if (P.running) ch *= .6 }
  const hit = Math.random() < ch;
  const end = hit ? tp : tp.clone().add(V([rand(-1.5, 1.5), rand(-.6, 1.2), rand(-1.5, 1.5)])).sub(mz).multiplyScalar(1.6).add(mz);
  tracer(mz, end);
  SFX.shot(mz.distanceTo(camera.position));
  if (hit) { if (t.kind === 'player') damagePlayer(s.team === 'enemy' ? 8 : 0); else damageSoldier(t.ref, 1, false) }
}
function updSoldier(s, dt) {
  const m = s.m;
  if (!s.alive) {
    s.deadT += dt; m.rotation.x = Math.max(-Math.PI / 2, m.rotation.x - dt * 5);
    if (s.deadT > 12) { L.remove(m); s.gone = true } return;
  }
  const moving = !walkTo(m, s.cover, dt, s.speed);
  if (moving) { setPose(m, m.userData.gun ? 'carry' : 'walk'); return }
  const t = chooseTarget(s);
  if (!t) { setPose(m, m.userData.gun ? 'carry' : 'idle'); return }
  const tp = aimPoint(t); m.rotation.y = Math.atan2(tp.x - m.position.x, tp.z - m.position.z);
  if (s.melee) { setPose(m, 'cheer'); return } // bambu runcing / tanpa senapan: bersorak menyemangati
  setPose(m, 'aim');
  s.fireT -= dt;
  if (s.fireT <= 0) { s.fireT = rand(1.1, 2.6) * (s.team === 'ally' ? 1.1 : 1); soldierShoot(s, t) }
}
function cleanup(arr) { for (let i = arr.length - 1; i >= 0; i--) if (arr[i].gone) arr.splice(i, 1) }
function aliveEnemies(wave) { return enemies.filter(e => e.alive && (wave === undefined || e.wave === wave)).length }

/* ---------- tank ---------- */
function spawnTank(pos, path) {
  const g = new R.Group(), ol = lam(0x5a5e3a), dk = lam(0x262620), add = (geo, mat, x, y, z, p = g) => { const m = new R.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m };
  add(new R.BoxGeometry(2.9, 1, 5.4), ol, 0, .95, 0);
  add(new R.BoxGeometry(2.6, .55, 3.6), ol, 0, 1.7, -.3);
  [-1.55, 1.55].forEach(x => { add(new R.BoxGeometry(.7, 1, 5.8), dk, x, .55, 0); for (let i = 0; i < 5; i++) { const w = new R.CylinderGeometry(.38, .38, .72, 12); w.rotateZ(Math.PI / 2); add(w, lam(0x3a3a30), x, .45, -2.1 + i * 1.05) } });
  const tur = new R.Group(); tur.position.set(0, 2.25, -.3); g.add(tur);
  add(new R.BoxGeometry(1.9, .75, 2.2), ol, 0, 0, 0, tur);
  const bg = new R.CylinderGeometry(.09, .11, 2.6, 8); bg.rotateX(Math.PI / 2); add(bg, dk, 0, .05, 2.3, tur);
  add(new R.CylinderGeometry(.35, .35, .25, 12), ol, .4, .5, -.3, tur);
  const star = textPlane('★', .8, .8, '#5a5e3a', '#e8e0c0'); star.position.set(1.47, 1.1, 0); star.rotation.y = Math.PI / 2; g.add(star);
  g.position.copy(pos); g.position.y = W.groundH(pos.x, pos.z); L.add(g);
  const tk = { g, tur, hp: 3, alive: true, path: path.map(p => V([p[0], 0, p[1]])), i: 0, fireT: rand(4, 6), mgT: 3, col: null };
  tk.col = { x0: 0, x1: 0, z0: 0, z1: 0, y0: 0, y1: 2.7, tank: tk }; colliders.push(tk.col);
  tanks.push(tk); updTankCol(tk); return tk;
}
function updTankCol(tk) { const p = tk.g.position, a = Math.abs(Math.sin(tk.g.rotation.y)) > .7; const hw = a ? 2.9 : 1.9, hd = a ? 1.9 : 2.9; Object.assign(tk.col, { x0: p.x - hw, x1: p.x + hw, z0: p.z - hd, z1: p.z + hd, y0: p.y, y1: p.y + 2.7 }) }
function updTank(tk, dt) {
  if (!tk.alive) { if (Math.random() < dt * 8) puff(tk.g.position.clone().add(V([0, 2.5, 0])), 0x1a1a1a, rand(2, 3), rand(3, 5), V([rand(-.3, .3), 2.5, rand(-.3, .3)]), 3); return }
  const tg = tk.path[tk.i];
  if (tg) {
    const d = new R.Vector3(tg.x - tk.g.position.x, 0, tg.z - tk.g.position.z);
    if (d.length() < .5) tk.i++;
    else {
      const want = Math.atan2(d.x, d.z); let diff = want - tk.g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      tk.g.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), dt * .8);
      if (Math.abs(diff) < .3) { const st = Math.min(d.length(), 1.5 * dt); tk.g.position.addScaledVector(d.normalize(), st) }
      tk.g.position.y = W.groundH(tk.g.position.x, tk.g.position.z);
      updTankCol(tk);
    }
  }
  const dx = P.pos.x - tk.g.position.x, dz = P.pos.z - tk.g.position.z, dist = Math.hypot(dx, dz);
  tk.tur.rotation.y += (Math.atan2(dx, dz) - tk.g.rotation.y - tk.tur.rotation.y) * Math.min(1, dt * 1.5);
  if (mode !== 'play') return;
  tk.fireT -= dt; tk.mgT -= dt;
  if (tk.fireT <= 0 && dist < 80) {
    tk.fireT = rand(5, 7.5);
    const mz = tk.tur.localToWorld(V([0, .05, 3.6]));
    boomFx(mz, .5); artillery(V([P.pos.x + rand(-4, 4), 0, P.pos.z + rand(-4, 4)]), 1.3, 3.2, 55);
  }
  if (tk.mgT <= 0 && dist < 55) {
    tk.mgT = rand(3, 5);
    for (let i = 0; i < 6; i++) setTimeout(() => { if (tk.alive && mode === 'play') soldierShoot({ m: tk.g, acc: .12, team: 'enemy' }, { kind: 'player' }) }, i * 110);
  }
}
function damageTank(tk) {
  if (!tk.alive) return; tk.hp--; toast(tk.hp > 0 ? `TANK RUSAK! (${3 - tk.hp}/3)` : 'TANK HANCUR!', 1200);
  if (tk.hp <= 0) {
    tk.alive = false; C.kills += 3;
    [0, 300, 700].forEach(t => setTimeout(() => boomFx(tk.g.position.clone().add(V([rand(-1, 1), 1.5, rand(-1, 1)])), 1.4), t));
    tk.g.traverse(o => { if (o.material && o.material.color) o.material = lam(0x1e1c18) });
    tk.tur.rotation.z = .25; tk.tur.position.y += .2;
  }
}

/* ---------- pesawat ---------- */
function flyBy(z, bombs = 4, dir = 1, y = 42) {
  const g = new R.Group(), mt = lam(0x6b6f5a), add = (geo, x, yy, zz) => { const m = new R.Mesh(geo, mt); m.position.set(x, yy, zz); g.add(m); return m };
  const f = new R.CylinderGeometry(.55, .35, 7.5, 10); f.rotateZ(Math.PI / 2); add(f, 0, 0, 0);
  add(new R.BoxGeometry(1.8, .12, 11), .5, 0, 0); add(new R.BoxGeometry(1, .1, 3.5), -3.3, .2, 0); add(new R.BoxGeometry(.9, 1.2, .1), -3.4, .7, 0);
  const pr = add(new R.BoxGeometry(.06, 2.2, .2), 3.85, 0, 0); g.userData.prop = pr;
  g.rotation.y = dir > 0 ? 0 : Math.PI;
  g.position.set(-dir * 190, y, z); scene.add(g);
  planes.push({ g, v: dir * 58, bombs, t: 0 });
}
function updPlanes(dt) {
  let near = 999;
  for (let i = planes.length - 1; i >= 0; i--) {
    const p = planes[i]; p.g.position.x += p.v * dt; p.g.userData.prop.rotation.x += dt * 40;
    const d = p.g.position.distanceTo(camera.position); near = Math.min(near, d);
    p.t -= dt;
    if (p.bombs > 0 && Math.abs(p.g.position.x - P.pos.x) < 26 && p.t <= 0) { p.t = .35; p.bombs--; artillery(V([p.g.position.x + rand(-2, 2), 0, p.g.position.z + rand(-6, 6)]), 1.4, 3.6, 60) }
    if (Math.abs(p.g.position.x) > 200) { scene.remove(p.g); planes.splice(i, 1) }
  }
  if (A.plane) A.plane.gain.value = near < 200 ? Math.max(0, .22 - near / 900) : 0;
}

/* ---------- darah pemain ---------- */
function damagePlayer(n) {
  if (mode !== 'play' || n <= 0) return;
  P.hp -= n; C.lastHurt = T; SFX.hurt(); shake = Math.max(shake, .2);
  const v = $('#vig'); v.style.opacity = Math.min(1, .5 + (100 - P.hp) / 120);
  if (P.hp <= 0) die();
}
function die() {
  mode = 'busy'; P.hp = 0; stopVO(); toast('KAMU GUGUR... BANGKIT LAGI!', 2000);
  fadeOut(() => {
    P.hp = 100; P.carry = false; const c = P.check; W.roof = null; teleport(c[0], c[1], c[2]);
    C.ammo = C.mag; C.reserve = Math.max(C.reserve, 40); if (C.hasGun) C.gren = Math.max(C.gren, 2);
    pending.forEach(s => L.remove(s.ring)); pending.length = 0;
    W.onRespawn && W.onRespawn(); mode = 'play';
  }, 700);
}

/* ---------- update utama tempur ---------- */
function updateCombat(dt) {
  C.cd -= dt;
  if (C.reloading > 0) { C.reloading -= dt; if (C.reloading <= 0) { const n = Math.min(C.mag - C.ammo, C.reserve); C.ammo += n; C.reserve -= n } }
  if (mode === 'play' && T - C.lastHurt > 4 && P.hp < 100) P.hp = Math.min(100, P.hp + 12 * dt);
  const v = $('#vig'); v.style.opacity = Math.max(0, parseFloat(v.style.opacity || 0) - dt * .8) * (P.hp < 35 ? 1 : 1);
  if (P.hp < 35) v.style.opacity = Math.max(parseFloat(v.style.opacity), .45 + Math.sin(T * 6) * .1);
  if (mode === 'play' || mode === 'cut') { enemies.forEach(s => updSoldier(s, dt)); allies.forEach(s => updSoldier(s, dt)); tanks.forEach(t => updTank(t, dt)) }
  cleanup(enemies); cleanup(allies);
  updateNades(dt); updPlanes(dt);
  for (let i = tracers.length - 1; i >= 0; i--) { tracers[i].t -= dt; if (tracers[i].t <= 0) { L.remove(tracers[i].m); tracers.splice(i, 1) } }
  // tank engine
  let tn = 999; tanks.forEach(t => { if (t.alive) tn = Math.min(tn, t.g.position.distanceTo(camera.position)) });
  if (A.tank) A.tank.gain.value = tn < 90 ? (.18 - tn / 500) : 0;
  // view model
  const show = C.hasGun && mode === 'play' && !P.carry;
  viewGun.visible = show;
  if (show) {
    C.kick = Math.max(0, C.kick - dt * 8);
    const bob = P.moving ? Math.sin(T * (P.running ? 13 : 9)) * .015 : 0, rl = C.reloading > 0 ? Math.sin(Math.min(1, (1.6 - C.reloading) / 1.6) * Math.PI) : 0;
    viewGun.position.set(.22 + bob, -.24 - Math.abs(bob) - rl * .15, -.45 + C.kick * .06);
    viewGun.rotation.set(C.kick * .12 + rl * .6, 0, rl * .3);
  }
  // HUD
  $('#hpbar').style.width = Math.max(0, P.hp) + '%';
  $('#hpbar').style.background = P.hp < 35 ? '#ff3b30' : '#7ed957';
  $('#ammo').textContent = C.reloading > 0 ? 'MENGISI...' : `${C.ammo} / ${C.reserve}`;
  $('#gren').textContent = '💣 × ' + C.gren;
}
function clearCombat() {
  enemies.length = 0; allies.length = 0; tanks.length = 0; nades.length = 0; tracers.length = 0;
  planes.forEach(p => scene.remove(p.g)); planes.length = 0;
}
