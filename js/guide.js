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

    window.cacheReadyPromise.finally(showNav);

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
