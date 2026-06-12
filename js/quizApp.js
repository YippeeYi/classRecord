(() => {
  const CHOICE_REWARD = 100;
  const FILL_REWARD = 500;
  const JUDGE_REWARD = 100;
  const questionText = document.getElementById('quiz-question-text');
  const questionMeta = document.getElementById('quiz-question-meta');
  const optionsWrap = document.getElementById('quiz-options');
  const fillForm = document.getElementById('quiz-fill-form');
  const fillInput = document.getElementById('quiz-fill-input');
  const feedback = document.getElementById('quiz-feedback');
  const nextButton = document.getElementById('quiz-next-btn');
  const filterWrap = document.getElementById('quiz-filter');

  const typeLabels = { choice: '选择题', fill: '填空题', judge: '判断题' };
  const contentLabels = { person: '人名', term: '术语', author: '记录人', date: '记录时间' };
  const contentByType = {
    choice: ['person', 'term', 'author', 'date'],
    fill: ['person', 'term', 'author'],
    judge: ['person', 'term', 'author']
  };

  let allQuestions = [];
  let questionBank = [];
  let currentQuestion = null;
  let answeredCurrent = false;
  let activeFilters = {
    types: new Set(Object.keys(typeLabels)),
    contents: new Set(Object.keys(contentLabels))
  };

  function shuffle(list) {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeAnswer(text) {
    return stripOptionMarkup(text).toLowerCase();
  }

  function stripOptionMarkup(text) {
    return window.stripRecordMarkup(text || '')
      .replace(/\^(.+?)\^/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildStemText(record) {
    return String(record.content || '')
      .replace(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g, '$2')
      .replace(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g, '$2')
      .replace(/\(\((.+?)\)\)/g, '$1');
  }

  function extractTokenRefs(text, kind) {
    const pattern = kind === 'person'
      ? /\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g
      : /\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g;
    const refs = [];
    let match = pattern.exec(text || '');
    while (match) {
      const label = stripOptionMarkup(match[2]);
      if (match[1] && label) refs.push({ id: match[1], label });
      match = pattern.exec(text || '');
    }
    return refs;
  }

  function uniqueValues(list) {
    return [...new Set(list.filter(Boolean))];
  }

  function buildLabelMap(records, people) {
    const map = new Map();
    const add = (id, label) => {
      if (!id || !label) return;
      const values = map.get(id) || [];
      if (!values.includes(label)) values.push(label);
      map.set(id, values);
    };

    people.forEach((person) => {
      add(person.id, person.id);
      extractTokenRefs(`[[${person.id}|${person.alias || ''}]]`, 'person').forEach((ref) => add(person.id, ref.label));
    });
    records.forEach((record) => {
      extractTokenRefs(record.content || '', 'person').forEach((ref) => add(ref.id, ref.label));
    });
    return map;
  }

  function getQuestionBase(record, kind) {
    const text = buildStemText(record).trim();
    if (!text) return null;

    const tokens = extractTokenRefs(record.content || '', kind)
      .filter((ref) => ref.label && text.includes(ref.label));
    if (!tokens.length) return null;

    const answerRef = pickRandom(tokens);
    const maskedText = text.replace(answerRef.label, '________________________');
    if (maskedText === text) return null;

    return {
      id: record.id,
      type: '',
      content: kind,
      answer: answerRef.label,
      answerId: answerRef.id,
      maskedText
    };
  }

  function buildChoiceQuestion(record, kind, pools) {
    const base = getQuestionBase(record, kind);
    if (!base) return null;

    const samePersonLabels = kind === 'person'
      ? shuffle((pools.personLabels.get(base.answerId) || []).filter((item) => item !== base.answer && !base.maskedText.includes(item)))
      : [];
    const generalPool = kind === 'person' ? pools.personOptions : pools.termOptions;
    const distractors = uniqueValues([
      ...samePersonLabels,
      ...shuffle(generalPool.filter((item) => item !== base.answer && !base.maskedText.includes(item)))
    ]).slice(0, 3);
    if (distractors.length < 3) return null;

    return {
      ...base,
      type: 'choice',
      reward: CHOICE_REWARD,
      options: shuffle([base.answer, ...distractors])
    };
  }

  function buildFillQuestion(record, kind) {
    const base = getQuestionBase(record, kind);
    if (!base) return null;

    return {
      ...base,
      type: 'fill',
      reward: FILL_REWARD,
      options: []
    };
  }

  function buildJudgeQuestion(record, kind, pools) {
    const refs = extractTokenRefs(record.content || '', kind);
    const availableRefs = refs.filter((ref) => ref.label);
    if (!availableRefs.length) return null;

    const shouldBeCorrect = Math.random() >= 0.5;
    const text = buildStemText(record).trim();
    if (!text) return null;

    if (shouldBeCorrect) {
      return {
        id: record.id,
        type: 'judge',
        content: kind,
        answer: '正确',
        maskedText: text,
        reward: JUDGE_REWARD,
        options: ['正确', '错误']
      };
    }

    const target = pickRandom(availableRefs);
    const sameLabels = kind === 'person'
      ? shuffle((pools.personLabels.get(target.id) || []).filter((item) => item !== target.label))
      : [];
    const generalPool = kind === 'person' ? pools.personOptions : pools.termOptions;
    const replacement = pickRandom(uniqueValues([
      ...sameLabels,
      ...shuffle(generalPool.filter((item) => item !== target.label))
    ]));
    if (!replacement) return null;

    return {
      id: record.id,
      type: 'judge',
      content: kind,
      answer: '错误',
      maskedText: text.replace(target.label, replacement),
      reward: JUDGE_REWARD,
      options: ['正确', '错误']
    };
  }

  function buildAuthorChoiceQuestion(record, authorPool) {
    if (!record.author || !record.content) return null;
    const distractors = shuffle(authorPool.filter((author) => author !== record.author)).slice(0, 3);
    if (distractors.length < 3) return null;

    return {
      id: record.id,
      type: 'choice',
      content: 'author',
      answer: record.author,
      maskedText: `${buildStemText(record).trim()}\n\n这条记录的记录人是谁？`,
      reward: CHOICE_REWARD,
      options: shuffle([record.author, ...distractors])
    };
  }

  function buildAuthorFillQuestion(record) {
    if (!record.author || !record.content) return null;
    return {
      id: record.id,
      type: 'fill',
      content: 'author',
      answer: String(record.author).toLowerCase(),
      maskedText: `${buildStemText(record).trim()}\n\n请填写记录人姓名拼音首字母。`,
      reward: FILL_REWARD,
      options: []
    };
  }

  function buildAuthorJudgeQuestion(record, authorPool) {
    if (!record.author || !record.content) return null;
    const shouldBeCorrect = Math.random() >= 0.5;
    const wrongAuthor = pickRandom(authorPool.filter((author) => author !== record.author));
    if (!shouldBeCorrect && !wrongAuthor) return null;
    const shownAuthor = shouldBeCorrect ? record.author : wrongAuthor;

    return {
      id: record.id,
      type: 'judge',
      content: 'author',
      answer: shouldBeCorrect ? '正确' : '错误',
      maskedText: `${buildStemText(record).trim()}\n\n这条记录的记录人是 ${shownAuthor}。`,
      reward: JUDGE_REWARD,
      options: ['正确', '错误']
    };
  }

  function dayNumber(date) {
    const time = new Date(`${date}T00:00:00`).getTime();
    return Number.isFinite(time) ? Math.floor(time / 86400000) : 0;
  }

  function buildDateChoiceQuestion(record, datePool) {
    if (!record.date || !record.content) return null;
    const sortedDistractors = datePool
      .filter((date) => date !== record.date)
      .map((date) => ({ date, distance: Math.abs(dayNumber(date) - dayNumber(record.date)) }))
      .sort((a, b) => b.distance - a.distance)
      .map((item) => item.date);
    const distractors = shuffle(sortedDistractors.slice(0, Math.max(8, 3))).slice(0, 3);
    if (distractors.length < 3) return null;

    return {
      id: record.id,
      type: 'choice',
      content: 'date',
      answer: record.date,
      maskedText: `${buildStemText(record).trim()}\n\n这条记录发生在什么时间？`,
      reward: CHOICE_REWARD,
      options: shuffle([record.date, ...distractors])
    };
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `quiz-feedback is-${type}`;
  }

  function updateQuestionBank() {
    const allowedContents = new Set();
    activeFilters.types.forEach((type) => {
      contentByType[type].forEach((content) => allowedContents.add(content));
    });
    [...activeFilters.contents].forEach((content) => {
      if (!allowedContents.has(content)) activeFilters.contents.delete(content);
    });

    questionBank = allQuestions.filter((question) => activeFilters.types.has(question.type) && activeFilters.contents.has(question.content));
    renderFilter();
  }

  function renderFilter() {
    if (!filterWrap) return;
    const availableContents = new Set();
    activeFilters.types.forEach((type) => contentByType[type].forEach((content) => availableContents.add(content)));
    const buildButton = (group, value, label, disabled = false) => `
      <button type="button" class="btn-action filter-option${activeFilters[group].has(value) ? ' is-active' : ''}" data-group="${group}" data-value="${value}"${disabled ? ' disabled' : ''}>${label}</button>
    `;

    filterWrap.innerHTML = `
      <div class="filter-field quiz-filter-field">
        <label>题型</label>
        <div class="quiz-filter-options">
          ${Object.entries(typeLabels).map(([value, label]) => buildButton('types', value, label)).join('')}
        </div>
      </div>
      <div class="filter-field quiz-filter-field">
        <label>内容</label>
        <div class="quiz-filter-options">
          ${Object.entries(contentLabels).map(([value, label]) => buildButton('contents', value, label, !availableContents.has(value))).join('')}
        </div>
      </div>
      <div class="filter-actions">
        <button type="button" class="btn-action quiz-filter-all">全选</button>
      </div>
    `;
  }

  function renderQuestion() {
    updateQuestionBank();
    if (!questionBank.length) {
      questionText.textContent = '当前筛选条件下没有足够的条目可生成题目。';
      questionMeta.textContent = '请调整题型或题目内容筛选。';
      optionsWrap.innerHTML = '';
      optionsWrap.hidden = true;
      if (fillForm) fillForm.hidden = true;
      nextButton.disabled = true;
      return;
    }

    currentQuestion = pickRandom(questionBank);
    answeredCurrent = false;
    feedback.textContent = '';
    feedback.className = 'quiz-feedback';
    nextButton.disabled = false;
    questionText.innerHTML = formatContent(currentQuestion.maskedText);
    questionMeta.textContent = `条目 ${currentQuestion.id} · ${typeLabels[currentQuestion.type]} · ${contentLabels[currentQuestion.content]} · 答对奖励 ${currentQuestion.reward} Q币`;

    const isFill = currentQuestion.type === 'fill';
    optionsWrap.hidden = isFill;
    if (fillForm) fillForm.hidden = !isFill;

    if (isFill) {
      optionsWrap.innerHTML = '';
      if (fillInput) {
        fillInput.value = '';
        fillInput.disabled = false;
        fillInput.focus();
      }
      return;
    }

    optionsWrap.innerHTML = currentQuestion.options.map((option, index) => `
            <button class="quiz-option" type="button" data-option="${escapeHtml(option)}">
                <span class="quiz-option-label">${currentQuestion.type === 'judge' ? (index === 0 ? '✓' : '×') : String.fromCharCode(65 + index)}</span>
                <span>${escapeHtml(option)}</span>
            </button>
        `).join('');
  }

  function handleAnswer(option) {
    if (!currentQuestion || answeredCurrent) return;
    answeredCurrent = true;
    const isCorrect = currentQuestion.type === 'fill'
      ? normalizeAnswer(option) === normalizeAnswer(currentQuestion.answer)
      : option === currentQuestion.answer;
    window.GameState.recordQuizResult(isCorrect);

    if (currentQuestion.type === 'fill') {
      if (fillInput) fillInput.disabled = true;
    } else {
      optionsWrap.querySelectorAll('.quiz-option').forEach((button) => {
        const value = button.dataset.option || '';
        button.disabled = true;
        if (value === currentQuestion.answer) {
          button.classList.add('is-correct');
        } else if (value === option) {
          button.classList.add('is-wrong');
        }
      });
    }

    if (isCorrect) {
      window.GameState.addCoins(currentQuestion.reward, 'quiz-reward');
      setFeedback(`回答正确，获得 ${currentQuestion.reward} Q币。`, 'success');
    } else {
      setFeedback(`回答错误，正确答案是 ${currentQuestion.answer}。`, 'error');
    }
  }

  filterWrap?.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-option');
    const allButton = event.target.closest('.quiz-filter-all');
    if (allButton) {
      activeFilters = {
        types: new Set(Object.keys(typeLabels)),
        contents: new Set(Object.keys(contentLabels))
      };
      renderQuestion();
      return;
    }
    if (!button || button.disabled) return;

    const group = button.dataset.group;
    const value = button.dataset.value;
    const values = activeFilters[group];
    if (values.has(value)) {
      if (values.size > 1) values.delete(value);
    } else {
      values.add(value);
    }
    renderQuestion();
  });

  optionsWrap?.addEventListener('click', (event) => {
    const button = event.target.closest('.quiz-option');
    if (button) handleAnswer(button.dataset.option || '');
  });

  fillForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!fillInput) return;
    handleAnswer(fillInput.value);
  });

  nextButton?.addEventListener('click', renderQuestion);

  (window.cacheReadyPromise || Promise.resolve())
    .then(() => Promise.all([window.loadAllRecords(), window.loadAllPeople(), window.loadAllGlossary()]))
    .then(([records, people, glossary]) => {
      const pools = {
        personLabels: buildLabelMap(records, people),
        personOptions: [],
        termOptions: uniqueValues(glossary.flatMap((term) => [stripOptionMarkup(term.term), term.id]))
      };
      pools.personOptions = uniqueValues([...pools.personLabels.values()].flat());
      pools.termOptions = uniqueValues([
        ...pools.termOptions,
        ...records.flatMap((record) => extractTokenRefs(record.content || '', 'term').map((ref) => ref.label))
      ]);

      const authorPool = uniqueValues(records.map((record) => record.author));
      const datePool = uniqueValues(records.map((record) => record.date));
      const questions = [];
      records.forEach((record) => {
        questions.push(buildChoiceQuestion(record, 'person', pools));
        questions.push(buildChoiceQuestion(record, 'term', pools));
        questions.push(buildFillQuestion(record, 'person'));
        questions.push(buildFillQuestion(record, 'term'));
        questions.push(buildJudgeQuestion(record, 'person', pools));
        questions.push(buildJudgeQuestion(record, 'term', pools));
        questions.push(buildAuthorChoiceQuestion(record, authorPool));
        questions.push(buildAuthorFillQuestion(record));
        questions.push(buildAuthorJudgeQuestion(record, authorPool));
        questions.push(buildDateChoiceQuestion(record, datePool));
      });

      allQuestions = shuffle(questions.filter(Boolean));
      renderQuestion();
    });
})();