import { api } from '../api.js';
import { i18n } from '../i18n.js';

const HomePage = async () => {
    let subjects = [];
    let announcements = [];
    try {
        subjects = await api.getSubjects();
        announcements = await api.getAnnouncements();
    } catch (e) {
        console.error(e);
        return `<div class="card" style="padding: 2rem; text-align: center;"><h3>${i18n.t('error')}</h3><p>تعذر تحميل المواد</p></div>`;
    }

    const announcementsSection = announcements.length > 0 ? `
        <div class="card mb-4" style="border-right: 4px solid var(--primary); background-color: rgba(79, 70, 229, 0.05);">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; color: var(--primary);">
                <i class="ph ph-megaphone" style="font-size: 1.5rem;"></i>
                <h3 style="margin: 0; font-size: 1.2rem;">لوحة التبليغات</h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${announcements.map(a => `
                    <div style="padding: 0.8rem; border-bottom: 1px dashed var(--border);">
                        <p style="margin: 0 0 0.4rem 0; font-size: 1rem; color: var(--text-main); line-height: 1.6;">${a.content}</p>
                        <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: var(--text-muted);">
                            <i class="ph ph-clock"></i>
                            <span>${a.created_at}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : '';

    if (subjects.length === 0 && announcements.length === 0) {
        return `<div class="text-center" style="padding: 4rem 2rem;"><i class="ph ph-books" style="font-size: 5rem; color: var(--text-muted); display: block; margin-bottom: 1rem;"></i><h2>لا توجد مواد دراسية حالياً</h2><p style="color: var(--text-muted);">سيتم إضافة المواد قريباً من قبل الإدارة</p></div>`;
    }

    return `
        ${announcementsSection}
        <div class="header-section mb-4"><h1>${i18n.t('subjects')}</h1><p>اختر المادة لعرض المحاضرات والملفات</p></div>
        <div class="grid-auto-fit">
            ${subjects.map(subject => `
                <div class="card" onclick="window.router.navigate('/subject/${subject.id}')" 
                     style="cursor: pointer; background: linear-gradient(135deg, ${subject.color || '#4f46e5'} 0%, ${subject.color || '#4f46e5'}dd 100%); color: white; border: none;">
                    <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <i class="ph ph-book-open" style="font-size: 2.5rem;"></i>
                        <div><h3 style="color: white; margin: 0;">${subject.title}</h3><p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 0.9rem;">${subject.code}</p></div>
                    </div>
                    <p style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">${subject.description || 'اضغط لعرض المحتوى'}</p>
                </div>
            `).join('')}
        </div>
    `;
};

export default HomePage;
