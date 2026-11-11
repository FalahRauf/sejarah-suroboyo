/* ============================================================
   ENGINE: renderer, audio, input, pemain, UI, cutscene, level
   ============================================================ */
const R = THREE, $ = s => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const V = a => new R.Vector3(...a);
const pick = a => a[Math.floor(Math.random() * a.length)];
let mode = 'menu', T = 0, shake = 0;

/* ---------------- AUDIO (semua disintesis) ---------------- */
const A = { ctx: null, muted: false, scale: 'act1', step: 0, mel: 2 };
function initAudio() {
  const ac = new (window.AudioContext || window.webkitAudioContext)(); A.ctx = ac;
  A.master = ac.createGain(); A.master.gain.value = .85; A.master.connect(ac.destination);
  A.music = ac.createGain(); A.music.gain.value = .17; A.music.connect(A.master);
  A.sfx = ac.createGain(); A.sfx.connect(A.master);
  const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  A.noise = b;
  const loopNoise = (type, f, g) => {
    const s = ac.createBufferSource(); s.buffer = b; s.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const gn = ac.createGain(); gn.gain.value = g; s.connect(fl).connect(gn).connect(A.master); s.start(); return gn;
  };
  const drone = (type, f, lp) => {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f;
    const fl = ac.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp;
    const g = ac.createGain(); g.gain.value = 0; o.connect(fl).connect(g).connect(A.master); o.start(); return g;
  };
  A.wind = loopNoise('lowpass', 380, .06);
  A.radio = loopNoise('bandpass', 2600, 0);
  A.crowd = loopNoise('bandpass', 700, 0);
  A.plane = drone('sawtooth', 78, 420);
  A.tank = drone('square', 36, 170);
  setInterval(musicTick, 250);
}
function nz(dur, type, freq, vol, q = 1, att = .005) {
  if (!A.ctx) return; const ac = A.ctx, t = ac.currentTime;
  const s = ac.createBufferSource(); s.buffer = A.noise;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + att + dur);
  s.connect(f).connect(g).connect(A.sfx); s.start(t, Math.random()); s.stop(t + att + dur + .1);
}
function tone(freq, dur, vol, type = 'sine', slide, dest) {
  if (!A.ctx) return; const ac = A.ctx, t = ac.currentTime;
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest || A.sfx); o.start(t); o.stop(t + dur + .05);
}
const SFX = {
  step(soft) { nz(.08, 'lowpass', rand(450, 750), soft ? .06 : .16) },
  boom(d = 10) { const v = Math.max(.1, 1.3 - d / 35); nz(2.4, 'lowpass', 240, v, 1, .01); tone(60, 1.3, v, 'sine', 28); nz(.35, 'bandpass', 900, v * .5) },
  shot(d = 40) { nz(.16, 'bandpass', rand(900, 1900), Math.max(.03, .5 - d / 120), .8, .002) },
  rifle() { nz(.22, 'lowpass', 2600, 1, .7, .001); tone(130, .25, .55, 'sine', 45); nz(.7, 'bandpass', 500, .12, .5, .03) },
  reload() { tone(900, .05, .15, 'square'); setTimeout(() => tone(600, .06, .15, 'square'), 300); setTimeout(() => tone(1100, .05, .15, 'square'), 900) },
  hit() { tone(1900, .05, .1, 'square') },
  hurt() { tone(240, .25, .22, 'sawtooth', 110) },
  pin() { tone(2200, .05, .1, 'square'); setTimeout(() => tone(1600, .08, .1, 'triangle'), 60) },
  blip() { tone(880, .1, .12, 'square') },
  ok() { tone(660, .15, .18, 'triangle'); setTimeout(() => tone(990, .3, .18, 'triangle'), 120) },
  alert() { tone(320, .5, .3, 'sawtooth', 140) },
  tick() { tone(1500, .04, .05, 'square') },
  tear() { nz(.7, 'highpass', 2400, .5, .5, .01); setTimeout(() => nz(.4, 'highpass', 3000, .4, .5, .01), 250) },
  whistle() { tone(1600, 1.1, .1, 'sine', 400) },
  cheer() { nz(4, 'bandpass', 850, .6, .4, 1); nz(3.5, 'bandpass', 1700, .3, .6, .8) },
  door(open) { tone(open ? 180 : 140, .35, .1, 'sawtooth', open ? 120 : 90); nz(.15, 'lowpass', 400, .25) },
};
const SCALES = { act1: [0, 240, 480, 720, 960, 1200, 1440, 1680], act2: [0, 120, 270, 540, 670, 800, 1200, 1320] };
function pluck(f, v = .25) { tone(f, 1.4, v, 'triangle', null, A.music); tone(f * 2.01, .6, v * .3, 'sine', null, A.music) }
function musicTick() {
  if (!A.ctx) return;
  const s = SCALES[A.scale === 'act1' ? 'act1' : 'act2'], base = A.scale === 'act1' ? 196 : 165, p = A.step++ % 16;
  if (Math.random() < (A.scale === 'act1' ? .5 : .38)) {
    A.mel = Math.max(0, Math.min(s.length - 1, A.mel + [1, -1, 2, -2, 0, 1, -1][Math.floor(Math.random() * 7)]));
    pluck(base * 2 * Math.pow(2, s[A.mel] / 1200));
  }
  if (p % 4 === 0) pluck(base * Math.pow(2, s[(p / 4) % 3 * 2] / 1200), .18);
  if (p === 0) { tone(base / 4, 5, .5, 'sine', null, A.music); tone(base / 4 * 1.01, 5, .3, 'sine', null, A.music) }
  if (A.scale !== 'act1' && (p === 6 || p === 14)) tone(95, .25, .4, 'sine', 60, A.music);
  if (A.scale === 'act3' && p % 4 === 2) tone(70, .2, .35, 'sine', 45, A.music);
}
/* Voice over: file audio/<id>.mp3 dipakai kalau ada, kalau tidak pakai TTS browser */
let curVO = null;
function stopVO() { if (window.speechSynthesis) speechSynthesis.cancel(); if (curVO) { curVO.pause(); curVO = null } }
function speak(text, pitch = 1, rate = 1, id, onDur) {
  stopVO(); if (A.muted) return;
  if (id) {
    const a = new Audio('audio/' + id + '.mp3'); curVO = a; let done = false;
    a.onloadedmetadata = () => { onDur && onDur(a.duration) };
    a.oncanplaythrough = () => { if (done || curVO !== a) return; done = true; a.play().catch(() => {}) };
    a.onerror = () => { if (done || curVO !== a) return; done = true; curVO = null; tts(text, pitch, rate) };
    return;
  }
  tts(text, pitch, rate);
}
function tts(text, pitch, rate) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text.replace(/[“”"]/g, ''));
  u.lang = 'id-ID'; u.rate = rate; u.pitch = pitch;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith('id'));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
if (window.speechSynthesis) speechSynthesis.getVoices();

/* ---------------- RENDERER & SCENE ---------------- */
const renderer = new R.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = R.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new R.Scene();
scene.fog = new R.Fog(0xd9d2bd, 35, 170);
const camera = new R.PerspectiveCamera(72, innerWidth / innerHeight, .05, 700);
camera.rotation.order = 'YXZ'; scene.add(camera);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) });
const hemi = new R.HemisphereLight(0xe8f0ff, 0x6b5a40, .75); scene.add(hemi);
const sun = new R.DirectionalLight(0xfff0d0, 1.05); sun.position.set(50, 90, 35);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005;
Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, far: 320 });
scene.add(sun);

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new R.CanvasTexture(c); t.wrapS = t.wrapT = R.RepeatWrapping; t.anisotropy = 4; return t;
}
function speckle(g, w, h, n, a) { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * a})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2) } }
const skyTex = (top, mid, bot) => canvasTex(4, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(.5, mid); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, w, h) });
const sky = new R.Mesh(new R.SphereGeometry(500, 32, 16), new R.MeshBasicMaterial({ map: skyTex('#4d86c4', '#a9c6df', '#efe2c0'), side: R.BackSide, fog: false }));
scene.add(sky);

