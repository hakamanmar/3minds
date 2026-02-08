import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const HomePage = async () => {
    const subjects = await api.getSubjects();

    return `
        <div class="header-section flex-between">
            <div>
                <h1>${i18n.t('subjects')}</h1>
                <p>Academic Hub Student Platform</p>
            </div>
            ${auth.getUser()?.role === 'admin' ? `
                <button class="btn btn-primary" id="home-add-subject">
                    <i class="ph ph-plus"></i> ${i18n.t('add_subject')}
                </button>
            ` : ''}
        </div>

        <div class="grid-auto-fit mt-4">
            ${subjects.map(subject => `
                <div class="card subject-card" onclick="window.router.navigate('/subject/${subject.id}')" style="cursor: pointer; border-left: 6px solid ${subject.color}">
                    <div style="background-color: ${subject.color}20; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                         <i class="ph ph-book-open" style="font-size: 24px; color: ${subject.color}"></i>
                    </div>
                    <h2>${subject.title}</h2>
                    <p class="code" style="font-weight: 600; font-size: 0.9rem; color: ${subject.color}">${subject.code}</p>
                    <p>${subject.description}</p>
                </div>
            `).join('')}
        </div>
    `;
};

HomePage.init = () => {
    const addBtn = document.getElementById('home-add-subject');
    if (addBtn) {
        addBtn.onclick = async () => {
            const content = `
                <input type="text" name="title" placeholder="${i18n.t('title')}" class="mb-4" />
                <input type="text" name="code" placeholder="${i18n.t('code')}" class="mb-4" />
                <textarea name="description" placeholder="${i18n.t('description')}" class="mb-4"></textarea>
                <input type="color" name="color" value="#4f46e5" style="height: 50px;" />
            `;
            const data = await UI.modal(i18n.t('add_subject'), content, async (data) => {
                if (!data.title || !data.code) return false;
                await api.addSubject(data);
                UI.toast(i18n.t('success'));
                return true;
            });
            if (data) window.router.resolve();
        };
    }
};

export default HomePage;
