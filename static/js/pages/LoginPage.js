import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const LoginPage = async () => {
    return `
        <div style="display: flex; justify-content: center; align-items: center; height: 80vh;">
            <div class="glass-panel" style="padding: 3rem; width: 100%; max-width: 400px;">
                <h1 class="text-center">${i18n.t('login')}</h1>
                <p class="text-center mb-4">Welcome back to AcademicHub</p>
                
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
                    
                    <div style="margin-top: 1.5rem; text-align: center; font-size: 0.8rem; color: var(--text-muted);">
                        <p>Demo: admin@uni.edu / admin123</p>
                    </div>
                </form>
            </div>
        </div>
    `;
};

LoginPage.init = () => {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await api.login(email, password);
            if (res.success) {
                auth.setUser(res.user);
                if (res.must_reset) {
                    window.router.navigate('/change-password');
                } else {
                    window.router.navigate('/');
                }
            } else {
                UI.toast(res.message || i18n.t('error'), 'error');
            }
        } catch (err) {
            if (err.status === 403) {
                UI.toast(i18n.t('device_locked'), 'error');
            } else {
                UI.toast(i18n.t('error'), 'error');
            }
        }
    });
};

export default LoginPage;