/* ---------------- LEVEL ---------------- */
let L = new R.Group(); scene.add(L);
const colliders = [], doors = [], flags = [], fires = [];
let interacts = [];
const W = { groundH: () => 0 };
function newLevel() {
  scene.remove(L);
  L.traverse(o => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose() });
  L = new R.Group(); scene.add(L);
  colliders.length = 0; doors.length = 0; flags.length = 0; fires.length = 0; interacts = [];
  parts.length = 0; pending.length = 0;
  if (window.clearCombat) clearCombat();
  W.groundH = () => 0; W.roof = null; W.onRespawn = null; W.update = null;
  G.target = null;
}
function env(o) {
  scene.fog.color.set(o.fog); scene.fog.near = o.near; scene.fog.far = o.far;
  sky.material.map = skyTex(...o.sky); sky.material.needsUpdate = true;
  hemi.color.set(o.hemi[0]); hemi.groundColor.set(o.hemi[1]); hemi.intensity = o.hemi[2];
  sun.color.set(o.sun[0]); sun.intensity = o.sun[1]; sun.position.set(...o.sunPos);
}
function makeGround(draw, size, rep, seg = 1, hfn) {
  const t = canvasTex(256, 256, draw); t.repeat.set(rep, rep);
  const geo = new R.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  if (hfn) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hfn(p.getX(i), p.getZ(i))); geo.computeVertexNormals() }
  const m = new R.Mesh(geo, new R.MeshLambertMaterial({ map: t })); m.receiveShadow = true; L.add(m); return m;
}

