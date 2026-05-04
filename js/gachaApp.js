(() => {
    const SINGLE_COST = 1;
    const TEN_COST = 1;
    const REVEAL_DELAY = 1180;
    const RECENT_HISTORY_LIMIT = 20;
    const HISTORY_PAGE_SIZE = 10;
    const poolState = { items: [] };
    const revealState = {
        results: [],
        index: 0,
        timer: 0,
        isSummary: false
    };
    const historyState = { page: 1 };

    const resultStage = document.getElementById("gacha-result-stage");
    const resultGrid = document.getElementById("gacha-result-grid");
    const historyList = document.getElementById("gacha-history");
    const collectionGrid = document.getElementById("gacha-collection");
    const pity4Node = document.getElementById("gacha-pity-4");
    const pity5Node = document.getElementById("gacha-pity-5");
    const emptyState = document.getElementById("gacha-empty-state");
    const revealScreen = document.getElementById("wish-reveal-screen");
    const revealMeteor = document.getElementById("wish-reveal-meteor");
    const revealCardWrap = document.getElementById("wish-reveal-card-wrap");
    const revealSummary = document.getElementById("wish-reveal-summary");
    const revealSummaryGrid = document.getElementById("wish-reveal-summary-grid");
    const revealHint = document.getElementById("wish-reveal-hint");
    const revealNext = document.getElementById("wish-reveal-next");
    const revealSkip = document.getElementById("wish-reveal-skip");
    const revealClose = document.getElementById("wish-reveal-close");
    const historyOpen = document.getElementById("gacha-history-open");
    const historyModal = document.getElementById("gacha-history-modal");
    const historyAllList = document.getElementById("gacha-history-all");
    const historyPrev = document.getElementById("gacha-history-prev");
    const historyNext = document.getElementById("gacha-history-next");
    const historyPage = document.getElementById("gacha-history-page");

    const rarityLabel = (rarity) => `${rarity} 星`;
    const rarityClass = (rarity) => `rarity-${rarity}`;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function itemImageStyle(item) {
        return item.image ? ` style="background-image:url('${encodeURI(item.image)}')"` : "";
    }

    function highestRarity(results) {
        return results.reduce((highest, item) => Math.max(highest, item.rarity), 3);
    }

    function groupedPool() {
        return {
            3: poolState.items.filter((item) => item.rarity === 3),
            4: poolState.items.filter((item) => item.rarity === 4),
            5: poolState.items.filter((item) => item.rarity === 5),
            6: poolState.items.filter((item) => item.rarity === 6)
        };
    }

    function rollRarity(state, guaranteeFourStar = false) {
        if (state.pity5 >= 89) return 5;
        const random = Math.random();
        if (random < 0.002) return 6;
        if (guaranteeFourStar || state.pity4 >= 9) return Math.random() < 0.12 ? 5 : 4;
        if (random < 0.008) return 5;
        if (random < 0.059) return 4;
        return 3;
    }

    function pickFromPool(pool, rarity) {
        for (let next = rarity; next >= 3; next -= 1) {
            const items = pool[next] || [];
            if (items.length) return items[Math.floor(Math.random() * items.length)];
        }
        return null;
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

            if (item.rarity >= 5) {
                pity.pity5 = 0;
                pity.pity4 = 0;
            } else if (item.rarity === 4) {
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

    function cardMarkup(item, index = 0, isLarge = false) {
        return `
            <article class="wish-card ${rarityClass(item.rarity)}${isLarge ? " is-large" : ""}" style="animation-delay:${index * 64}ms">
                <div class="wish-card-art"${itemImageStyle(item)}></div>
                <div class="wish-card-overlay"></div>
                <div class="wish-card-meta">
                    <p class="wish-card-rarity">${rarityLabel(item.rarity)}</p>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${escapeHtml(item.title || item.series || "等待替换为你的卡面素材")}</p>
                </div>
            </article>
        `;
    }

    function renderResults(results) {
        resultStage.classList.remove("is-active");
        resultStage.classList.toggle("is-ten-pull", results.length >= 10);
        resultStage.dataset.highestRarity = String(highestRarity(results));
        resultGrid.innerHTML = results.map((item, index) => cardMarkup(item, index)).join("");
        requestAnimationFrame(() => resultStage.classList.add("is-active"));
    }

    function renderRevealCard(item, index) {
        revealCardWrap.innerHTML = `
            <div class="wish-reveal-card-shell ${rarityClass(item.rarity)}">
                ${cardMarkup(item, 0, true)}
                <div class="wish-reveal-card-info">
                    <span>${index + 1} / ${revealState.results.length}</span>
                    <strong>${rarityLabel(item.rarity)}</strong>
                </div>
            </div>
        `;
        revealHint.textContent = revealState.results.length > 1 ? "单击继续展示下一张" : "单击查看结果";
    }

    function resetRevealClasses() {
        revealScreen.classList.remove("is-opening", "is-card", "is-summary", "rarity-3", "rarity-4", "rarity-5", "rarity-6");
        revealMeteor.classList.remove("rarity-3", "rarity-4", "rarity-5", "rarity-6");
    }

    function showCurrentCard() {
        const item = revealState.results[revealState.index];
        if (!item) {
            showSummary();
            return;
        }

        resetRevealClasses();
        revealScreen.classList.add("is-card", rarityClass(item.rarity));
        revealCardWrap.hidden = false;
        revealSummary.hidden = true;
        revealClose.hidden = true;
        revealSkip.hidden = revealState.results.length <= 1;
        renderRevealCard(item, revealState.index);
    }

    function openingHint(rarity) {
        if (rarity >= 6) return "彩色星轨正在坠落...";
        if (rarity >= 5) return "金色星轨正在坠落...";
        if (rarity >= 4) return "紫色星轨正在坠落...";
        return "蓝色星轨正在坠落...";
    }

    function startOpening(results) {
        const rarity = highestRarity(results);
        resetRevealClasses();
        revealScreen.hidden = false;
        revealCardWrap.hidden = true;
        revealSummary.hidden = true;
        revealClose.hidden = true;
        revealSkip.hidden = results.length <= 1;
        revealHint.textContent = openingHint(rarity);
        revealScreen.classList.add("is-opening", rarityClass(rarity));
        revealMeteor.classList.add(rarityClass(rarity));
        clearTimeout(revealState.timer);
        revealState.timer = window.setTimeout(showCurrentCard, REVEAL_DELAY);
    }

    function showSummary() {
        clearTimeout(revealState.timer);
        revealState.isSummary = true;
        resetRevealClasses();
        revealScreen.classList.add("is-summary", rarityClass(highestRarity(revealState.results)));
        revealCardWrap.hidden = true;
        revealSummary.hidden = false;
        revealSkip.hidden = true;
        revealClose.hidden = false;
        revealHint.textContent = "单击返回抽卡页";
        revealSummaryGrid.innerHTML = revealState.results.map((item, index) => cardMarkup(item, index)).join("");
        renderResults(revealState.results);
    }

    function closeReveal() {
        clearTimeout(revealState.timer);
        revealScreen.hidden = true;
        resetRevealClasses();
        document.body.classList.remove("is-wish-revealing");
    }

    function advanceReveal() {
        if (revealScreen.hidden) return;
        if (revealScreen.classList.contains("is-opening")) {
            showCurrentCard();
            return;
        }
        if (revealState.isSummary) {
            closeReveal();
            return;
        }
        revealState.index += 1;
        if (revealState.index >= revealState.results.length) {
            showSummary();
            return;
        }
        showCurrentCard();
    }

    function openReveal(results) {
        revealState.results = results;
        revealState.index = 0;
        revealState.isSummary = false;
        document.body.classList.add("is-wish-revealing");
        startOpening(results);
    }

    function historyItemMarkup(item) {
        return `
            <li class="${rarityClass(item.rarity)}">
                <span>${escapeHtml(item.name)}</span>
                <span>${rarityLabel(item.rarity)}</span>
            </li>
        `;
    }

    function renderHistory() {
        const history = window.GameState.getState().gacha.history || [];
        const recent = history.slice(0, RECENT_HISTORY_LIMIT);
        historyList.innerHTML = recent.length
            ? recent.map(historyItemMarkup).join("")
            : "<li>还没有抽卡记录。</li>";
        historyOpen.hidden = history.length <= RECENT_HISTORY_LIMIT;
    }

    function renderHistoryModal() {
        const history = window.GameState.getState().gacha.history || [];
        const totalPages = Math.max(1, Math.ceil(history.length / HISTORY_PAGE_SIZE));
        historyState.page = Math.min(Math.max(historyState.page, 1), totalPages);
        const start = (historyState.page - 1) * HISTORY_PAGE_SIZE;
        const pageItems = history.slice(start, start + HISTORY_PAGE_SIZE);

        historyAllList.innerHTML = pageItems.length
            ? pageItems.map(historyItemMarkup).join("")
            : "<li>还没有抽卡记录。</li>";
        historyPage.textContent = `${historyState.page} / ${totalPages}`;
        historyPrev.disabled = historyState.page <= 1;
        historyNext.disabled = historyState.page >= totalPages;
    }

    function openHistoryModal() {
        historyState.page = 1;
        renderHistoryModal();
        historyModal.hidden = false;
        historyModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("is-history-modal-open");
    }

    function closeHistoryModal() {
        historyModal.hidden = true;
        historyModal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("is-history-modal-open");
    }

    function renderCollection() {
        const { collection } = window.GameState.getState().gacha;
        const items = poolState.items
            .filter((item) => collection[item.id])
            .sort((left, right) => right.rarity - left.rarity || left.name.localeCompare(right.name, "zh-CN"));

        collectionGrid.innerHTML = items.length
            ? items.map((item) => `
                <article class="collection-card ${rarityClass(item.rarity)}">
                    <div class="collection-art"${itemImageStyle(item)}></div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <p>${rarityLabel(item.rarity)} · 持有 ${collection[item.id]} 张</p>
                </article>
            `).join("")
            : '<p class="gacha-panel-empty">抽到的卡会展示在这里。</p>';
    }

    function updatePityText() {
        const state = window.GameState.getState();
        pity4Node.textContent = `${10 - (state.gacha.pity4 || 0)} 抽内保底 4 星`;
        pity5Node.textContent = `${90 - (state.gacha.pity5 || 0)} 抽内保底 5 星`;
    }

    function setButtonsDisabled(disabled) {
        document.querySelectorAll("[data-gacha-count]").forEach((button) => {
            button.disabled = disabled;
        });
    }

    function handleDraw(count, cost) {
        if (!poolState.items.length) {
            window.showGameToast("卡池为空，请先在 data/gacha/pool.json 中配置卡面。", "error");
            return;
        }
        if (!window.GameState.spendCoins(cost, "gacha-spend")) {
            window.showGameToast(`Q币不足，本次抽卡需要 ${cost} Q币。`, "error");
            return;
        }

        setButtonsDisabled(true);
        window.setTimeout(() => {
            const results = draw(count);
            renderHistory();
            renderHistoryModal();
            renderCollection();
            updatePityText();
            openReveal(results);
            setButtonsDisabled(false);
        }, 120);
    }

    document.querySelectorAll("[data-gacha-count]").forEach((button) => {
        button.addEventListener("click", () => {
            const count = Number(button.dataset.gachaCount || "0");
            handleDraw(count, count === 10 ? TEN_COST : SINGLE_COST);
        });
    });

    revealNext.addEventListener("click", advanceReveal);
    revealSkip.addEventListener("click", (event) => {
        event.stopPropagation();
        showSummary();
    });
    revealClose.addEventListener("click", (event) => {
        event.stopPropagation();
        closeReveal();
    });
    historyOpen.addEventListener("click", openHistoryModal);
    historyPrev.addEventListener("click", () => {
        historyState.page -= 1;
        renderHistoryModal();
    });
    historyNext.addEventListener("click", () => {
        historyState.page += 1;
        renderHistoryModal();
    });
    document.querySelectorAll("[data-history-close]").forEach((node) => {
        node.addEventListener("click", closeHistoryModal);
    });
    document.addEventListener("keydown", (event) => {
        if (!historyModal.hidden && event.key === "Escape") {
            closeHistoryModal();
            return;
        }
        if (revealScreen.hidden) return;
        if (event.key === "Escape") {
            showSummary();
            return;
        }
        if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            advanceReveal();
        }
    });

    window.GameState.subscribe(() => {
        renderHistory();
        renderHistoryModal();
        renderCollection();
        updatePityText();
    });

    fetch("data/gacha/pool.json")
        .then((response) => response.json())
        .then((items) => {
            poolState.items = Array.isArray(items) ? items.filter((item) => item && item.id && item.name && item.rarity) : [];
            emptyState.hidden = poolState.items.length > 0;
            renderHistory();
            renderHistoryModal();
            renderCollection();
            updatePityText();
        })
        .catch(() => {
            emptyState.hidden = false;
            renderHistory();
            renderHistoryModal();
            renderCollection();
            updatePityText();
        });
})();
