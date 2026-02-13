/* ViewerPage.js - عارض الملفات المدمج مع الترجمة الذكية */
import { i18n } from '../i18n.js';

// دالة لاستخراج FILE_ID من رابط Google Drive
const extractFileId = (url) => {
    if (!url) return null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

// دالة لكشف نوع المتصفح
const detectBrowser = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('edg')) return 'edge';
    return 'other';
};

const ViewerPage = async (params) => {
    const fileUrl = decodeURIComponent(params.url || '');
    const fileName = decodeURIComponent(params.name || 'ملف');
    const fileId = extractFileId(fileUrl);
    const browser = detectBrowser();
    
    // رابط العرض المدمج من Google Drive
    const embedUrl = fileId 
        ? `https://drive.google.com/file/d/${fileId}/preview`
        : fileUrl;

    // رابط التحميل المباشر
    const downloadUrl = fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : fileUrl;

    // تعليمات الترجمة حسب المتصفح
    const browserInstructions = {
        chrome: `
            <p style="margin: 0 0 0.75rem 0; font-weight: 600;">🌐 جوجل كروم (Chrome):</p>
            <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                <li>اضغط بـ <strong>زر الماوس اليمين</strong> في أي مكان بالصفحة</li>
                <li>اختر <strong>"ترجمة إلى العربية"</strong> (Translate to Arabic)</li>
                <li>أو اضغط على أيقونة الترجمة <strong>⚙️</strong> في شريط العنوان</li>
            </ol>
        `,
        firefox: `
            <p style="margin: 0 0 0.75rem 0; font-weight: 600;">🦊 فايرفوكس (Firefox):</p>
            <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                <li>اضغط على أيقونة الترجمة 🌐 في شريط العنوان</li>
                <li>أو استخدم إضافة <strong>Google Translate</strong></li>
                <li>أو اضغط زر "فتح في Drive" واستخدم ترجمة Google Drive</li>
            </ol>
        `,
        safari: `
            <p style="margin: 0 0 0.75rem 0; font-weight: 600;">🧭 سفاري (Safari):</p>
            <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                <li>اضغط على أيقونة <strong>aA</strong> في شريط العنوان</li>
                <li>اختر <strong>"ترجمة إلى العربية"</strong></li>
                <li>أو اضغط زر "فتح في Drive" واستخدم ترجمة Google Drive</li>
            </ol>
        `,
        edge: `
            <p style="margin: 0 0 0.75rem 0; font-weight: 600;">🌊 إيدج (Edge):</p>
            <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                <li>اضغط بـ <strong>زر الماوس اليمين</strong> في أي مكان بالصفحة</li>
                <li>اختر <strong>"ترجمة"</strong> (Translate)</li>
                <li>أو اضغط على أيقونة الترجمة في شريط العنوان</li>
            </ol>
        `,
        other: `
            <p style="margin: 0 0 0.75rem 0; font-weight: 600;">🌐 متصفحك:</p>
            <ol style="margin: 0; padding-right: 1.5rem; line-height: 1.8;">
                <li>ابحث عن أيقونة الترجمة في شريط العنوان</li>
                <li>أو اضغط بزر الماوس اليمين واختر "ترجمة"</li>
                <li>أو اضغط زر "فتح في Drive" واستخدم ترجمة Google Drive</li>
            </ol>
        `
    };

    return `
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <button class="btn" onclick="window.history.back()" style="color: var(--text-muted); padding: 0.5rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> رجوع
            </button>
            
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <div id="google-translate-element" style="display: inline-block;"></div>
                
                <button id="translationHelpBtn" class="btn" style="background: #3b82f6; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-translate"></i>
                    كيف أترجم؟
                </button>
                
                <a href="${downloadUrl}" target="_blank" class="btn" style="background: #10b981; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <i class="ph ph-download-simple"></i>
                    تحميل
                </a>
                
                <a href="${fileUrl}" target="_blank" class="btn" style="background: #6366f1; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; text-decoration: none;">
                    <i class="ph ph-arrow-square-out"></i>
                    Drive
                </a>
            </div>
        </div>

        <!-- شريط الإرشادات للترجمة -->
        <div id="translation-help" style="display: none; margin-bottom: 1rem; padding: 1.25rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); animation: slideDown 0.3s ease;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
                    <i class="ph ph-lightbulb" style="font-size: 1.5rem;"></i>
                    طريقة الترجمة لمتصفحك
                </h3>
                <button id="closeHelpBtn" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 0.25rem 0.75rem; border-radius: 6px; cursor: pointer;">
                    ✕
                </button>
            </div>
            
            <div style="background: rgba(255,255,255,0.15); padding: 1rem; border-radius: 8px; backdrop-filter: blur(10px);">
                ${browserInstructions[browser]}
                
                <hr style="margin: 1rem 0; border: none; border-top: 1px solid rgba(255,255,255,0.3);">
                
                <p style="margin: 0 0 0.5rem 0; font-weight: 600;">✨ طريقة بديلة (Google Translate Widget):</p>
                <p style="margin: 0; opacity: 0.95;">استخدم قائمة الترجمة فوق لترجمة عناوين الصفحة والأزرار</p>
            </div>
        </div>

        <div class="glass-panel notranslate" style="padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 1rem;">
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
                class="notranslate"
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
            
            /* تنسيق Google Translate Widget */
            .goog-te-banner-frame.skiptranslate {
                display: none !important;
            }
            body {
                top: 0 !important;
            }
            #google-translate-element {
                background: white;
                padding: 0.5rem;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }
            .goog-te-gadget-simple {
                background-color: transparent !important;
                border: none !important;
                font-size: 14px !important;
            }
            .goog-te-gadget-simple .goog-te-menu-value span {
                color: #4f46e5 !important;
            }
        </style>
    `;
};

// تحميل Google Translate Script
const loadGoogleTranslate = () => {
    // تحقق إذا السكريبت محمّل مسبقاً
    if (document.getElementById('google-translate-script')) {
        return;
    }

    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);

    // دالة التهيئة
    window.googleTranslateElementInit = function() {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'ar,en',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google-translate-element');
    };
};

// هذا الـ init function راح يشتغل بعد ما الصفحة تحمّل
ViewerPage.init = (params) => {
    const fileUrl = decodeURIComponent(params.url || '');
    const fileId = extractFileId(fileUrl);

    // تحميل Google Translate Widget
    loadGoogleTranslate();

    // زر "كيف أترجم؟"
    const helpBtn = document.getElementById('translationHelpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            const helpBox = document.getElementById('translation-help');
            if (helpBox) {
                if (helpBox.style.display === 'none' || !helpBox.style.display) {
                    helpBox.style.display = 'block';
                    helpBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                } else {
                    helpBox.style.display = 'none';
                }
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