/* ---------------- HELPER GEOMETRI ---------------- */
const MC = {};
const lam = c => MC[c] || (MC[c] = new R.MeshLambertMaterial({ color: c }));
function box(w, h, d, x, y, z, mat, collide = true, shadow = true, parent) {
  const m = new R.Mesh(new R.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z);
  m.castShadow = shadow; m.receiveShadow = true; (parent || L).add(m);
  if (collide) colliders.push({ x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2, y0: y, y1: y + h });
  return m;
}
function wall(x0, z0, x1, z1, h = 2.5, mat = lam(0x9a6a4a), th = .4) { // tembok lurus sejajar sumbu
  const w = Math.abs(x1 - x0) || th, d = Math.abs(z1 - z0) || th;
  return box(w, h, d, (x0 + x1) / 2, 0, (z0 + z1) / 2, mat);
}
const TC = {};
function wallMat(base, win, rw, rh, trim = '#5b3a1e', style = 0) {
  const k = base + win + trim + style;
  if (!TC[k]) TC[k] = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); speckle(g, w, h, 1500, .12);
    if (style === 2) { // papan kayu kampung
      for (let x = 0; x < w; x += 16) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, 0, 2, h) }
      g.fillStyle = trim; g.fillRect(44, 34, 40, 42); g.fillStyle = win; g.fillRect(48, 38, 32, 34); g.fillStyle = trim; g.fillRect(62, 38, 3, 34);
      return;
    }
    g.fillStyle = trim;
    if (style === 1) { g.beginPath(); g.moveTo(36, 96); g.lineTo(36, 46); g.arc(64, 46, 28, Math.PI, 0); g.lineTo(92, 96); g.fill(); g.fillStyle = win; g.beginPath(); g.moveTo(41, 91); g.lineTo(41, 46); g.arc(64, 46, 23, Math.PI, 0); g.lineTo(87, 91); g.fill() }
    else { g.fillRect(36, 26, 56, 70); g.fillStyle = win; g.fillRect(41, 31, 46, 60) }
    g.fillStyle = trim; g.fillRect(62, 31, 4, 62); g.fillRect(41, 60, 46, 3);
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 118, w, 10); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, 0, w, 4);
  });
  const t = TC[k].clone(); t.needsUpdate = true; t.repeat.set(rw, rh);
  return new R.MeshLambertMaterial({ map: t });
}
function hipRoof(x, z, w, d, y, color, hgt = 2.6) {
  const geo = new R.ConeGeometry(Math.SQRT1_2 * 1.1, hgt, 4); geo.rotateY(Math.PI / 4);
  const r = new R.Mesh(geo, lam(color)); r.scale.set(w, 1, d); r.position.set(x, y + hgt / 2, z); r.castShadow = true; L.add(r); return r;
}
function textPlane(text, w, h, bg = '#2b1d10', fg = '#f2d98a', font = 'Oswald, serif') {
  const t = canvasTex(512, 96, (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.font = `bold 60px ${font}`; g.textAlign = 'center'; g.fillText(text, cw / 2, 68) });
  return new R.Mesh(new R.PlaneGeometry(w, h), new R.MeshBasicMaterial({ map: t }));
}
function label(text, color = '#ffd84a') {
  const t = canvasTex(256, 64, (g, w, h) => { g.font = 'bold 30px Oswald, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, 10, w, 44); g.fillStyle = color; g.fillText(text, w / 2, 44) });
  const s = new R.Sprite(new R.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(2, .5, 1); s.position.y = 2.3; s.renderOrder = 5; return s;
}
function tree(x, z, s = 1, collide = true) {
  const y = W.groundH(x, z);
  box(.35 * s, 3 * s, .35 * s, x, y, z, lam(0x5b3d22), collide);
  const c = new R.Mesh(new R.IcosahedronGeometry(rand(1.6, 2.3) * s, 1), lam(pick([0x3d6b2a, 0x4a7a30, 0x2f5a22, 0x557f35])));
  c.position.set(x, y + 3.9 * s, z); c.castShadow = true; L.add(c);
}
function sandbagLine(x0, z0, x1, z1, rows = 2, color = 0x9d8b62) { // garis karung pasir sejajar sumbu
  const along = Math.abs(x1 - x0) > Math.abs(z1 - z0), len = along ? Math.abs(x1 - x0) : Math.abs(z1 - z0), n = Math.round(len / .85);
  for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
    const k = (i + (j % 2) * .5) / n; if (k > 1) continue;
    const x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k, y = W.groundH(x, z);
    const m = new R.Mesh(sandbagGeo, lam(color)); m.position.set(x, y + .18 + j * .33, z); m.rotation.y = along ? 0 : Math.PI / 2; m.rotation.z = rand(-.05, .05);
    m.castShadow = true; m.receiveShadow = true; L.add(m);
  }
  const yb = W.groundH((x0 + x1) / 2, (z0 + z1) / 2);
  colliders.push({ x0: Math.min(x0, x1) - .3, x1: Math.max(x0, x1) + .3, z0: Math.min(z0, z1) - .3, z1: Math.max(z0, z1) + .3, y0: yb, y1: yb + rows * .33 + .05 });
}
const sandbagGeo = (() => { const g = new R.BoxGeometry(.85, .33, .48); g.userData.shared = true; return g })();

/* ---------------- BENDERA ---------------- */
function flagTex(cols) { return canvasTex(96, 64, (g, w, h) => { cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / cols.length, w, h / cols.length + 1) }) }) }
function makeFlag(cols, w, h) {
  const geo = new R.PlaneGeometry(w, h, 14, 6); geo.translate(w / 2, 0, 0);
  const m = new R.Mesh(geo, new R.MeshLambertMaterial({ map: flagTex(cols), side: R.DoubleSide }));
  m.castShadow = true; m.userData = { w, base: Float32Array.from(geo.attributes.position.array) }; flags.push(m); L.add(m); return m;
}
function updateFlags(t) {
  flags.forEach((f, k) => {
    const p = f.geometry.attributes.position, b = f.userData.base, w = f.userData.w;
    for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.array[i * 3 + 2] = Math.sin(x * 2.2 - t * 6 + k) * .18 * (x / w) + Math.sin(b[i * 3 + 1] * 3 + t * 4) * .04 * (x / w) }
    p.needsUpdate = true; f.geometry.computeVertexNormals();
  });
}

