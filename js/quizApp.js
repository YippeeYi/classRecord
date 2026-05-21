(() => {
  const CHOICE_REWARD = 100;
  const questionText = document.getElementById('quiz-question-text');
  const questionMeta = document.getElementById('quiz-question-meta');
  const optionsWrap = document.getElementById('quiz-options');
  const filterBar = document.getElementById('quiz-filter-bar');
  const feedback = document.getElementById('quiz-feedback');
  const nextButton = document.getElementById('quiz-next-btn');

  let questionBank = [];
  let currentQuestion = null;
  let answeredCurrent = false;

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

  function extractTokensByType(text) {
    const personTokens = [...String(text || '').matchAll(/\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g)].map((m) => m[2]?.trim()).filter(Boolean);
    const termTokens = [...String(text || '').matchAll(/\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g)].map((m) => m[2]?.trim()).filter(Boolean);
    return { personTokens: [...new Set(personTokens)], termTokens: [...new Set(termTokens)] };
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

  function getQuestionBase(record) {
    const text = buildStemText(record).trim();
    if (!text) return null;

    const { personTokens, termTokens } = extractTokensByType(record.content || '');
    const tokens = [...personTokens, ...termTokens].map((label) => stripOptionMarkup(label)).filter((label) => label && text.includes(label));
    if (!tokens.length) return null;

    const answer = pickRandom(tokens);
    const maskedText = text.replace(answer, '________________________');
    if (maskedText === text) return null;

    return {
      id: record.id,
      date: record.date,
      time: record.time || '',
      author: record.author || '',
      answer,
      maskedText,
      contentType: personTokens.includes(answer) ? 'name' : 'term'
    };
  }

  function buildChoiceQuestion(record, answerPool, personPool) {
    const base = getQuestionBase(record);
    if (!base) return null;

    const sourcePool = base.contentType === 'name' ? personPool : answerPool;
    const distractors = shuffle(sourcePool.filter((item) => item !== base.answer && !base.maskedText.includes(item))).slice(0, 3);
    if (distractors.length < 3) return null;

    return {
      ...base,
      type: 'choice',
      reward: CHOICE_REWARD,
      category: base.contentType,
      options: shuffle([base.answer, ...distractors])
    };
  }

  function buildTrueFalseQuestion(record, personPool) {
    const base = getQuestionBase(record);
    if (!base || !personPool.length) return null;
    const shouldBeFalse = Math.random() < 0.5 && base.contentType === 'name';
    const replacement = shouldBeFalse ? pickRandom(personPool.filter((item) => item !== base.answer)) : '';
    const shownText = shouldBeFalse ? base.maskedText.replace('________________________', replacement) : buildStemText(record);
    return {
      ...base,
      type: 'tf',
      category: base.contentType,
      shownText,
      isStatementTrue: !shouldBeFalse,
      reward: CHOICE_REWARD,
      options: ['正确', '错误']
    };
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `quiz-feedback is-${type}`;
  }

  function renderQuestion() {
    if (!questionBank.length) {
      questionText.textContent = 'No question can be generated yet.';
      questionMeta.textContent = 'Add more tagged records first.';
      optionsWrap.innerHTML = '';
      optionsWrap.hidden = true;
      nextButton.disabled = true;
      return;
    }

    currentQuestion = pickRandom(questionBank);
    answeredCurrent = false;
    feedback.textContent = '';
    feedback.className = 'quiz-feedback';
    nextButton.disabled = false;
    questionText.innerHTML = formatContent(currentQuestion.type === 'tf' ? currentQuestion.shownText : currentQuestion.maskedText);
    const typeText = currentQuestion.type === 'tf' ? '判断题' : '选择题';
    questionMeta.textContent = `条目 ${currentQuestion.id} · ${currentQuestion.time || '无时间'} · ${typeText} · 答对奖励 ${currentQuestion.reward} Q币`;
    optionsWrap.hidden = false;

    optionsWrap.innerHTML = currentQuestion.options.map((option, index) => `
            <button class="quiz-option" type="button" data-option="${escapeHtml(option)}">
                <span class="quiz-option-label">${String.fromCharCode(65 + index)}</span>
                <span>${escapeHtml(option)}</span>
            </button>
        `).join('');
  }

  function handleAnswer(option) {
    if (!currentQuestion || answeredCurrent) return;
    answeredCurrent = true;
    const correctedAnswer = currentQuestion.type === 'tf' ? (currentQuestion.isStatementTrue ? '正确' : '错误') : currentQuestion.answer;
    const isCorrect = option === correctedAnswer;
    window.GameState.recordQuizResult(isCorrect);
    optionsWrap.querySelectorAll('.quiz-option').forEach((button) => {
      const value = button.dataset.option || '';
      button.disabled = true;
      if (value === correctedAnswer) button.classList.add('is-correct');
      else if (value === option) button.classList.add('is-wrong');
    });

    if (isCorrect) {
      window.GameState.addCoins(currentQuestion.reward, 'quiz-reward');
      setFeedback(`回答正确，获得 ${currentQuestion.reward} Q币。`, 'success');
    } else {
      setFeedback(`回答错误，正确答案是 ${correctedAnswer}。`, 'error');
    }
  }

  optionsWrap?.addEventListener('click', (event) => {
    const button = event.target.closest('.quiz-option');
    if (button) handleAnswer(button.dataset.option || '');
  });

  nextButton?.addEventListener('click', renderQuestion);

  (window.cacheReadyPromise || Promise.resolve())
    .then(() => window.loadAllRecords())
    .then((records) => {
      const answerPool = [...new Set(records.flatMap((record) => {
        const { personTokens, termTokens } = extractTokensByType(record.content || '');
        return [...personTokens, ...termTokens].map((label) => stripOptionMarkup(label));
      }))].filter(Boolean);
      const personPool = [...new Set(records.flatMap((record) => extractTokensByType(record.content || '').personTokens.map((label) => stripOptionMarkup(label))))].filter(Boolean);
      const choiceQuestions = records.map((record) => buildChoiceQuestion(record, answerPool, personPool)).filter(Boolean);
      const tfQuestions = records.map((record) => buildTrueFalseQuestion(record, personPool)).filter(Boolean);
      questionBank = shuffle([...choiceQuestions, ...tfQuestions]);
      if (filterBar) {
        filterBar.innerHTML = `<label>题型 <select id="quiz-type-filter"><option value="">全部</option><option value="choice">选择题</option><option value="tf">判断题</option></select></label>
        <label>内容 <select id="quiz-content-filter"><option value="">全部</option><option value="name">人物名称</option><option value="term">术语</option><option value="author">记录者</option><option value="time">记录时间</option></select></label>`;
        const typeEl = document.getElementById('quiz-type-filter');
        const contentEl = document.getElementById('quiz-content-filter');
        const apply = () => {
          const t = typeEl?.value || '';
          const c = contentEl?.value || '';
          const filtered = [...choiceQuestions, ...tfQuestions].filter((q) => (!t || q.type === t) && (!c || q.category === c || (c === 'author' && q.author) || (c === 'time' && q.time)));
          questionBank = shuffle(filtered);
          renderQuestion();
        };
        typeEl?.addEventListener('change', apply);
        contentEl?.addEventListener('change', apply);
      }
      renderQuestion();
    });
})();
