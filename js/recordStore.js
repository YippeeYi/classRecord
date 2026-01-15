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

    const res = await fetch("data/record/records_index.json");
    const files = await res.json();

    const list = [];

    for (let i = 0; i < files.length; i++) {
        const r = await fetch(`data/record/${files[i]}`);
        const record = await r.json();

        // ✅ 只在这里生成 id
        record.id = `R${String(i + 1).padStart(3, "0")}`;

        list.push(record);
    }

    RecordStore.records = list;
    RecordStore.loaded = true;
    return list;
};
