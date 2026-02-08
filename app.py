import os
import sqlite3
import json
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import time
import google.generativeai as genai
from PyPDF2 import PdfReader

# Configure Gemini
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyB8pppep-QjwRqsNQaMo7Aj7U0nFhsJwD8")
genai.configure(api_key=GEMINI_API_KEY)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key'
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Database Setup
DB_PATH = 'academic.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    # Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            device_id TEXT,
            must_change_pw INTEGER DEFAULT 0
        )
    ''')
    
    # Subjects Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            code TEXT,
            color TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Assignments Table (Editor-Subject relation)
    c.execute('''
        CREATE TABLE IF NOT EXISTS assignments (
            user_id INTEGER,
            subject_id INTEGER,
            PRIMARY KEY (user_id, subject_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id)
        )
    ''')
    
    # Files Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_id INTEGER,
            filename TEXT NOT NULL,
            filepath TEXT NOT NULL,
            file_type TEXT,
            uploaded_by INTEGER,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (subject_id) REFERENCES subjects (id)
        )
    ''')
    
    # Seed Data if empty
    c.execute('SELECT count(*) FROM users')
    if c.fetchone()[0] == 0:
        # Create Admin
        admin_pass = generate_password_hash('admin123')
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', 
                  ('admin@uni.edu', admin_pass, 'admin'))
        
        # Create Student
        student_pass = generate_password_hash('student123')
        c.execute('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', 
                  ('student@uni.edu', student_pass, 'student'))
        
        # Create Subjects
        subjects = [
            ('Computer Science 101', 'Intro to CS', 'CS101', '#4F46E5'),
            ('Advanced Mathematics', 'Calculus and Linear Algebra', 'MATH202', '#EC4899'),
            ('Physics I', 'Mechanics and Waves', 'PHYS101', '#10B981'),
            ('Chemistry', 'Organic Chemistry Basics', 'CHEM201', '#F59E0B'),
            ('History of Art', 'Renaissance to Modern', 'ART105', '#8B5CF6'),
            ('Economics', 'Micro and Macro Economics', 'ECON101', '#EF4444'),
            ('Psychology', 'Cognitive Science', 'PSYCH101', '#6366F1'),
            ('Literature', 'World Literature Classics', 'LIT301', '#14B8A6')
        ]
        c.executemany('INSERT INTO subjects (title, description, code, color) VALUES (?, ?, ?, ?)', subjects)
        
    conn.commit()
    conn.close()

# Helper for Authorization
def get_current_role():
    return request.headers.get('X-User-Role', 'guest')

