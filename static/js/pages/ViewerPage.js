/* ViewerPage.js - عارض الملفات مع ترجمة المحتوى */
import { i18n } from '../i18n.js';

// دالة لاستخراج FILE_ID من رابط Google Drive
const extractFileId = (url) => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

const ViewerPage = async (params) => {
    const fileUrl = decodeURIComponent(params.url || '');
    const fileName = decodeURIComponent(params.name || 'ملف');
    const fileId = extractFileId(fileUrl);
    
    // رابط العرض المدمج من Google Drive
    const embedUrl = fileId 
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : fileUrl;

    // رابط التحميل المباشر
    const downloadUrl = fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : fileUrl;

    // رابط للعرض في صفحة منفصلة (للترجمة)
    const viewUrl = fileId
        ? `https://drive.google.com/file/d/${fileId}/view`
        : fileUrl;

    return `
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <button class="btn" onclick="window.history.back()" style="color: var(--text-muted); padding: 0.5rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> رجوع
            </button>
            
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button id="translateBtn" class="btn" style="background: #3b82f6; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-weight: 600;">
                    <i class="ph ph-translate"></i>
                    ترجمة الملف
                </button>
                
                <a href="${downloadUrl}" target="_blank" class="btn" style="background: #10b981; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <i class="ph ph-download-simple"></i>
                    تحميل
                </a>
            </div>
        </div>

        <!-- رسالة الترجمة -->
        <div id="translation-message" style="display: none; margin-bottom: 1rem; padding: 1.25rem; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); animation: slideDown 0.3s ease;">
            <div style="display: flex; align-items: start; gap: 1rem;">
                <i class="ph ph-info" style="font-size: 2rem; margin-top: 0.25rem;"></i>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 0.75rem 0; font-size: 1.1rem;">📖 كيفية ترجمة محتوى الملف:</h3>
                    <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8; opacity: 0.95;">
                        <li>راح يفتح الملف في صفحة جديدة</li>
                        <li><strong>اضغط بزر الماوس اليمين</strong> على محتوى الملف</li>
                        <li>اختر <strong>"ترجمة إلى العربية"</strong> من القائمة</li>
                        <li>استمتع بقراءة الملف مترجم! 🎉</li>
                    </ol>
                    <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(255,255,255,0.15); border-radius: 6px;">
                        <p style="margin: 0; font-size: 0.9rem;">💡 <strong>ملاحظة:</strong> ترجمة المتصفح تشتغل بشكل أفضل في Chrome و Edge</p>
                    </div>
                </div>
                <button id="closeMessageBtn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 1.2rem;">
                    ✕
                </button>
            </div>
        </div>

        <div class="glass-panel" style="padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 1rem;">
            <h2 style="margin: 0; display: flex; align-items: center; gap: 0.75rem; color: var(--text-main);">
                <i class="ph ph-file-text" style="color: #4f46e5;"></i>
                ${fileName}
            </h2>
        </div>

        <div id="viewer-wrapper" style="position: relative; width: 100%; height: calc(100vh - 250px); min-height: 600px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <iframe 
                id="fileViewer"
                src="${embedUrl}" 
                style="width: 100%; height: 100%; border: none;"
                allow="autoplay"
            ></iframe>
        </div>

        <style>
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        </style>
    `;
};

// هذا الـ init function راح يشتغل بعد ما الصفحة تحمّل
ViewerPage.init = (params) => {
    const fileUrl = decodeURIComponent(params.url || '');
    const fileId = extractFileId(fileUrl);
    const viewUrl = fileId
        ? `https://drive.google.com/file/d/${fileId}/view`
        : fileUrl;

    // زر "ترجمة الملف"
    const translateBtn = document.getElementById('translateBtn');
    if (translateBtn) {
        translateBtn.addEventListener('click', () => {
            // إظهار الرسالة التوضيحية
            const message = document.getElementById('translation-message');
            if (message) {
                message.style.display = 'block';
                message.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // إخفاء الرسالة بعد 15 ثانية
                setTimeout(() => {
                    message.style.display = 'none';
                }, 15000);
            }

            // فتح الملف في صفحة جديدة للترجمة
            setTimeout(() => {
                window.open(viewUrl, '_blank');
            }, 800);
        });
    }

    // زر إغلاق الرسالة
    const closeBtn = document.getElementById('closeMessageBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const message = document.getElementById('translation-message');
            if (message) {
                message.style.display = 'none';
            }
        });
    }
};

export default ViewerPage;
