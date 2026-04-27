(() => {
    const QUESTION_REWARD = 100;
    const questionText = document.getElementById('quiz-question-text');
    const questionMeta = document.getElementById('quiz-question-meta');
    const optionsWrap = document.getElementById('quiz-options');
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

    function buildQuestion(record, answerPool) {
        const text = buildStemText(record).trim();
        if (!text) return null;

        const tokens = extractLabeledTokens(record.content || '')
            .map((label) => stripOptionMarkup(label))
            .filter((label) => label && text.includes(label));
        if (!tokens.length) return null;

        const answer = pickRandom(tokens);
        const maskedText = text.replace(answer, '____________');
        if (maskedText === text) return null;

        const distractors = shuffle(answerPool.filter((item) => item !== answer && !maskedText.includes(item))).slice(0, 3);
        if (distractors.length < 3) return null;

        return {
            id: record.id,
            date: record.date,
            answer,
            maskedText,
            options: shuffle([answer, ...distractors])
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
            nextButton.disabled = true;
            return;
        }

        currentQuestion = pickRandom(questionBank);
        answeredCurrent = false;
        feedback.textContent = '';
        feedback.className = 'quiz-feedback';
        nextButton.disabled = false;
        questionText.innerHTML = formatContent(currentQuestion.maskedText);
        questionMeta.textContent = `Record ${currentQuestion.id} · ${currentQuestion.date} · Reward ${QUESTION_REWARD} Q`;

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

        optionsWrap.querySelectorAll('.quiz-option').forEach((button) => {
            const value = button.dataset.option || '';
            button.disabled = true;
            if (value === currentQuestion.answer) {
                button.classList.add('is-correct');
            } else if (value === option) {
                button.classList.add('is-wrong');
            }
        });

        if (isCorrect) {
            window.GameState.addCoins(QUESTION_REWARD, 'quiz-reward');
            setFeedback(`Correct. +${QUESTION_REWARD} Q`, 'success');
        } else {
            setFeedback(`Wrong. Answer: ${currentQuestion.answer}`, 'error');
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
            const answerPool = [...new Set(
                records.flatMap((record) => extractLabeledTokens(record.content || '').map((label) => stripOptionMarkup(label)))
            )].filter(Boolean);
            questionBank = records.map((record) => buildQuestion(record, answerPool)).filter(Boolean);
            renderQuestion();
        });
})();
