(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const screens = $$('.screen');
  const state = { activity: null, icon: 'walk', date: null, time: null, place: '' };
  const monthNames = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
  const monthNamesGen = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
  const dateLong = d => `${d.getDate()} ${monthNamesGen[d.getMonth()]} ${d.getFullYear()}`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let shownYear = today.getFullYear(), shownMonth = today.getMonth();

  function showScreen(id) {
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $('#open-envelope').addEventListener('click', () => { showScreen('screen-question'); initScratch(); });

  // Scratch-off surface: works with mouse, pen and touch.
  let scratchReady = false, scratched = false, ctx, drawing = false, lastPoint = null;
  function initScratch() {
    if (scratchReady) return;
    const canvas = $('#scratch-canvas'), card = $('#scratch-card');
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    // Reset the canvas context each time the invitation is restarted.
    canvas.width = Math.round(card.clientWidth * dpr);
    canvas.height = Math.round(card.clientHeight * dpr);
    ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = card.clientWidth, h = card.clientHeight;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#d9d0ca'); grad.addColorStop(.5, '#eee7e1'); grad.addColorStop(1, '#d1c5bd');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#81736d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '600 10px DM Sans, sans-serif'; ctx.fillText('СОТРИТЕ ЗАЩИТНЫЙ СЛОЙ', w / 2, h / 2 - 4);
    ctx.globalCompositeOperation = 'destination-out';
    function point(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function start(e) { if (scratched) return; drawing = true; lastPoint = point(e); canvas.setPointerCapture?.(e.pointerId); erase(lastPoint, lastPoint); }
    function move(e) { if (!drawing || scratched) return; const p = point(e); erase(lastPoint, p); lastPoint = p; }
    function end() { drawing = false; lastPoint = null; checkReveal(); }
    function erase(a, b) { ctx.beginPath(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 34; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.beginPath(); ctx.arc(b.x, b.y, 17, 0, Math.PI * 2); ctx.fill(); }
    canvas.addEventListener('pointerdown', start); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
    function checkReveal() {
      if (scratched) return;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let clear = 0; for (let i = 3; i < data.length; i += 4 * 12) if (data[i] < 80) clear++;
      const sampled = data.length / (4 * 12);
      if (clear / sampled > .34) {
        scratched = true; canvas.style.transition = 'opacity .5s ease'; canvas.style.opacity = '0';
        $('#scratch-hint').style.display = 'none';
        setTimeout(() => { canvas.style.display = 'none'; const area = $('#answer-area'); area.classList.add('visible'); area.setAttribute('aria-hidden', 'false'); }, 450);
      }
    }
    scratchReady = true;
  }

  const noButton = $('#no-button'), noZone = $('#no-zone'); let noMoves = 0;
  function moveNoButton(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const maxX = Math.max(0, noZone.clientWidth - noButton.offsetWidth);
    const maxY = Math.max(0, noZone.clientHeight - noButton.offsetHeight);
    const oldX = parseFloat(noButton.style.left) || 0;
    const oldY = parseFloat(noButton.style.top) || 0;
    let x = oldX, y = oldY;
    for (let i = 0; i < 12 && Math.hypot(x - oldX, y - oldY) < 55; i++) {
      x = Math.random() * maxX;
      y = Math.random() * maxY;
    }
    noButton.style.left = `${x}px`; noButton.style.top = `${y}px`;
    noMoves++;
    $('#no-caption').textContent = noMoves >= 4 ? 'Кажется, кнопка уже всё решила за тебя 😅' : 'Ой, кнопка «Нет» убежала!';
  }
  noButton.addEventListener('pointerenter', moveNoButton);
  noButton.addEventListener('pointerdown', moveNoButton);
  noButton.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); moveNoButton(e); });
  noZone.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = noButton.getBoundingClientRect();
    const distance = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    if (distance < 32) moveNoButton(e);
  });
  $('#yes-button').addEventListener('click', () => showScreen('screen-activity'));

  const customPlan = $('#custom-plan');
  const customPlace = $('#custom-place');
  const customTime = $('#custom-time');
  function updateActivityContinue() {
    const isFree = state.icon === 'free';
    $('#to-calendar').disabled = !state.activity || (isFree && (!customPlace.value.trim() || !customTime.value.trim()));
    if (isFree) {
      state.place = customPlace.value.trim();
      state.time = customTime.value.trim();
    }
  }
  [customPlace, customTime].forEach(input => input.addEventListener('input', () => {
    updateActivityContinue();
    if (state.icon === 'free' && state.date) {
      $('#to-confirm').disabled = !customPlace.value.trim() || !customTime.value.trim();
    }
  }));
  $$('.activity-card').forEach(card => card.addEventListener('click', () => {
    $$('.activity-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected'); state.activity = card.dataset.activity; state.icon = card.dataset.icon;
    const isFree = state.icon === 'free';
    customPlan.hidden = !isFree;
    if (!isFree) { state.place = ''; state.time = null; }
    $('#to-confirm').disabled = true;
    updateActivityContinue();
  }));
  $('#to-calendar').addEventListener('click', () => { if (state.icon === 'free') updateActivityContinue(); if ($('#to-calendar').disabled) return; renderCalendar(); showScreen('screen-calendar'); });
  $$('.back-button').forEach(btn => btn.addEventListener('click', () => showScreen(btn.dataset.back)));

  const monthTitle = $('.calendar-head strong');
  const yearTitle = $('.calendar-head div span');
  const monthArrows = $$('.month-arrow');
  monthArrows[0].addEventListener('click', () => {
    shownMonth--; if (shownMonth < 0) { shownMonth = 11; shownYear--; }
    renderCalendar();
  });
  monthArrows[1].addEventListener('click', () => {
    shownMonth++; if (shownMonth > 11) { shownMonth = 0; shownYear++; }
    renderCalendar();
  });

  function renderCalendar() {
    const holder = $('#calendar-days'); holder.innerHTML = '';
    monthTitle.textContent = monthNames[shownMonth][0].toUpperCase() + monthNames[shownMonth].slice(1);
    yearTitle.textContent = shownYear;
    const prevMonth = new Date(shownYear, shownMonth, 1);
    const earliestMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    monthArrows[0].disabled = prevMonth <= earliestMonth;
    const firstDay = new Date(shownYear, shownMonth, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(shownYear, shownMonth + 1, 0).getDate();
    for (let i = 0; i < offset; i++) {
      const blank = document.createElement('span'); blank.className = 'day blank'; blank.setAttribute('aria-hidden', 'true'); holder.append(blank);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(shownYear, shownMonth, day); date.setHours(0, 0, 0, 0);
      const btn = document.createElement('button'); btn.className = 'day'; btn.type = 'button'; btn.textContent = day;
      btn.setAttribute('aria-label', dateLong(date));
      if (date < today) btn.disabled = true;
      if (date.getTime() === today.getTime()) btn.classList.add('today');
      if (state.date && state.date.getTime() === date.getTime()) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        state.date = date; if (state.icon !== 'free') state.time = null;
        $$('.day', holder).forEach(d => d.classList.remove('selected')); btn.classList.add('selected');
        $('#time-section').hidden = state.icon === 'free'; $('#selected-date-label').textContent = dateLong(date);
        $('#to-confirm').disabled = state.icon === 'free'
          ? (!customPlace.value.trim() || !customTime.value.trim())
          : true;
        if (state.icon !== 'free') renderTimes();
      });
      holder.append(btn);
    }
    if (state.date) {
      $('#time-section').hidden = state.icon === 'free';
      $('#selected-date-label').textContent = dateLong(state.date);
      if (state.icon !== 'free') renderTimes();
      $('#to-confirm').disabled = state.icon === 'free'
        ? (!state.place.trim() || !state.time)
        : !state.time;
    } else {
      $('#to-confirm').disabled = true;
    }
  }
  function renderTimes() {
    const holder = $('#time-grid'); holder.innerHTML = '';
    const times = [];
    for (let mins = 9 * 60; mins <= 22 * 60; mins += 30) {
      const h = String(Math.floor(mins / 60)).padStart(2, '0');
      const m = String(mins % 60).padStart(2, '0');
      times.push(`${h}:${m}`);
    }
    times.forEach(time => {
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'time-option'; btn.textContent = time;
      if (state.time === time) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        state.time = time; $$('.time-option', holder).forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); $('#to-confirm').disabled = false;
      });
      holder.append(btn);
    });
  }
  $('#to-confirm').addEventListener('click', () => {
    if (!state.activity || !state.date || !state.time || (state.icon === 'free' && !state.place.trim())) return;
    const activityIcons = {
      walk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42m0-12.72-1.42 1.42m-9.88 9.88-1.42 1.42"/><circle cx="12" cy="12" r="4"/></svg>',
      coffee: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z"/><path d="M17 10h2a2.5 2.5 0 0 1 0 5h-2M7 4v2m4-2v2m4-2v2"/></svg>',
      film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m10 8 5 4-5 4V8Z"/></svg>',
      bowling: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="15" r="6"/><circle cx="10" cy="13" r="1"/><circle cx="14" cy="13" r="1"/><path d="M8 5.5a2 2 0 1 1 4 0c0 1.1-2 3.5-2 3.5S8 6.6 8 5.5Zm5-1a1.5 1.5 0 1 1 3 0c0 .8-1.5 2.5-1.5 2.5S13 5.3 13 4.5Z"/></svg>',
      free: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/><path d="M9 12h6m-3-3v6"/></svg>'
    };
    $('#summary-activity-icon').innerHTML = activityIcons[state.icon] || activityIcons.walk;
    $('#summary-activity').textContent = state.activity;
    $('#summary-place-row').hidden = state.icon !== 'free';
    $('#summary-place').textContent = state.place;
    $('#summary-date').textContent = dateLong(state.date);
    $('#summary-time').textContent = state.time;
    showScreen('screen-confirm');
  });
  $('#send-telegram').addEventListener('click', () => {
    const message = `Я выбираю наше свидание! ♥\n\nПлан: ${state.activity}${state.icon === 'free' ? `\nМесто: ${state.place}` : ''}\nДата: ${dateLong(state.date)}\nВремя: ${state.time}\n\nЖду встречи 😊`;
    // Telegram share link requires both a URL and the prefilled message.
    // This opens Telegram's share chooser; the recipient must still send it manually.
    const siteUrl = window.location.href;
    const url = `https://t.me/share/url?url=${encodeURIComponent(siteUrl)}&text=${encodeURIComponent(message)}`;
    window.location.href = url;
  });
  $('#restart').addEventListener('click', () => {
    state.activity = null; state.icon = 'walk'; state.date = null; state.time = null; state.place = ''; customPlace.value = ''; customTime.value = ''; customPlan.hidden = true; noMoves = 0; scratched = false; scratchReady = false;
    $$('.activity-card').forEach(c => c.classList.remove('selected')); $('#to-calendar').disabled = true; $('#to-confirm').disabled = true;
    $('#answer-area').classList.remove('visible'); $('#answer-area').setAttribute('aria-hidden','true'); $('#scratch-canvas').style.display = 'block'; $('#scratch-canvas').style.opacity = '1'; $('#scratch-hint').style.display = '';
    noButton.style.left = '0px'; noButton.style.top = '0px'; $('#no-caption').textContent = 'Кажется, кнопка «Нет» немного стесняется.';
    $('#time-section').hidden = true; $('#summary-place-row').hidden = true; $('#calendar-days').innerHTML = '';
    $('#time-grid').innerHTML = ''; $('#to-calendar').disabled = true; $('#to-confirm').disabled = true;
    shownYear = today.getFullYear(); shownMonth = today.getMonth(); showScreen('screen-envelope');
  });
})();
