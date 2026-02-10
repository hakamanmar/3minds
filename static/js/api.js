/* api.js - Includes Student Deletion & Persistent Login */

const API_BASE = '/api';

export const api = {
    async _fetch(url, options = {}) {
        options.headers = { ...options.headers, 'Content-Type': 'application/json' };
        const res = await fetch(url, options);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw { status: res.status, message: err.message || 'Error' };
        }
        return res.json();
    },

    async login(email, password) {
        return this._fetch(`${API_BASE}/login`, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async getUsers() { return this._fetch(`${API_BASE}/users`); },
    
    // NEW: Delete User Function
    async deleteUser(id) {
        return this._fetch(`${API_BASE}/users?id=${id}`, { method: 'DELETE' });
    },

    async addStudent(email, password) {
        return this._fetch(`${API_BASE}/admin/add-student`, {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },
    
    async resetDevice(user_id) {
        return this._fetch(`${API_BASE}/admin/reset-device`, {
            method: 'POST',
            body: JSON.stringify({ user_id })
        });
    },
    
    async changePassword(user_id, password) {
        return this._fetch(`${API_BASE}/change-password`, {
            method: 'POST',
            body: JSON.stringify({ user_id, password })
        });
    },

    async getSubjects() { return this._fetch(`${API_BASE}/subjects`); },
    async addSubject(data) { return this._fetch(`${API_BASE}/subjects`, { method: 'POST', body: JSON.stringify(data) }); },
    async updateSubject(id, data) { return this._fetch(`${API_BASE}/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async deleteSubject(id) { return this._fetch(`${API_BASE}/subjects/${id}`, { method: 'DELETE' }); },
    async getLessons(subjectId) { return this._fetch(`${API_BASE}/subjects/${subjectId}/lessons`); },
    async deleteLesson(id) { return this._fetch(`${API_BASE}/lessons/${id}`, { method: 'DELETE' }); },

    async getAnnouncements() { return this._fetch(`${API_BASE}/announcements`); },
    async addAnnouncement(content) { return this._fetch(`${API_BASE}/announcements`, { method: 'POST', body: JSON.stringify({ content }) }); },
    async updateAnnouncement(id, content) { return this._fetch(`${API_BASE}/announcements?id=${id}`, { method: 'PUT', body: JSON.stringify({ content }) }); },
    async deleteAnnouncement(id) { return this._fetch(`${API_BASE}/announcements?id=${id}`, { method: 'DELETE' }); }
};

export const auth = {
    user: null,
    // Load user from localStorage immediately (PERSISTENT LOGIN)
    getUser() {
        if (!this.user) {
            const saved = localStorage.getItem('academic_user');
            if (saved) this.user = JSON.parse(saved);
        }
        return this.user;
    },
    setUser(user) {
        this.user = user;
        // Save to localStorage
        localStorage.setItem('academic_user', JSON.stringify(user));
    },
    logout() {
        this.user = null;
        localStorage.removeItem('academic_user');
        window.location.href = '/'; 
    }
};
