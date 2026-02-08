import os
import sqlite3
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = 'dev-secret-key'

# Vercel Temporary DB
DB_PATH = '/tmp/academic.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT, role TEXT DEFAULT "student", device_id TEXT, must_change_pw INTEGER DEFAULT 0)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, code TEXT, color TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    c.execute('CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, subject_id INTEGER, filename TEXT, filepath TEXT, file_type TEXT, uploaded_by INTEGER, uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    
    c.execute('SELECT count(*) FROM users')
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', ('admin@uni.edu', generate_password_hash('admin123'), 'admin'))
        c.execute('INSERT INTO subjects (title, description, code, color) VALUES (?, ?, ?, ?)', ('Computer Science', 'Intro to CS', 'CS101', '#4F46E5'))
    conn.commit()
    conn.close()

@app.before_request
def startup():
    if not os.path.exists(DB_PATH):
        init_db()

@app.route('/')
@app.route('/admin') # ضمان ان الروابط تفتح صح
@app.route('/subjects')
def index():
    return render_template('index.html')

# API LOGIN
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (data.get('email'),)).fetchone()
    conn.close()
    if user and check_password_hash(user['password'], data.get('password')):
        return jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

# API USERS (هذا اللي جان ناقص ومسوي الخلل)
@app.route('/api/users', methods=['GET'])
def get_users():
    conn = get_db()
    users = conn.execute('SELECT id, email, role, device_id FROM users').fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

# API SUBJECTS
@app.route('/api/subjects', methods=['GET', 'POST'])
def handle_subjects():
    conn = get_db()
    if request.method == 'POST':
        data = request.json
        conn.execute('INSERT INTO subjects (title, description, code, color) VALUES (?, ?, ?, ?)',
                     (data['title'], data['description'], data['code'], data['color']))
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    
    subjects = conn.execute('SELECT * FROM subjects').fetchall()
    conn.close()
    return jsonify([dict(s) for s in subjects])

@app.route('/api/subjects/<int:id>', methods=['DELETE'])
def delete_subject(id):
    conn = get_db()
    conn.execute('DELETE FROM subjects WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/add-student', methods=['POST'])
def add_student():
    data = request.json
    conn = get_db()
    try:
        conn.execute('INSERT INTO users (email, password, role) VALUES (?, ?, "student")',
                     (data['email'], generate_password_hash(data['password'])))
        conn.commit()
        return jsonify({'success': True})
    except:
        return jsonify({'success': False, 'error': 'Exists'})
    finally:
        conn.close()

@app.route('/api/admin/reset-device', methods=['POST'])
def reset_device():
    data = request.json
    conn = get_db()
    conn.execute('UPDATE users SET device_id = NULL WHERE id = ?', (data['user_id'],))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run()
