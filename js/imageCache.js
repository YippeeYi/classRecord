(() => {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") {
        return;
    }

    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js").catch((error) => {
            console.warn("图片缓存注册失败：", error);
        });
    });
})();
