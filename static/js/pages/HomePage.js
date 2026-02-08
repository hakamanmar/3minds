import { api } from '../api.js';
import { i18n } from '../i18n.js';

const HomePage = async () => {
    let subjects = [];
    try {
        subjects = await api.getSubjects();
    } catch (e) {
        console.error(e);
        return `<div class="card" style="padding: 2rem; text-align: center;">
            <h3>${i18n.t('error')}</h3>
            <p>تعذر تحميل المواد</p>
        </div>`;
    }

    if (subjects.length === 0) {
        return `
            <div class="text-center" style="padding: 4rem 2rem;">
                <i class="ph ph-books" style="font-size: 5rem; color: var(--text-muted); display: block; margin-bottom: 1rem;"></i>
                <h2>لا توجد مواد دراسية حالياً</h2>
                <p style="color: var(--text-muted);">سيتم إضافة المواد قريباً من قبل الإدارة</p>
            </div>
        `;
    }

    return `
        <div class="header-section mb-4">
            <h1>${i18n.t('subjects')}</h1>
            <p>اختر المادة لعرض المحاضرات والملفات</p>
        </div>

        <div class="grid-auto-fit">
            ${subjects.map(subject => `
                <div class="card" onclick="window.router.navigate('/subject/${subject.id}')" 
                     style="cursor: pointer; background: linear-gradient(135deg, ${subject.color || '#4f46e5'} 0%, ${subject.color || '#4f46e5'}dd 100%); color: white; border: none;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <i class="ph ph-book-open" style="font-size: 2.5rem;"></i>
                        <div>
                            <h3 style="color: white; margin: 0;">${subject.title}</h3>
                            <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 0.9rem;">${subject.code}</p>
                        </div>
                    </div>
                    <p style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">${subject.description || 'اضغط لعرض المحتوى'}</p>
                </div>
            `).join('')}
        </div>
    `;
};

export default HomePage;
