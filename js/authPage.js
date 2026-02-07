/************************************************************
 * authPage.js
 * 访问验证页面逻辑
 ************************************************************/

(() => {
    const form = document.querySelector('.auth-form');
    const errorText = document.querySelector('.auth-error');
    let hasFailedOnce = false;

    if (!form || typeof window.verifyAccessKey !== 'function') {
        return;
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const input = form.querySelector('input[name="accessKey"]');
        const result = await window.verifyAccessKey(input.value);
        if (!result.ok) {
            errorText.textContent = result.message || '密钥验证失败。';
            if (hasFailedOnce) {
                errorText.classList.remove('auth-error--emphasis');
                void errorText.offsetWidth;
                errorText.classList.add('auth-error--emphasis');
            }
            hasFailedOnce = true;
            return;
        }
        errorText.classList.remove('auth-error--emphasis');
        const target = sessionStorage.getItem('classRecordRedirectTarget') || 'index.html';
        sessionStorage.removeItem('classRecordRedirectTarget');
        window.location.replace(target);
    });
})();
