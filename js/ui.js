/* ============================================================
   UI: menu utama, pilih babak, simpan progres, pengaturan,
       pause, kontrol sentuh (HP), kuis, sumber & kredit
   ============================================================ */
const CREDITS_NAME = 'Siswa XI PPLG 4'; // ganti dengan nama kamu / kelompokmu

/* ---------- progres tersimpan ---------- */
function getProgress() { try { return Math.min(3, parseInt(localStorage.getItem('arek_progress')) || 1) } catch (e) { return 1 } }
function saveProgress(n) { try { if (n > getProgress()) localStorage.setItem('arek_progress', n) } catch (e) {} }
const ROMAN = ['', 'I', 'II', 'III'];

/* ---------- pengaturan ---------- */
function applySettings() {
  if (A.ctx) { A.music.gain.value = S.music; A.sfx.gain.value = S.sfx }
  const low = S.gfx === 'rendah';
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  if (renderer.shadowMap.enabled === low) {
    renderer.shadowMap.enabled = !low; sun.castShadow = !low;
    scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true) });
  }
}
const SET_FIELDS = { sSens: ['sens', parseFloat], sMusic: ['music', parseFloat], sSfx: ['sfx', parseFloat], sVoice: ['voice', v => v === '1'], sGfx: ['gfx', v => v], sDiff: ['diff', v => v] };
function openSettings() {
  Object.entries(SET_FIELDS).forEach(([id, [k]]) => { const el = $('#' + id); el.value = typeof S[k] === 'boolean' ? (S[k] ? '1' : '0') : S[k] });
  $('#settings').hidden = false;
}
Object.entries(SET_FIELDS).forEach(([id, [k, conv]]) => $('#' + id).addEventListener('input', e => { S[k] = conv(e.target.value); saveSettings(); applySettings(); if (k === 'voice' && !S[k]) stopVO() }));
$('#settings .close').onclick = () => $('#settings').hidden = true;

/* ---------- menu utama ---------- */
let started = false;
function startGame(act) {
  if (!A.ctx) initAudio();
  applySettings();
  ['#settings', '#chapSel', '#credits'].forEach(s => $(s).hidden = true);
  $('#menu').hidden = true; $('#hud').hidden = false;
  if (TOUCH) { document.body.classList.add('touch'); $('#touch').hidden = false; try { const f = document.documentElement.requestFullscreen; f && f.call(document.documentElement).catch(() => {}) } catch (e) {} }
  else lock();
  started = true; mode = 'busy';
  if (act === 1) { saveProgress(1); fadeOut(intro, 200) }
  else if (act === 2) { youths.forEach(y => L.remove(y)); youths = []; startAct2() }
  else { youths.forEach(y => L.remove(y)); youths = []; giveGun(3); startAct3() }
}
function refreshMenu() {
  const p = getProgress();
  $('#btnCont').hidden = p < 2; $('#btnCont').textContent = 'LANJUTKAN · BABAK ' + ROMAN[p];
  document.querySelectorAll('#chapSel [data-act]').forEach(b => { const a = +b.dataset.act; b.disabled = a > p; b.querySelector('small').textContent = a > p ? '🔒 Selesaikan babak sebelumnya' : b.dataset.sub });
}
const hashAct = location.hash === '#babak2' ? 2 : location.hash === '#babak3' ? 3 : 1;
$('#btnNew').onclick = () => startGame(hashAct);
$('#btnCont').onclick = () => startGame(getProgress());
$('#btnChap').onclick = () => { refreshMenu(); $('#chapSel').hidden = false };
$('#btnSet').onclick = openSettings;
$('#btnCred').onclick = () => $('#credits').hidden = false;
document.querySelectorAll('#chapSel [data-act]').forEach(b => b.onclick = () => startGame(+b.dataset.act));
document.querySelectorAll('.panel .back').forEach(b => b.onclick = () => b.closest('.panel').hidden = true);
refreshMenu();

