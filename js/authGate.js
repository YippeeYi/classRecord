/************************************************************
 * authGate.js
 * 纯前端访问密钥保护（无服务器）
 * 说明：
 * 1) 将密钥的 SHA-256 哈希填入 CLASS_RECORD_ACCESS_KEY_HASH。
 * 2) 默认密钥为 "classrecord"，建议尽快替换为自定义密钥。
 ************************************************************/

(() => {
    const STORAGE_KEY = 'classRecordAccessGranted';
    const LOCK_CLASS = 'auth-locked';
    const DEFAULT_KEY_HASH = '721a57120df8535ec92f61a4a6e25dfbfbf142613f766381b5a877461424d89c';
    const ACCESS_KEY_HASH = window.CLASS_RECORD_ACCESS_KEY_HASH || DEFAULT_KEY_HASH;
    let resolveAccess;
    const accessPromise = new Promise((resolve) => {
        resolveAccess = resolve;
    });

    window.waitForAccess = () => accessPromise;
    window.dispatchEvent(new Event('authGateReady'));

    const removeLock = (overlay) => {
        document.documentElement.classList.remove(LOCK_CLASS);
        if (overlay) {
            overlay.remove();
        }
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

    const buildOverlay = () => {
        const overlay = document.createElement('div');
        overlay.className = 'auth-overlay';
        overlay.innerHTML = `
            <div class="auth-card">
                <h2>🔒 需要密钥访问</h2>
                <p>请输入访问密钥以查看内容（本地验证，无需服务器）。</p>
                <form class="auth-form">
                    <input type="password" name="accessKey" placeholder="访问密钥" required />
                    <button type="submit">进入</button>
                </form>
                <p class="auth-hint">提示：密钥只保存在当前设备浏览器里。</p>
                <p class="auth-error" aria-live="polite"></p>
            </div>
        `;
        return overlay;
    };

    const initAuthGate = () => {
        if (localStorage.getItem(STORAGE_KEY) === 'true') {
            removeLock();
            return;
        }

        document.documentElement.classList.add(LOCK_CLASS);
        const overlay = buildOverlay();
        document.body.appendChild(overlay);

        const form = overlay.querySelector('.auth-form');
        const errorText = overlay.querySelector('.auth-error');

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const input = form.querySelector('input[name="accessKey"]');
            const rawKey = input.value.trim();
            if (!rawKey) {
                errorText.textContent = '请输入密钥。';
                return;
            }

            try {
                const inputHash = await sha256Hex(rawKey);
                if (inputHash === ACCESS_KEY_HASH) {
                    localStorage.setItem(STORAGE_KEY, 'true');
                    removeLock(overlay);
                } else {
                    errorText.textContent = '密钥不正确，请重试。';
                }
            } catch (error) {
                errorText.textContent = '浏览器不支持加密验证，请更换浏览器。';
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuthGate);
    } else {
        initAuthGate();
    }
})();
