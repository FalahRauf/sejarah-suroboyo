/* ============================================================
   ALUR CERITA 3 BABAK + LOOP UTAMA
   ============================================================ */
let refs = {}, mat = null, youths = [], crowd = [];
const guards = []; let stealth = false, sus = 0;
const ROOF = [H.x0 + .7, H.x1 - .7, H.z0 + .7, H.z1 - .7, H.h + .2];

/* ---------- ambience pertempuran ---------- */
let ambT = 2;
function battleAmbience(dt, intensity = 1) {
  ambT -= dt;
  if (ambT < 0) { ambT = rand(.2, 1.6) / intensity; Math.random() < .25 ? SFX.boom(rand(45, 100)) : (SFX.shot(rand(40, 100)), setTimeout(() => SFX.shot(rand(40, 100)), 110)) }
}

/* =================== BABAK I =================== */
function setupAct1() {
  refs = buildAct1();
  mat = human({ name: 'Cak Mat', shirt: 0xf3efe0, pants: 0x3b3a30, hat: 'peci', mustache: true, skin: 0x7a4a2e });
  mat.position.set(-8.2, .15, 18.5); mat.rotation.y = Math.PI / 2;
  const defs = [
    { name: 'Dul', pos: [6.5, 42], o: { shirt: 0xd6c7a1, hat: 'ikat' }, line: ['Bendera Londo nang Yamato? Kurang ajar!', 'Aku melu, Rek! Tak gawa bambu runcingku.'] },
    { name: 'Sri', pos: [-7, -4], o: { shirt: 0xb5523b, skirt: 0x5a3a2a, longHair: true, skin: 0x9a6040 }, line: ['Aku dari dapur umum. Para pemuda butuh semangat dan makanan.', 'Aku ikut ke hotel. Merdeka!'] },
    { name: 'Koh Liem', pos: [7.5, 8], o: { shirt: 0x3d5a80, hat: 'peci', skin: 0xd8b088 }, line: ['Tokoku dekat Tunjungan. Semua orang Surabaya, apa pun asalnya, cinta kemerdekaan.', 'Ayo berangkat bersama!'] },
  ];
  youths = defs.map(d => { const h = human({ name: d.name, ...d.o }); h.position.set(d.pos[0], .02, d.pos[1]); h.userData.def = d; return h });
  crowd = [];
}
function intro() {
  chapter('BABAK I', 'Insiden Bendera · 19 September 1945');
  playCut([
    { from: [-40, 45, 70], to: [-5, 28, 25], look: [10, 5, -20], text: 'Surabaya, 19 September 1945. Sebulan setelah Proklamasi Kemerdekaan, Merah Putih berkibar di seluruh penjuru kota.' },
    { from: [-2, 6, -10], to: [3, 9, -22], look: [14, 16, -30], look2: [14, 19, -29], text: 'Namun pagi itu, sekelompok orang Belanda mengibarkan bendera merah-putih-biru di atas Hotel Yamato, Jalan Tunjungan. Tanpa izin pemerintah Indonesia.' },
    { from: [-4, 3, 30], to: [-5.5, 2, 24], look: [-8, 1.5, 18.5], text: 'Kabar itu menyebar cepat. Arek-arek Suroboyo marah. Kamu, seorang pemuda kampung, bergegas ke pos pemuda.' },
  ], () => {
    teleport(-5, 27, Math.PI * .15); checkpoint(-5, 27, 0);
    setObj('Temui Cak Mat di pos pemuda', () => mat.position);
    const it = addI(mat, 'Bicara dengan Cak Mat', () => dialog('Cak Mat', [
      'Rek! Wis krungu durung? Londo ngibarno bendera merah putih biru nang Hotel Yamato!',
      'Iki ngenyek kemerdekaan kita. Proklamasi wis diumumno, tapi mereka masih merasa berkuasa.',
      'Ayo kumpulno arek-arek. Ada tiga kawan kita di sekitar jalan ini: Dul, Sri, dan Koh Liem. Ajak mereka ke depan hotel!'
    ], () => { remI(it); rally() }, { vo: 'cakmat' }));
  }, 'intro');
}
let rallied = 0;
function rally() {
  const obj = () => `Ajak kawan berkumpul di Hotel Yamato (${rallied}/3)`;
  $('#objText').textContent = obj(); SFX.ok();
  G.target = () => { const y = youths.find(y => !y.userData.rallied); return y ? y.position : null };
  youths.forEach((y, i) => {
    const it = addI(y, 'Ajak ' + y.userData.def.name, () => dialog(y.userData.def.name, y.userData.def.line, () => {
      remI(it); y.userData.rallied = true; y.userData.goal = V([rand(2, 6), 0, -26 - i * 3]); rallied++;
      $('#objText').textContent = obj();
      if (rallied === 3) fact('Hotel Yamato', 'Hotel ini dibangun tahun 1910 dengan nama Hotel Oranje. Saat pendudukan Jepang namanya diganti menjadi Hotel Yamato. Kini dikenal sebagai Hotel Majapahit di Jalan Tunjungan, Surabaya.', nego);
    }, { vo: ['dul', 'sri', 'liem'][i] }));
  });
}
function cone(range) {
  const m = new R.Mesh(new R.CircleGeometry(range, 24, -Math.PI / 2 - .7, 1.4), new R.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: .32, depthWrite: false, side: R.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = .15; m.renderOrder = 2; return m;
}
function spawnGuards() {
  [[[8.6, -36.5], [8.6, -23.5]], [[14, -29.8], [36, -29.8]], [[22, -36.3], [22, -23.8]], [[30, -24], [30, -36]]].forEach(path => {
    const g = human({ shirt: 0x7a7448, pants: 0x5e5a38, skin: 0xe2b896, hat: 'helm', rifle: true, longSleeve: true, hair: 0x8a6a3a });
    g.position.set(path[0][0], 0, path[0][1]); g.add(cone(8));
    guards.push({ m: g, path: path.map(p => V([p[0], 0, p[1]])), i: 1, wait: 0, home: path[0] });
  });
}
function losFlat(a, b) {
  const steps = Math.ceil(a.distanceTo(b) / .4);
  for (let i = 1; i < steps; i++) {
    const x = a.x + (b.x - a.x) * i / steps, z = a.z + (b.z - a.z) * i / steps;
    for (const c of colliders) if (!c.off && c.y1 > 1.3 && c.y0 < 1 && x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) return false;
  }
  return true;
}
function updGuards(dt) {
  if (!guards.length) return;
  let seen = 0;
  guards.forEach(g => {
    if (mode === 'play') {
      setPose(g.m, 'carry');
      if (g.wait > 0) { g.wait -= dt; g.m.rotation.y += Math.sin(T * 1.5) * dt * .8; animHuman(g.m, 0, dt) }
      else if (walkTo(g.m, g.path[g.i], dt, 1.7)) { g.i = (g.i + 1) % g.path.length; g.wait = 2.2 }
    }
    if (!stealth || W.roof || mode !== 'play') return;
    const d = V([P.pos.x - g.m.position.x, 0, P.pos.z - g.m.position.z]), Ln = d.length();
    const range = P.crouch ? 4.2 : 8, fwd = V([Math.sin(g.m.rotation.y), 0, Math.cos(g.m.rotation.y)]);
    if (Ln < range && d.normalize().dot(fwd) > .76 && losFlat(g.m.position, P.pos)) seen = Math.max(seen, (1.4 - Ln / range) * (P.crouch ? .9 : 1.6));
    if (Ln < 1.2) seen = 5;
  });
  if (seen) sus += seen * dt; else sus = Math.max(0, sus - dt * .5);
  $('#sus').style.display = stealth && sus > 0 ? 'block' : 'none';
  $('#sus div').style.width = Math.min(100, sus * 100) + '%';
  if (sus >= 1) caught();
}
function caught() {
  sus = 0; mode = 'busy'; SFX.alert(); SFX.whistle(); toast('KETAHUAN!'); $('#vig').style.opacity = 1;
  speak('Hei! Berhenti!', 1.2, 1.1, 'penjaga-teriak');
  fadeOut(() => { teleport(4, -48, -Math.PI / 2 - .4); guards.forEach(g => { g.m.position.set(g.home[0], 0, g.home[1]); g.i = 1; g.wait = 0 }); mode = 'play' });
}
function nego() {
  for (let i = 0; i < 18; i++) {
    const c = human({ hat: pick(['peci', 'ikat', null, 'caping']), skirt: i % 5 === 0 ? pick([0x7a3a2a, 0x3a5a6a]) : null, longHair: i % 5 === 0, bambu: i % 4 === 1 });
    c.position.set(rand(-2, 7), .02, rand(-41, -19)); c.rotation.y = Math.PI / 2 + rand(-.4, .4); crowd.push(c);
  }
  youths.forEach((y, i) => { y.position.set(4 + i, .02, -27 - i * 2); y.rotation.y = Math.PI / 2; y.userData.goal = null });
  const sud = human({ name: 'Residen Soedirman', shirt: 0xf2f0ea, pants: 0xf2f0ea, longSleeve: true, hat: 'peci', mustache: true, skin: 0x7a4a2e, shoe: 0x111111 });
  sud.position.set(2, .02, -30); sud.userData.goal = V([9.3, 0, -30]); youths.push(sud);
  spawnGuards();
  playCut([
    { from: [-4, 3, -20], to: [1, 2.4, -25], look: [8, 1.6, -30], text: 'Ratusan warga berkumpul di depan Hotel Yamato. Residen Soedirman masuk untuk berunding dan meminta bendera Belanda diturunkan.', fn: () => { if (A.crowd) A.crowd.gain.value = .15 } },
    { from: [6, 2.2, -27], to: [7, 2, -31], look: [12, 2, -30], text: 'Pimpinan Belanda, Ploegman, menolak. Perundingan gagal, dan perkelahian pecah di dalam lobi hotel.', fn: () => SFX.shot(20) },
    { from: [3, 5, -48], to: [12, 4, -19], look: [25, 2, -22], text: 'Di tengah kekacauan, para pemuda mencari jalan menuju atap. Penjaga masih berjaga. Gang di samping hotel menuju pintu belakang.' },
  ], () => {
    if (A.crowd) A.crowd.gain.value = .06;
    teleport(4, -48, -Math.PI / 2 - .4); checkpoint(4, -48, -Math.PI / 2);
    stealth = true;
    setObj('Menyusup ke Hotel Yamato, temukan tangga ke atap', () => refs.stairsPos);
    dialog('Petunjuk', ['Tekan C untuk merunduk. Saat merunduk, penjaga lebih sulit melihatmu.', 'Hindari area merah di depan penjaga. Lewat gang samping menuju pintu belakang bisa jadi pilihan. Tekan E untuk membuka pintu.'], null, { pitch: 1, vo: 'petunjuk' });
    const it = addI(refs.stairsPos, 'Naik ke atap', () => {
      remI(it); stealth = false; $('#sus').style.display = 'none';
      fadeOut(() => {
        W.roof = ROOF; teleport(20, -34, -Math.PI * .75);
        const har = human({ name: 'Hariyono', shirt: 0xe8e0c8, hat: 'ikat' }); har.position.set(15.6, H.h + .2, -31.6); har.rotation.y = -Math.PI / 2;
        const koe = human({ name: 'Koesno Wibowo', shirt: 0xd6c7a1, pants: 0x2a2a2a }); koe.position.set(15.6, H.h + .2, -28.4); koe.rotation.y = -Math.PI / 2;
        dialog('Hariyono', ['Kowe yo munggah, Rek? Apik! Aku Hariyono, iki Koesno Wibowo.', 'Kita robek warna birunya. Biar yang tersisa merah putih! Ayo bantu kami di tiang bendera!'], () => {
          setObj('Panjat tiang bendera', () => refs.pole);
          const it2 = addI(refs.pole, 'Panjat & robek warna biru', () => { remI(it2); flagScene() }, 2.2);
        }, { vo: 'hariyono' });
      });
    }, 2.6);
  }, 'nego');
}
function flagScene() {
  const f = refs.bigFlag;
  playCut([
    { from: [16, 15, -26], to: [15, 18, -27.5], look: [14, 19, -29], text: 'Kamu memanjat tiang bendera. Angin bertiup kencang. Di bawah, ribuan mata menatap ke atas.' },
    { from: [12.5, 19.6, -26.5], to: [12.8, 19.3, -27.2], look: [14, 19, -29.5], dur: 5, text: 'Bersama Hariyono dan Koesno Wibowo, kain biru itu dirobek!', fn: () => setTimeout(() => { SFX.tear(); f.material.map = flagTex(['#c8102e', '#ffffff']); f.material.needsUpdate = true; f.scale.y = .667; f.position.y = H.h + 7 + .333 }, 1500) },
    { from: [0, 2, -34], to: [-2, 1.7, -36], look: [14, 19, -30], text: 'Merah Putih kembali berkibar di langit Surabaya. MERDEKA!', fn: () => { SFX.cheer(); if (A.crowd) A.crowd.gain.value = .25; crowd.concat(youths).forEach(c => setPose(c, 'cheer')) } },
  ], () => {
    if (A.crowd) A.crowd.gain.value = 0;
    fact('Insiden Bendera Hotel Yamato', 'Pada 19 September 1945, pemuda Surabaya (di antaranya Hariyono dan Koesno Wibowo) memanjat Hotel Yamato dan merobek bagian biru bendera Belanda sehingga tersisa Merah Putih. Peristiwa ini membakar semangat perlawanan rakyat Surabaya.', startAct2);
  }, 'bendera');
}

/* =================== BABAK II =================== */
let wave = 0, waveOn = false, warga = [], followers = [], saved = 0, shellT = 5;
function startAct2() {
  W.roof = null; guards.length = 0; stealth = false; youths = []; crowd = [];
  fadeOut(() => {
    refs = buildAct2(); saveProgress(2);
    W.enemyZone = (c, flank) => { let x = c.x + rand(-7, 7), z; if (Math.abs(x) < 2.6 && Math.random() < .5) z = rand(-26, -15); else { if (Math.abs(x) < 4) x = x < 0 ? -5 : 5; z = rand(-37, -30.5) } return V([Math.max(-34, Math.min(34, x)), 0, z]) };
    mat = human({ name: 'Cak Mat', shirt: 0xf3efe0, pants: 0x3b3a30, hat: 'peci', mustache: true, skin: 0x7a4a2e, rifle: true });
    mat.position.set(8, .02, 20.5); mat.rotation.y = -Math.PI / 2;
    for (let x = -16; x <= 16; x += 2.8) if (Math.abs(x) > 2) spawnSoldier('ally', V([x, 0, rand(14, 30)]), V([x + rand(-.4, .4), 0, -4.8]));
    for (let i = 0; i < 5; i++) spawnSoldier('ally', V([rand(-10, 10), 0, 30]), V([rand(-12, 12), 0, rand(-1.5, 1)]), { bambu: true });
    chapter('BABAK II', 'Pertempuran Surabaya · 10 November 1945');
    playCut([
      { from: [-30, 30, 60], to: [-10, 18, 30], look: [0, 2, -20], text: '25 Oktober 1945, pasukan Sekutu dari Inggris mendarat di Surabaya. Ketegangan dengan para pejuang terus meningkat.' },
      { from: [12, 10, -2], to: [6, 6, -8], look: [0, 3, -30], text: '30 Oktober, pimpinan pasukan Inggris, Brigadir Jenderal Mallaby, tewas dalam baku tembak di dekat Jembatan Merah. Inggris pun murka.', fn: () => SFX.boom(30) },
      { from: [-3, 4, 40], to: [0, 3, 30], look: [8, 2, 20], text: 'Inggris mengeluarkan ultimatum: rakyat Surabaya harus menyerahkan senjata sebelum 10 November pukul 06.00. Arek-arek Suroboyo menolak.' },
      { from: [20, 25, -60], to: [-15, 16, -25], look: [0, 0, 10], text: 'Pagi 10 November, serangan besar-besaran dimulai dari darat, laut, dan udara.', fn: () => { SFX.boom(15); setTimeout(() => SFX.boom(25), 700); setTimeout(() => SFX.boom(10), 1600); flyBy(0, 0, 1, 35) } },
    ], () => {
      teleport(7, 26, Math.PI * .6); checkpoint(7, 26, Math.PI * .6);
      setObj('Dengarkan siaran radio di pos pemuda', () => refs.radio.position);
      const it = addI(refs.radio.position, 'Dengarkan radio', () => { remI(it); radioScene() }, 2.6);
    }, 'babak2');
  });
}
function radioScene() {
  if (A.radio) A.radio.gain.value = .05;
  dialog('📻 Radio Pemberontakan — Bung Tomo', [
    'Saudara-saudara rakyat Surabaya! Bersiaplah! Keadaan genting!',
    'Kita tunjukkan bahwa kita adalah benar-benar orang yang ingin merdeka!',
    'Selama banteng-banteng Indonesia masih mempunyai darah merah yang dapat membikin secarik kain putih menjadi merah dan putih, maka selama itu tidak akan kita mau menyerah kepada siapa pun juga!',
    'Semboyan kita tetap: merdeka atau mati! Allahu Akbar! Merdeka!',
  ], () => {
    if (A.radio) A.radio.gain.value = 0;
    fact('Bung Tomo', 'Sutomo atau Bung Tomo membakar semangat rakyat lewat siaran Radio Pemberontakan. Pidatonya yang berapi-api membuat para pejuang dan warga bertahan dengan gagah berani melawan pasukan yang jauh lebih kuat persenjataannya.', () => {
      dialog('Cak Mat', [
        'Rek, iki senapan rampasan teko gudang senjata Jepang. Gawe en!',
        'Klik kiri untuk menembak, R untuk mengisi peluru, dan G untuk melempar granat. Merunduk di balik karung pasir biar tidak kena tembak!',
        'Musuh mau menyeberang lewat Jembatan Merah. Ayo ke barikade!'
      ], () => {
        giveGun(3);
        setObj('Bergabung di barikade Jembatan Merah', () => V([0, 0, -3]));
        mat.userData.goal = V([-2.5, 0, -4.6]);
      }, { vo: 'cakmat3' });
    });
  }, { pitch: .85, rate: 1.05, vo: 'radio' });
}
function nextWave() {
  wave++; waveOn = true;
  const n = [6, 8, 10][wave - 1];
  for (let i = 0; i < n; i++) {
    const onBridge = Math.random() < .3;
    const cover = onBridge ? V([rand(-2.6, 2.6), 0, rand(-26, -16)]) : V([pick([rand(-34, -6), rand(6, 34)]), 0, rand(-36, -30.5)]);
    setTimeout(() => spawnSoldier('enemy', V([rand(-6, 6), 0, rand(-64, -58)]), cover, { wave }), i * 700);
  }
  toast(`GELOMBANG ${wave}/3`, 1800); SFX.alert();
  if (wave === 3) { setTimeout(() => flyBy(-6, 5, 1), 4000); setTimeout(() => flyBy(4, 5, -1), 14000) }
}
function afterWaves() {
  waveOn = false;
  mat.position.set(-2.5, 0, -4.6);
  dialog('Cak Mat', ['Musuh mundur sementara! Hebat kowe, Rek!', 'Tapi masih ada warga yang terjebak di gudang timur. Bawa mereka ke langgar di kampung barat. Hati-hati, awasi lingkaran merah, itu tanda meriam akan jatuh!'], evac, { vo: 'cakmat2' });
}
function evac() {
  checkpoint(0, -1, Math.PI);
  const defs = [['Mbok Darmi', [30, -4], { shirt: 0xa0522d, skirt: 0x5a3a2a, longHair: true }], ['Pak Karto', [35, 0], { shirt: 0x8b7d6b, hat: 'caping', mustache: true }], ['Siti kecil', [31, 2.5], { shirt: 0xe07a9a, skirt: 0x7a3a5a, scale: .7, longHair: true }]];
  warga = defs.map(([n, p, o], i) => {
    const w = human({ name: n, ...o }); w.position.set(p[0], .02, p[1]); w.userData.n = n;
    const it = addI(w, 'Ajak ' + n + ' mengungsi', () => { remI(it); followers.push(w); speak(['Matur nuwun, Nak!', 'Ayo, cepat!', 'Aku takut...'][i], 1.1, 1, 'warga-' + (i + 1)); toast(n.toUpperCase() + ' MENGIKUTIMU', 1200) });
    return w;
  });
  // beberapa penembak musuh tetap menembak dari seberang sungai
  for (let i = 0; i < 4; i++) spawnSoldier('enemy', V([rand(-6, 6), 0, -60]), V([rand(-30, 30), 0, rand(-35, -31)]), { wave: 9 });
  updEvacObj();
  G.target = () => { const w = warga.find(w => !followers.includes(w)); return w ? w.position : (saved < 3 ? refs.langgar : null) };
  W.onRespawn = () => followers.forEach((w, i) => { if (!w.userData.safe) w.position.set(P.pos.x + 1 + i, .02, P.pos.z + 1.5) });
  shellT = 3;
}
function updEvacObj() {
  $('#objText').textContent = `Evakuasi warga ke langgar di kampung barat (${saved}/3)`;
  if (saved >= 3) { pending.forEach(s => L.remove(s.ring)); pending.length = 0; setTimeout(() => fact('Pertempuran Surabaya', 'Pertempuran yang dimulai 10 November 1945 berlangsung sekitar tiga minggu. Rakyat dari berbagai golongan, mulai dari pemuda, santri, buruh, hingga pelajar, ikut bertempur. Ribuan orang gugur.', startAct3), 1200) }
}
function updateAct2(dt) {
  battleAmbience(dt, 1.2);
  if (mat && mat.userData.goal) { setPose(mat, 'carry'); if (walkTo(mat, mat.userData.goal, dt, 3.5)) { mat.userData.goal = null; mat.rotation.y = Math.PI } }
  if (C.hasGun && wave === 0 && P.pos.z < 1 && mode === 'play') { checkpoint(0, 0, Math.PI); nextWave() }
  if (waveOn && mode === 'play') {
    const left = aliveEnemies(wave);
    $('#objText').textContent = `Pertahankan barikade · Gelombang ${wave}/3 · Musuh tersisa: ${left}`; G.target = null;
    if (left === 0) { waveOn = false; if (wave < 3) { toast('GELOMBANG DIHALAU!', 1600); setTimeout(nextWave, 4500) } else setTimeout(afterWaves, 1500) }
    shellT -= dt; if (shellT < 0) { shellT = rand(4, 7); artillery(V([rand(-16, 16), 0, rand(-5, 4)]), 1.7, 3.2, 50) }
    // bala bantuan pejuang
    if (allies.filter(a => a.alive && !a.melee).length < 9 && Math.random() < dt * .5) { const x = pick([-14, -9, -6, 6, 9, 14]); spawnSoldier('ally', V([x, 0, 12]), V([x + rand(-1, 1), 0, -4.8])) }
  }
  if (warga.length && saved < 3 && mode === 'play') {
    shellT -= dt;
    if (shellT < 0 && Math.hypot(P.pos.x - refs.langgar.x, P.pos.z - refs.langgar.z) > 10) { shellT = rand(2.4, 4); artillery(V([P.pos.x + rand(-7, 7), 0, P.pos.z + rand(-7, 7)])) }
    if (Math.random() < dt * .05) flyBy(P.pos.z + rand(-5, 5), 4, pick([1, -1]));
  }
  followers.forEach((w, i) => {
    if (w.userData.safe) return;
    const back = V([Math.sin(P.yaw), 0, Math.cos(P.yaw)]).multiplyScalar(1.6 + i * 1.3);
    const goal = V([P.pos.x + back.x + (i - 1) * .6, 0, P.pos.z + back.z]);
    if (w.position.distanceTo(goal) > 1.2) walkTo(w, goal, dt, 7.3); else animHuman(w, 0, dt);
    if (w.position.distanceTo(refs.langgar) < 6) { w.userData.safe = true; saved++; SFX.ok(); toast(`${w.userData.n} SELAMAT!`, 1400); w.userData.goal = V([-27 + rand(-3, 3), 0, 56.5]); updEvacObj() }
  });
  warga.forEach(w => { if (w.userData.safe && w.userData.goal) walkTo(w, w.userData.goal, dt, 2) });
}

/* =================== BABAK III =================== */
let phase3 = 0, delivered = 0, timer3 = 0, spawn3 = 0, komandan = null;
const POSTS = [-20, 0, 20];
function startAct3() {
  fadeOut(() => {
    warga = []; followers = []; wave = 0; waveOn = false;
    refs = buildAct3(); saveProgress(3);
    W.enemyZone = (c, flank) => V([Math.max(-34, Math.min(34, c.x + rand(-8, 8))), 0, flank ? rand(-14, -7) : Math.max(-60, Math.min(-8, c.z + rand(-6, 6)))]);
    komandan = human({ name: 'Komandan Basuki', shirt: 0x5a6a3a, pants: 0x4a5030, hat: 'kepi', hatColor: 0x4a5030, mustache: true, rifle: true, longSleeve: true });
    komandan.position.set(-1, hAct3(-1, 23), 23); komandan.rotation.y = Math.PI;
    for (let x = -32; x <= 32; x += 3.4) if (Math.abs(x) > 1.5) spawnSoldier('ally', V([x, 0, rand(5, 14)]), V([x + rand(-.5, .5), 0, -1]));
    for (let i = 0; i < 4; i++) spawnSoldier('ally', V([rand(-15, 15), 0, 12]), V([rand(-20, 20), 0, rand(1, 3)]), { bambu: true });
    chapter('BABAK III', 'Pertahanan Gunungsari · Akhir November 1945');
    playCut([
      { from: [-30, 25, 50], to: [-8, 14, 20], look: [0, 0, -20], text: 'Akhir November 1945. Setelah berminggu-minggu bertempur, sebagian besar kota Surabaya jatuh ke tangan Sekutu.' },
      { from: [25, 4, 4], to: [8, 2.5, 2], look: [-10, 1, -2], text: 'Para pejuang mundur ke selatan dan membangun garis pertahanan di Gunungsari, dekat Kali Brantas.' },
      { from: [0, 6, 30], to: [0, 4, 24], look: [-1, 1.6, 23], text: 'Garis ini harus bertahan selama mungkin, agar warga dan pasukan sempat mundur ke luar kota.' },
    ], () => {
      teleport(0, 27, 0); checkpoint(0, 27, 0);
      C.reserve = Math.max(C.reserve, 60); C.gren = Math.max(C.gren, 3);
      dialog('Komandan Basuki', [
        'Kowe pemuda dari Jembatan Merah, ya? Bagus, kami butuh orang berani.',
        'Pasukan di parit kehabisan peluru. Angkat peti amunisi dari depot ini, antar ke tiga pos di parit depan.',
        'Waktu membawa peti kamu tidak bisa menembak. Lari dan merunduklah di balik karung pasir!'
      ], () => { phase3 = 1; nextDelivery() }, { vo: 'komandan' });
    }, 'babak3');
  });
}
function nextDelivery() {
  if (delivered >= 3) return tankPhase();
  setObj(`Ambil peti amunisi di depot (${delivered}/3)`, () => refs.depot);
  const it = addI(refs.depot, 'Angkat peti amunisi', () => {
    remI(it); P.carry = true; SFX.blip();
    const x = POSTS[delivered];
    setObj(`Antar peti ke pos parit (${delivered}/3)`, () => V([x, hAct3(x, -.5), -.5]));
  }, 3);
}
function tankPhase() {
  phase3 = 2;
  const t1 = spawnTank(V([-10, 0, -100]), [[-10, -60], [-8, -25], [-8, -10]]);
  const t2 = spawnTank(V([12, 0, -115]), [[12, -60], [10, -25], [10, -10]]);
  playCut([
    { from: [0, 3, 3], to: [0, 4, 1], look: [0, 2, -60], look2: [-5, 2, -80], dur: 4.5, text: 'Suara mesin menderu dari utara. TANK! Dua tank Sekutu mendekati garis pertahanan!', fn: () => SFX.alert() },
  ], () => {
    dialog('Komandan Basuki', ['Peluru senapan tidak mempan melawan baja! Lempar granat ke dekat tank, tiga kali kena pasti hancur!', 'Ambil granat tambahan di depot kalau habis!'], () => {
      checkpoint(0, 6, 0);
      setObj('Hancurkan tank dengan granat (0/2)', () => { const t = tanks.find(t => t.alive); return t ? t.g.position : null });
    }, { vo: 'komandan2' });
  }, 'tank');
  addI(refs.depot, 'Ambil amunisi & granat', refill, 3);
}
function retreatPhase() {
  phase3 = 3; timer3 = D().timer;
  dialog('Komandan Basuki', ['Tank hancur! Tapi pasukan musuh terlalu banyak. Semua mundur!', 'Seberangi jembatan Brantas sekarang. Jembatan akan diledakkan untuk menahan musuh!'], () => {
    checkpoint(0, 27, 0);
    setObj('MUNDUR! Seberangi jembatan sebelum diledakkan', () => V([0, 0, 54]));
    $('#timer').hidden = false;
    allies.forEach((a, i) => { a.cover = V([rand(-2.4, 2.4), 0, 33]); a.retreat = 1; a.speed = rand(3.2, 4) });
    for (let i = 0; i < 10; i++) setTimeout(() => spawnSoldier('enemy', V([rand(-30, 30), 0, -80]), V([rand(-30, 30), 0, rand(-20, -6)])), i * 600);
    flyBy(10, 6, 1); setTimeout(() => flyBy(20, 6, -1), 9000);
    W.onRespawn = () => { timer3 = D().timer - 10 };
  }, { vo: 'komandan3' });
}
function bridgeScene() {
  phase3 = 4; $('#timer').hidden = true; enemies.forEach(e => e.cover = e.m.position.clone());
  playCut([
    { from: [10, 6, 62], to: [8, 5, 60], look: [0, 1, 42], dur: 4, text: 'Kamu berhasil menyeberang. Para pejuang menyalakan sumbu dinamit...' },
    { from: [12, 5, 58], to: [14, 7, 62], look: [0, 1, 42], dur: 5, text: 'DUAR! Jembatan runtuh ke Kali Brantas. Pasukan musuh tertahan di seberang.', fn: () => setTimeout(() => {
      [[-2, 38], [2, 42], [0, 46], [0, 42]].forEach(([x, z], i) => setTimeout(() => boomFx(V([x, 1, z]), 1.6), i * 200));
      setTimeout(() => { bridgeUp = false; refs.bridge.visible = false; refs.bridgeCols.forEach(c => c.off = true); colliders.push({ x0: -3.4, x1: 3.4, z0: 36.4, z1: 47.6, y0: -4, y1: 4 }); for (let i = 0; i < 8; i++) puff(V([rand(-3, 3), 0, rand(37, 47)]), 0x8a8a80, 3, 5, V([0, 2, 0]), 3) }, 400);
    }, 1200) },
  ], () => fact('Gunungsari', 'Setelah kota Surabaya dikuasai Sekutu, para pejuang mundur ke daerah selatan seperti Gunungsari, Sidoarjo, dan Mojokerto. Mereka terus melawan. Perlawanan rakyat Surabaya menunjukkan kepada dunia bahwa bangsa Indonesia siap mempertahankan kemerdekaannya.', ending), 'jembatan');
}
function updateAct3(dt) {
  battleAmbience(dt, phase3 >= 3 ? 2 : 1.2);
  if (mode !== 'play') return;
  // musuh terus berdatangan
  spawn3 -= dt;
  const maxE = phase3 === 1 ? 6 : phase3 === 2 ? 7 : phase3 === 3 ? 12 : 0;
  if (spawn3 < 0 && aliveEnemies() < maxE) {
    spawn3 = rand(1.5, 3.5);
    const cover = pick([[-18, -30], [14, -36], [-6, -53], [24, -20], [-28, -18], [rand(-30, 30), rand(-45, -12)]]);
    spawnSoldier('enemy', V([rand(-30, 30), 0, rand(-88, -78)]), V([cover[0] + rand(-2, 2), 0, cover[1] + rand(-1, 2)]));
  }
  if (phase3 === 1 && P.carry) {
    const x = POSTS[delivered];
    if (Math.hypot(P.pos.x - x, P.pos.z + .5) < 2.4) { P.carry = false; delivered++; SFX.ok(); toast(`PETI ${delivered}/3 TERKIRIM`, 1300); C.reserve += 10; nextDelivery() }
    if (Math.random() < dt * .25) artillery(V([P.pos.x + rand(-6, 6), 0, P.pos.z + rand(-6, 6)]), 1.8, 3, 45);
  }
  if (phase3 === 2) {
    const dead = tanks.filter(t => !t.alive).length;
    $('#objText').textContent = `Hancurkan tank dengan granat (${dead}/2)`;
    if (dead >= 2) { phase3 = 2.5; setTimeout(retreatPhase, 1500) }
  }
  if (phase3 === 3) {
    timer3 -= dt; $('#timer').textContent = '⏱ ' + Math.max(0, Math.ceil(timer3));
    $('#timer').style.color = timer3 < 10 ? '#ff4b40' : '#fff';
    if (Math.random() < dt * .5) artillery(V([P.pos.x + rand(-8, 8), 0, P.pos.z + rand(-8, 8)]), 1.6, 3.2, 50);
    allies.forEach(a => { if (!a.alive) return; if (a.retreat === 1 && a.m.position.z > 32) { a.retreat = 2; a.cover = V([rand(-2.4, 2.4), 0, 50]) } else if (a.retreat === 2 && a.m.position.z > 49) { a.retreat = 3; a.cover = V([rand(-25, 25), 0, rand(52, 58)]) } });
    if (P.pos.z > 50) bridgeScene();
    else if (timer3 <= 0) { boomFx(V([0, 1, 42]), 1.5); toast('JEMBATAN DILEDAKKAN... KAMU TERLAMBAT!', 2000); die() }
  }
}
function ending() {
  playCut([
    { from: [0, 5, 60], to: [0, 7, 56], look: [0, 2, 20], text: 'Garis pertahanan Gunungsari akhirnya jatuh, tetapi para pejuang berhasil mundur dan terus melawan.' },
    { from: [-30, 40, 70], to: [30, 45, 50], look: [0, 0, -20], text: 'Pertempuran Surabaya berlangsung sekitar tiga minggu. Ribuan pejuang dan warga gugur mempertahankan kemerdekaan.' },
    { from: [-10, 20, 0], to: [10, 22, -10], look: [0, 0, -60], text: 'Surabaya akhirnya dikuasai Sekutu, tetapi perlawanan arek-arek Suroboyo mengejutkan dunia: bangsa Indonesia siap mempertahankan kemerdekaannya.' },
    { from: [4, 3, 2], to: [5, 4.5, 4], look: [6, 4, 0], text: 'Untuk mengenang keberanian mereka, setiap tanggal 10 November diperingati sebagai Hari Pahlawan.' },
  ], () => { A.scale = 'act1'; showQuiz() }, 'ending');
}

/* =================== LOOP UTAMA =================== */
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (paused) { renderer.render(scene, camera); return }
  T += dt;
  if (mode === 'play') updatePlayer(dt);
  else if (mode === 'cut' && cut) updateCut(dt);
  else if (mode === 'menu') { camera.position.set(Math.sin(T * .05) * 40, 22, 40 + Math.cos(T * .05) * 20); camera.lookAt(14, 12, -30) }
  if (mode !== 'menu' && mode !== 'end') {
    W.update && W.update(dt);
    youths.forEach(y => { if (y.userData.goal) { if (walkTo(y, y.userData.goal, dt, 3.5)) y.userData.goal = null } else animHuman(y, 0, dt) });
    crowd.forEach(c => animHuman(c, 0, dt));
    updGuards(dt);
    if (refs.langgar) updateAct2(dt);
    if (refs.bridge) updateAct3(dt);
  } else if (W.update) W.update(dt);
  updateCombat(dt); updateDoors(dt); updateFlags(T); updateParts(dt); updateFires(dt); updatePending(dt);
  updateInteract(); updateMarker();
  if (shake > 0) { camera.position.x += rand(-1, 1) * shake * .25; camera.position.y += rand(-1, 1) * shake * .25; shake = Math.max(0, shake - dt * 1.8) }
  renderer.render(scene, camera);
}

setupAct1();
requestAnimationFrame(loop);
setTimeout(() => $('#fade').style.opacity = 0, 200);
// tombol menu, pause, pengaturan, kuis ada di js/ui.js
