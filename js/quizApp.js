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

  function blankHtml(answer, revealed = false) {
    const width = Math.max(2, Array.from(String(answer || '')).length);
    return `<span class="quiz-answer-blank${revealed ? ' is-revealed' : ''}" style="--blank-chars:${width}">${revealed ? escapeHtml(answer) : ''}</span>`;
  }

  function renderRecordWithBlank(recordText, answer, revealed = false) {
    const escapedRecord = escapeHtml(recordText);
    const escapedAnswer = escapeHtml(answer);
    if (escapedRecord.includes(escapedAnswer)) {
      return escapedRecord.replace(escapedAnswer, blankHtml(answer, revealed));
    }
    return `${escapedRecord}<span class="quiz-record-answer-line">???${blankHtml(answer, revealed)}</span>`;
  }

  function renderJudgeRecord(question, revealed = false) {
    const escapedRecord = escapeHtml(question.recordText || '');
    if (!revealed || question.answer === '\u6b63\u786e' || !question.wrongText) return escapedRecord;
    return escapedRecord.replace(escapeHtml(question.wrongText), `<span class="quiz-judge-correction"><span class="quiz-judge-wrong">${escapeHtml(question.wrongText)}</span><span class="quiz-judge-answer">${escapeHtml(question.correctText)}</span></span>`);
  }

  function renderQuestionBody(revealed = false) {
    if (!currentQuestion) return;
    let recordHtml = escapeHtml(currentQuestion.recordText || currentQuestion.maskedText || '');
    if (currentQuestion.type === 'choice' || currentQuestion.type === 'fill') {
      recordHtml = renderRecordWithBlank(currentQuestion.recordText || currentQuestion.maskedText || '', currentQuestion.answer, revealed);
    } else if (currentQuestion.type === 'judge') {
      recordHtml = renderJudgeRecord(currentQuestion, revealed);
    }
    questionText.innerHTML = `
      <span class="quiz-question-prompt">${escapeHtml(currentQuestion.prompt)}</span>
      <span class="quiz-question-record">${formatContent(recordHtml)}</span>
    `;
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
    if (!text.includes(answerRef.label)) return null;

    return {
      id: record.id,
      type: '',
      content: kind,
      answer: answerRef.label,
      answerId: answerRef.id,
      recordText: text,
      prompt: kind === 'person' ? '\u8bf7\u6839\u636e\u8bb0\u5f55\u5185\u5bb9\u9009\u62e9\u88ab\u6316\u7a7a\u7684\u4eba\u540d\u3002' : '\u8bf7\u6839\u636e\u8bb0\u5f55\u5185\u5bb9\u9009\u62e9\u88ab\u6316\u7a7a\u7684\u672f\u8bed\u3002'
    };
  }

  function getPersonChoiceOptions(base, pools) {
    const answerLabels = shuffle((pools.personLabels.get(base.answerId) || []).filter((item) => item !== base.answer));
    const otherPeople = shuffle([...pools.personLabels.entries()]
      .filter(([id, labels]) => id !== base.answerId && labels.length)
      .map(([id, labels]) => ({ id, labels: shuffle(labels) })));
    const forms = [];

    if (answerLabels.length >= 3) {
      forms.push([base.answer, ...answerLabels.slice(0, 3)]);
    }
    const twoLabelPerson = otherPeople.find((person) => person.labels.length >= 2);
    if (answerLabels.length >= 1 && twoLabelPerson) {
      forms.push([base.answer, answerLabels[0], ...twoLabelPerson.labels.slice(0, 2)]);
    }
    if (otherPeople.length >= 3) {
      forms.push([base.answer, ...otherPeople.slice(0, 3).map((person) => person.labels[0])]);
    }

    const options = pickRandom(shuffle(forms).filter((form) => uniqueValues(form).length === 4));
    return options ? shuffle(options) : null;
  }

  function buildChoiceQuestion(record, kind, pools) {
    const base = getQuestionBase(record, kind);
    if (!base) return null;

    const options = kind === 'person'
      ? getPersonChoiceOptions(base, pools)
      : shuffle(uniqueValues([
        base.answer,
        ...shuffle(pools.termOptions.filter((item) => item !== base.answer && !base.recordText.includes(item))).slice(0, 3)
      ]));
    if (!options || options.length < 4) return null;

    return {
      ...base,
      type: 'choice',
      reward: CHOICE_REWARD,
      prompt: kind === 'person' ? '\u8bf7\u6839\u636e\u8bb0\u5f55\u5185\u5bb9\u9009\u62e9\u88ab\u6316\u7a7a\u7684\u4eba\u540d\u3002' : '\u8bf7\u6839\u636e\u8bb0\u5f55\u5185\u5bb9\u9009\u62e9\u88ab\u6316\u7a7a\u7684\u672f\u8bed\u3002',
      options: shuffle(options.slice(0, 4))
    };
  }

  function buildFillQuestion(record, kind) {
    const base = getQuestionBase(record, kind);
    if (!base) return null;

    return {
      ...base,
      type: 'fill',
      reward: FILL_REWARD,
      prompt: kind === 'person' ? '\u8bf7\u586b\u5199\u8bb0\u5f55\u4e2d\u88ab\u6316\u7a7a\u7684\u4eba\u540d\u3002' : '\u8bf7\u586b\u5199\u8bb0\u5f55\u4e2d\u88ab\u6316\u7a7a\u7684\u672f\u8bed\u3002',
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
        answer: '\u6b63\u786e',
        prompt: '\u8bf7\u5224\u65ad\u4e0b\u65b9\u8bb0\u5f55\u5185\u5bb9\u662f\u5426\u6b63\u786e\u3002',
        recordText: text,
        reward: JUDGE_REWARD,
        options: ['\u6b63\u786e', '\u9519\u8bef']
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
      answer: '\u9519\u8bef',
      prompt: '\u8bf7\u5224\u65ad\u4e0b\u65b9\u8bb0\u5f55\u5185\u5bb9\u662f\u5426\u6b63\u786e\u3002',
      recordText: text.replace(target.label, replacement),
      wrongText: replacement,
      correctText: target.label,
      reward: JUDGE_REWARD,
      options: ['\u6b63\u786e', '\u9519\u8bef']
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
      prompt: '\u8fd9\u6761\u8bb0\u5f55\u7684\u8bb0\u5f55\u4eba\u662f\u8c01\uff1f',
      recordText: buildStemText(record).trim(),
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
      prompt: '\u8bf7\u586b\u5199\u8fd9\u6761\u8bb0\u5f55\u7684\u8bb0\u5f55\u4eba\u59d3\u540d\u62fc\u97f3\u9996\u5b57\u6bcd\u3002',
      recordText: buildStemText(record).trim(),
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
      answer: shouldBeCorrect ? '\u6b63\u786e' : '\u9519\u8bef',
      prompt: '\u8bf7\u5224\u65ad\u4e0b\u65b9\u8bb0\u5f55\u4eba\u4e0e\u8bb0\u5f55\u5185\u5bb9\u662f\u5426\u5339\u914d\u3002',
      recordText: `${buildStemText(record).trim()}\n\n\u8bb0\u5f55\u4eba\uff1a${shownAuthor}`,
      wrongText: shownAuthor,
      correctText: record.author,
      reward: JUDGE_REWARD,
      options: ['\u6b63\u786e', '\u9519\u8bef']
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
      prompt: '\u8fd9\u6761\u8bb0\u5f55\u53d1\u751f\u5728\u4ec0\u4e48\u65f6\u95f4\uff1f',
      recordText: buildStemText(record).trim(),
      reward: CHOICE_REWARD,
      options: shuffle([record.date, ...distractors])
    };
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `quiz-feedback is-${type}`;
  }

  function hasQuestionFor(types, contents) {
    return allQuestions.some((question) => types.has(question.type) && contents.has(question.content));
  }


  function pruneFilters() {
    let changed = true;
    while (changed) {
      changed = false;
      const nextTypes = new Set([...activeFilters.types].filter((type) => allQuestions.some((question) => question.type === type && activeFilters.contents.has(question.content))));
      if (nextTypes.size && nextTypes.size !== activeFilters.types.size) {
        activeFilters.types = nextTypes;
        changed = true;
      }
      const nextContents = new Set([...activeFilters.contents].filter((content) => allQuestions.some((question) => activeFilters.types.has(question.type) && question.content === content)));
      if (nextContents.size && nextContents.size !== activeFilters.contents.size) {
        activeFilters.contents = nextContents;
        changed = true;
      }
    }
  }

  function updateQuestionBank() {
    pruneFilters();
    if (!hasQuestionFor(activeFilters.types, activeFilters.contents)) {
      const firstQuestion = allQuestions[0];
      if (firstQuestion) {
        activeFilters.types = new Set([firstQuestion.type]);
        activeFilters.contents = new Set([firstQuestion.content]);
      }
    }
    questionBank = allQuestions.filter((question) => activeFilters.types.has(question.type) && activeFilters.contents.has(question.content));
    renderFilter();
  }

  function renderFilter() {
    if (!filterWrap) return;
    const buildButton = (group, value, label) => {
      const currentSet = activeFilters[group];
      const nextSet = new Set(currentSet);
      if (nextSet.has(value)) nextSet.delete(value);
      else nextSet.add(value);
      const nextTypes = group === 'types' ? nextSet : activeFilters.types;
      const nextContents = group === 'contents' ? nextSet : activeFilters.contents;
      const disabled = !nextSet.size || !hasQuestionFor(nextTypes, nextContents);
      return `
        <button type="button" class="btn-action filter-option${currentSet.has(value) ? ' is-active' : ''}" data-group="${group}" data-value="${value}"${disabled ? ' disabled' : ''}>
          <span class="quiz-filter-check">${currentSet.has(value) ? '\u2713' : '+'}</span>${label}
        </button>
      `;
    };

    filterWrap.innerHTML = `
      <div class="filter-field quiz-filter-field">
        <label>\u9898\u578b\uff08\u53ef\u591a\u9009\uff09</label>
        <div class="quiz-filter-options">
          ${Object.entries(typeLabels).map(([value, label]) => buildButton('types', value, label)).join('')}
        </div>
      </div>
      <div class="filter-field quiz-filter-field">
        <label>\u5185\u5bb9\uff08\u53ef\u591a\u9009\uff09</label>
        <div class="quiz-filter-options">
          ${Object.entries(contentLabels).map(([value, label]) => buildButton('contents', value, label)).join('')}
        </div>
      </div>
      <div class="filter-actions">
        <button type="button" class="btn-action quiz-filter-all">\u5168\u9009\u53ef\u7528</button>
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
    renderQuestionBody(false);
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

    renderQuestionBody(true);
    if (isCorrect) {
      window.GameState.addCoins(currentQuestion.reward, 'quiz-reward');
      setFeedback(`\u2713 \u56de\u7b54\u6b63\u786e\uff0c\u83b7\u5f97 ${currentQuestion.reward} Q\u5e01\u3002`, 'success');
    } else {
      setFeedback(`\u2715 \u56de\u7b54\u9519\u8bef\uff0c\u6b63\u786e\u7b54\u6848\u662f ${currentQuestion.answer}\u3002`, 'error');
    }
  }

  filterWrap?.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-option');
    const allButton = event.target.closest('.quiz-filter-all');
    if (allButton) {
      activeFilters = {
        types: new Set(Object.keys(typeLabels).filter((type) => allQuestions.some((question) => question.type === type))),
        contents: new Set(Object.keys(contentLabels).filter((content) => allQuestions.some((question) => question.content === content)))
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
