/************************************************************
 * guide.js
 * 导览页面逻辑
 ************************************************************/

(() => {
    const progressWrap = document.getElementById('guide-progress');
    const progressFill = document.getElementById('guide-progress-fill');
    const progressText = document.getElementById('guide-progress-text');

    const setProgress = (value) => {
        const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = `缓存加载中 ${percent}%`;
        }
    };


    let tipTimer = null;

    const startTipRotation = (tipEl) => {
        const tips = [
            '💡 小提示：人物页支持多维排序，适合快速找人。',
            '📝 小提示：记录页可先看最新日期，再按兴趣筛选。',
            '📚 小提示：术语页可以快速补齐班级“黑话”背景。',
            '🔎 小提示：记录详情里的人名和术语都可点击跳转查看。',
            '📅 小提示：按日期先浏览，再看人物关系会更容易串起事件。',
            '🧠 小提示：先看速览数据，再进入具体页面会更高效。'
        ];

        if (!tipEl || tips.length === 0) {
            return;
        }

        let currentIndex = Math.floor(Math.random() * tips.length);
        tipEl.textContent = tips[currentIndex];

        if (tips.length === 1) {
            return;
        }

        const switchTip = () => {
            let nextIndex = currentIndex;
            while (nextIndex === currentIndex) {
                nextIndex = Math.floor(Math.random() * tips.length);
            }

            tipEl.classList.add('is-switching');
            window.setTimeout(() => {
                currentIndex = nextIndex;
                tipEl.textContent = tips[currentIndex];
                tipEl.classList.remove('is-switching');
            }, 280);
        };

        if (tipTimer) {
            window.clearInterval(tipTimer);
        }
        tipTimer = window.setInterval(switchTip, 3600);
    };


    const bindStatCardLinks = () => {
        const cards = document.querySelectorAll('.guide-stat-link[data-target]');
        cards.forEach((card) => {
            const target = card.getAttribute('data-target');
            if (!target) {
                return;
            }

            card.addEventListener('click', () => {
                location.href = target;
            });

            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    location.href = target;
                }
            });
        });
    };

    const renderGuideHighlights = async () => {
        const wrap = document.getElementById('guide-highlights');
        if (!wrap) {
            return;
        }

        await Promise.all([
            typeof window.loadAllRecords === 'function' ? window.loadAllRecords() : Promise.resolve([]),
            typeof window.loadAllPeople === 'function' ? window.loadAllPeople() : Promise.resolve([]),
            typeof window.loadAllGlossary === 'function' ? window.loadAllGlossary() : Promise.resolve([])
        ]);

        const records = Array.isArray(window.RecordStore?.records) ? window.RecordStore.records : [];
        const people = Array.isArray(window.PeopleStore?.people) ? window.PeopleStore.people : [];
        const terms = Array.isArray(window.GlossaryStore?.terms) ? window.GlossaryStore.terms : [];

        const latestDate = records
            .map((item) => item?.date)
            .filter(Boolean)
            .sort()
            .at(-1) || '暂无';

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = String(value);
            }
        };

        setText('guide-record-count', records.length);
        setText('guide-people-count', people.length);
        setText('guide-term-count', terms.length);
        setText('guide-latest-date', latestDate);

        const tipEl = document.getElementById('guide-tip');
        if (tipEl) {
            startTipRotation(tipEl);
        }

        wrap.hidden = false;
    };

    const showNav = () => {
        if (progressWrap) {
            progressWrap.hidden = true;
        }
    };

    const waitForAccess = () => {
        if (typeof window.waitForAccess === 'function') {
            return window.waitForAccess();
        }

        return new Promise((resolve) => {
            window.addEventListener('authGateReady', () => {
                window.waitForAccess().then(resolve);
            }, { once: true });
        });
    };

    window.cacheReadyPromise = (async () => {
        await waitForAccess();

        const needsLoad = typeof window.needsCacheLoad === 'function' && window.needsCacheLoad();
        if (needsLoad && progressWrap) {
            progressWrap.hidden = false;
            setProgress(0);
        }

        await window.ensureAllCachesLoaded({
            showOverlay: false,
            onProgress: (progress) => {
                if (progressWrap) {
                    progressWrap.hidden = false;
                }
                setProgress(progress);
            }
        });
    })();

    bindStatCardLinks();

    window.cacheReadyPromise
        .then(renderGuideHighlights)
        .finally(showNav);

    const refreshBtn = document.getElementById('refresh-cache-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            const ok = confirm('将清空所有本地缓存并重新加载数据，是否继续？');
            if (!ok) {
                return;
            }
            if (typeof window.clearCache === 'function') {
                window.clearCache();
            }
            location.reload();
        });
    }
})();
