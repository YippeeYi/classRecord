/************************************************************
 * cacheLoader.js
 * 公共缓存加载模块
 * - 支持 index.json + 分文件结构
 * - localStorage 缓存
 ************************************************************/

/**
 * 通用缓存加载器
 * @param {string} cacheKey localStorage key
 * @param {string} indexUrl 索引文件路径
 * @param {string} basePath 数据文件所在目录
 * @returns {Promise<Array>}
 */
function loadWithCache(cacheKey, indexUrl, basePath) {
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
        return Promise.resolve(JSON.parse(cache));
    }

    return fetch(indexUrl)
        .then(res => {
            if (!res.ok) throw new Error("Index fetch failed");
            return res.json();
        })
        .then(files =>
            Promise.all(
                files.map(f =>
                    fetch(`${basePath}/${f}`).then(r => r.json())
                )
            )
        )
        .then(list => {
            localStorage.setItem(cacheKey, JSON.stringify(list));
            return list;
        });
}

/* ===============================
   专用封装（更语义化）
   =============================== */

function loadPeopleWithCache() {
    return loadWithCache(
        "classRecord_people_v1",
        "data/people/people_index.json",
        "data/people"
    );
}

function loadRecordsWithCache() {
    return loadWithCache(
        "classRecord_records_v1",
        "data/record/records_index.json",
        "data/record"
    );
}
