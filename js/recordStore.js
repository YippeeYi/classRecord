/************************************************************
 * recordStore.js
 * 全局记录仓库（只负责统一持有 records）
 ************************************************************/

window.RecordStore = {
    records: [],
    loaded: false
};

/**
 * 统一加载所有记录（只会执行一次）
 */
window.loadAllRecords = async function () {
    if (RecordStore.loaded) {
        return RecordStore.records;
    }

    // 直接调用公共缓存模块
    const list = await loadRecordsWithCache();

    list.forEach((r, i) => {
        if (!r.id) {
            r.id = `R${String(i + 1).padStart(3, "0")}`;
        }
    });

    RecordStore.records = list;
    RecordStore.loaded = true;
    return list;
};
