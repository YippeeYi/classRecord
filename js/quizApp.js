(() => {
  const CHOICE_REWARD = 100;
  const FILL_REWARD = 500;
  const questionText = document.getElementById('quiz-question-text');
  const questionMeta = document.getElementById('quiz-question-meta');
  const optionsWrap = document.getElementById('quiz-options');
  const fillForm = document.getElementById('quiz-fill-form');
  const fillInput = document.getElementById('quiz-fill-input');
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

  function extractLabeledTokens(text) {
    const tokens = [];
    const patterns = [
      /\[\[([a-zA-Z0-9_-]+)\|(.+?)\]\]/g,
      /\{\{([a-zA-Z0-9_-]+)\|(.+?)\}\}/g
    ];

    patterns.forEach((pattern) => {
      let match = pattern.exec(text);
      while (match) {
        if (match[2]) tokens.push(match[2].trim());
        match = pattern.exec(text);
      }
    });

    return [...new Set(tokens.filter(Boolean))];
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

    const tokens = extractLabeledTokens(record.content || '')
      .map((label) => stripOptionMarkup(label))
      .filter((label) => label && text.includes(label));
    if (!tokens.length) return null;

    const answer = pickRandom(tokens);
    const maskedText = text.replace(answer, '________________________');
    if (maskedText === text) return null;

    return {
      id: record.id,
      date: record.date,
      answer,
      maskedText
    };
  }

  function buildChoiceQuestion(record, answerPool) {
    const base = getQuestionBase(record);
    if (!base) return null;

    const distractors = shuffle(answerPool.filter((item) => item !== base.answer && !base.maskedText.includes(item))).slice(0, 3);
    if (distractors.length < 3) return null;

    return {
      ...base,
      type: 'choice',
      reward: CHOICE_REWARD,
      options: shuffle([base.answer, ...distractors])
    };
  }

  function buildFillQuestion(record) {
    const base = getQuestionBase(record);
    if (!base) return null;

    return {
      ...base,
      type: 'fill',
      reward: FILL_REWARD,
      options: []
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
    questionMeta.textContent = `条目 ${currentQuestion.id} · ${currentQuestion.date} · ${currentQuestion.type === 'fill' ? '填空题' : '选择题'} · 答对奖励 ${currentQuestion.reward} Q币`;

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
                <span class="quiz-option-label">${String.fromCharCode(65 + index)}</span>
                <span>${escapeHtml(option)}</span>
            </button>
        `).join('');
  }

  function handleAnswer(option) {
    if (!currentQuestion || answeredCurrent) return;
    answeredCurrent = true;
    const isCorrect = option === currentQuestion.answer;
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
    .then(() => window.loadAllRecords())
    .then((records) => {
      const answerPool = [...new Set(
        records.flatMap((record) => extractLabeledTokens(record.content || '').map((label) => stripOptionMarkup(label)))
      )].filter(Boolean);
      const choiceQuestions = records.map((record) => buildChoiceQuestion(record, answerPool)).filter(Boolean);
      const fillQuestions = records.map((record) => buildFillQuestion(record)).filter(Boolean);
      questionBank = shuffle([...choiceQuestions, ...fillQuestions]);
      renderQuestion();
    });
})();
