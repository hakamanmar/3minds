import { i18n } from './i18n.js';

export const UI = {
    modal(title, content, onConfirm, confirmText = i18n.t('save')) {
        const modalId = 'dynamic-modal';
        let modal = document.getElementById(modalId);
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal-overlay';
        modal.dir = i18n.t('dir');
        modal.innerHTML = `
            <div class="modal-content glass-panel">
                <h3>${title}</h3>
                <div class="modal-body">${content}</div>
                <div class="modal-actions">
                    <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
                    <button class="btn" id="modal-cancel">${i18n.t('cancel')}</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        return new Promise((resolve) => {
            document.getElementById('modal-cancel').onclick = () => {
                modal.remove();
                resolve(null);
            };
            document.getElementById('modal-confirm').onclick = async () => {
                const inputs = modal.querySelectorAll('input, select, textarea');
                const data = {};
                inputs.forEach(i => data[i.name] = i.type === 'file' ? i.files[0] : i.value);

                if (onConfirm) {
                    const success = await onConfirm(data);
                    if (success) {
                        modal.remove();
                        resolve(data);
                    }
                } else {
                    modal.remove();
                    resolve(data);
                }
            };
        });
    },

    toast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
};
