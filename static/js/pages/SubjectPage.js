import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';
import { UI } from '../ui.js';

const SubjectPage = async (params) => {
    let subject = null;
    let lessons = [];
    
    try {
        subject = await api.getSubject(params.id);
        lessons = await fetch(`/api/subjects/${params.id}/lessons`).then(r => r.json());
    } catch (e) {
        console.error(e);
        return `<div class="card" style="padding: 2rem; text-align: center;">
            <h3>${i18n.t('error')}</h3>
            <p>تعذر تحميل المحتوى</p>
            <button class="btn btn-primary" onclick="window.router.navigate('/')">العودة للرئيسية</button>
        </div>`;
    }

    if (!subject || !subject.title) {
        return `<div class="card" style="padding: 2rem; text-align: center;">
            <h3>المادة غير موجودة</h3>
            <button class="btn btn-primary" onclick="window.router.navigate('/')">العودة للرئيسية</button>
        </div>`;
    }

    const user = auth.getUser();
    const isAdmin = user && user.role === 'admin';

    return `
        <div class="header-section mb-4">
            <button class="btn" onclick="window.router.navigate('/')" style="display: flex; align-items: center; gap: 8px; margin-bottom: 1rem; border: 1px solid var(--border);">
                <i class="ph ph-arrow-left"></i>
                <span>عودة</span>
            </button>
            <div style="background: linear-gradient(135deg, ${subject.color || '#4f46e5'} 0%, ${subject.color || '#4f46e5'}dd 100%); 
                        padding: 2rem; border-radius: 16px; color: white;">
                <h1 style="color: white; margin: 0;">${subject.title}</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 0.5rem 0 0 0;">${subject.code}</p>
                <p style="color: rgba(255,255,255,0.8); margin: 0.5rem 0 0 0;">${subject.description || ''}</p>
            </div>
        </div>

        <div class="card">
            <h2 style="margin-bottom: 1.5rem;">${i18n.t('materials')}</h2>
            ${lessons.length === 0 ? `
                <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
                    <i class="ph ph-files" style="font-size: 4rem; display: block; margin-bottom: 1rem;"></i>
                    <p>${i18n.t('no_materials')}</p>
                </div>
            ` : `
                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    ${lessons.map(lesson => {
                        // تحويل رابط Google Drive للتنزيل المباشر
                        let downloadUrl = lesson.url;
                        if (lesson.url.includes('drive.google.com')) {
                            const fileIdMatch = lesson.url.match(/\/d\/([a-zA-Z0-9_-]+)/);
                            if (fileIdMatch) {
                                downloadUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
                            }
                        }
                        
                        return `
                        <div class="lesson-item" data-id="${lesson.id}" style="padding: 1.5rem; border: 1px solid var(--border); border-radius: 12px; 
                                                        display: flex; justify-content: space-between; align-items: center;
                                                        transition: all 0.3s ease;"
                             onmouseover="this.style.borderColor='var(--primary)'; this.style.transform='translateY(-2px)';"
                             onmouseout="this.style.borderColor='var(--border)'; this.style.transform='translateY(0)';">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <i class="ph ${lesson.type === 'Video' ? 'ph-video' : 'ph-file-pdf'}" 
                                   style="font-size: 2rem; color: ${lesson.type === 'Video' ? '#ef4444' : '#4f46e5'};"></i>
                                <div>
                                    <h3 style="margin: 0; font-size: 1.1rem;">${lesson.title}</h3>
                                    <p style="margin: 0.25rem 0 0 0; font-size: 0.9rem; color: var(--text-muted);">
                                        ${lesson.type === 'Video' ? 'فيديو' : 'ملف PDF'}
                                    </p>
                                </div>
                            </div>
                            <div style="display: flex; gap: 0.5rem; align-items: center;">
                                ${lesson.type !== 'Video' ? `
                                    <a href="${downloadUrl}" download class="btn" 
                                       style="display: flex; align-items: center; gap: 8px; text-decoration: none; border: 1px solid var(--border);">
                                        <i class="ph ph-download-simple"></i>
                                        <span>تنزيل</span>
                                    </a>
                                ` : ''}
                                <a href="${lesson.url}" target="_blank" class="btn btn-primary" 
                                   style="display: flex; align-items: center; gap: 8px; text-decoration: none;">
                                    <i class="ph ph-arrow-square-out"></i>
                                    <span>فتح</span>
                                </a>
                                ${isAdmin ? `
                                    <button class="btn delete-lesson-btn" data-id="${lesson.id}" 
                                            style="color: #ef4444; display: flex; align-items: center; gap: 8px; border: 1px solid #ef4444;">
                                        <i class="ph ph-trash"></i>
                                        <span>حذف</span>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `}).join('')}
                </div>
            `}
        </div>
    `;
};

SubjectPage.init = (params) => {
    // حذف الدرس (للأدمن فقط)
    document.querySelectorAll('.delete-lesson-btn').forEach(btn => {
        btn.onclick = async () => {
            if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
                const lessonId = btn.dataset.id;
                try {
                    await fetch(`/api/lessons/${lessonId}`, { method: 'DELETE' });
                    UI.toast('تم الحذف بنجاح');
                    window.router.resolve();
                } catch (e) {
                    UI.toast('حدث خطأ أثناء الحذف', 'error');
                }
            }
        };
    });
};

export default SubjectPage;