/* ---------------- PINTU ---------------- */
function door(hx, hz, width, openAngle, name) {
  const pivot = new R.Group(); pivot.position.set(hx, 0, hz); L.add(pivot);
  const tex = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#5a3418'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a200c'; g.lineWidth = 4; g.strokeRect(8, 8, w - 16, h / 2 - 12); g.strokeRect(8, h / 2 + 4, w - 16, h / 2 - 12); g.fillStyle = '#d4a84a'; g.fillRect(w - 14, h / 2 - 4, 6, 8) });
  const m = new R.Mesh(new R.BoxGeometry(.18, 3, width), new R.MeshLambertMaterial({ map: tex }));
  m.position.set(0, 1.5, width / 2); m.castShadow = true; pivot.add(m);
  const col = { x0: hx - .3, x1: hx + .3, z0: hz, z1: hz + width, y0: 0, y1: 3 }; colliders.push(col);
  const d = { pivot, col, open: false, ang: 0, target: 0 };
  doors.push(d);
  addI(V([hx, 0, hz + width / 2]), () => (d.open ? 'Tutup ' : 'Buka ') + name, () => {
    d.open = !d.open; d.target = d.open ? openAngle : 0; col.off = d.open; SFX.door(d.open);
  }, 2.6);
  return d;
}
function updateDoors(dt) { doors.forEach(d => { d.ang += (d.target - d.ang) * Math.min(1, dt * 6); d.pivot.rotation.y = d.ang }) }

