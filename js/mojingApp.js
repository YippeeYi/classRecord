(() => {
    const COSTS = {
        buy: 30,
        outline: 8,
        extract: 28,
        revealAll: 70,
        extractAll: 160,
        scanRare: 45,
        reroll: 35
    };
    const QUALITY = [
        { key: "white", label: "白", weight: 44, mult: 1.0 },
        { key: "green", label: "绿", weight: 26, mult: 1.45 },
        { key: "blue", label: "蓝", weight: 16, mult: 2.1 },
        { key: "purple", label: "紫", weight: 8, mult: 3.25 },
        { key: "gold", label: "金", weight: 4, mult: 5.2 },
        { key: "red", label: "红", weight: 2, mult: 8.4 }
    ];
    const state = {
        safe: null,
        mode: "outline"
    };

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

    function isEmpty(grid, x, y) {
        return y >= 0 && y < grid.length && x >= 0 && x < grid.length && grid[y][x] === null;
    }

    function firstEmpty(grid) {
        for (let y = 0; y < grid.length; y += 1) {
            for (let x = 0; x < grid.length; x += 1) {
                if (grid[y][x] === null) return { x, y };
            }
        }
        return null;
    }

    function maxHeightForWidth(grid, x, y, width) {
        let height = 0;
        while (height < 6 && y + height < grid.length) {
            for (let dx = 0; dx < width; dx += 1) {
                if (!isEmpty(grid, x + dx, y + height)) return height;
            }
            height += 1;
        }
        return height;
    }

    function makeSafe() {
        const n = randomInt(9, 12);
        const grid = Array.from({ length: n }, () => Array.from({ length: n }, () => null));
        const items = [];

        while (firstEmpty(grid)) {
            const { x, y } = firstEmpty(grid);
            let maxW = 0;
            while (maxW < 6 && x + maxW < n && isEmpty(grid, x + maxW, y)) {
                maxW += 1;
            }
            const width = randomInt(1, Math.max(1, maxW));
            const maxH = Math.max(1, maxHeightForWidth(grid, x, y, width));
            const height = randomInt(1, maxH);
            const quality = rollQuality();
            const id = `item-${items.length}`;
            const area = width * height;
            const value = Math.round(area * (10 + randomInt(0, 7)) * quality.mult);
            const item = {
                id,
                x,
                y,
                width,
                height,
                area,
                value,
                quality,
                outlined: false,
                extracted: false
            };
            items.push(item);
            for (let dy = 0; dy < height; dy += 1) {
                for (let dx = 0; dx < width; dx += 1) {
                    grid[y + dy][x + dx] = id;
                }
            }
        }

        return { n, grid, items, rareKnown: false };
    }

    function itemAt(cell) {
        if (!state.safe) return null;
        const id = state.safe.grid[cell.y][cell.x];
        return state.safe.items.find((item) => item.id === id) || null;
    }

    function renderBoard() {
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
                <div class="mojing-item-meta">
                    <strong>${item.quality.label}级物品</strong>
                    <span>${item.width}x${item.height} · ${item.value} Q币</span>
                </div>
            `;
            board.appendChild(node);
        });

        for (let y = 0; y < state.safe.n; y += 1) {
            for (let x = 0; x < state.safe.n; x += 1) {
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
            ? `稀有小格数量：${state.safe.items.filter((item) => ["purple", "gold", "red"].includes(item.quality.key)).reduce((sum, item) => sum + item.area, 0)}`
            : "稀有小格数量：未知";
    }

    function setMode(mode) {
        state.mode = mode;
        modeButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.mode === mode);
        });
        modeLabel.textContent = mode === "extract" ? "开取一格" : "侦察一格";
    }

    function extractItem(item, silent = false) {
        if (!item || item.extracted) return 0;
        item.extracted = true;
        item.outlined = true;
        window.GameState.addCoins(item.value, "mojing-loot");
        if (!silent) addLog(`获得 ${item.quality.label}级物品，收益 ${item.value} Q币。`);
        return item.value;
    }

    function handleCell(cell) {
        const item = itemAt(cell);
        if (!item) return;
        if (state.mode === "outline") {
            if (item.outlined) {
                addLog("这个轮廓已经侦察过。");
                return;
            }
            if (!spend(COSTS.outline, "侦察一格")) return;
            item.outlined = true;
            addLog(`侦察到 ${item.width}x${item.height} 的灰色轮廓。`);
            renderBoard();
            return;
        }
        if (item.extracted) {
            addLog("这个物品已经取出。");
            return;
        }
        if (!spend(COSTS.extract, "开取一格")) return;
        extractItem(item);
        renderBoard();
    }

    function buySafe(cost = COSTS.buy, label = "购买保险箱") {
        if (!spend(cost, label)) return;
        state.safe = makeSafe();
        game.hidden = false;
        setMode("outline");
        addLog(`新保险箱入手：${state.safe.n}x${state.safe.n}。`);
        renderBoard();
    }

    buyButton.addEventListener("click", () => buySafe());
    modeButtons.forEach((button) => {
        button.addEventListener("click", () => setMode(button.dataset.mode));
    });
    revealAllButton.addEventListener("click", () => {
        if (!state.safe || !spend(COSTS.revealAll, "全图轮廓")) return;
        state.safe.items.forEach((item) => {
            if (!item.extracted) item.outlined = true;
        });
        addLog("所有未开取物品轮廓已标记为灰色。");
        renderBoard();
    });
    extractAllButton.addEventListener("click", () => {
        if (!state.safe || !spend(COSTS.extractAll, "全箱开取")) return;
        const total = state.safe.items.reduce((sum, item) => sum + extractItem(item, true), 0);
        addLog(`全箱开取完成，总收益 ${total} Q币。`);
        renderBoard();
    });
    scanRareButton.addEventListener("click", () => {
        if (!state.safe || !spend(COSTS.scanRare, "稀有扫描")) return;
        state.safe.rareKnown = true;
        addLog("扫描完成：已获得紫/金/红品质小格总数。");
        renderBoard();
    });
    rerollButton.addEventListener("click", () => {
        buySafe(COSTS.reroll, "换箱弃置");
    });
})();
