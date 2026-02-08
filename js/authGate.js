/************************************************************
 * authGate.js
 * 纯前端访问密钥保护（无服务器）
 * 说明：将密钥的 SHA-256 哈希填入 CLASS_RECORD_ACCESS_KEY_HASH
 ************************************************************/

(() => {
    const STORAGE_KEY = 'classRecordAccessGranted';
    const TARGET_KEY = 'classRecordRedirectTarget';
    const AUTH_PAGE = 'auth.html';
    const DEFAULT_KEY_HASH = '0ab2f2320f98a963fbe1d48ac2ff2e89f9ad59bbd5910f0398192e262db1fcb2';
    const ACCESS_KEY_HASH = window.CLASS_RECORD_ACCESS_KEY_HASH || DEFAULT_KEY_HASH;
    let resolveAccess;
    const accessPromise = new Promise((resolve) => {
        resolveAccess = resolve;
    });

    window.waitForAccess = () => accessPromise;
    window.dispatchEvent(new Event('authGateReady'));

    const resolveAccessPromise = () => {
        if (resolveAccess) {
            resolveAccess();
            resolveAccess = null;
        }
    };

    const sha256Hex = async (value) => {
        const data = new TextEncoder().encode(value);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    };

    const handleAuthGate = () => {
        const path = window.location.pathname;
        const isAuthPage = path.endsWith(`/${AUTH_PAGE}`) || path.endsWith(AUTH_PAGE);
        const hasAccess = localStorage.getItem(STORAGE_KEY) === 'true';

        if (hasAccess) {
            resolveAccessPromise();
            if (isAuthPage) {
                const target = sessionStorage.getItem(TARGET_KEY) || 'index.html';
                sessionStorage.removeItem(TARGET_KEY);
                window.location.replace(target);
            }
            return;
        }

        if (!isAuthPage) {
            const target = window.location.pathname + window.location.search + window.location.hash;
            sessionStorage.setItem(TARGET_KEY, target);
            window.location.replace(AUTH_PAGE);
        }
    };

    handleAuthGate();

    window.verifyAccessKey = async (rawKey) => {
        if (!rawKey) {
            return { ok: false, message: '请输入密钥。' };
        }

        try {
            const inputHash = await sha256Hex(rawKey.trim());
            if (inputHash === ACCESS_KEY_HASH) {
                localStorage.setItem(STORAGE_KEY, 'true');
                resolveAccessPromise();
                return { ok: true };
            }
            return { ok: false, message: '密钥不正确，请重试。' };
        } catch (error) {
            return { ok: false, message: '浏览器不支持加密验证，请更换浏览器。' };
        }
    };

    window.clearAccessKey = () => {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(TARGET_KEY);
    };
})();
