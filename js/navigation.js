/************************************************************
 * navigation.js
 * 全站跳转过渡 + 轻量预取
 ************************************************************/

(() => {
    const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TRANSITION_MS = REDUCED_MOTION ? 0 : 180;
    const FULLSCREEN_STORAGE_KEY = 'classRecord:keepFullscreen';
    let isNavigating = false;

    const syncFullscreenPreference = () => {
        try {
            if (isNavigating) {
                sessionStorage.setItem(FULLSCREEN_STORAGE_KEY, '1');
                return;
            }
            if (document.fullscreenElement) {
                sessionStorage.setItem(FULLSCREEN_STORAGE_KEY, '1');
            } else {
                sessionStorage.removeItem(FULLSCREEN_STORAGE_KEY);
            }
        } catch (error) {
            // Ignore storage failures.
        }
    };

    const markEntering = () => {
        document.body.classList.add('page-ready');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', markEntering, { once: true });
    } else {
        markEntering();
    }

    document.addEventListener('fullscreenchange', syncFullscreenPreference);

    const restoreFullscreen = () => {
        try {
            if (sessionStorage.getItem(FULLSCREEN_STORAGE_KEY) === '1' && !document.fullscreenElement && document.fullscreenEnabled) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } catch (error) {
            // Ignore fullscreen restore failures.
        }
    };

    window.addEventListener('load', restoreFullscreen, { once: true });
    document.addEventListener('pointerdown', restoreFullscreen, { once: true, capture: true });

    const prefetchCache = new Set();

    const prefetchPage = (href) => {
        if (!href || prefetchCache.has(href)) {
            return;
        }

        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
            return;
        }

        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'document';
        link.href = url.href;
        document.head.appendChild(link);
        prefetchCache.add(href);
    };

    const warmCoreData = () => {
        [
            'data/record/records_index.json',
            'data/people/people_index.json',
            'data/glossary/glossary_index.json'
        ].forEach((path) => {
            fetch(path, { cache: 'force-cache' }).catch(() => {});
        });
    };

    window.addEventListener('load', () => {
        const run = () => {
            prefetchPage('record.html');
            prefetchPage('people.html');
            prefetchPage('glossary.html');
            prefetchPage('quiz.html');
            prefetchPage('gacha.html');
            warmCoreData();
        };

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(run, { timeout: 1200 });
        } else {
            window.setTimeout(run, 360);
        }
    });

    window.navigateTo = (href) => {
        if (!href) {
            return;
        }

        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) {
            isNavigating = Boolean(document.fullscreenElement);
            syncFullscreenPreference();
            window.location.href = url.href;
            return;
        }

        isNavigating = Boolean(document.fullscreenElement);
        syncFullscreenPreference();
        document.body.classList.remove('page-ready');
        document.body.classList.add('page-leaving');

        window.setTimeout(() => {
            window.location.href = url.href;
        }, TRANSITION_MS);
    };

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-nav-target]');
        if (!trigger) {
            return;
        }

        const target = trigger.getAttribute('data-nav-target');
        if (!target) {
            return;
        }

        event.preventDefault();
        window.navigateTo(target);
    });
})();
