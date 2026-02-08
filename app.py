import os
import sqlite3
from flask import Flask, render_template, request, jsonify, abort
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', template_folder='templates')

# الأمان أولاً: نجيب المفتاح من السيرفر مو ثابت بالكود
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-very-secret-key-12345')

DB_PATH = '/tmp/academic.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# دالة حماية للتحقق من الصلاحيات (RBAC)
def check_auth(required_role=None):
    role = request.headers.get('X-User-Role', 'guest')
    if required_role and role != required_role and role != 'admin':
        abort(403)
    return role

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "student", device_id TEXT, must_change_pw INTEGER DEFAULT 0)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, code TEXT, color TEXT)')
    
    # تأمين حساب الأدمن والممثلين
    c.execute('SELECT count(*) FROM users')
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', ('admin@3minds.edu', generate_password_hash('3minds@admin2026'), 'admin'))
    conn.commit()
    conn.close()

@app.before_request
def startup():
    if not os.path.exists(DB_PATH):
        init_db()

@app.route('/')
@app.route('/login')
@app.route('/admin')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'success': False}), 400
        
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (data.get('email'),)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], data.get('password')):
        return jsonify({
            'success': True, 
            'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}
        })
    return jsonify({'success': False, 'message': 'Invalid Credentials'}), 401

@app.route('/api/users', methods=['GET'])
def get_users():
    # حماية: بس الأدمن يشوف الطلاب
    check_auth('admin')
    conn = get_db()
    users = conn.execute('SELECT id, email, role, device_id FROM users').fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

if __name__ == '__main__':
    app.run()