/* ---------- pause ---------- */
function setPause(v) {
  if (paused === v) return; paused = v; $('#pause').hidden = !v;
  if (A.ctx) v ? A.ctx.suspend() : A.ctx.resume();
  if (window.speechSynthesis) v ? speechSynthesis.pause() : speechSynthesis.resume();
  if (curVO) v ? curVO.pause() : curVO.play().catch(() => {});
}
function onLockChange() {
  if (!started || TOUCH) return;
  const locked = document.pointerLockElement === canvas;
  if (!locked && mode === 'play') setPause(true);
  if (locked) setPause(false);
}
$('#btnResume').onclick = () => { if (TOUCH) setPause(false); else lock() };
$('#btnRetry').onclick = () => {
  setPause(false); if (!TOUCH) lock();
  if (W.roof) teleport(20, -34, -Math.PI * .75); else die('KEMBALI KE CHECKPOINT');
};
$('#btnPSet').onclick = openSettings;
$('#btnMenu').onclick = () => location.href = location.pathname;
$('#pauseBtn').onclick = () => { if (mode === 'play') setPause(true) };

/* ---------- kontrol sentuh (HP / tablet) ---------- */
if (TOUCH) {
  const joy = $('#joy'), knob = $('#knob'); let joyId = null, lookId = null, lx = 0, ly = 0;
  joy.addEventListener('touchstart', e => { e.preventDefault(); joyId = e.changedTouches[0].identifier }, { passive: false });
  addEventListener('touchstart', e => {
    for (const t of e.changedTouches) if (t.identifier !== joyId && lookId === null && !t.target.closest('button,#joy,.panel,#fact,#quiz') && t.clientX > innerWidth * .35) { lookId = t.identifier; lx = t.clientX; ly = t.clientY }
  }, { passive: true });
  addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) {
        const r = joy.getBoundingClientRect(), dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2), L2 = Math.min(1, Math.hypot(dx, dy) / 50), a = Math.atan2(dy, dx);
        P.joy = { x: Math.cos(a) * L2, y: Math.sin(a) * L2 }; knob.style.transform = `translate(${P.joy.x * 40}px,${P.joy.y * 40}px)`;
      }
      if (t.identifier === lookId && mode === 'play' && !paused) {
        P.yaw -= (t.clientX - lx) * .006 * S.sens; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - (t.clientY - ly) * .006 * S.sens)); lx = t.clientX; ly = t.clientY;
      }
    }
  }, { passive: true });
  addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joyId) { joyId = null; P.joy = null; knob.style.transform = '' }
      if (t.identifier === lookId) lookId = null;
    }
  });
  document.querySelectorAll('#tbtns button').forEach(b => {
    b.addEventListener('touchstart', e => {
      e.preventDefault(); if (paused) return;
      const k = b.dataset.t;
      if (k === 'fire' && mode === 'play') fire();
      if (k === 'nade' && mode === 'play') throwGrenade();
      if (k === 'act') action('KeyE');
      if (k === 'reload' && mode === 'play') reload();
      if (k === 'crouch') { P.crouch = !P.crouch; $('#stance').textContent = P.crouch ? 'MERUNDUK' : 'BERDIRI' }
      if (k === 'run') keys.ShiftLeft = true;
    }, { passive: false });
    b.addEventListener('touchend', () => { if (b.dataset.t === 'run') keys.ShiftLeft = false });
  });
  $('#tnext').addEventListener('touchstart', e => { e.preventDefault(); action('Space') }, { passive: false });
  $('#tskip').addEventListener('touchstart', e => { e.preventDefault(); if (mode === 'cut') skipCut() }, { passive: false });
}

