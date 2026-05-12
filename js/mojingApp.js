(() => {
    const STORAGE_KEY = "classRecord:mojingSafe";

    // 七个消耗常数
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
        { key: "white", label: "白", weight: 44, mult: 1 },
        { key: "green", label: "绿", weight: 26, mult: 2 },
        { key: "blue", label: "蓝", weight: 16, mult: 5 },
        { key: "purple", label: "紫", weight: 8, mult: 13 },
        { key: "gold", label: "金", weight: 3, mult: 50 },
        { key: "red", label: "红", weight: 1, mult: 1000 }
    ];

    const state = {
        safe: null,
        mode: "outline"
    };

    function initToolbar() {
        const toolbarContainer = document.querySelector(".mojing-toolbar");
        const buttonsData = [
            { mode: "outline", label: "侦察一格", costKey: "outline" },
            { mode: "extract", label: "开取一格", costKey: "extract" },
            { id: "mojing-reveal-all", label: "全图轮廓", costKey: "revealAll" },
            { id: "mojing-extract-all", label: "全箱开取", costKey: "extractAll" },
            { id: "mojing-scan-rare", label: "稀有扫描", costKey: "scanRare" },
            { id: "mojing-reroll", label: "换箱弃置", costKey: "reroll" },
        ];

        toolbarContainer.innerHTML = "";
        buttonsData.forEach(btnData => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "mojing-tool";
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

    const buyButton = document.getElementById("mojing-buy");
    const game = document.getElementById("mojing-game");
    const board = document.getElementById("mojing-board");
    const sizeNode = document.getElementById("mojing-size");
    const modeLabel = document.getElementById("mojing-mode-label");
    const rareCount = document.getElementById("mojing-rare-count");
    const logList = document.getElementById("mojing-log");
    const modeButtons = document.querySelectorAll("[data-mode]");
    const revealAllButton = document.getElementById("mojing-reveal-all");
    const extractAllButton = document.getElementById("mojing-extract-all");
    const scanRareButton = document.getElementById("mojing-scan-rare");
    const rerollButton = document.getElementById("mojing-reroll");

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function readStoredSafe() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function saveSafe() {
        try {
            if (state.safe) {
                // 确保每个 item 字段完整
                state.safe.items.forEach(item => {
                    if (typeof item.outlined !== 'boolean') item.outlined = false;
                    if (typeof item.extracted !== 'boolean') item.extracted = false;
                });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state.safe));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch { }
    }

    function spend(amount, label) {
        if (window.GameState.spendCoins(amount, "mojing-spend")) return true;
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

    function rollQuality() {
        const total = QUALITY.reduce((sum, item) => sum + item.weight, 0);
        let roll = Math.random() * total;
        for (const item of QUALITY) {
            roll -= item.weight;
            if (roll <= 0) return item;
        }
        return QUALITY[0];
    }

    function makeSafe() {
        const n = randomInt(10, 20);
        const grid = Array.from({ length: n }, () => Array(n).fill(null));
        const items = [];
        let idCounter = 0;

        function canPlace(x, y, w, h) {
            if (x < 0 || y < 0 || x + w > n || y + h > n) return false;
            for (let dy = 0; dy < h; dy++)
                for (let dx = 0; dx < w; dx++)
                    if (grid[y + dy][x + dx] !== null) return false;
            return true;
        }

        function placeRect(rect) {
            for (let dy = 0; dy < rect.height; dy++)
                for (let dx = 0; dx < rect.width; dx++)
                    grid[rect.y + dy][rect.x + dx] = rect.id;
            items.push(rect);
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
                placeRect(rect);
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
                    } else {
                        placeRect(rect);
                    }
                }
            }
        }

        while (true) {
            const emptyCells = getEmptyCells();
            if (emptyCells.length === 0) break;
            const queue = generateInitialRects(emptyCells);
            expandRects(queue);
        }

        items.forEach((item) => {
            item.quality = rollQuality();
            item.area = item.width * item.height;
            item.value = Math.round(Math.pow(2, item.area / 18 + 2 * Math.random()) * item.area * item.quality.mult);
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
            button.disabled = !hasSafe || extractedDone || (mode === "outline" && outlinedDone);
        });

        if (state.mode === "outline" && outlinedDone && !extractedDone) {
            setMode("extract", false);
        }

        revealAllButton.disabled = !hasSafe || extractedDone || outlinedDone || state.safe.revealAllUsed;
        extractAllButton.disabled = !hasSafe || extractedDone || state.safe.extractAllUsed;
        scanRareButton.disabled = !hasSafe || extractedDone || state.safe.scanRareUsed;
    }

    function formatValue(value) {
        if (value >= 1_000_000) {
            const v = value / 1_000_000;
            return v.toPrecision(3) + "M";
        } else if (value >= 1_000) {
            const v = value / 1_000;
            return v.toPrecision(3) + "k";
        }
        return value.toString();
    }

    function renderBoard() {
        updateControls();
        if (!state.safe) return;
        board.style.setProperty("--mojing-n", String(state.safe.n));
        board.innerHTML = "";

        state.safe.items.forEach((item) => {
            const node = document.createElement("div");
            node.className = `mojing-item quality-${item.quality.key}`;
            node.dataset.itemId = item.id;
            node.style.gridColumn = `${item.x + 1} / span ${item.width}`;
            node.style.gridRow = `${item.y + 1} / span ${item.height}`;
            node.classList.toggle("is-outlined", item.outlined && !item.extracted);
            node.classList.toggle("is-extracted", item.extracted);
            node.innerHTML = `
                <div class="mojing-item-art"></div>
                <div class="mojing-item-value">${formatValue(item.value)}</div>
            `;
            board.appendChild(node);
        });

        for (let y = 0; y < state.safe.n; y++) {
            for (let x = 0; x < state.safe.n; x++) {
                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = "mojing-cell";
                cell.style.gridColumn = x + 1;
                cell.style.gridRow = y + 1;
                cell.dataset.x = String(x);
                cell.dataset.y = String(y);
                cell.addEventListener("click", () => handleCell({ x, y }));
                board.appendChild(cell);
            }
        }

        sizeNode.textContent = `${state.safe.n} x ${state.safe.n}`;
        rareCount.textContent = state.safe.rareKnown
            ? `稀有小格数量：${state.safe.grid.flat().reduce((sum, id) => {
                const item = state.safe.items.find(i => i.id === id);
                return sum + (item && ["purple", "gold", "red"].includes(item.quality.key) ? 1 : 0);
            }, 0)}`
            : "稀有小格数量：未知";
    }

    function setMode(mode, shouldUpdate = true) {
        state.mode = mode;
        modeButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.mode === mode);
        });
        modeLabel.textContent = mode === "extract" ? "开取一格" : "侦察一格";
        if (shouldUpdate) updateControls();
    }

    function extractItem(item, silent = false) {
        if (!item || item.extracted) return 0;
        item.extracted = true;
        item.outlined = true;
        window.GameState.addCoins(item.value, "mojing-loot");
        if (!silent) addLog(`获得物品，收益 ${item.value} Q币。`);
        return item.value;
    }

    function handleCell(cell) {
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
            addLog(`侦察到 ${item.width}x${item.height} 的灰色轮廓。`);
            saveSafe();
            renderBoard();
            return;
        }

        if (item.extracted) {
            addLog("这个物品已经取出。");
            return;
        }
        if (!spend(COSTS.extract, "开取一格")) return;
        extractItem(item);
        saveSafe();
        renderBoard();
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
        activateSafe(safe, `新保险箱入手：${safe.n}x${safe.n}。`);
    }

    buyButton.addEventListener("click", () => buySafe());
    modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (!button.disabled) setMode(button.dataset.mode);
        });
    });
    revealAllButton.addEventListener("click", () => {
        if (!state.safe || state.safe.revealAllUsed || allOutlined() || allExtracted()) return;
        if (!spend(COSTS.revealAll, "全图轮廓")) return;
        state.safe.revealAllUsed = true;
        state.safe.items.forEach((item) => {
            if (!item.extracted) item.outlined = true;
        });
        addLog("所有未开取物品轮廓已标记为灰色。");
        saveSafe();
        renderBoard();
    });
    extractAllButton.addEventListener("click", () => {
        if (!state.safe || state.safe.extractAllUsed || allExtracted()) return;
        if (!spend(COSTS.extractAll, "全箱开取")) return;
        state.safe.extractAllUsed = true;
        const total = state.safe.items.reduce((sum, item) => sum + extractItem(item, true), 0);
        addLog(`全箱开取完成，总收益 ${total} Q币。`);
        saveSafe();
        renderBoard();
    });
    scanRareButton.addEventListener("click", () => {
        if (!state.safe || state.safe.scanRareUsed || allExtracted()) return;
        if (!spend(COSTS.scanRare, "稀有扫描")) return;
        state.safe.scanRareUsed = true;
        state.safe.rareKnown = true;
        addLog("扫描完成：已获得紫/金/红品质小格总数。");
        saveSafe();
        renderBoard();
    });
    rerollButton.addEventListener("click", () => {
        if (state.safe && !allExtracted()) {
            const ok = window.confirm("当前保险箱仍有未开取物品，换箱会直接弃置。确认换箱吗？");
            if (!ok) return;
        }
        buySafe(COSTS.reroll, "换箱弃置");
    });

    const storedSafe = readStoredSafe();
    if (storedSafe && Array.isArray(storedSafe.items) && Array.isArray(storedSafe.grid)) {
        // 补充默认字段，避免旧数据缺失
        storedSafe.items.forEach(item => {
            if (typeof item.outlined !== 'boolean') item.outlined = false;
            if (typeof item.extracted !== 'boolean') item.extracted = false;
            if (!item.quality) item.quality = rollQuality(); // 保证旧数据有质量字段
        });
        activateSafe(storedSafe, "已恢复上次保险箱。");
    } else {
        updateControls();
    }
})();