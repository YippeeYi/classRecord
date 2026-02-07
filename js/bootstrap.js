/************************************************************
 * bootstrap.js
 * 预加载所有缓存数据（首次进入/清缓存时）
 ************************************************************/

const waitForAccess = () => {
    if (typeof window.waitForAccess === 'function') {
        return window.waitForAccess();
    }

    return new Promise((resolve) => {
        window.addEventListener(
            'authGateReady',
            () => {
                window.waitForAccess().then(resolve);
            },
            { once: true }
        );
    });
};

window.cacheReadyPromise = (async () => {
    await waitForAccess();
    return window.ensureAllCachesLoaded();
})();
