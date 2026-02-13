/* ViewerPage.js - عارض الملفات المدمج مع الترجمة المحسّنة */
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

    return `
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <button class="btn" onclick="window.history.back()" style="color: var(--text-muted); padding: 0.5rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> رجوع
            </button>
            
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button id="activateTranslateBtn" class="btn" style="background: #3b82f6; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-translate"></i>
                    تفعيل الترجمة
                </button>
                
                <button id="translationHelpBtn" class="btn" style="background: #8b5cf6; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-question"></i>
                    كيف أترجم؟
                </button>
                
                <a href="${downloadUrl}" target="_blank" class="btn" style="background: #10b981; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <i class="ph ph-download-simple"></i>
                    تحميل الملف
                </a>
                
                <a href="${fileUrl}" target="_blank" class="btn" style="background: #6366f1; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <i class="ph ph-arrow-square-out"></i>
                    فتح في Drive
                </a>
            </div>
        </div>

        <!-- رسالة تنشيط الترجمة -->
        <div id="translation-activation" style="display: none; margin-bottom: 1rem; padding: 1.25rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); animation: slideDown 0.3s ease;">
            <div style="display: flex; align-items: center; gap: 1rem;">
                <i class="ph ph-check-circle" style="font-size: 2rem;"></i>
                <div>
                    <h3 style="margin: 0 0 0.5rem 0;">✅ تم تفعيل وضع الترجمة!</h3>
                    <p style="margin: 0; opacity: 0.95;">الآن اضغط بـ <strong>زر الماوس اليمين</strong> على الملف واختر <strong>"ترجمة إلى العربية"</strong></p>
                </div>
            </div>
        </div>

        <!-- شريط الإرشادات للترجمة -->
        <div id="translation-help" style="display: none; margin-bottom: 1rem; padding: 1.25rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-lightbulb" style="font-size: 1.5rem;"></i>
                    طريقة الترجمة السريعة
                </h3>
                <button id="closeHelpBtn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; cursor: pointer;">
                    ✕
                </button>
            </div>
            
            <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
                <p style="margin: 0 0 0.75rem 0; font-weight: 600;">🎯 طريقة سريعة (موصى بها):</p>
                <ol style="margin: 0 0 1rem 0; padding-right: 1.5rem; line-height: 1.8;">
                    <li>اضغط زر <strong>"تفعيل الترجمة"</strong> فوق</li>
                    <li>اضغط بزر الماوس اليمين على الملف</li>
                    <li>اختر <strong>"ترجمة إلى العربية"</strong></li>
                </ol>
                
                <hr style="margin: 1rem 0; border: none; border-top: 1px solid rgba(255,255,255,0.3);">
                
                <p style="margin: 0 0 0.75rem 0; font-weight: 600;">📱 إذا ما اشتغلت:</p>
                <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                    <li>اضغط زر "فتح في Drive" فوق</li>
                    <li>في الصفحة الجديدة، استخدم ترجمة المتصفح</li>
                </ol>
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

    // زر "تفعيل الترجمة"
    const activateBtn = document.getElementById('activateTranslateBtn');
    if (activateBtn) {
        activateBtn.addEventListener('click', () => {
            // إخفاء زر المساعدة لو كان ظاهر
            const helpBox = document.getElementById('translation-help');
            if (helpBox) helpBox.style.display = 'none';

            // إظهار رسالة التفعيل
            const activationMsg = document.getElementById('translation-activation');
            if (activationMsg) {
                activationMsg.style.display = 'block';
                activationMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // إخفاء الرسالة بعد 8 ثواني
                setTimeout(() => {
                    activationMsg.style.display = 'none';
                }, 8000);
            }

            // محاولة فتح الملف في صفحة جديدة قابلة للترجمة
            if (fileId) {
                const driveViewUrl = 'https://drive.google.com/file/d/' + fileId + '/view';
                window.open(driveViewUrl, '_blank');
            }
        });
    }

    // زر "كيف أترجم؟"
    const helpBtn = document.getElementById('translationHelpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            // إخفاء رسالة التفعيل لو كانت ظاهرة
            const activationMsg = document.getElementById('translation-activation');
            if (activationMsg) activationMsg.style.display = 'none';

            const helpBox = document.getElementById('translation-help');
            if (helpBox) {
                helpBox.style.display = 'block';
                helpBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }

    // زر إغلاق المساعدة
    const closeBtn = document.getElementById('closeHelpBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const helpBox = document.getElementById('translation-help');
            if (helpBox) {
                helpBox.style.display = 'none';
            }
        });
    }

    // عرض نصيحة للمستخدمين الجدد (أول مرة فقط)
    setTimeout(() => {
        const hasSeenTip = localStorage.getItem('translation_tip_seen');
        if (!hasSeenTip) {
            const helpBox = document.getElementById('translation-help');
            if (helpBox) {
                helpBox.style.display = 'block';
                helpBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            localStorage.setItem('translation_tip_seen', 'true');
        }
    }, 2000);
};

export default ViewerPage;