/* ---------------- PEMAIN & INPUT ---------------- */
const P = { pos: new R.Vector3(), yaw: 0, pitch: 0, eye: 1.65, crouch: false, roof: false, stepT: 0, floor: 0, hp: 100, carry: false, check: [0, 0, 0] };
const keys = {};
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyC') { P.crouch = !P.crouch; $('#stance').textContent = P.crouch ? 'MERUNDUK' : 'BERDIRI' }
  if (e.code === 'KeyM') { A.muted = !A.muted; if (A.master) A.master.gain.value = A.muted ? 0 : .85; if (A.muted) stopVO() }
  if (e.code === 'KeyE' || e.code === 'Space') { e.preventDefault(); action(e.code) }
  if (e.code === 'KeyR' && mode === 'play' && window.reload) reload();
  if (e.code === 'KeyG' && mode === 'play' && window.throwGrenade) throwGrenade();
  if (e.code === 'Enter' && mode === 'cut') skipCut();
});
addEventListener('keyup', e => keys[e.code] = false);
const canvas = renderer.domElement;
const lock = () => { if (mode !== 'menu' && mode !== 'end') canvas.requestPointerLock() };
canvas.addEventListener('click', lock); $('#pause').addEventListener('click', lock);
document.addEventListener('pointerlockchange', () => { $('#pause').hidden = !(document.pointerLockElement !== canvas && mode === 'play') });
addEventListener('mousemove', e => {
  if (document.pointerLockElement !== canvas || mode !== 'play') return;
  P.yaw -= e.movementX * .0022; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - e.movementY * .0022));
});
addEventListener('mousedown', e => { if (e.button === 0 && document.pointerLockElement === canvas && mode === 'play' && window.fire) fire() });
function action(code) {
  if (mode === 'dialog') return nextLine();
  if (mode === 'fact') return closeFact();
  if (mode === 'cut' && code === 'Space') return nextShot();
  if (mode === 'play' && code === 'KeyE' && curI) { SFX.blip(); curI.use() }
}
function blocked(x, z, r, feet) {
  for (const c of colliders) {
    if (c.off || c.y1 < feet + .45 || c.y0 > feet + 1.5) continue;
    const cx = Math.max(c.x0, Math.min(x, c.x1)), cz = Math.max(c.z0, Math.min(z, c.z1));
    if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return true;
  }
  return false;
}
function updatePlayer(dt) {
  const f = new R.Vector3(-Math.sin(P.yaw), 0, -Math.cos(P.yaw)), r = new R.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw));
  const mv = new R.Vector3();
  if (keys.KeyW) mv.add(f); if (keys.KeyS) mv.sub(f); if (keys.KeyD) mv.add(r); if (keys.KeyA) mv.sub(r);
  const running = (keys.ShiftLeft || keys.ShiftRight) && !P.crouch && !P.carry;
  const spd = P.carry ? 3.3 : P.crouch ? 2.3 : running ? 7.5 : 4.5;
  if (mv.lengthSq()) {
    mv.normalize().multiplyScalar(spd * dt);
    const fl = P.floor;
    if (!blocked(P.pos.x + mv.x, P.pos.z, .38, fl)) P.pos.x += mv.x;
    if (!blocked(P.pos.x, P.pos.z + mv.z, .38, fl)) P.pos.z += mv.z;
    P.stepT -= dt * spd;
    if (P.stepT < 0) { P.stepT = 2.1; SFX.step(P.crouch) }
  }
  if (W.roof) { const q = W.roof; P.pos.x = Math.max(q[0], Math.min(q[1], P.pos.x)); P.pos.z = Math.max(q[2], Math.min(q[3], P.pos.z)); P.floor = q[4] }
  else P.floor = W.groundH(P.pos.x, P.pos.z);
  P.eye += ((P.crouch ? 1.0 : 1.65) - P.eye) * Math.min(1, dt * 10);
  P.moving = mv.lengthSq() > 0; P.running = running;
  const bob = P.moving ? Math.sin(T * (running ? 13 : 9)) * (running ? .06 : .035) : 0;
  camera.position.set(P.pos.x, P.floor + P.eye + bob, P.pos.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
}
function teleport(x, z, yaw) { P.pos.set(x, 0, z); P.yaw = yaw; P.pitch = 0; P.floor = W.roof ? W.roof[4] : W.groundH(x, z); updatePlayer(0) }
function checkpoint(x, z, yaw) { P.check = [x, z, yaw] }

