/* LoginPage.js - Names Arranged Vertically */
import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const LoginPage = async () => {
    return `
        <div style="display: flex; justify-content: center; align-items: center; height: 80vh;">
            <div class="glass-panel" style="padding: 3rem; width: 100%; max-width: 400px;">
                <h1 class="text-center">${i18n.t('login')}</h1>
                <p class="text-center mb-4" style="color: var(--primary); font-weight: 600;">Welcome back to 3Minds</p>
                
                <form id="login-form">
                    <div class="mb-4">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email</label>
                        <input type="email" id="email" placeholder="student@uni.edu" required />
                    </div>
                    <div class="mb-4">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Password</label>
                        <input type="password" id="password" required />
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">${i18n.t('login')}</button>
                    
                    <div style="margin-top: 2rem; text-align: center; font-size: 0.9rem; color: var(--text-muted); font-weight: 500; border-top: 1px dashed var(--border); padding-top: 1rem;">
                        <p style="margin-bottom: 0.5rem;">Developed by:</p>
                        <div style="color: var(--primary); line-height: 1.8;">
                            Alhakam Anmar<br>
                            Mena Sabri<br>
                            Danya Majed
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
};

LoginPage.init = () => {
    const form = document.getElementById('login-form');
    // ... (نفس كود الدخول المضبوط السابق)
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const btn = form.querySelector('button[type="submit"]');
        const oldText = btn.innerText;
        btn.innerText = '...'; btn.disabled = true;
        try {
            const res = await api.login(email, password);
            if (res.success) {
                auth.setUser(res.user);
                window.router.navigate('/');
            } else {
                UI.toast(res.message || i18n.t('error'), 'error');
                btn.innerText = oldText; btn.disabled = false;
            }
        } catch (err) {
            UI.toast(i18n.t('error'), 'error');
            btn.innerText = oldText; btn.disabled = false;
        }
    });
};

export default LoginPage;
