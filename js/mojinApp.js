(() => {
    const STORAGE_KEY = "classRecord:mojinSafe";
    const LEGACY_STORAGE_KEY = "classRecord:mo" + "jingSafe";
    const OPENING_CLASS = "is-opening";
    const ITEM_IMAGE_BASE = "images/mojin";

    const COSTS = {
        buy: 500,
        outline: 10,
        extract: 100,
        revealAll: 300,
        extractAll: 3000,
        scanRare: 100,
        reroll: 500
    };

    const QUALITY = [
        { key: "white", label: "白", rank: 0, weight: 560, mult: 1 },
        { key: "green", label: "绿", rank: 1, weight: 245, mult: 2.6 },
        { key: "blue", label: "蓝", rank: 2, weight: 105, mult: 8 },
        { key: "purple", label: "紫", rank: 3, weight: 38, mult: 30 },
        { key: "gold", label: "金", rank: 4, weight: 9, mult: 145 },
        { key: "red", label: "红", rank: 5, weight: 2, mult: 3600 }
    ];

    const state = {
        safe: null,
        mode: "outline",
        isOpening: false
    };

    function initToolbar() {
        const toolbarContainer = document.querySelector(".mojin-toolbar");
        const buttonsData = [
            { mode: "outline", label: "侦察一格", costKey: "outline" },
            { mode: "extract", label: "开取一格", costKey: "extract" },
            { id: "mojin-reveal-all", label: "全图轮廓", costKey: "revealAll" },
            { id: "mojin-extract-all", label: "全箱开取", costKey: "extractAll" },
            { id: "mojin-scan-rare", label: "稀有扫描", costKey: "scanRare" },
            { id: "mojin-reroll", label: "换箱弃置", costKey: "reroll" },
        ];

        toolbarContainer.innerHTML = "";
        buttonsData.forEach((btnData) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mojin-tool";
            if (btnData.mode) {
                btn.dataset.mode = btnData.mode;
                if (btnData.mode === "outline") btn.classList.add("is-active");
            }
            if (btnData.id) btn.id = btnData.id;
            const cost = COSTS[btnData.costKey] ?? 0;
            btn.textContent = `${btnData.label} · ${cost}`;
            toolbarContainer.appendChild(btn);
        });
    }

    initToolbar();

    const buyButton = document.getElementById("mojin-buy");
    const game = document.getElementById("mojin-game");
    const board = document.getElementById("mojin-board");
    const sizeNode = document.getElementById("mojin-size");
    const modeLabel = document.getElementById("mojin-mode-label");
    const rareCount = document.getElementById("mojin-rare-count");
    const logList = document.getElementById("mojin-log");
    const modeButtons = document.querySelectorAll("[data-mode]");
    const revealAllButton = document.getElementById("mojin-reveal-all");
    const extractAllButton = document.getElementById("mojin-extract-all");
    const scanRareButton = document.getElementById("mojin-scan-rare");
    const rerollButton = document.getElementById("mojin-reroll");

    buyButton.textContent = `购买保险箱 · ${COSTS.buy} Q币`;

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function wait(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
    }

    function readStoredSafe() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
            if (raw && localStorage.getItem(LEGACY_STORAGE_KEY)) localStorage.removeItem(LEGACY_STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveSafe() {
        try {
            if (state.safe) {
                state.safe.items.forEach((item) => {
                    if (typeof item.outlined !== "boolean") item.outlined = false;
                    if (typeof item.extracted !== "boolean") item.extracted = false;
                    delete item.opening;
                    delete item.openDuration;
                });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.safe));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch { }
    }

    function spend(amount, label) {
        if (window.GameState.spendCoins(amount, "mojin-spend")) return true;
        window.showGameToast(`${label} 需要 ${amount} Q币。`, "error");
        return false;
    }

    function addLog(text) {
        const li = document.createElement("li");
        li.textContent = text;
        logList.prepend(li);
        while (logList.children.length > 16) {
            logList.lastElementChild.remove();
        }
    }

    function pickWeighted(candidates = QUALITY) {
        const total = candidates.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * total;
        for (const item of candidates) {
            roll -= item.weight;
            if (roll <= 0) return item;
        }
        return candidates[0];
    }

    function rollQuality() {
        return pickWeighted(QUALITY);
    }

    function calculateRectValue(width, height, quality) {
        const rank = quality.rank;
        const area = width * height;
        const longSide = Math.max(width, height);
        const shortSide = Math.max(1, Math.min(width, height));
        const shapeBonus = 1 + Math.pow(longSide / shortSide - 1, 1.35) * 0.32;
        const qualityBonus = quality.mult * (1 + rank * 0.16);
        const sizeBonus = area * (1 + Math.sqrt(area) * 0.18);
        const randomFactor = 0.92 + Math.random() * 0.16;
        return Math.max(1, Math.round(sizeBonus * shapeBonus * qualityBonus * randomFactor));
    }

    function getOpenDuration(item) {
        const rank = item.quality.rank;
        const base = 920 + rank * 380;
        const jitter = 0.94 + Math.random() * 0.12;
        return Math.round(base * jitter);
    }

    function assignRectQuality(item, cellQualities) {
        const counts = new Map();
        for (let dy = 0; dy < item.height; dy++) {
            for (let dx = 0; dx < item.width; dx++) {
                const quality = cellQualities[item.y + dy][item.x + dx];
                counts.set(quality.key, (counts.get(quality.key) || 0) + 1);
            }
        }

        const maxCount = Math.max(...counts.values());
        const winners = QUALITY.filter((quality) => counts.get(quality.key) === maxCount);
        return winners.length === 1 ? winners[0] : pickWeighted(winners);
    }

    function makeSafe() {
        const n = randomInt(10, 20);
        const grid = Array.from({ length: n }, () => Array(n).fill(null));
        const cellQualities = Array.from({ length: n }, () => Array(n).fill(null));
        const items = [];
        let idCounter = 0;

        function canPlace(x, y, w, h) {
            if (x < 0 || y < 0 || x + w > n || y + h > n) return false;
            for (let dy = 0; dy < h; dy++)
                for (let dx = 0; dx < w; dx++)
                    if (grid[y + dy][x + dx] !== null) return false;
            return true;
        }

        function placeRect(rect, isNew = false) {
            for (let dy = 0; dy < rect.height; dy++)
                for (let dx = 0; dx < rect.width; dx++)
                    grid[rect.y + dy][rect.x + dx] = rect.id;

            if (isNew) items.push(rect);
        }

        function removeRect(rect) {
            for (let dy = 0; dy < rect.height; dy++)
                for (let dx = 0; dx < rect.width; dx++)
                    grid[rect.y + dy][rect.x + dx] = null;
        }

        function getEmptyCells() {
            const cells = [];
            for (let y = 0; y < n; y++)
                for (let x = 0; x < n; x++)
                    if (grid[y][x] === null) cells.push({ x, y });
            return cells;
        }

        function generateInitialRects(emptyCells) {
            const k = Math.max(1, Math.floor(emptyCells.length / 10));
            const queue = [];
            for (let i = 0; i < k && emptyCells.length > 0; i++) {
                const idx = randomInt(0, emptyCells.length - 1);
                const { x, y } = emptyCells.splice(idx, 1)[0];
                const speed = randomInt(1, 10);
                const rect = { id: `item-${idCounter++}`, x, y, width: 1, height: 1, speed };
                queue.push(rect);
                placeRect(rect, true);
            }
            return queue;
        }

        function expandRects(queue) {
            while (queue.length > 0) {
                queue.sort((a, b) => a.speed - b.speed);
                const rect = queue.shift();
                const dirs = ["up", "down", "left", "right"].sort(() => Math.random() - 0.5);
                for (const dir of dirs) {
                    let newX = rect.x, newY = rect.y, newW = rect.width, newH = rect.height;
                    if (dir === "up" && rect.height < 6) { newY -= 1; newH += 1; }
                    else if (dir === "down" && rect.height < 6) { newH += 1; }
                    else if (dir === "left" && rect.width < 6) { newX -= 1; newW += 1; }
                    else if (dir === "right" && rect.width < 6) { newW += 1; }
                    else continue;
                    removeRect(rect);
                    if (canPlace(newX, newY, newW, newH)) {
                        rect.x = newX; rect.y = newY; rect.width = newW; rect.height = newH;
                        placeRect(rect);
                        rect.speed += randomInt(1, 5);
                        queue.push(rect);
                        break;
                    }
                    placeRect(rect);
                }
            }
        }

        while (true) {
            const emptyCells = getEmptyCells();
            if (emptyCells.length === 0) break;
            expandRects(generateInitialRects(emptyCells));
        }

        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                cellQualities[y][x] = rollQuality();
            }
        }

        items.forEach((item) => {
            item.area = item.width * item.height;
            item.quality = assignRectQuality(item, cellQualities);
            item.value = calculateRectValue(item.width, item.height, item.quality);
            item.outlined = false;
            item.extracted = false;
        });

        return { n, grid, items, rareKnown: false, revealAllUsed: false, extractAllUsed: false, scanRareUsed: false };
    }

    function allOutlined() {
        return Boolean(state.safe) && state.safe.items.every((item) => item.outlined || item.extracted);
    }

    function allExtracted() {
        return Boolean(state.safe) && state.safe.items.every((item) => item.extracted);
    }

    function itemAt(cell) {
        if (!state.safe) return null;
        const id = state.safe.grid[cell.y][cell.x];
        return state.safe.items.find((item) => item.id === id) || null;
    }

    function updateControls() {
        const hasSafe = Boolean(state.safe);
        const outlinedDone = allOutlined();
        const extractedDone = allExtracted();
        buyButton.hidden = hasSafe;
        game.hidden = !hasSafe;

        modeButtons.forEach((button) => {
            const mode = button.dataset.mode;
            button.disabled = state.isOpening || !hasSafe || extractedDone || (mode === "outline" && outlinedDone);
        });

        if (state.mode === "outline" && outlinedDone && !extractedDone) {
            setMode("extract", false);
        }

        revealAllButton.disabled = state.isOpening || !hasSafe || extractedDone || outlinedDone || state.safe.revealAllUsed;
        extractAllButton.disabled = state.isOpening || !hasSafe || extractedDone || state.safe.extractAllUsed;
        scanRareButton.disabled = state.isOpening || !hasSafe || extractedDone || state.safe.scanRareUsed;
        rerollButton.disabled = state.isOpening || !hasSafe;
    }

    function formatValue(value) {
        if (value >= 1_000_000) return `${Math.floor(value / 1_000_000)}M`;
        if (value >= 1_000) return `${Math.floor(value / 1_000)}k`;
        return value.toString();
    }

    function getExtractedCoins() {
        if (!state.safe) return 0;
        return state.safe.items.reduce((sum, item) => sum + (item.extracted ? item.value : 0), 0);
    }

    function getExtractedRare() {
        if (!state.safe) return 0;
        return state.safe.items.reduce((sum, item) => {
            if (item.extracted && ["purple", "gold", "red"].includes(item.quality.key)) return sum + item.area;
            return sum;
        }, 0);
    }

    function getRareCellCount() {
        if (!state.safe) return 0;
        const itemMap = new Map(state.safe.items.map((item) => [item.id, item]));
        return state.safe.grid.flat().reduce((sum, id) => {
            const item = itemMap.get(id);
            return sum + (item && ["purple", "gold", "red"].includes(item.quality.key) ? 1 : 0);
        }, 0);
    }

    function imagePathFor(item) {
        return `${ITEM_IMAGE_BASE}/${item.quality.key}-${item.width}x${item.height}.png`;
    }

    function renderBoard() {
        updateControls();
        if (!state.safe) return;

        board.style.setProperty("--mojin-n", String(state.safe.n));
        board.innerHTML = "";

        const fragment = document.createDocumentFragment();
        state.safe.items.forEach((item) => {
            const node = document.createElement("div");
            node.className = `mojin-item quality-${item.quality.key}`;
            node.dataset.itemId = item.id;
            node.style.gridColumn = `${item.x + 1} / span ${item.width}`;
            node.style.gridRow = `${item.y + 1} / span ${item.height}`;
            node.style.setProperty("--mojin-item-w", item.width);
            node.style.setProperty("--mojin-item-h", item.height);
            node.style.setProperty("--mojin-open-duration", `${item.openDuration || getOpenDuration(item)}ms`);
            node.classList.toggle("is-outlined", item.outlined && !item.extracted);
            node.classList.toggle("is-extracted", item.extracted);
            node.classList.toggle(OPENING_CLASS, Boolean(item.opening));
            const imageMarkup = item.extracted
                ? `<img src="${imagePathFor(item)}" alt="" loading="lazy" decoding="async">`
                : "";
            node.innerHTML = `
                <div class="mojin-item-art" aria-hidden="true">${imageMarkup}</div>
                <div class="mojin-item-value">${formatValue(item.value)}</div>
                <div class="mojin-magnifier" aria-hidden="true"></div>
            `;
            const img = node.querySelector("img");
            if (img) img.addEventListener("error", () => img.remove(), { once: true });
            fragment.appendChild(node);
        });

        for (let y = 0; y < state.safe.n; y++) {
            for (let x = 0; x < state.safe.n; x++) {
                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = "mojin-cell";
                cell.style.gridColumn = x + 1;
                cell.style.gridRow = y + 1;
                cell.dataset.x = String(x);
                cell.dataset.y = String(y);
                cell.disabled = state.isOpening;
                cell.addEventListener("click", () => handleCell({ x, y }));
                fragment.appendChild(cell);
            }
        }
        board.appendChild(fragment);

        sizeNode.textContent = `${state.safe.n} x ${state.safe.n}`;
        rareCount.textContent = state.safe.rareKnown ? `稀有小格数量：${getRareCellCount()}` : "稀有小格数量：未知";

        let extractedCoinsNode = document.getElementById("mojin-extracted-coins");
        let extractedRareNode = document.getElementById("mojin-extracted-rare");

        if (!extractedCoinsNode) {
            extractedCoinsNode = document.createElement("p");
            extractedCoinsNode.id = "mojin-extracted-coins";
            rareCount.insertAdjacentElement("afterend", extractedCoinsNode);
        }
        if (!extractedRareNode) {
            extractedRareNode = document.createElement("p");
            extractedRareNode.id = "mojin-extracted-rare";
            extractedCoinsNode.insertAdjacentElement("afterend", extractedRareNode);
        }

        extractedCoinsNode.textContent = `已开取 Q币总数：${getExtractedCoins()}`;
        extractedRareNode.textContent = `已开取稀有小格总数：${getExtractedRare()}`;
    }

    function setMode(mode, shouldUpdate = true) {
        state.mode = mode;
        modeButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.mode === mode);
        });
        modeLabel.textContent = mode === "extract" ? "开取一格" : "侦察一格";
        if (shouldUpdate) updateControls();
    }

    async function extractItem(item, silent = false) {
        if (!item || item.extracted || item.opening) return 0;

        item.opening = true;
        item.openDuration = getOpenDuration(item);
        state.isOpening = true;
        renderBoard();
        await wait(item.openDuration);

        item.opening = false;
        delete item.openDuration;
        item.extracted = true;
        item.outlined = true;
        state.isOpening = false;
        window.GameState.addCoins(item.value, "mojin-loot");

        if (!silent) addLog(`获得 ${item.quality.label}品质 ${item.width}×${item.height} 物品，收益 ${item.value} Q币。`);
        saveSafe();
        renderBoard();
        return item.value;
    }

    async function handleCell(cell) {
        if (state.isOpening) return;
        const item = itemAt(cell);
        if (!item) return;

        if (allExtracted()) {
            addLog("保险箱已经开空，只能换箱弃置。");
            updateControls();
            return;
        }

        if (state.mode === "outline") {
            if (allOutlined()) {
                addLog("所有物品都已侦察，无需继续侦察。");
                updateControls();
                return;
            }
            if (item.outlined) {
                addLog("这个轮廓已经侦察过。");
                return;
            }
            if (!spend(COSTS.outline, "侦察一格")) return;
            item.outlined = true;
            addLog(`侦察到 ${item.width}×${item.height} 的灰色轮廓。`);
            saveSafe();
            renderBoard();
            return;
        }

        if (item.extracted) {
            addLog("这个物品已经取出。");
            return;
        }
        if (!spend(COSTS.extract, "开取一格")) return;
        await extractItem(item);
    }

    function activateSafe(safe, logText) {
        state.safe = safe;
        setMode("outline", false);
        if (logText) addLog(logText);
        saveSafe();
        renderBoard();
    }

    function buySafe(cost = COSTS.buy, label = "购买保险箱") {
        if (!spend(cost, label)) return;
        const safe = makeSafe();
        activateSafe(safe, `新保险箱入手：${safe.n}×${safe.n}。`);
    }

    buyButton.addEventListener("click", () => buySafe());
    modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (!button.disabled) setMode(button.dataset.mode);
        });
    });
    revealAllButton.addEventListener("click", () => {
        if (!state.safe || state.safe.revealAllUsed || allOutlined() || allExtracted() || state.isOpening) return;
        if (!spend(COSTS.revealAll, "全图轮廓")) return;
        state.safe.revealAllUsed = true;
        state.safe.items.forEach((item) => {
            if (!item.extracted) item.outlined = true;
        });
        addLog("所有未开取物品轮廓已标记为灰色。");
        saveSafe();
        renderBoard();
    });
    extractAllButton.addEventListener("click", async () => {
        if (!state.safe || state.safe.extractAllUsed || allExtracted() || state.isOpening) return;
        if (!spend(COSTS.extractAll, "全箱开取")) return;
        state.safe.extractAllUsed = true;
        let total = 0;
        const orderedItems = [...state.safe.items]
            .filter((item) => !item.extracted)
            .sort((a, b) => (a.y - b.y) || (a.x - b.x));
        for (const item of orderedItems) {
            total += await extractItem(item, true);
        }
        addLog(`全箱开取完成，总收益 ${total} Q币。`);
        saveSafe();
        renderBoard();
    });
    scanRareButton.addEventListener("click", () => {
        if (!state.safe || state.safe.scanRareUsed || allExtracted() || state.isOpening) return;
        if (!spend(COSTS.scanRare, "稀有扫描")) return;
        state.safe.scanRareUsed = true;
        state.safe.rareKnown = true;
        addLog("扫描完成：已获得紫/金/红品质小格总数。");
        saveSafe();
        renderBoard();
    });
    rerollButton.addEventListener("click", () => {
        if (state.isOpening) return;
        if (state.safe && !allExtracted()) {
            const ok = window.confirm("当前保险箱仍有未开取物品，换箱会直接弃置。确认换箱吗？");
            if (!ok) return;
        }
        buySafe(COSTS.reroll, "换箱弃置");
    });

    const storedSafe = readStoredSafe();
    if (storedSafe && Array.isArray(storedSafe.items) && Array.isArray(storedSafe.grid)) {
        const uniqueMap = new Map();
        storedSafe.items.forEach((item) => {
            if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
        });

        storedSafe.items = [...uniqueMap.values()];
        storedSafe.items.forEach((item) => {
            if (typeof item.outlined !== "boolean") item.outlined = false;
            if (typeof item.extracted !== "boolean") item.extracted = false;
            delete item.opening;
            delete item.openDuration;
            if (!item.quality || typeof item.quality.rank !== "number") {
                const key = item.quality?.key;
                item.quality = QUALITY.find((quality) => quality.key === key) || rollQuality();
            }
            item.area = item.width * item.height;
            if (!item.value) item.value = calculateRectValue(item.width, item.height, item.quality);
        });
        activateSafe(storedSafe, "已恢复上次保险箱。");
    } else {
        updateControls();
    }
})();
