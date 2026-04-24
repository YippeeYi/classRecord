(() => {
    const SINGLE_COST = 0;
    const TEN_COST = 0;
    const poolState = { items: [] };

    const resultStage = document.getElementById('gacha-result-stage');
    const resultGrid = document.getElementById('gacha-result-grid');
    const historyList = document.getElementById('gacha-history');
    const collectionGrid = document.getElementById('gacha-collection');
    const pity4Node = document.getElementById('gacha-pity-4');
    const pity5Node = document.getElementById('gacha-pity-5');
    const emptyState = document.getElementById('gacha-empty-state');
    const cinematic = document.getElementById('wish-cinematic');
    const cinematicText = document.getElementById('wish-cinematic-text');

    const rarityLabel = (rarity) => `${rarity} Star`;
    const rarityClass = (rarity) => `rarity-${rarity}`;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function groupedPool() {
        return {
            3: poolState.items.filter((item) => item.rarity === 3),
            4: poolState.items.filter((item) => item.rarity === 4),
            5: poolState.items.filter((item) => item.rarity === 5)
        };
    }

    function rollRarity(state, guaranteeFourStar = false) {
        if (state.pity5 >= 89) return 5;
        if (guaranteeFourStar || state.pity4 >= 9) return Math.random() < 0.12 ? 5 : 4;
        const random = Math.random();
        if (random < 0.006) return 5;
        if (random < 0.057) return 4;
        return 3;
    }

    function pickFromPool(pool, rarity) {
        const items = pool[rarity] || [];
        return items.length ? items[Math.floor(Math.random() * items.length)] : null;
    }

    function draw(count) {
        const state = window.GameState.getState();
        const pity = { pity4: state.gacha.pity4 || 0, pity5: state.gacha.pity5 || 0 };
        const pool = groupedPool();
        const results = [];

        for (let index = 0; index < count; index += 1) {
            const guaranteedFour = count === 10 && index === count - 1 && !results.some((item) => item.rarity >= 4);
            const rarity = rollRarity(pity, guaranteedFour);
            const item = pickFromPool(pool, rarity);
            if (!item) continue;
            results.push(item);

            if (rarity === 5) {
                pity.pity5 = 0;
                pity.pity4 = 0;
            } else if (rarity === 4) {
                pity.pity4 = 0;
                pity.pity5 += 1;
            } else {
                pity.pity4 += 1;
                pity.pity5 += 1;
            }
        }

        window.GameState.updatePity(pity);
        window.GameState.recordPull(results);
        return results;
    }

    function renderResults(results) {
        resultStage.classList.remove('is-active');
        resultStage.classList.toggle('is-ten-pull', results.length >= 10);
        const highestRarity = results.reduce((highest, item) => Math.max(highest, item.rarity), 3);
        resultStage.dataset.highestRarity = String(highestRarity);
        resultGrid.innerHTML = results.map((item, index) => {
            const imageStyle = item.image ? `style="background-image:url('${encodeURI(item.image)}')"` : '';
            return `
                <article class="wish-card ${rarityClass(item.rarity)}${index === 0 && results.length >= 10 ? ' is-featured' : ''}" style="animation-delay:${index * 90}ms">
                    <div class="wish-card-art" ${imageStyle}></div>
                    <div class="wish-card-overlay"></div>
                    <div class="wish-card-meta">
                        <p class="wish-card-rarity">${rarityLabel(item.rarity)}</p>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p>${escapeHtml(item.title || item.series || 'Waiting for your art')}</p>
                    </div>
                </article>
            `;
        }).join('');
        requestAnimationFrame(() => resultStage.classList.add('is-active'));
    }

    function playCinematic(results) {
        if (!cinematic) {
            renderResults(results);
            return;
        }

        const highestRarity = results.reduce((highest, item) => Math.max(highest, item.rarity), 3);
        cinematic.className = `wish-cinematic is-active ${rarityClass(highestRarity)}`;
        cinematic.setAttribute('aria-hidden', 'false');
        cinematicText.textContent = highestRarity >= 5
            ? '金色流星划破夜空'
            : highestRarity >= 4
                ? '紫色流星即将坠落'
                : '蓝色流星轻轻掠过';

        window.setTimeout(() => {
            cinematic.classList.add('is-impact');
        }, 720);

        window.setTimeout(() => {
            cinematic.classList.remove('is-impact');
            cinematic.classList.remove('is-active');
            cinematic.setAttribute('aria-hidden', 'true');
            renderResults(results);
        }, 1500);
    }

    function renderHistory() {
        const history = window.GameState.getState().gacha.history || [];
        historyList.innerHTML = history.length
            ? history.map((item) => `
                <li class="${rarityClass(item.rarity)}">
                    <span>${escapeHtml(item.name)}</span>
                    <span>${rarityLabel(item.rarity)}</span>
                </li>
            `).join('')
            : '<li>No pull history yet.</li>';
    }

    function renderCollection() {
        const { collection } = window.GameState.getState().gacha;
        const items = poolState.items
            .filter((item) => collection[item.id])
            .sort((left, right) => right.rarity - left.rarity || left.name.localeCompare(right.name, 'zh-CN'));

        collectionGrid.innerHTML = items.length
            ? items.map((item) => `
                <article class="collection-card ${rarityClass(item.rarity)}">
                    <div class="collection-art"${item.image ? ` style="background-image:url('${encodeURI(item.image)}')"` : ''}></div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${rarityLabel(item.rarity)} · Owned ${collection[item.id]}</p>
                </article>
            `).join('')
            : '<p class="gacha-panel-empty">Pulled cards will appear here.</p>';
    }

    function updatePityText() {
        const state = window.GameState.getState();
        pity4Node.textContent = `${10 - (state.gacha.pity4 || 0)} pulls to 4-star pity`;
        pity5Node.textContent = `${90 - (state.gacha.pity5 || 0)} pulls to 5-star pity`;
    }

    function setButtonsDisabled(disabled) {
        document.querySelectorAll('[data-gacha-count]').forEach((button) => {
            button.disabled = disabled;
        });
    }

    function handleDraw(count, cost) {
        if (!poolState.items.length) {
            window.showGameToast('Pool is empty. Fill data/gacha/pool.json first.', 'error');
            return;
        }
        if (!window.GameState.spendCoins(cost, 'gacha-spend')) {
            window.showGameToast(`Not enough Q coins. Need ${cost}.`, 'error');
            return;
        }

        setButtonsDisabled(true);
        resultStage.classList.remove('is-active');
        resultStage.classList.remove('is-ten-pull');
        window.setTimeout(() => {
            const results = draw(count);
            playCinematic(results);
            renderHistory();
            renderCollection();
            updatePityText();
            window.setTimeout(() => {
                setButtonsDisabled(false);
            }, 1500);
        }, 180);
    }

    document.querySelectorAll('[data-gacha-count]').forEach((button) => {
        button.addEventListener('click', () => {
            const count = Number(button.dataset.gachaCount || '0');
            handleDraw(count, count === 10 ? TEN_COST : SINGLE_COST);
        });
    });

    window.GameState.subscribe(() => {
        renderHistory();
        renderCollection();
        updatePityText();
    });

    fetch('data/gacha/pool.json')
        .then((response) => response.json())
        .then((items) => {
            poolState.items = Array.isArray(items) ? items.filter((item) => item && item.id && item.name && item.rarity) : [];
            emptyState.hidden = poolState.items.length > 0;
            renderHistory();
            renderCollection();
            updatePityText();
        })
        .catch(() => {
            emptyState.hidden = false;
            renderHistory();
            renderCollection();
            updatePityText();
        });
})();
