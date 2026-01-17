/************************************************************
 * recordStore.js
 * 全局记录仓库（统一生成 record.id）
 ************************************************************/

window.RecordStore = {
    records: [],
    loaded: false
};

window.loadAllRecords = async function () {
    if (RecordStore.loaded) {
        return RecordStore.records;
    }

    // 检查缓存是否过期（比如过期时间为24小时）
    const cacheTimestamp = localStorage.getItem("cacheTimestamp");
    const now = Date.now();
    if (!cacheTimestamp || now - cacheTimestamp > 86400000) {  // 24小时过期
        console.log("缓存已过期，重新加载数据");
        localStorage.removeItem("records"); // 清除缓存
        localStorage.removeItem("cacheTimestamp"); // 清除缓存时间戳
    }

    // 先尝试从缓存中读取数据
    const cachedRecords = localStorage.getItem("records");
    if (cachedRecords) {
        console.log("使用缓存数据");
        RecordStore.records = JSON.parse(cachedRecords);
        RecordStore.loaded = true;
        return RecordStore.records;
    }

    // 如果缓存中没有，则从网络请求数据
    const indexRes = await fetch("data/record/records_index.json");
    const files = await indexRes.json();

    const list = [];

    for (let i = 0; i < files.length; i++) {
        const r = await fetch(`data/record/${files[i]}`);
        const record = await r.json();

        // 自动生成 id
        record.id = `R${String(i + 1).padStart(3, "0")}`;
        list.push(record);
    }

    // 缓存记录和缓存时间戳
    localStorage.setItem("records", JSON.stringify(list));
    localStorage.setItem("cacheTimestamp", now);

    RecordStore.records = list;
    RecordStore.loaded = true;
    return list;
};
