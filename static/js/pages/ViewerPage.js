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

    // رابط فتح في Google Docs للترجمة
    const docsViewUrl = fileId
        ? `https://docs.google.com/document/d/${fileId}/edit`
        : fileUrl;

    return `
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <button class="btn" onclick="window.history.back()" style="color: var(--text-muted); padding: 0.5rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> رجوع
            </button>
            
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button onclick="showTranslationHelp()" class="btn" style="background: #3b82f6; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-translate"></i>
                    كيف أترجم؟
                </button>
                
                <button onclick="openInDocs()" class="btn" style="background: #8b5cf6; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-file-text"></i>
                    فتح للترجمة
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

        <!-- شريط الإرشادات للترجمة -->
        <div id="translation-help" style="display: none; margin-bottom: 1rem; padding: 1.25rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-lightbulb" style="font-size: 1.5rem;"></i>
                    طريقة الترجمة السريعة
                </h3>
                <button onclick="document.getElementById('translation-help').style.display='none'" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; cursor: pointer;">
                    ✕
                </button>
            </div>
            
            <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
                <p style="margin: 0 0 0.75rem 0; font-weight: 600;">📱 إذا تستخدم جوجل كروم (Chrome):</p>
                <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                    <li>اضغط بزر الماوس اليمين على أي مكان في الملف</li>
                    <li>اختر <strong>"ترجمة إلى العربية"</strong> أو <strong>"Translate to Arabic"</strong></li>
                    <li>استمتع بالقراءة! 🎉</li>
                </ol>
                
                <hr style="margin: 1rem 0; border: none; border-top: 1px solid rgba(255,255,255,0.3);">
                
                <p style="margin: 0 0 0.75rem 0; font-weight: 600;">🌐 أو اضغط زر "فتح للترجمة" فوق:</p>
                <p style="margin: 0; opacity: 0.95;">راح يفتح الملف في صفحة Google Docs ومن هناك تقدر تترجمه بسهولة</p>
            </div>
        </div>

        <div class="glass-panel" style="padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 1rem;">
            <h2 style="margin: 0; display: flex; align-items: center; gap: 0.75rem; color: var(--text-main);">
                <i class="ph ph-file-text" style="color: #4f46e5;"></i>
                ${fileName}
            </h2>
        </div>

        <div style="position: relative; width: 100%; height: calc(100vh - 250px); min-height: 600px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <iframe 
                id="fileViewer"
                src="${embedUrl}" 
                style="width: 100%; height: 100%; border: none;"
                allow="autoplay"
            ></iframe>
        </div>

        <script>
            // إظهار شريط المساعدة
            function showTranslationHelp() {
                const helpBox = document.getElementById('translation-help');
                helpBox.style.display = 'block';
                helpBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // فتح الملف في Google Docs للترجمة الأسهل
            function openInDocs() {
                const fileId = '${fileId}';
                if (fileId) {
                    // نفتح الملف في Google Drive viewer مع خيار الترجمة
                    window.open('https://drive.google.com/file/d/' + fileId + '/view', '_blank');
                } else {
                    alert('عذراً، الملف غير متوفر');
                }
            }

            // رسالة توضيحية عند تحميل الصفحة لأول مرة
            window.addEventListener('load', function() {
                // نعرض نصيحة سريعة بعد ثانيتين
                setTimeout(function() {
                    const hasSeenTip = localStorage.getItem('translation_tip_seen');
                    if (!hasSeenTip) {
                        showTranslationHelp();
                        localStorage.setItem('translation_tip_seen', 'true');
                    }
                }, 2000);
            });
        </script>
    `;
};

ViewerPage.init = () => {};
export default ViewerPage;
