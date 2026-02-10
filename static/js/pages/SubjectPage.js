/* SubjectPage.js - Debug Version */
import { api, auth } from '../api.js';
import { i18n } from '../i18n.js';

const SubjectPage = async (params) => {
    const id = params.id;
    let subject = {};
    let items = [];
    let errorDetails = "";

    try {
        const response = await api.getSubject(id);
        if (response) {
            subject = response.subject || response;
            items = response.lessons || response.files || [];
        }
    } catch (e) {
        console.error("FULL ERROR:", e);
        // هنا راح نعرض الخطأ بالضبط
        errorDetails = e.message || JSON.stringify(e);
        
        subject = { 
            title: "فشل التحميل", 
            code: "ERR", 
            color: "#ef4444", 
            description: `السبب: ${errorDetails}` // راح يطلعلك السبب بالشاشة
        };
    }

    const user = auth.getUser();
    const isAdmin = user && (user.role === 'admin' || user.role === 'editor');

    return `
        <div style="margin-bottom: 2rem;">
            <button class="btn" onclick="window.router.navigate('/')" style="margin-bottom: 1rem; color: var(--text-muted); padding: 0; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> ${i18n.t('back')}
            </button>
            
            <!-- لوحة المادة (أو لوحة الخطأ) -->
            <div class="glass-panel" style="padding: 2rem; border-right: 6px solid ${subject.color || '#4f46e5'}; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <h1 style="margin-bottom: 0.5rem; color: var(--text-main);">${subject.title || 'Untitled'}</h1>
                <p class="code" style="color: ${subject.color || '#4f46e5'}; font-weight: bold; font-family: monospace; font-size: 1.1em;">${subject.code || ''}</p>
                
                <!-- عرض تفاصيل الخطأ باللون الأحمر -->
                <p style="color: ${errorDetails ? 'red' : 'var(--text-muted)'}; margin-top: 0.5rem; direction: ltr; font-family: monospace;">
                    ${subject.description || ''}
                </p>

                ${isAdmin && errorDetails ? 
                    `<div style="margin-top: 20px; padding: 10px; background: #fff5f5; border: 1px dashed red;">
                        <strong>نصيحة للمطور:</strong><br>
                        تأكد من أن قاعدة البيانات تحتوي على مادة بهذا الـ ID.<br>
                        <button onclick="window.router.navigate('/admin')" class="btn btn-primary" style="margin-top:10px;">الذهاب للوحة التحكم لإضافة مادة</button>
                     </div>` 
                : ''}
            </div>
        </div>

        <div>
            <h2 style="margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                <i class="ph ph-files"></i> ${i18n.t('materials')}
            </h2>
            
            ${items.length === 0 ? 
                `<div class="card" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                    <i class="ph ph-folder-open" style="font-size: 3rem; margin-bottom: 1rem; display: block;"></i>
                    <p>${i18n.t('no_materials')}</p>
                </div>` : 
                `<div class="grid-auto-fit" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
                    ${items.map(item => `
                        <div class="card" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                            <h3>${item.title || item.filename}</h3>
                            <a href="${item.url || '#'}" target="_blank" class="btn btn-primary">عرض</a>
                        </div>
                    `).join('')}
                </div>`
            }
        </div>
    `;
};

// ... (باقي الكود نفسه)
SubjectPage.init = () => {}; 
export default SubjectPage;
