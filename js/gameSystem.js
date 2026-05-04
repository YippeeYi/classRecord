(() => {
    const STORAGE_KEY = 'classRecord:gameState';
    const DEFAULT_STATE = {
        balance: 0,
        unlockedRecordIds: [],
        quiz: { answered: 0, correct: 0 },
        gacha: { pity4: 0, pity5: 0, totalPulls: 0, history: [], collection: {} }
    };

    const listeners = new Set();
    const clone = (value) => JSON.parse(JSON.stringify(value));

    function mergeState(raw) {
        const state = clone(DEFAULT_STATE);
        if (!raw || typeof raw !== 'object') return state;
        state.balance = Number.isFinite(raw.balance) ? raw.balance : 0;
        state.unlockedRecordIds = Array.isArray(raw.unlockedRecordIds) ? [...new Set(raw.unlockedRecordIds)] : [];
        state.quiz = { ...state.quiz, ...(raw.quiz || {}) };
        state.gacha = {
            ...state.gacha,
            ...(raw.gacha || {}),
            history: Array.isArray(raw.gacha?.history) ? raw.gacha.history : [],
            collection: raw.gacha?.collection && typeof raw.gacha.collection === 'object' ? raw.gacha.collection : {}
        };
        return state;
    }

    function readState() {
        try {
            return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
        } catch (error) {
            return clone(DEFAULT_STATE);
        }
    }

    let currentState = readState();

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    }

    function emitChange(reason, detail = {}) {
        saveState();
        const snapshot = clone(currentState);
        listeners.forEach((listener) => listener(snapshot, reason, detail));
        window.dispatchEvent(new CustomEvent('qcoinchange', { detail: { state: snapshot, reason, ...detail } }));
    }

    function ensureToastHost() {
        let host = document.getElementById('game-toast-stack');
        if (!host) {
            host = document.createElement('div');
            host.id = 'game-toast-stack';
            host.className = 'game-toast-stack';
            document.body.appendChild(host);
        }
        return host;
    }

    window.showGameToast = function (message, type = 'info') {
        const host = ensureToastHost();
        const toast = document.createElement('div');
        toast.className = `game-toast is-${type}`;
        toast.textContent = message;
        host.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        window.setTimeout(() => {
            toast.classList.remove('is-visible');
            window.setTimeout(() => toast.remove(), 220);
        }, 2200);
    };

    function syncBalanceTargets() {
        document.querySelectorAll('[data-qcoin-balance]').forEach((node) => {
            node.textContent = String(currentState.balance);
        });
        document.querySelectorAll('[data-qcoin-quiz-correct]').forEach((node) => {
            node.textContent = String(currentState.quiz.correct);
        });
    }

    function notify(message, type = 'info') {
        window.showGameToast?.(message, type);
    }

    window.GameState = {
        getState() {
            return clone(currentState);
        },
        subscribe(listener) {
            if (typeof listener !== 'function') return () => { };
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getBalance() {
            return currentState.balance;
        },
        addCoins(amount, reason = 'earn') {
            const safeAmount = Number(amount);
            if (!Number.isFinite(safeAmount) || safeAmount <= 0) return false;
            currentState.balance += safeAmount;
            emitChange(reason, { amount: safeAmount });
            return true;
        },
        spendCoins(amount, reason = 'spend') {
            const safeAmount = Number(amount);
            if (!Number.isFinite(safeAmount) || safeAmount <= 0) return false;
            if (currentState.balance < safeAmount) return false;
            currentState.balance -= safeAmount;
            emitChange(reason, { amount: safeAmount });
            return true;
        },
        isRecordUnlocked(recordId) {
            return currentState.unlockedRecordIds.includes(recordId);
        },
        isRecordLocked(record) {
            return Boolean(record && record.importance === 'important' && !this.isRecordUnlocked(record.id));
        },
        unlockRecord(recordId, cost = 500) {
            if (!recordId || this.isRecordUnlocked(recordId)) return true;
            if (!this.spendCoins(cost, 'unlock-spend')) {
                notify(`Not enough Q coins. Need ${cost}.`, 'error');
                return false;
            }
            currentState.unlockedRecordIds = [...new Set([...currentState.unlockedRecordIds, recordId])];
            emitChange('record-unlocked', { recordId, cost });
            notify(`Unlocked ${recordId}.`, 'success');
            return true;
        },
        recordQuizResult(isCorrect) {
            currentState.quiz.answered += 1;
            if (isCorrect) currentState.quiz.correct += 1;
            emitChange('quiz-result', { isCorrect });
        },
        recordPull(results) {
            currentState.gacha.history = [...results, ...currentState.gacha.history].slice(0, 1000);
            currentState.gacha.totalPulls += results.length;
            results.forEach((item) => {
                currentState.gacha.collection[item.id] = (currentState.gacha.collection[item.id] || 0) + 1;
            });
            emitChange('gacha-result', { results });
        },
        updatePity({ pity4, pity5 }) {
            if (Number.isFinite(pity4)) currentState.gacha.pity4 = pity4;
            if (Number.isFinite(pity5)) currentState.gacha.pity5 = pity5;
            emitChange('gacha-pity');
        }
    };

    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return;
        currentState = readState();
        syncBalanceTargets();
    });

    document.addEventListener('DOMContentLoaded', syncBalanceTargets, { once: true });
    window.GameState.subscribe(syncBalanceTargets);
})();
