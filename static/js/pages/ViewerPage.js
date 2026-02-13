/* ViewerPage.js - عارض الملفات مع ترجمة فعلية */
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
    
    // رابط التحميل المباشر من Google Drive
    const directUrl = fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : fileUrl;

    // رابط العرض العادي (غير قابل للترجمة)
    const normalEmbedUrl = fileId 
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : fileUrl;

    // رابط Google Docs Viewer (قابل للترجمة!)
    const translatableUrl = fileId
        ? `https://docs.google.com/viewer?url=https://drive.google.com/uc?export=download%26id=${fileId}&embedded=true`
        : `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

    return `
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <button class="btn" onclick="window.history.back()" style="color: var(--text-muted); padding: 0.5rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> رجوع
            </button>
            
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button id="enableTranslateBtn" class="btn" style="background: #3b82f6; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; font-weight: 600;">
                    <i class="ph ph-translate"></i>
                    <span id="translateBtnText">تفعيل الترجمة</span>
                </button>
                
                <a href="${directUrl}" target="_blank" class="btn" style="background: #10b981; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <i class="ph ph-download-simple"></i>
                    تحميل
                </a>
            </div>
        </div>

        <!-- رسالة التعليمات -->
        <div id="translation-instructions" style="display: none; margin-bottom: 1rem; padding: 1.25rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); animation: slideDown 0.3s ease;">
            <div style="display: flex; align-items: start; gap: 1rem;">
                <i class="ph ph-check-circle" style="font-size: 2.5rem;"></i>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 0.75rem 0; font-size: 1.2rem;">✅ تم تفعيل وضع الترجمة!</h3>
                    <p style="margin: 0 0 1rem 0; opacity: 0.95; line-height: 1.6;">الآن الملف يعرض بطريقة قابلة للترجمة. اتبع الخطوات:</p>
                    <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8; opacity: 0.95;">
                        <li><strong>اضغط بزر الماوس اليمين</strong> على الملف أدناه</li>
                        <li>اختر <strong>"ترجمة إلى العربية"</strong> من القائمة</li>
                        <li>أو اضغط أيقونة الترجمة في شريط المتصفح</li>
                    </ol>
                </div>
                <button id="closeInstructionsBtn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 1.2rem;">
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
                src="${normalEmbedUrl}" 
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
    
    // رابط Google Docs Viewer (قابل للترجمة!)
    const translatableUrl = fileId
        ? `https://docs.google.com/viewer?url=https://drive.google.com/uc?export=download%26id=${fileId}&embedded=true`
        : `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;

    // رابط العرض العادي
    const normalEmbedUrl = fileId 
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : fileUrl;

    let isTranslateMode = false;

    // زر "تفعيل الترجمة"
    const translateBtn = document.getElementById('enableTranslateBtn');
    const btnText = document.getElementById('translateBtnText');
    const iframe = document.getElementById('fileViewer');
    const instructions = document.getElementById('translation-instructions');

    if (translateBtn && iframe) {
        translateBtn.addEventListener('click', () => {
            if (!isTranslateMode) {
                // التبديل لوضع الترجمة
                iframe.src = translatableUrl;
                btnText.textContent = 'إلغاء الترجمة';
                translateBtn.style.background = '#ef4444';
                isTranslateMode = true;

                // إظهار التعليمات
                if (instructions) {
                    instructions.style.display = 'block';
                    instructions.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            } else {
                // الرجوع للوضع العادي
                iframe.src = normalEmbedUrl;
                btnText.textContent = 'تفعيل الترجمة';
                translateBtn.style.background = '#3b82f6';
                isTranslateMode = false;

                // إخفاء التعليمات
                if (instructions) {
                    instructions.style.display = 'none';
                }
            }
        });
    }

    // زر إغلاق التعليمات
    const closeBtn = document.getElementById('closeInstructionsBtn');
    if (closeBtn && instructions) {
        closeBtn.addEventListener('click', () => {
            instructions.style.display = 'none';
        });
    }
};

export default ViewerPage;
