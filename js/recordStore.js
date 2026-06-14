/************************************************************
 * recordStore.js
 * 全局记录仓库
 ************************************************************/

window.RecordStore = {
    records: [],
    loaded: false
};

window.loadAllRecords = async function ({ onProgressStep } = {}) {
    if (RecordStore.loaded) {
        return RecordStore.records;
    }

    const list = await loadWithCache({
        key: "records",
        expire: 24 * 60 * 60 * 1000,
        loader: async () => {
            const indexRes = await fetch("data/record/records_index.json");
            if (!indexRes.ok) {
                throw new Error(`记录索引加载失败：${indexRes.status}`);
            }
            const files = await indexRes.json();


            const records = await Promise.all(
                files.map(async (file, i) => {
                    try {
                        const res = await fetch(`data/record/${file}`);
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}`);
                        }
                        const record = await res.json();
                        if (!record.time) {
                            delete record.time;
                        }
                        record.fileName = file;
                        record.recordIndex = i;
                        record.date = file.slice(0, 10);

                        // 生成id
                        if (!record.id) {
                            record.id = `R${String(i + 1).padStart(3, "0")}`;
                        }

                        return record;
                    } catch (error) {
                        console.warn(`跳过无法加载的记录文件：${file}`, error);
                        return null;
                    } finally {
                        if (typeof onProgressStep === "function") {
                            onProgressStep();
                        }
                    }
                })
            );

            return records.filter(Boolean);
        }
    });

    const normalizedList = list.filter(Boolean);

    normalizedList.forEach((record, index) => {
        if (!record.time) {
            delete record.time;
        }
        if (!Number.isInteger(record.recordIndex)) {
            record.recordIndex = index;
        }
    });

    RecordStore.records = normalizedList;
    RecordStore.loaded = true;
    return normalizedList;
};
