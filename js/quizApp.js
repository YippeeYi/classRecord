(() => {
  const CHOICE_REWARD = 100;
  const FILL_REWARD = 500;
  const QUESTION_TYPES = ['choice', 'fill', 'judge'];
  const QUESTION_CONTENT_BY_TYPE = {
    choice: ['person', 'term', 'author', 'time'],
    fill: ['person', 'term', 'author'],
    judge: ['person', 'term', 'author']
  };

  const questionText = document.getElementById('quiz-question-text');
  const questionMeta = document.getElementById('quiz-question-meta');
  const optionsWrap = document.getElementById('quiz-options');
  const fillForm = document.getElementById('quiz-fill-form');
  const fillInput = document.getElementById('quiz-fill-input');
  const feedback = document.getElementById('quiz-feedback');
  const nextButton = document.getElementById('quiz-next-btn');
  const filterWrap = document.getElementById('quiz-filter-bar');

  let questionBank = [];
  let currentQuestion = null;
  let answeredCurrent = false;
  let selectedTypes = new Set(QUESTION_TYPES);
  let selectedContents = new Set(['person', 'term', 'author', 'time']);

  const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const strip = (t) => window.stripRecordMarkup(t || '').replace(/\s+/g, ' ').trim();
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const parsePeople = (content) => [...content.matchAll(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g)].map((m) => ({ id: m[1], label: strip(m[2]) }));
  const parseTerms = (content) => [...content.matchAll(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g)].map((m) => ({ id: m[1], label: strip(m[2]) }));

  const pinyinInitials = (name) => {
    const pure = String(name || '').toLowerCase().replace(/[^a-z\u4e00-\u9fa5]/g, '');
    return pure.split('').map((ch) => /[a-z]/.test(ch) ? ch : 'x').join('');
  };

  function renderFilterBar() {
    const allContents = ['person', 'term', 'author', 'time'];
    const allowedContents = new Set([...selectedTypes].flatMap((t) => QUESTION_CONTENT_BY_TYPE[t]));
    filterWrap.innerHTML = `
      <div class="record-filter quiz-filter">
        <div class="filter-field">${QUESTION_TYPES.map((t) => `<button type="button" class="btn-action quiz-filter-chip ${selectedTypes.has(t) ? 'is-active' : ''}" data-ft="type" data-v="${t}">${t}</button>`).join('')}</div>
        <div class="filter-field">${allContents.filter((c) => allowedContents.has(c)).map((c) => `<button type="button" class="btn-action quiz-filter-chip ${selectedContents.has(c) ? 'is-active' : ''}" data-ft="content" data-v="${c}">${c}</button>`).join('')}</div>
      </div>`;
  }

  function buildQuestions(records) {
    const byPersonId = {};
    records.forEach((r) => parsePeople(r.content || '').forEach((p) => { byPersonId[p.id] = byPersonId[p.id] || new Set(); byPersonId[p.id].add(p.label); }));
    const allAuthors = [...new Set(records.map((r) => r.author).filter(Boolean))];
    const allTimes = [...new Set(records.map((r) => r.time).filter(Boolean))];

    const list = [];
    records.forEach((record) => {
      const text = strip(record.content);
      const people = parsePeople(record.content || '');
      const terms = parseTerms(record.content || '');

      people.forEach((p) => {
        if (!text.includes(p.label)) return;
        const masked = text.replace(p.label, '________________________');
        const sameAlias = [...(byPersonId[p.id] || [])].filter((v) => v !== p.label);
        const other = Object.entries(byPersonId).filter(([id]) => id !== p.id).flatMap(([, s]) => [...s]);
        const options = shuffle([p.label, ...sameAlias, ...other].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4));
        if (options.length === 4) list.push({ id: record.id, type: 'choice', contentType: 'person', answer: p.label, maskedText: masked, options, reward: CHOICE_REWARD });
        list.push({ id: record.id, type: 'fill', contentType: 'person', answer: p.label, maskedText: masked, reward: FILL_REWARD });
      });

      terms.forEach((t) => {
        if (!text.includes(t.label)) return;
        const masked = text.replace(t.label, '________________________');
        const termPool = records.flatMap((r) => parseTerms(r.content || '').map((x) => x.label)).filter((x) => x !== t.label);
        const options = shuffle([t.label, ...termPool.filter(Boolean)]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
        if (options.length === 4) list.push({ id: record.id, type: 'choice', contentType: 'term', answer: t.label, maskedText: masked, options, reward: CHOICE_REWARD });
        list.push({ id: record.id, type: 'fill', contentType: 'term', answer: t.label, maskedText: masked, reward: FILL_REWARD });
      });

      if (allAuthors.length >= 4) {
        const opts = shuffle([record.author, ...allAuthors.filter((a) => a !== record.author)]).slice(0, 4);
        list.push({ id: record.id, type: 'choice', contentType: 'author', answer: record.author, maskedText: text, options: opts, reward: CHOICE_REWARD });
        list.push({ id: record.id, type: 'fill', contentType: 'author', answer: pinyinInitials(record.author), maskedText: text, reward: FILL_REWARD });
      }
      if (allTimes.length >= 4 && record.time) {
        const opts = shuffle([record.time, ...allTimes.filter((t) => t !== record.time)]).slice(0, 4);
        list.push({ id: record.id, type: 'choice', contentType: 'time', answer: record.time, maskedText: text, options: opts, reward: CHOICE_REWARD });
      }

      ['person', 'term', 'author'].forEach((ct) => {
        const base = ct === 'author' ? { src: record.author, rep: pickRandom(allAuthors.filter((a) => a !== record.author) || ['']) } : ct === 'person' ? { src: people[0]?.label, rep: pickRandom(Object.values(byPersonId).flatMap((s) => [...s]).filter((x) => x !== people[0]?.label) || ['']) } : { src: terms[0]?.label, rep: pickRandom(records.flatMap((r) => parseTerms(r.content || '').map((x) => x.label)).filter((x) => x !== terms[0]?.label) || ['']) };
        if (!base.src) return;
        const wrong = Math.random() < 0.5;
        const shown = wrong && base.rep ? text.replace(base.src, base.rep) : text;
        list.push({ id: record.id, type: 'judge', contentType: ct, maskedText: shown, answer: wrong ? '错误' : '正确', options: ['正确', '错误'], reward: CHOICE_REWARD });
      });
    });
    return list;
  }

  function pickQuestion() {
    const allowedContents = new Set([...selectedTypes].flatMap((t) => QUESTION_CONTENT_BY_TYPE[t]));
    const finalContents = [...selectedContents].filter((c) => allowedContents.has(c));
    const pool = questionBank.filter((q) => selectedTypes.has(q.type) && finalContents.includes(q.contentType));
    return pool.length ? pickRandom(pool) : null;
  }

  function renderQuestion() { currentQuestion = pickQuestion(); if (!currentQuestion) return; answeredCurrent = false; feedback.textContent = ''; questionText.innerHTML = currentQuestion.maskedText; questionMeta.textContent = `条目 ${currentQuestion.id} · ${currentQuestion.type} · ${currentQuestion.contentType}`; const isFill = currentQuestion.type === 'fill'; optionsWrap.hidden = isFill; fillForm.hidden = !isFill; if (!isFill) optionsWrap.innerHTML = currentQuestion.options.map((o, i) => `<button class="quiz-option btn-action" type="button" data-option="${esc(o)}"><span class="quiz-option-label">${String.fromCharCode(65 + i)}</span><span>${esc(o)}</span></button>`).join(''); else fillInput.value = ''; }

  function handleAnswer(v) { if (!currentQuestion || answeredCurrent) return; answeredCurrent = true; const ok = String(v).trim() === String(currentQuestion.answer).trim(); window.GameState.recordQuizResult(ok); if (ok) window.GameState.addCoins(currentQuestion.reward, 'quiz-reward'); feedback.textContent = ok ? `回答正确，获得 ${currentQuestion.reward} Q币。` : `回答错误，正确答案是 ${currentQuestion.answer}`; }

  filterWrap?.addEventListener('click', (e) => { const b = e.target.closest('.quiz-filter-chip'); if (!b) return; const ft = b.dataset.ft; const v = b.dataset.v; const set = ft === 'type' ? selectedTypes : selectedContents; if (set.has(v)) set.delete(v); else set.add(v); if (!selectedTypes.size) selectedTypes = new Set(QUESTION_TYPES); renderFilterBar(); renderQuestion(); });
  optionsWrap?.addEventListener('click', (e) => { const b = e.target.closest('.quiz-option'); if (b) handleAnswer(b.dataset.option || ''); });
  fillForm?.addEventListener('submit', (e) => { e.preventDefault(); handleAnswer(fillInput.value); });
  nextButton?.addEventListener('click', renderQuestion);

  (window.cacheReadyPromise || Promise.resolve()).then(() => window.loadAllRecords()).then((records) => { questionBank = buildQuestions(records); renderFilterBar(); renderQuestion(); });
})();
