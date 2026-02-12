/************************************************************
 * cacheLoader.js
 * 通用本地缓存加载器（带过期时间）
 *
 * 用法：
 * loadWithCache({
 *   key: "records",
 *   expire: 24 * 60 * 60 * 1000,
 *   loader: async () => {...}
 * })
 *
 * 额外能力：
 * - clearCache(key?)：清除指定 / 全部缓存
 ************************************************************/

/* ===============================
   缓存前缀（防止误删其他项目）
   =============================== */
const CACHE_PREFIX = "classRecord";

/* ===============================
   通用加载器
   =============================== */
window.loadWithCache = async function ({
    key,
    expire = 24 * 60 * 60 * 1000,
    loader
}) {
    if (!key || typeof loader !== "function") {
        throw new Error("loadWithCache: key 和 loader 是必须的");
    }

    const dataKey = `${CACHE_PREFIX}:${key}:data`;
    const timeKey = `${CACHE_PREFIX}:${key}:time`;
    const now = Date.now();

    const cachedData = localStorage.getItem(dataKey);
    const cachedTime = localStorage.getItem(timeKey);

    /* ===============================
       ① 缓存有效 → 直接返回
       =============================== */
    if (
        cachedData &&
        cachedTime &&
        now - Number(cachedTime) < expire
    ) {
        console.log(`📦 使用缓存：${key}`);
        return JSON.parse(cachedData);
    }

    /* ===============================
       ② 缓存失效 → 清理
       =============================== */
    console.log(`♻️ 缓存失效，重新加载：${key}`);
    localStorage.removeItem(dataKey);
    localStorage.removeItem(timeKey);

    /* ===============================
       ③ 调用真正的加载逻辑
       =============================== */
    const data = await loader();

    /* ===============================
       ④ 写入缓存
       =============================== */
    localStorage.setItem(dataKey, JSON.stringify(data));
    localStorage.setItem(timeKey, now.toString());

    return data;
};

/* ===============================
   🧹 手动清理缓存（新增）
   =============================== */
window.clearCache = function () {
    // 清空本项目所有缓存
    Object.keys(localStorage).forEach(k => {
        if (k.startsWith(CACHE_PREFIX + ":")) {
            localStorage.removeItem(k);
        }
    });
    console.log("🧹 已清除缓存");
};

window.needsCacheLoad = function ({ expire = 24 * 60 * 60 * 1000 } = {}) {
    return !isCacheValid("records", expire)
        || !isCacheValid("people", expire)
        || !isCacheValid("glossary", expire);
};

function isCacheValid(key, expire) {
    const dataKey = `${CACHE_PREFIX}:${key}:data`;
    const timeKey = `${CACHE_PREFIX}:${key}:time`;
    const cachedData = localStorage.getItem(dataKey);
    const cachedTime = localStorage.getItem(timeKey);

    if (!cachedData || !cachedTime) {
        return false;
    }

    return Date.now() - Number(cachedTime) < expire;
}

function showLoadingOverlay() {
    if (document.getElementById("loading-overlay")) {
        return;
    }

    const overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.innerHTML = `
        <div class="loading-overlay-card">
            <div class="loading-overlay-title">正在加载缓存数据…</div>
            <div class="loading-overlay-subtitle">首次进入或清理缓存时会稍慢一些</div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
        overlay.remove();
    }
}

window.ensureAllCachesLoaded = async function ({ expire = 24 * 60 * 60 * 1000, showOverlay = true, onProgress } = {}) {
    const needsLoad = window.needsCacheLoad({ expire });

    if (!needsLoad) {
        return;
    }

    if (showOverlay) {
        showLoadingOverlay();
    }

    try {
        if (typeof onProgress === "function") {
            const getBatchSize = async (indexPath) => {
                const res = await fetch(indexPath);
                const files = await res.json();
                return Array.isArray(files) ? files.length : 0;
            };

            const [recordCount, peopleCount, glossaryCount] = await Promise.all([
                getBatchSize("data/record/records_index.json"),
                getBatchSize("data/people/people_index.json"),
                getBatchSize("data/glossary/glossary_index.json")
            ]);

            const totalSteps = recordCount + peopleCount + glossaryCount;
            let completedSteps = 0;
            let lastProgress = 0;

            const emitProgress = () => {
                if (totalSteps <= 0) {
                    onProgress(0);
                    return;
                }
                const nextProgress = completedSteps / totalSteps;
                lastProgress = Math.max(lastProgress, nextProgress);
                onProgress(lastProgress);
            };

            const onProgressStep = () => {
                completedSteps += 1;
                emitProgress();
            };

            onProgress(0);
            await loadAllRecords({ onProgressStep });
            await loadAllPeople({ onProgressStep });
            await loadAllGlossary({ onProgressStep });
            onProgress(1);
        } else {
            await Promise.all([
                loadAllRecords(),
                loadAllPeople(),
                loadAllGlossary()
            ]);
        }
    } finally {
        if (showOverlay) {
            hideLoadingOverlay();
        }
    }
};