(() => {
    const canvas = document.getElementById("parkour-canvas");
    const ctx = canvas.getContext("2d");
    const scoreNode = document.getElementById("parkour-score");
    const livesNode = document.getElementById("parkour-lives");
    const timeNode = document.getElementById("parkour-time");
    const toggleButton = document.getElementById("parkour-toggle");
    const eventNode = document.getElementById("parkour-event");
    const leaderboardNode = document.getElementById("parkour-leaderboard");
    const inventoryNode = document.getElementById("parkour-inventory");
    const leaderboardKey = "classRecord:parkour:leaderboard";
    const inventoryKey = "classRecord:parkour:inventory";
    const scenes = [
        { id: "classroom", name: "教室", base: "#c7d8ed", stripe: "#adc4dc", obstacles: ["飞来的粉笔", "扫帚", "课桌"] },
        { id: "playground", name: "操场", base: "#8ccf91", stripe: "#6eb977", obstacles: ["篮球", "跳绳", "冲刺同学"] },
        { id: "gym", name: "体育馆", base: "#d9b071", stripe: "#c8934e", obstacles: ["排球", "移动球筐", "垫子"] },
        { id: "canteen", name: "食堂", base: "#e6c27a", stripe: "#d0a65d", obstacles: ["饭点人潮", "餐盘", "队伍"] },
        { id: "pingpong", name: "乒乓球室", base: "#78b7c5", stripe: "#5da0ad", obstacles: ["乒乓球", "球拍", "球桌角"] },
        { id: "hall", name: "过渡走廊", base: "#b8b4cf", stripe: "#9f9ab9", obstacles: ["书包", "拖把桶", "转角同学"] }
    ];
    const weathers = ["晴", "小雨", "阴", "大风", "薄雾"];
    const relics = ["情书碎片", "生物作业", "避雷针传说", "银狼贴纸", "锁哥钥匙", "摸鱼奖章", "跑操号码布", "食堂饭卡"];
    let records = [];
    let running = false;
    let lastTime = 0;
    let direction = 0;
    let worldY = 0;
    let playerX = 0;
    let lives = 3;
    let score = 0;
    let invincible = 0;
    let speed = 150;
    let spawnTimer = 0;
    let itemTimer = 0;
    let eventTimer = 0;
    let weather = weathers[0];
    let objects = [];

    function loadJson(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
    }

    function saveJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getLeaderboard() {
        return loadJson(leaderboardKey, []);
    }

    function getInventory() {
        return loadJson(inventoryKey, []);
    }

    function renderLeaderboard() {
        const entries = getLeaderboard();
        leaderboardNode.innerHTML = entries.length ? entries.map((entry) => `<li><span>${entry.name}</span><strong>${entry.score}</strong></li>`).join("") : "<li>暂无记录</li>";
    }

    function renderInventory() {
        const inventory = getInventory();
        inventoryNode.innerHTML = relics.map((name) => `<span class="parkour-relic${inventory.includes(name) ? " is-owned" : ""}">${name}</span>`).join("");
    }

    function currentScene() {
        return scenes[Math.abs(Math.floor(worldY / 900)) % scenes.length];
    }

    function currentTimeName() {
        const phase = Math.floor(worldY / 1200) % 4;
        return ["早晨", "中午", "傍晚", "晚上"][phase];
    }

    function resetGame() {
        running = false;
        direction = 0;
        worldY = 0;
        playerX = 0;
        lives = 3;
        score = 0;
        invincible = 0;
        speed = 150;
        spawnTimer = 0;
        itemTimer = 0;
        eventTimer = 0;
        weather = weathers[Math.floor(Math.random() * weathers.length)];
        objects = [];
        toggleButton.textContent = "开始跑酷";
        updateHud();
        draw();
    }

    function updateHud() {
        scoreNode.textContent = String(score);
        livesNode.textContent = String(lives);
        const scene = currentScene();
        timeNode.textContent = `${currentTimeName()} · ${weather} · ${scene.name}`;
    }

    function spawnObstacle() {
        const scene = currentScene();
        objects.push({
            type: "obstacle",
            label: scene.obstacles[Math.floor(Math.random() * scene.obstacles.length)],
            x: (Math.random() - 0.5) * 720,
            y: -360,
            w: 34 + Math.random() * 34,
            h: 34 + Math.random() * 34,
            vx: 0,
            color: "#7f1d1d"
        });
    }

    function spawnItem() {
        const good = Math.random() > 0.38;
        objects.push({
            type: good ? "boost" : "debuff",
            label: good ? "加速星" : "缓速雾",
            x: (Math.random() - 0.5) * 680,
            y: -360,
            w: 28,
            h: 28,
            vx: 0,
            color: good ? "#facc15" : "#6b7280"
        });
    }

    function spawnRecordScene() {
        const record = records[Math.floor(Math.random() * records.length)];
        if (!record) return;
        objects.push({
            type: "event",
            label: stripRecordMarkup(record.content || "编日史事件").slice(0, 18),
            x: (Math.random() - 0.5) * 620,
            y: -380,
            w: 86,
            h: 46,
            vx: 0,
            color: "#4338ca"
        });
        if (Math.random() > 0.45) spawnRelic(true);
    }

    function spawnRelic(linked = false) {
        const inventory = getInventory();
        const available = relics.filter((name) => !inventory.includes(name));
        if (!available.length) return;
        objects.push({
            type: "relic",
            label: available[Math.floor(Math.random() * available.length)],
            x: (Math.random() - 0.5) * 620,
            y: linked ? -430 : -360,
            w: 30,
            h: 30,
            vx: 0,
            color: "#14b8a6"
        });
    }

    function hit(a, b) {
        return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
    }

    function endGame() {
        running = false;
        toggleButton.textContent = "重新开始";
        const leaderboard = getLeaderboard();
        const qualifies = leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score;
        if (qualifies) {
            const name = prompt("跑酷成绩可以上榜！请输入玩家名字：", "匿名同学") || "匿名同学";
            leaderboard.push({ name: name.slice(0, 12), score });
            leaderboard.sort((a, b) => b.score - a.score);
            saveJson(leaderboardKey, leaderboard.slice(0, 10));
            renderLeaderboard();
        }
    }

    function update(delta) {
        if (!running) return;
        const dt = Math.min(delta / 1000, 0.033);
        worldY += speed * dt;
        score = Math.floor(worldY);
        playerX += direction * 115 * dt;
        playerX = Math.max(-360, Math.min(360, playerX));
        speed = Math.min(270, speed + dt * 2.5);
        invincible = Math.max(0, invincible - dt);
        spawnTimer -= dt;
        itemTimer -= dt;
        eventTimer -= dt;
        if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = Math.max(0.32, 1.05 - speed / 460); }
        if (itemTimer <= 0) { Math.random() > 0.35 ? spawnItem() : spawnRelic(); itemTimer = 4 + Math.random() * 3; }
        if (eventTimer <= 0) { spawnRecordScene(); eventTimer = 7 + Math.random() * 5; }
        if (Math.floor(worldY / 1000) !== Math.floor((worldY - speed * dt) / 1000)) weather = weathers[Math.floor(Math.random() * weathers.length)];

        const player = { x: playerX, y: 0, w: 30, h: 34 };
        objects.forEach((object) => {
            object.y += speed * dt;
            if (!object.used && hit(player, object)) {
                object.used = true;
                if (object.type === "obstacle" && invincible <= 0) {
                    lives -= 1;
                    invincible = 1.2;
                    if (lives <= 0) endGame();
                } else if (object.type === "boost") {
                    score += 120;
                    invincible = 0.8;
                } else if (object.type === "debuff") {
                    speed = Math.max(120, speed - 35);
                } else if (object.type === "event") {
                    eventNode.textContent = object.label;
                    score += 80;
                } else if (object.type === "relic") {
                    const inventory = getInventory();
                    if (!inventory.includes(object.label)) {
                        inventory.push(object.label);
                        saveJson(inventoryKey, inventory);
                        renderInventory();
                    }
                    score += 160;
                }
            }
        });
        objects = objects.filter((object) => object.y < 380 && !object.used);
        updateHud();
    }

    function drawPixelRect(x, y, w, h, color) {
        ctx.fillStyle = color;
        ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    function draw() {
        const scene = currentScene();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = scene.base;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const offset = Math.floor(worldY % 96);
        for (let y = -96; y < canvas.height + 96; y += 96) {
            ctx.fillStyle = scene.stripe;
            ctx.fillRect(0, y + offset, canvas.width, 12);
        }
        ctx.fillStyle = currentTimeName() === "晚上" ? "rgba(17, 24, 39, 0.28)" : currentTimeName() === "中午" ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 244, 214, 0.12)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        objects.forEach((object) => {
            drawPixelRect(cx + object.x - object.w / 2, cy + object.y - object.h / 2, object.w, object.h, object.color);
            ctx.fillStyle = "#fff";
            ctx.font = "12px sans-serif";
            ctx.fillText(object.label, cx + object.x - object.w / 2, cy + object.y - object.h / 2 - 5);
        });
        drawPixelRect(cx + playerX - 14, cy - 18, 28, 36, invincible > 0 ? "#fef08a" : "#1d4ed8");
        drawPixelRect(cx + playerX - 8, cy - 30, 16, 14, "#f8c9a5");
        requestAnimationFrame(loop);
    }

    function loop(time = 0) {
        const delta = time - lastTime;
        lastTime = time;
        update(delta);
        draw();
    }

    function setDirection(value) {
        direction = Number(value) || 0;
        document.querySelectorAll(".parkour-dir").forEach((button) => button.classList.toggle("is-active", Number(button.dataset.dir) === direction));
    }

    toggleButton.addEventListener("click", () => {
        if (lives <= 0 || toggleButton.textContent === "重新开始") resetGame();
        running = !running;
        toggleButton.textContent = running ? "暂停跑酷" : "继续跑酷";
    });
    document.querySelectorAll(".parkour-dir").forEach((button) => button.addEventListener("click", () => setDirection(button.dataset.dir)));
    document.addEventListener("keydown", (event) => {
        if (event.code === "Space") { event.preventDefault(); toggleButton.click(); }
        if (["ArrowLeft", "KeyA"].includes(event.code)) setDirection(Math.max(-2, direction - 1));
        if (["ArrowRight", "KeyD"].includes(event.code)) setDirection(Math.min(2, direction + 1));
    });

    (window.cacheReadyPromise || Promise.resolve()).then(() => loadAllRecords()).then((loaded) => {
        records = loaded.filter((record) => record.content);
        renderLeaderboard();
        renderInventory();
        resetGame();
        requestAnimationFrame(loop);
    });
})();
