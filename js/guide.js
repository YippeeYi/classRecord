/************************************************************
 * guide.js
 * 导览页面逻辑
 ************************************************************/

(() => {
    const loadingText = document.getElementById('guide-loading-text');
    const nav = document.getElementById('guide-nav');

    const showNav = () => {
        if (loadingText) {
            loadingText.hidden = true;
        }
        if (nav) {
            nav.hidden = false;
            requestAnimationFrame(() => nav.classList.add('is-visible'));
        }
    };

    if (loadingText && typeof window.needsCacheLoad === 'function' && window.needsCacheLoad()) {
        loadingText.hidden = false;
    }

    const cacheReady = window.cacheReadyPromise || Promise.resolve();
    cacheReady.finally(showNav);

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
