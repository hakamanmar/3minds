/* ViewerPage.js - عارض الملفات مع تحميل آمن */
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

    // تأكد من وجود امتداد .pdf
    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    
    // رابط التحميل المُحسّن (يستخدم confirm parameter لتجنب مشاكل bin)
    const downloadUrl = fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
        : fileUrl;

    return `
        <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
            <button class="btn" onclick="window.history.back()" style="color: var(--text-muted); padding: 0.5rem 1rem; background: white; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                <i class="ph ph-arrow-right"></i> رجوع
            </button>
            
            <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                <button id="downloadBtn" class="btn" style="background: #10b981; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; display: flex; align-items: center; gap: 8px; cursor: pointer; border: none;">
                    <i class="ph ph-download-simple"></i>
                    تحميل الملف
                </button>
            </div>
        </div>

        <div class="glass-panel" style="padding: 1.5rem; background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 1rem;">
            <h2 style="margin: 0; display: flex; align-items: center; gap: 0.75rem; color: var(--text-main);">
                <i class="ph ph-file-text" style="color: #4f46e5;"></i>
                ${fileName}
            </h2>
        </div>

        <div id="viewer-wrapper" style="position: relative; width: 100%; height: calc(100vh - 200px); min-height: 600px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <iframe 
                id="fileViewer"
                src="${embedUrl}" 
                style="width: 100%; height: 100%; border: none;"
                allow="autoplay"
            ></iframe>
        </div>
    `;
};

ViewerPage.init = (params) => {
    const fileUrl = decodeURIComponent(params.url || '');
    const fileName = decodeURIComponent(params.name || 'ملف');
    const fileId = extractFileId(fileUrl);
    
    // تأكد من وجود امتداد .pdf
    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    
    // رابط التحميل المُحسّن
    const downloadUrl = fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`
        : fileUrl;

    // زر التحميل مع معالجة خاصة
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            // إنشاء عنصر <a> مؤقت للتحميل
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = safeFileName;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            
            // إضافة للـ DOM، ضغط، ثم حذف
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
};

export default ViewerPage;