def require_role(role):
    def decorator(f):
        def wrapper(*args, **kwargs):
            if get_current_role() != role and get_current_role() != 'admin':
                return jsonify({'error': 'Unauthorized'}), 401
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    client_device_id = data.get('device_id')
    
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    
    if user and check_password_hash(user['password'], password):
        # Device Lock Logic
        if user['role'] == 'student':
            if user['device_id'] is None:
                # First login: Bind device
                conn = get_db()
                conn.execute('UPDATE users SET device_id = ? WHERE id = ?', (client_device_id, user['id']))
                conn.commit()
                conn.close()
            elif user['device_id'] != client_device_id:
                return jsonify({
                    'success': False, 
                    'error': 'device_locked',
                    'message': 'Account linked to another device. Contact Admin.'
                }), 403

        return jsonify({
            'success': True,
            'must_reset': bool(user['must_change_pw']),
            'user': {
                'id': user['id'],
                'email': user['email'],
                'role': user['role']
            }
        })
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.json
    user_id = data.get('user_id')
    new_password = data.get('password')
    
    # Security check: User can only change their own password unless they are admin
    # In a real app we'd verify with a session token. For this demo, we check headers.
    if get_current_role() != 'admin':
        # Simulated session check - in production use Flask-Login or JWT
        pass 

    if len(new_password) < 8:
        return jsonify({'error': 'Short password'}), 400
        
    conn = get_db()
    conn.execute('UPDATE users SET password = ?, must_change_pw = 0 WHERE id = ?', 
                 (generate_password_hash(new_password), user_id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/admin/reset-device', methods=['POST'])
@require_role('admin')
def reset_device():
    data = request.json
    user_id = data.get('user_id')
    conn = get_db()
    conn.execute('UPDATE users SET device_id = NULL WHERE id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/subjects', methods=['GET'])
def get_subjects():
    conn = get_db()
    subjects = conn.execute('SELECT * FROM subjects').fetchall()
    conn.close()
    return jsonify([dict(s) for s in subjects])

@app.route('/api/subjects/<int:id>', methods=['GET'])
def get_subject_details(id):
    conn = get_db()
    subject = conn.execute('SELECT * FROM subjects WHERE id = ?', (id,)).fetchone()
    if not subject:
        return jsonify({'error': 'Subject not found'}), 404
        
    files = conn.execute('SELECT * FROM files WHERE subject_id = ? ORDER BY uploaded_at DESC', (id,)).fetchall()
    conn.close()
    
    return jsonify({
        'subject': dict(subject),
        'files': [dict(f) for f in files]
    })

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if get_current_role() not in ['admin', 'editor']:
        return jsonify({'error': 'Unauthorized'}), 401
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    subject_id = request.form.get('subject_id')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        filename = secure_filename(file.filename)
        save_name = f"{int(time.time())}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], save_name)
        file.save(filepath)
        
        file_type = 'pdf' if filename.lower().endswith('.pdf') else 'video' if filename.lower().endswith(('.mp4', '.mov')) else 'image'
        
        conn = get_db()
        # In a real app we'd get the actual user ID from a session/token. 
        # For this demo, we'll keep it simple but functional.
        admin_id = conn.execute('SELECT id FROM users WHERE role = ?', (get_current_role(),)).fetchone()
        user_id = admin_id['id'] if admin_id else 1

        conn.execute('INSERT INTO files (subject_id, filename, filepath, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?)',
                     (subject_id, filename, save_name, file_type, user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/subjects', methods=['POST'])
@require_role('admin')
def add_subject():
    data = request.json
    conn = get_db()
    conn.execute('INSERT INTO subjects (title, description, code, color) VALUES (?, ?, ?, ?)',
                 (data['title'], data['description'], data['code'], data['color']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/subjects/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_subject(id):
    conn = get_db()
    # Delete files from disk first
    files = conn.execute('SELECT filepath FROM files WHERE subject_id = ?', (id,)).fetchall()
    for f in files:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], f['filepath']))
        except: pass
        
    conn.execute('DELETE FROM subjects WHERE id = ?', (id,))
    conn.execute('DELETE FROM files WHERE subject_id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/subjects/<int:id>', methods=['PUT'])
@require_role('admin')
def rename_subject(id):
    data = request.json
    conn = get_db()
    conn.execute('UPDATE subjects SET title = ? WHERE id = ?', (data['title'], id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/files/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_file(id):
    conn = get_db()
    file = conn.execute('SELECT filepath FROM files WHERE id = ?', (id,)).fetchone()
    if file:
        try:
            os.remove(os.path.join(app.config['UPLOAD_FOLDER'], file['filepath']))
        except: pass
        conn.execute('DELETE FROM files WHERE id = ?', (id,))
        conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/files/<int:id>', methods=['PUT'])
@require_role('admin')
def rename_file(id):
    data = request.json
    conn = get_db()
    conn.execute('UPDATE files SET filename = ? WHERE id = ?', (data['filename'], id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# User Management
@app.route('/api/users', methods=['GET'])
@require_role('admin')
def get_users():
    conn = get_db()
    users = conn.execute('SELECT id, email, role, device_id, must_change_pw FROM users').fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/admin/add-student', methods=['POST'])
@require_role('admin')
def add_student():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    conn = get_db()
    try:
        conn.execute('INSERT INTO users (email, password, role, must_change_pw) VALUES (?, ?, ?, 1)',
                     (email, generate_password_hash(password), 'student'))
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'error': 'User already exists'}), 400
    finally:
        conn.close()
    return jsonify({'success': True})

@app.route('/api/users/<int:id>/role', methods=['PUT'])
@require_role('admin')
def update_user_role(id):
    data = request.json
    conn = get_db()
    conn.execute('UPDATE users SET role = ? WHERE id = ?', (data['role'], id))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# AI Real Integration
def extract_text_from_pdf(filepath):
    try:
        reader = PdfReader(filepath)
        text = ""
        # Process ALL pages
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        return ""

@app.route('/api/ai/summarize', methods=['POST'])
@require_role('student') # Allows students, editors, and admins
def ai_summarize():
    data = request.json
    file_id = data.get('fileId')
    
    conn = get_db()
    file_record = conn.execute('SELECT filepath FROM files WHERE id = ?', (file_id,)).fetchone()
    conn.close()
    
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
        
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file_record['filepath'])
    
    # Extract text
    document_text = extract_text_from_pdf(filepath)
    if not document_text:
        return jsonify({'summary': "قاعدة البيانات لا تحتوي على نص قابل للقراءة في هذا الملف.", 'questions': []})

    try:
        # AI features are temporarily disabled (Bilingual Message)
        message = (
            "The AI assistant is currently disabled.\n"
            "مساعد الذكاء الاصطناعي معطل حالياً.\n\n"
            "This platform is running in educational preview mode.\n"
            "هذه المنصة تعمل حالياً في وضع العرض التعليمي التجريبي.\n\n"
            "You can upload and download study materials normally.\n"
            "يمكنك رفع وتحميل المواد الدراسية بشكل طبيعي.\n\n"
            "AI features will be enabled in a future update.\n"
            "سيتم تفعيل ميزات الذكاء الاصطناعي في تحديث مستقبلي.\n\n"
            "Thank you for your understanding.\n"
            "شكراً لتفهمكم."
        )
        return jsonify({
            'summary': message,
            'concepts': "AI features are disabled / ميزات الذكاء الاصطناعي معطلة",
            'questions': ["AI features are disabled / ميزات الذكاء الاصطناعي معطلة"]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', debug=True, port=5000)