/* ---------- kuis akhir ---------- */
const QUIZ = [
  { q: 'Bendera apa yang dikibarkan Belanda di atas Hotel Yamato pada 19 September 1945?', a: ['Merah-putih-biru (bendera Belanda)', 'Hinomaru (bendera Jepang)', 'Union Jack (bendera Inggris)', 'Merah putih'], e: 'Bendera Belanda dikibarkan tanpa izin, sehingga memicu kemarahan rakyat Surabaya.' },
  { q: 'Siapa pemuda yang dikenal ikut memanjat dan merobek bagian biru bendera tersebut?', a: ['Hariyono dan Koesno Wibowo', 'Bung Tomo dan Mallaby', 'Soekarno dan Hatta', 'Ploegman dan Soedirman'], e: 'Hariyono dan Koesno Wibowo termasuk pemuda yang merobek warna biru sehingga tersisa Merah Putih.' },
  { q: 'Apa nama Hotel Yamato sekarang?', a: ['Hotel Majapahit', 'Hotel Indonesia', 'Hotel Oranje', 'Hotel Tunjungan'], e: 'Dulu bernama Hotel Oranje, lalu Hotel Yamato di masa Jepang, dan kini Hotel Majapahit.' },
  { q: 'Pimpinan pasukan Inggris yang tewas di Surabaya pada 30 Oktober 1945 adalah...', a: ['Brigadir Jenderal A.W.S. Mallaby', 'Mr. W.V.Ch. Ploegman', 'Bung Tomo', 'Residen Soedirman'], e: 'Tewasnya Mallaby membuat Inggris mengeluarkan ultimatum kepada rakyat Surabaya.' },
  { q: 'Kapan batas waktu ultimatum Inggris agar rakyat Surabaya menyerahkan senjata?', a: ['10 November 1945 pukul 06.00', '17 Agustus 1945 pukul 10.00', '19 September 1945 pukul 09.00', '25 Oktober 1945 pukul 12.00'], e: 'Rakyat Surabaya menolak ultimatum itu, dan pertempuran besar pecah pada 10 November 1945.' },
  { q: 'Siapa yang membakar semangat rakyat lewat siaran radio dengan semboyan "merdeka atau mati"?', a: ['Bung Tomo', 'Mallaby', 'Ploegman', 'Hariyono'], e: 'Bung Tomo (Sutomo) berpidato lewat Radio Pemberontakan.' },
  { q: 'Mengapa tanggal 10 November diperingati sebagai Hari Pahlawan?', a: ['Untuk mengenang perjuangan rakyat dalam Pertempuran Surabaya 1945', 'Karena hari itu Proklamasi Kemerdekaan dibacakan', 'Karena hari itu Sumpah Pemuda diikrarkan', 'Karena hari itu Belanda mengakui kedaulatan Indonesia'], e: 'Pertempuran Surabaya menjadi simbol keberanian bangsa Indonesia mempertahankan kemerdekaan.' },
];
let qi = 0, qScore = 0;
function showQuiz() {
  mode = 'end'; paused = false;
  if (document.exitPointerLock) document.exitPointerLock();
  $('#hud').hidden = true; $('#touch').hidden = true; $('#pause').hidden = true;
  qi = 0; qScore = 0; $('#quiz').hidden = false; renderQ();
}
function renderQ() {
  const q = QUIZ[qi], opts = q.a.map((t, i) => ({ t, ok: i === 0 })).sort(() => Math.random() - .5);
  $('#qNum').textContent = `SOAL ${qi + 1} DARI ${QUIZ.length}`;
  $('#qText').textContent = q.q; $('#qExp').textContent = ''; $('#qNext').hidden = true;
  const box = $('#qOpts'); box.innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button'); b.className = 'opt'; b.textContent = o.t;
    b.onclick = () => {
      if (box.dataset.done) return; box.dataset.done = 1;
      if (o.ok) { qScore++; SFX.ok() } else SFX.alert();
      [...box.children].forEach((c, i) => { if (opts[i].ok) c.classList.add('right'); else if (c === b) c.classList.add('wrong') });
      $('#qExp').textContent = (o.ok ? '✔ Benar! ' : '✘ Kurang tepat. ') + q.e; $('#qNext').hidden = false;
    };
    box.appendChild(b);
  });
  delete box.dataset.done;
}
$('#qNext').onclick = () => {
  qi++; if (qi < QUIZ.length) return renderQ();
  $('#quiz').hidden = true; $('#end').hidden = false;
  $('#endKills').textContent = C.kills; $('#endQuiz').textContent = `${qScore} / ${QUIZ.length}`;
  $('#endGrade').textContent = qScore === QUIZ.length ? 'Luar biasa! Kamu benar-benar paham sejarah Surabaya 🇮🇩' : qScore >= 5 ? 'Bagus! Sedikit lagi sempurna.' : 'Coba main lagi dan perhatikan kartu fakta sejarahnya!';
  saveProgress(3);
};
$('#endCred').onclick = () => $('#credits').hidden = false;
$('#credName').textContent = CREDITS_NAME;
