/************************************************************
 * guide.js
 * 导览页面逻辑
 ************************************************************/

(() => {
    const progressWrap = document.getElementById('guide-progress');
    const progressFill = document.getElementById('guide-progress-fill');
    const progressText = document.getElementById('guide-progress-text');
    const nav = document.getElementById('guide-nav');

    const setProgress = (value) => {
        const percent = Math.max(0, Math.min(100, Math.round(value * 100)));
        if (progressFill) {
            progressFill.style.width = `${percent}%`;
        }
        if (progressText) {
            progressText.textContent = `缓存加载中 ${percent}%`;
        }
    };


    const renderGuideHighlights = () => {
        const wrap = document.getElementById('guide-highlights');
        if (!wrap) {
            return;
        }

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
            const tips = [
                '💡 小提示：人物页支持多维排序，适合快速找人。',
                '📝 小提示：记录页可先看最新日期，再按兴趣筛选。',
                '📚 小提示：术语页可以快速补齐班级“黑话”背景。'
            ];
            tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];
        }

        wrap.hidden = false;
    };

    const showNav = () => {
        if (progressWrap) {
            progressWrap.hidden = true;
        }
        if (nav) {
            nav.hidden = false;
            requestAnimationFrame(() => nav.classList.add('is-visible'));
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
