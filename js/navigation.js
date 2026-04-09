/************************************************************
 * navigation.js
 * 全站跳转过渡 + 轻量预取
 ************************************************************/

(() => {
    const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TRANSITION_MS = REDUCED_MOTION ? 0 : 180;

    const markEntering = () => {
        document.body.classList.add('page-ready');
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', markEntering, { once: true });
    } else {
        markEntering();
    }

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
            window.location.href = url.href;
            return;
        }

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