/* ---------------- INTERAKSI ---------------- */
let curI = null;
function addI(obj, text, use, r = 2.4) { const it = { obj, text, use, r }; interacts.push(it); return it }
function remI(it) { interacts = interacts.filter(i => i !== it) }
function pos3(o) { return o.isVector3 ? o : o.position }
function updateInteract() {
  curI = null; let best = 1e9;
  for (const it of interacts) {
    const p = pos3(it.obj); const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z);
    if (d < it.r && d < best && Math.abs((p.y || 0) - P.floor) < 3.5) { best = d; curI = it }
  }
  const el = $('#prompt');
  if (curI && mode === 'play') { el.innerHTML = `<b>E</b>${typeof curI.text === 'function' ? curI.text() : curI.text}`; el.style.display = 'block' } else el.style.display = 'none';
}

/* ---------------- OBJEKTIF & MARKER ---------------- */
const G = { target: null };
const beam = new R.Mesh(new R.CylinderGeometry(.35, .35, 40, 12, 1, true), new R.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: .18, depthWrite: false, side: R.DoubleSide }));
const gem = new R.Mesh(new R.OctahedronGeometry(.35), new R.MeshBasicMaterial({ color: 0xffd84a }));
scene.add(beam, gem);
function setObj(text, target) { $('#objText').textContent = text; G.target = target; SFX.ok() }
function updateMarker() {
  const tg = G.target ? G.target() : null;
  beam.visible = gem.visible = !!tg && mode === 'play';
  $('#arrow').style.display = tg ? 'block' : 'none';
  if (!tg) { $('#objDist').textContent = ''; return }
  beam.position.set(tg.x, (tg.y || 0) + 20, tg.z); gem.position.set(tg.x, (tg.y || 0) + 2.8 + Math.sin(T * 3) * .15, tg.z); gem.rotation.y = T * 2;
  const dx = tg.x - P.pos.x, dz = tg.z - P.pos.z;
  const fx = -Math.sin(P.yaw) * dx - Math.cos(P.yaw) * dz, rx = Math.cos(P.yaw) * dx - Math.sin(P.yaw) * dz;
  $('#arrow').style.transform = `rotate(${Math.atan2(rx, fx)}rad)`;
  $('#objDist').textContent = Math.round(Math.hypot(dx, dz)) + ' m';
}

