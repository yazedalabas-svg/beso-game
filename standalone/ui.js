// واجهة اللعبة للنسخة المستقلة (ملف واحد، بدون React).
// تستهلك نفس الـ snapshot اللي يبثّه المحرك، وتستخدم نفس أسماء الأصناف في game.css.

import ICONS from './icons.json';
import {assetURL} from '../game/assets.js';
const icon = (name, size = 18) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

const PUZZLE_SYMBOLS = [
  { id: 'coffee', text: 'فنجال', ic: 'Coffee' },
  { id: 'clock', text: 'ساعة', ic: 'Clock3' },
  { id: 'door', text: 'باب', ic: 'DoorOpen' },
];
const JOURNAL = [
  { id: 'photo0', title: 'فنجال', body: 'أول ما جيت، صب لي فنجال.' },
  { id: 'photo1', title: 'ساعة', body: 'عقب القهوة، ثقلت عيوني وأنا أطالع الساعة.' },
  { id: 'photo2', title: 'باب', body: 'آخر شيء أذكره، صوت الباب وهو يتقفل.' },
];
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function mountUI(host, start) {
  const shell = document.createElement('main');
  shell.className = 'game-shell';
  shell.dataset.mode = 'loading';
  shell.innerHTML =
    '<div class="world-canvas" aria-label="عالم اللعبة ثلاثي الأبعاد"></div>' +
    '<div class="film-grain" aria-hidden="true"></div><div class="vignette" aria-hidden="true"></div><div class="scanlines" aria-hidden="true"></div>' +
    '<div class="ui-layer"></div>';
  host.appendChild(shell);

  const stage = shell.querySelector('.world-canvas');
  const layer = shell.querySelector('.ui-layer');
  let game = null;
  let settingsOpen = false;
  let signature = '';
  let snap = null;
  const touch = { p: null };

  const act = (method, ...args) => game?.[method]?.(...args);

  // ---- لوحة الإعدادات: عنصر ثابت حتى ما ينقطع السحب على المؤشر ----
  const settingsPanel = document.createElement('div');
  settingsPanel.className = 'settings-panel';
  settingsPanel.innerHTML =
    `<label class="setting-row"><span>${icon('VolumeX', 16)}كتم الصوت</span>` +
    `<button class="sw" data-sw="muted" role="switch" aria-checked="false" aria-label="كتم الصوت"><i></i></button></label>` +
    `<label class="setting-row"><span>${icon('Eye', 16)}تخفيف الوميض والفزعات</span>` +
    `<button class="sw" data-sw="reduced" role="switch" aria-checked="false" aria-label="تخفيف الوميض والفزعات"><i></i></button></label>` +
    `<div class="volume-setting"><span>مستوى الصوت <b>80%</b></span><input class="volume-range" type="range" min="0" max="1" step="0.05" value="0.8" aria-label="مستوى الصوت"></div><div class="sensitivity"><span>حساسية الماوس <b dir="ltr">1.0×</b></span>` +
    `<input type="range" min="0.4" max="2" step="0.1" value="1" aria-label="حساسية الماوس"></div>`;
  settingsPanel.querySelectorAll('.sw').forEach((b) =>
    b.addEventListener('click', () => act('setSettings', { [b.dataset.sw]: b.getAttribute('aria-checked') !== 'true' })));
  settingsPanel.querySelector('.sensitivity input').addEventListener('input', (e) =>
    act('setSettings', { sensitivity: Number(e.target.value) }));

  settingsPanel.querySelector('.volume-range').addEventListener('input',e=>act('setSettings',{volume:Number(e.target.value)}));
  const syncSettings = (s) => {
    settingsPanel.querySelector('[data-sw="muted"]').setAttribute('aria-checked', String(s.settings.muted));
    settingsPanel.querySelector('[data-sw="reduced"]').setAttribute('aria-checked', String(s.settings.reduced));
    settingsPanel.querySelector('.volume-setting b').textContent=Math.round((s.settings.volume??.8)*100)+'%';
    const range = settingsPanel.querySelector('.sensitivity input');
    if (document.activeElement !== range) range.value = String(s.settings.sensitivity);
    settingsPanel.querySelector('.sensitivity b').textContent = s.settings.sensitivity.toFixed(1) + '×';
  };

  // ---- شاشات ----
  const titleScreen = (s) => `
   <header class="title-top"><span class="tape-label">${icon('Videotape', 17)} تسجيل مفقود · ٠١٧</span>
    <span class="rec" dir="ltr"><i></i>REC <span>00:00:00</span></span></header>
   <section class="title-screen">
    <div class="chapter-marker"><span></span>رعب · كوميديا · خيانة خوي</div>
    <h1>لا تطلع<br><span>يا بيسو.</span></h1>
    <p class="title-description">خويك يعرف طريق الخروج.<br>المشكلة... إنه ما يبيك تطلع.</p>
    <div class="start-actions"><button class="primary-action" data-do="start">ابدأ الكابوس ${icon('ArrowLeft', 21)}</button>
     ${s.hasSave ? `<button class="secondary-action" data-do="continue">كمّل من النقطة الآمنة ${icon('Play', 17)}</button>` : ''}</div>
    <button class="text-action" data-do="toggleSettings">${icon('AudioLines', 16)}الصوت وإعدادات الفزعة ${icon('ChevronLeft', 15)}</button>
    <div class="settings-slot"></div>
    <p class="muted-note">مرزوق يسمع ركضك ويرى نورك. افتح الدفتر N لمعرفة طرق النهايات الأربع.</p>
    <div class="headphone-note">${icon('Headphones', 19)}<p>السماعات تفرق. خطواته تحذّرك قبل ما تشوفه.<small>تحتوي اللعبة على فزعات وأصوات مفاجئة. يمكنك تخفيفها من الإعدادات.</small></p></div>
   </section>
   <aside class="title-stamp" aria-hidden="true"><span>ROOM</span><strong>017</strong><span>DO NOT OPEN</span></aside>
   <footer class="title-footer"><div class="control-strip"><span><kbd>W A S D</kbd> تحرّك</span>
    <span>${icon('ScanLine', 16)} الماوس للنظر</span><span><kbd>E</kbd> تفاعل</span><span><kbd>F</kbd> إضاءة</span><span><kbd>B</kbd> الشنطة</span></div>
    <span class="ending-count">${s.unlocked.length} / 4 نهايات مكتشفة</span></footer>`;

  const introScreen = (s) => `
   <div class="cinema-shade ${s.introTime > 6.3 ? 'lights-out' : ''}" aria-hidden="true"></div>
   <div class="cinema-bars" aria-hidden="true"></div>
   <div class="intro-caption">قبل ما تفيق...</div>
   <button class="text-action skip-action" data-do="skipIntro">تخطّ المشهد ${icon('ChevronLeft', 16)}</button>`;

  const cinemaScreen = (s) => `<div class="cinema-bars" aria-hidden="true"></div><div class="jojo-fx ${esc(s.cinemaFx)}" aria-hidden="true"></div><div class="manga-sfx" aria-hidden="true">${esc(s.cinemaGraphic)}</div>${s.cinemaCard?`<div class="jojo-card">${esc(s.cinemaCard)}<span>←</span></div>`:``}<div class="shot-caption">${esc(s.cinemaCaption)}</div><div class="intro-caption">${esc(s.ending?.label)} · ${Math.min(100,Math.floor(s.cinemaTime/s.cinemaDuration*100))}%</div><button class="text-action skip-action" data-do="finishCinema">تخطّ المشهد ${icon('ChevronLeft',16)}</button><button class="text-action cinema-pause" data-do="pause">إيقاف مؤقت ${icon('Pause',16)}</button>`;

  const eventScreen = (s) => `<div class="cinema-bars event-bars" aria-hidden="true"></div><div class="event-noise ${esc(s.eventId)}" aria-hidden="true"></div><div class="intro-caption">${s.eventId==='blackout'?'انقطاع الكهرباء':s.eventId==='cctv'?'تسجيل المراقبة':s.eventId==='lounge'?'استراحة غير آمنة':'باب EXIT'}</div><button class="text-action skip-action" data-do="skipEvent">تخطّ المشهد ${icon('ChevronLeft',16)}</button>`;

  const playScreen = (s) => `
   <header class="hud-top"><div class="objective"><span class="eyebrow">${s.level === 'room' ? '٠١ / الغرفة المظلمة' : '٠٢ / خلف الباب'}</span>
     <p class="js-goal">${esc(s.goal)}</p></div>
    <div class="hud-buttons"><button aria-label="الذكريات والأدلة N" data-do="openJournal">${icon('BookOpen', 18)}</button>
     <button aria-label="إيقاف اللعبة" data-do="pause">${icon('Pause', 18)}</button></div></header>
   <div class="crosshair ${s.target ? 'targeted' : ''}" aria-hidden="true"></div>
   ${s.target ? `<div class="interaction-prompt"><kbd>E</kbd>${esc(s.target)}</div>` : ''}
   ${s.powerOut&&s.powerHint?`<div class="power-compass"><i style="transform:rotate(${s.powerHint.angle}rad)">↑</i><span>عداد الكهرباء · ${s.powerHint.distance}م</span><small>يرجع تلقائيًا بعد ${Math.ceil(s.powerHint.seconds/60)}د</small></div>`:''}
   <div class="danger-cue js-danger" hidden>${icon('Footprints', 18)}<span class="js-danger-text"></span><span></span></div>
   <footer class="hud-bottom">
    <div class="inventory"><span class="${s.flags.keyFound ? 'collected' : ''}">${icon('KeyRound', 18)}${s.flags.keyFound ? 'مفتاح صدئ' : '—'}</span>
     <span>${icon('BookOpen', 18)}${Number(s.flags.evidenceRoom) + Number(s.flags.evidenceMaze)} / 2 أدلة</span>
     <span class="${s.flags.backpack?'collected':''}">${icon('Coffee',16)}${s.flags.backpack?`شنطة B · ${(s.flags.inventory?.energy||0)+(s.flags.inventory?.almond||0)}`:'الشنطة —'}</span>
     ${s.checkpoint ? `<span class="safe-label">${icon('ShieldCheck', 16)}محفوظ</span>` : ''}</div>
    <div class="vitals"><div class="battery-head">${icon('Flashlight', 18)}<span class="js-batt"></span><kbd>F</kbd></div>
     <div class="battery-meter js-battmeter"><i></i></div><div class="stamina-meter"><i></i></div>
     <small>SHIFT · ركض / C · انحناء / B · الشنطة / N · الدفتر</small></div></footer>`;

  const touchScreen = () => `
   <div class="look-pad"></div>
   <div class="touch-controls" dir="ltr">
    <div class="dpad">${[['KeyW', 'ArrowUp'], ['KeyA', 'ArrowLeft'], ['KeyS', 'ArrowDown'], ['KeyD', 'ArrowRight']]
      .map(([k, i]) => `<button data-key="${k}" aria-label="${k}">${icon(i, 21)}</button>`).join('')}</div>
    <div class="touch-actions"><button data-do="interact">E</button>
     <button data-do="toggleFlash">${icon('Flashlight', 21)}</button>
     <button data-key="ShiftLeft">${icon('Footprints', 21)}</button></div></div>`;

  const overlay = (s) => {
    let body = '';
    if (s.mode === 'pause' || s.mode === 'ready') body = `<section class="overlay-panel pause-panel"><p class="eyebrow">الشريط متوقف</p>
     <h2>${s.mode==='ready'?'صحيت... والباب مقفّل.':'خذ نفس، بيسو.'}</h2><p>${s.mode==='ready'?'اضغط كمّل الهروب للتحكم بالماوس. ابحث عن الفلاشلايت على الطاولة.':'مرزوق ينتظرك. الوقت والبطارية متوقفين.'}</p>
     <button class="primary-action" data-do="resume">كمّل الهروب ${icon('Play', 18)}</button><div class="settings-slot"></div>
     <div class="pause-controls"><span><kbd>W A S D</kbd> الحركة</span><span><kbd>SHIFT</kbd> ركض</span>
      <span><kbd>C</kbd> انحناء</span><span><kbd>N</kbd> ذكريات</span><span><kbd>ESC</kbd> إيقاف</span></div>
     <button class="text-action" data-do="start">ابدأ محاولة جديدة ${icon('RotateCcw', 15)}</button></section>`;

    else if (s.mode === 'puzzle') body = `<section class="overlay-panel puzzle-panel"><p class="eyebrow">قفل الباب / مزلاجان</p>
     <h2>وش صار أول؟</h2><p>رتّب الذكريات من البداية للنهاية.</p>
     <div class="lock-status"><span class="${s.flags.keyFound ? 'done' : ''}">${icon('KeyRound', 16)}${s.flags.keyFound ? 'المفتاح موجود' : 'المفتاح تحت السرير'}</span>
      <span class="${s.flags.memorySolved ? 'done' : ''}">${icon('Check', 16)}${s.flags.memorySolved ? 'مزلاج الذكريات مفتوح' : 'مزلاج الذكريات مقفل'}</span></div>
     <div class="code-slots" dir="ltr">${[0, 1, 2].map((i) => {
      const sym = PUZZLE_SYMBOLS.find((x) => x.id === s.puzzle[i]);
      return `<div><small>${['١', '٢', '٣'][i]}</small>${sym ? icon(sym.ic, 30) : '<span>—</span>'}</div>`;
    }).join('')}</div>
     <div class="symbol-buttons">${PUZZLE_SYMBOLS.map((x) =>
      `<button class="symbol-key" data-symbol="${x.id}" ${s.flags.memorySolved ? 'disabled' : ''}>${icon(x.ic, 28)}${x.text}</button>`).join('')}</div>
     <p class="puzzle-message ${s.flags.memorySolved ? 'success' : ''}" role="status">${esc(s.puzzleMessage || 'ثلاث صور على الجدار تساعدك تتذكّر.')}</p>
     <div class="panel-actions"><button class="primary-action" data-do="closeRead">${s.flags.keyFound && s.flags.memorySolved ? 'ارجع وافتح الباب' : 'ارجع للغرفة'} ${icon('ArrowLeft', 18)}</button>
      ${!s.flags.memorySolved ? `<button data-do="clearPuzzle">امسح الترتيب ${icon('RotateCcw', 15)}</button>` : ''}</div></section>`;

    else if (s.mode === 'read') {
      const isPhoto = !!s.read?.id?.startsWith('photo'),isInventory=s.read?.id==='inventory';
      body = `<section class="overlay-panel read-panel ${isPhoto ? 'photo-read' : ''}">
       <p class="eyebrow">${isInventory?'شنطة بيسو':s.read?.id === 'recording' ? 'صوت قديم / دليل ٠٢' : s.read?.id === 'journal' ? 'الأشياء اللي ما تنسى' : 'ذاكرة / دليل ٠١'}</p>
       <h2>${esc(s.read?.title)}</h2>
       ${isPhoto && !s.read.back ? `<div class="memory-photo"><img src="${assetURL('/textures/memory.png')}" alt="بيسو ومرزوق في صورة قديمة يشربان القهوة"><span>قبل كل هذا.</span></div>` : ''}
       <p class="clue-text">${esc(s.read?.body)}</p>
       ${isInventory?`<div class="bag-grid"><button data-item="energy" ${s.flags.inventory?.energy?'':'disabled'}><b>مشروب طاقة × ${s.flags.inventory?.energy||0}</b><span>يعيد ٦٥ ستامينا</span></button><button data-item="almond" ${s.flags.inventory?.almond?'':'disabled'}><b>ماء اللوز × ${s.flags.inventory?.almond||0}</b><span>يعيد ٢٨ ثانية للفلاشلايت</span></button><div><b>الفطر</b><span>يُستخدم فور التقاطه · ${s.flags.mushrooms.length} مأكول</span></div><div><b>هيبة بيسو</b><span>${s.flags.dignity}%</span></div></div>`:''}
       ${s.read?.id === 'journal' ? `<div class="journal-list">${JOURNAL.map((p, i) =>
        `<div>${s.flags.photos.includes(p.id) ? `<b>${p.title}</b><p>${p.body}</p>` : `<b>ذكرى ${i + 1}</b><p>لم تفحص هذه الصورة بعد.</p>`}</div>`).join('') +
        `<div><b>الرسالة خلف الصورة</b><p>${s.flags.evidenceRoom ? '«لازم بيسو ينام قبل ما أقفل عليه...»' : 'لم تجمعها بعد.'}</p></div>` +
        `<div><b>تسجيل مرزوق</b><p>${s.flags.evidenceMaze ? '«كنت أحمي نفسي... صاحب المشروع لا يتذكر.»' : 'في أحد الممرات، قرب الاستراحة.'}</p></div>`}</div>` : ''}
       <div class="panel-actions"><button class="primary-action" data-do="closeRead">ارجع ${icon('ArrowLeft', 18)}</button>
        ${isPhoto && !s.read.back ? `<button data-do="inspectBack">اقلب الصورة ${icon('RotateCcw', 16)}</button>` : ''}</div></section>`;
    }

    else if (s.mode === 'caught' && s.caughtTime > 1.3) body = `<section class="overlay-panel caught-panel">
     <p class="eyebrow">مسكك / المحاولة ${s.deaths + 1}</p><h2>قلت لك لا تطلع.</h2>
     <p>«أنت سريع... بس الممرات معي.»</p>
     <p class="muted-note">اكسر خط النظر عند الزوايا. إطفاء الفلاشلايت يصعّب اكتشافك.</p>
     <button class="primary-action" data-do="retry">مرّة أخيرة... يمكن ${icon('RotateCcw', 18)}</button>
     <span class="checkpoint-note">${icon('ShieldCheck', 15)}ترجع لآخر نقطة آمنة. الأدلة محفوظة.</span></section>`;

    else if (s.mode === 'choice') {const both=s.flags.evidenceRoom&&s.flags.evidenceMaze;body = `<section class="overlay-panel choice-panel"><p class="eyebrow">الباب الأخير / أربع طرق</p>
     <h2>هالمرة... أنت تختار.</h2><p>كل باب له مشهد ونهاية مختلفة. تقدر ترجع وتجرّب قرار ثاني بعد المشهد.</p>
     <div class="evidence-summary">${icon('BookOpen',18)}${s.flags.evidenceRoom?'✓':'○'} الرسالة · ${s.flags.evidenceMaze?'✓':'○'} التسجيل</div>
     <div class="ending-options">
      <button class="choice-card" data-decide="leave" ${both?'':'disabled'}>${icon('DoorOpen',25)}<span><b>١ · اخرج بالدليلين</b><small>${both?'جاهز · مواجهة بيسو ومرزوق':!s.flags.evidenceRoom?'خذ الرسالة عند مدخل المتاهة ثم التسجيل قرب الاستراحة':'بقي التسجيل قرب الاستراحة'}</small></span></button>
      <button class="choice-card" data-decide="trust">${icon('Coffee',25)}<span><b>٢ · اجلس للمصالحة</b><small>ماء اللوز ينتظر على الطاولة</small></span></button>
      <button class="choice-card" data-decide="unknown">${icon('Eye',25)}<span><b>٣ · اسمع مرزوق للنهاية</b><small>مواجهة هادئة عند الباب</small></span></button>
      <button class="choice-card" data-decide="control" ${both?'':'disabled'}>${icon('KeyRound',25)}<span><b>٤ · اكشف سر الحماية</b><small>${both?'غرفة المراقبة كشفت الحقيقة':'مقفلة حتى تجمع الرسالة والتسجيل'}</small></span></button>
     </div><button class="text-action" data-do="closeRead">ارجع واجمع الأدلة ${icon('ArrowLeft',16)}</button></section>`;}

    else if (s.mode === 'ending' && s.ending) body = `<section class="overlay-panel ending-panel ending-${s.ending.tone}">
     <div class="ending-index">${String(s.ending.id).padStart(2, '0')}<span>/ 04</span></div>
     <p class="eyebrow">${s.ending.label}</p><h2>${s.ending.title}</h2><p>${esc(s.ending.text)}</p>
     <blockquote>${esc(s.ending.quip)}</blockquote>
     <div class="run-stats"><span>${icon('Clock3', 16)}${Math.floor(s.elapsed / 60)}د ${Math.floor(s.elapsed % 60)}ث</span>
      <span>${icon('Footprints', 16)}${s.deaths} فزعات</span>
      <span>${icon('Eye', 16)}${s.unlocked.length} من 4 نهايات</span></div>
     <button class="primary-action" data-do="returnToChoice">جرّب قرارًا ثانيًا ${icon('RotateCcw',18)}</button><button class="text-action" data-do="replayCinema">أعد الكاتسين ${icon('Play',16)}</button><button class="text-action" data-do="start">ابدأ من جديد</button></section>`;

    if (!body) return '';
    return `<div class="overlay-backdrop ${s.mode === 'caught' ? 'caught-backdrop' : ''}">${body}</div>`;
  };

  const render = (s) => {
    const html =
      (s.mode === 'title' ? titleScreen(s) : '') +
      (s.mode === 'intro' ? introScreen(s) : '') +
      (s.mode === 'cinematic' ? cinemaScreen(s) : '') +
      (s.mode === 'event' ? eventScreen(s) : '') +
      (s.mode === 'loading' ? '<div class="loading-screen"><p>نجهّز الموديلات...</p></div>' : '') +
      (s.mode === 'play' ? playScreen(s) : '') +
      (s.mobile && s.mode === 'play' ? touchScreen() : '') +
      `<div class="subtitle js-subtitle" role="status" hidden><span></span><em></em></div>` +
      overlay(s);
    layer.innerHTML = html;
    const slot = layer.querySelector('.settings-slot');
    if (slot && (s.mode !== 'title' || settingsOpen)) slot.appendChild(settingsPanel);
  };

  // نحدّث الأرقام السريعة مباشرة بدون إعادة بناء الواجهة
  const paint = (s) => {
    syncSettings(s);
    const goal = layer.querySelector('.js-goal');
    if (goal) goal.textContent = s.goal;
    const batt = layer.querySelector('.js-batt');
    if (batt) {
      batt.textContent = s.flags.flashlight ? `${Math.ceil(s.flags.battery)} ث` : 'الفلاشلايت مفقود';
      const meter = layer.querySelector('.js-battmeter');
      meter.classList.toggle('low', s.flags.battery < 20);
      meter.firstElementChild.style.width = `${s.flags.flashlight ? (s.flags.battery / 120) * 100 : 0}%`;
      layer.querySelector('.stamina-meter i').style.width = `${s.stamina}%`;
    }
    const danger = layer.querySelector('.js-danger');
    if (danger) {
      const show = s.level === 'maze' && s.threat > 0.35;
      danger.hidden = !show;
      if (show) {
        danger.style.opacity = String(Math.min(1, s.threat + 0.3));
        danger.querySelector('.js-danger-text').textContent =
          s.threat > 0.72 ? 'هو قريب. طفّ النور واختفِ.' : 'تسمع خطوات...';
      }
    }
    const sub = layer.querySelector('.js-subtitle');
    if (sub) {
      const show = !!s.subtitle && !['title', 'ending', 'read'].includes(s.mode);
      sub.hidden = !show;
      if (show) sub.querySelector('em').textContent = s.subtitle;
    }
  };

  const onSnapshot = (s) => {
    snap = s;
    shell.dataset.mode = s.mode;
    shell.className = `game-shell ${s.settings.reduced ? 'reduced' : ''} ${s.mode === 'caught' && s.caughtTime < 0.8 ? 'scare' : ''} ${s.miniScare?'mini-scare '+s.miniScare:''} ${s.powerOut?'power-out':''}`;
    const sig = [s.mode, s.level, s.target, s.read?.id, s.read?.back, s.puzzle.join(), s.puzzleMessage,
      s.flags.keyFound, s.flags.memorySolved, s.flags.flashlight, s.flags.evidenceRoom, s.flags.evidenceMaze,
      s.mobile, s.hasSave, s.unlocked.length, s.ending?.id, s.introTime > 6.3, s.caughtTime > 1.3,
      s.cinemaFx,s.cinemaGraphic,s.cinemaCard,s.cinemaCaption,s.eventId,Math.floor(s.eventTime||0),s.miniScare,s.powerOut,s.powerHint?.distance,Math.round((s.powerHint?.angle||0)*10),s.flags.backpack,s.flags.inventory?.energy,s.flags.inventory?.almond,s.flags.mushrooms.length,settingsOpen, s.checkpoint,Math.floor(s.cinemaTime||0)].join('|');
    if (sig !== signature) { signature = sig; render(s); }
    paint(s);
  };

  // ---- الأحداث ----
  layer.addEventListener('click', (e) => {
    const el = e.target.closest('[data-do],[data-symbol],[data-decide],[data-item]');
    if (!el) return;
    if (el.dataset.symbol) return act('chooseSymbol', el.dataset.symbol);
    if (el.dataset.decide) return act('decide', el.dataset.decide);
    if (el.dataset.item) return act('useItem',el.dataset.item);
    const cmd = el.dataset.do;
    if (cmd === 'start') return act('start', false);
    if (cmd === 'continue') return act('start', true);
    if (cmd === 'toggleSettings') { settingsOpen = !settingsOpen; signature = ''; onSnapshot(snap); return; }
    act(cmd);
  });

  // أزرار اللمس: نضغط/نفلت المفاتيح مباشرة على المحرك
  const holdKey = (e) => {
    const b = e.target.closest('[data-key]');
    if (!b) return;
    e.preventDefault();
    b.setPointerCapture?.(e.pointerId);
    game?.keys.add(b.dataset.key);
  };
  const releaseKey = (e) => {
    const b = e.target.closest('[data-key]');
    if (b) game?.keys.delete(b.dataset.key);
  };
  layer.addEventListener('pointerdown', (e) => {
    holdKey(e);
    if (e.target.classList.contains('look-pad')) {
      touch.p = { x: e.clientX, y: e.clientY };
      e.target.setPointerCapture(e.pointerId);
    }
  });
  layer.addEventListener('pointermove', (e) => {
    if (touch.p && e.target.classList.contains('look-pad')) {
      act('look', e.clientX - touch.p.x, e.clientY - touch.p.y);
      touch.p = { x: e.clientX, y: e.clientY };
    }
  });
  layer.addEventListener('pointerup', (e) => { releaseKey(e); touch.p = null; });
  layer.addEventListener('pointercancel', (e) => { releaseKey(e); touch.p = null; });

  try {
    game = start(stage, onSnapshot);
  } catch (err) {
    layer.innerHTML = `<section class="overlay-panel error-panel"><p class="eyebrow">تعذّر تشغيل الرسوم</p>
     <h1>اللمبة ما اشتغلت.</h1><p>اللعبة تحتاج WebGL. جرّب تحديث Chrome أو Edge أو تفعيل تسريع الرسوم في المتصفح.</p>
     <button class="primary-action" onclick="location.reload()">حاول مرة ثانية ${icon('RotateCcw', 18)}</button>
     <details><summary>تفاصيل</summary><code dir="ltr">${esc(err && err.message)}</code></details></section>`;
  }
  return game;
}
