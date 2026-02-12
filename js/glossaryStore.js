/************************************************************
 * glossaryStore.js
 * 全局术语仓库（带缓存 + Store）
 ************************************************************/

window.GlossaryStore = {
    terms: [],
    loaded: false
};

window.loadAllGlossary = async function ({ onProgressStep } = {}) {
    if (GlossaryStore.loaded) {
        return GlossaryStore.terms;
    }

    // 使用通用缓存加载函数
    const list = await loadWithCache({
        key: "glossary",
        expire: 24 * 60 * 60 * 1000, // 24小时过期
        loader: async () => {
            // 先获取索引文件
            const indexRes = await fetch("data/glossary/glossary_index.json");
            const files = await indexRes.json();


            const terms = await Promise.all(
                files.map(async (f) => {
                    const res = await fetch(`data/glossary/${f}`);
                    const term = await res.json();

                    if (typeof onProgressStep === "function") {
                        onProgressStep();
                    }

                    return term;
                })
            );

            return terms;
        }
    });

    GlossaryStore.terms = list;
    GlossaryStore.loaded = true;
    return list;
};