/* ---------------- UI: DIALOG, FAKTA, CUTSCENE ---------------- */
let dlg = null;
function dialog(name, lines, done, opts = {}) { dlg = { name, lines, i: 0, done, opts }; mode = 'dialog'; $('#dialog').hidden = false; showLine() }
function showLine() { $('#dName').textContent = dlg.name; $('#dText').textContent = dlg.lines[dlg.i]; speak(dlg.lines[dlg.i], dlg.opts.pitch || 1, dlg.opts.rate || 1.02, dlg.opts.vo ? dlg.opts.vo + '-' + (dlg.i + 1) : null) }
function nextLine() { dlg.i++; SFX.tick(); if (dlg.i < dlg.lines.length) return showLine(); $('#dialog').hidden = true; stopVO(); mode = 'play'; const d = dlg.done; dlg = null; d && d() }
let factDone = null;
function fact(title, text, done) { mode = 'fact'; factDone = done; $('#fact h3').textContent = title; $('#fact p').textContent = text; $('#fact').hidden = false; SFX.ok() }
function closeFact() { $('#fact').hidden = true; mode = 'play'; const d = factDone; factDone = null; d && d() }
$('#fact button').onclick = closeFact;
function fadeOut(cb, hold = 300) { $('#fade').style.opacity = 1; setTimeout(() => { cb && cb(); setTimeout(() => $('#fade').style.opacity = 0, hold) }, 850) }
function chapter(a, b) { const c = $('#chapter'); c.querySelector('b').textContent = a; c.querySelector('span').textContent = b; c.style.opacity = 1; setTimeout(() => c.style.opacity = 0, 4200) }
function toast(t, ms = 1500) { const e = $('#toast'); e.textContent = t; e.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => e.style.display = 'none', ms) }

let cut = null;
function playCut(shots, onEnd, vo) { cut = { shots, i: -1, t: 0, onEnd, vo }; mode = 'cut'; document.body.classList.add('cine'); nextShot() }
function nextShot() {
  cut.i++; cut.t = 0;
  if (cut.i >= cut.shots.length) return endCut();
  const s = cut.shots[cut.i];
  s.d = s.dur || Math.max(4, (s.text || '').length * .072 + 1.2);
  $('#sub').textContent = s.text || '';
  if (s.text && s.speak !== false) speak(s.text, s.pitch || .95, s.rate || .98, cut.vo ? cut.vo + '-' + (cut.i + 1) : null, d => { s.d = Math.max(s.d, d + .6) });
  s.fn && s.fn();
}
function skipCut() { if (!cut) return; while (cut && cut.i < cut.shots.length - 1) { cut.i++; const s = cut.shots[cut.i]; s.fn && s.fn() } endCut() }
function endCut() {
  if (!cut) return; const e = cut.onEnd; cut = null; $('#sub').textContent = ''; stopVO();
  document.body.classList.remove('cine'); mode = 'play'; e && e();
}
function updateCut(dt) {
  const s = cut.shots[cut.i]; cut.t += dt; const k = Math.min(1, cut.t / s.d), e = k * k * (3 - 2 * k);
  camera.position.lerpVectors(V(s.from), V(s.to || s.from), e);
  camera.lookAt(V(s.look).lerp(V(s.look2 || s.look), e));
  if (cut.t >= s.d) nextShot();
}

