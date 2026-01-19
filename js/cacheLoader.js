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
 ************************************************************/

window.loadWithCache = async function ({
    key,
    expire = 24 * 60 * 60 * 1000,
    loader
}) {
    if (!key || typeof loader !== "function") {
        throw new Error("loadWithCache: key 和 loader 是必须的");
    }

    const dataKey = `${key}_cache`;
    const timeKey = `${key}_cache_time`;
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
