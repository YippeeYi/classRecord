/************************************************************
 * recordStore.js
 * 全局记录仓库
 ************************************************************/

window.RecordStore = {
    records: [],
    loaded: false
};

window.loadAllRecords = async function ({ onBatchSize, onProgressStep } = {}) {
    if (RecordStore.loaded) {
        return RecordStore.records;
    }

    const list = await loadWithCache({
        key: "records",
        expire: 24 * 60 * 60 * 1000,
        loader: async () => {
            const indexRes = await fetch("data/record/records_index.json");
            const files = await indexRes.json();

            if (typeof onBatchSize === "function") {
                onBatchSize(files.length);
            }

            const records = [];

            for (let i = 0; i < files.length; i++) {
                const res = await fetch(`data/record/${files[i]}`);
                const record = await res.json();

                // 生成id
                if (!record.id) {
                    record.id = `R${String(i + 1).padStart(3, "0")}`;
                }

                records.push(record);

                if (typeof onProgressStep === "function") {
                    onProgressStep();
                }
            }

            return records;
        }
    });

    RecordStore.records = list;
    RecordStore.loaded = true;
    return list;
};