/* ---------------- PARTIKEL & LEDAKAN ---------------- */
const parts = [];
const smokeTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h) });
function puff(pos, color, size, life, vel, grow = 2) {
  if (parts.length > 320) return;
  const s = new R.Sprite(new R.SpriteMaterial({ map: smokeTex, color, transparent: true, depthWrite: false, opacity: .9 }));
  s.position.copy(pos); s.scale.setScalar(size); L.add(s);
  parts.push({ s, life, max: life, vel, grow });
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { L.remove(p.s); p.s.material.dispose(); parts.splice(i, 1); continue }
    p.s.position.addScaledVector(p.vel, dt); p.s.scale.multiplyScalar(1 + p.grow * dt * .3); p.s.material.opacity = (p.life / p.max) * .8;
  }
}
const boomLight = new R.PointLight(0xff8a30, 0, 45); scene.add(boomLight);
function boomFx(pos, big = 1) {
  const d = pos.distanceTo(camera.position);
  SFX.boom(d); shake = Math.max(shake, Math.max(0, (1 - d / 40) * big));
  boomLight.position.set(pos.x, pos.y + 2, pos.z); boomLight.intensity = 6 * big;
  for (let i = 0; i < 10 * big; i++) puff(pos.clone().add(V([rand(-1, 1), rand(0, 1.5), rand(-1, 1)])), new R.Color().setHSL(rand(.03, .1), 1, .55), rand(1.5, 2.5) * big, .6, V([rand(-3, 3), rand(2, 6), rand(-3, 3)]), 4);
  for (let i = 0; i < 12 * big; i++) puff(pos.clone().add(V([rand(-1, 1), rand(.5, 2), rand(-1, 1)])), 0x333333, rand(2, 3) * big, rand(2, 4), V([rand(-1, 1), rand(1.5, 3.5), rand(-1, 1)]), 2.5);
  for (let i = 0; i < 6; i++) puff(pos.clone().add(V([0, .3, 0])), 0x6b5a40, .5, 1, V([rand(-6, 6), rand(4, 9), rand(-6, 6)]), 1);
}
function addFire(x, y, z, s = 1) {
  const f = new R.Mesh(new R.ConeGeometry(1.2 * s, 3 * s, 7), new R.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: .85 }));
  f.position.set(x, y + 1.5 * s, z); L.add(f); fires.push(f);
}
function updateFires(dt) {
  fires.forEach((f, i) => {
    f.scale.set(1 + Math.sin(T * 9 + i) * .15, 1 + Math.sin(T * 13 + i * 2) * .25, 1);
    if (Math.random() < dt * 5) puff(f.position.clone().add(V([0, 1.5, 0])), 0x2a2420, rand(2, 3.5), rand(4, 7), V([rand(.2, 1), rand(1.5, 3), rand(-.3, .3)]), 3);
  });
  boomLight.intensity = Math.max(0, boomLight.intensity - dt * 12);
}
/* tembakan artileri / bom: lingkaran merah peringatan lalu meledak */
const pending = [];
function artillery(p, delay = 1.6, radius = 3.2, dmg = 60) {
  p.y = W.groundH(p.x, p.z);
  const ring = new R.Mesh(new R.RingGeometry(radius * .7, radius, 24), new R.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: .7, side: R.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, p.y + .1, p.z); L.add(ring);
  if (p.distanceTo(P.pos) < 30) SFX.whistle();
  pending.push({ p, t: delay, ring, radius, dmg });
}
function updatePending(dt) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const s = pending[i]; s.t -= dt; s.ring.material.opacity = .4 + Math.sin(T * 20) * .3;
    if (s.t <= 0) { L.remove(s.ring); pending.splice(i, 1); boomFx(s.p); if (window.blastDamage) blastDamage(s.p, s.radius + .5, false, s.dmg) }
  }
}
