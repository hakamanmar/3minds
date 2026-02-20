import os
import requests
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-key-123')

def get_db():
    return psycopg2.connect(os.environ.get('POSTGRES_URL'))

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT, device_id TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, title TEXT, description TEXT, code TEXT, color TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS lessons (id SERIAL PRIMARY KEY, subject_id INTEGER, title TEXT, url TEXT, type TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    c.execute('SELECT count(*) FROM users WHERE email=%s', ('admin@3minds.edu',))
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)',
                  ('admin@3minds.edu', generate_password_hash('3minds@admin2026'), 'admin'))
    conn.commit()
    c.close()
    conn.close()

try: init_db()
except: pass

def send_telegram(message):
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHANNEL_ID')
    if token and chat_id:
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            requests.post(url, json={"chat_id": chat_id, "text": message}, timeout=5)
        except: pass

def is_admin(req):
    role = req.headers.get('X-User-Role', '')
    return role == 'admin'

@app.route('/')
@app.route('/login')
@app.route('/admin')
@app.route('/subjects')
@app.route('/subject/<int:id>')
@app.route('/viewer')
@app.route('/change-password')
def index(id=None):
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email', '').strip()
        password = data.get('password', '')
        if not email or not password:
            return jsonify({'success': False, 'message': 'البريد وكلمة السر مطلوبان'}), 400
        conn = get_db()
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = c.fetchone()
        c.close()
        conn.close()
        if user and check_password_hash(user['password'], password):
            return jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
        return jsonify({'success': False, 'message': 'بيانات تسجيل الدخول غير صحيحة'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': 'خطأ في الخادم'}), 500

@app.route('/api/subjects', methods=['GET', 'POST'])
def handle_subjects():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if request.method == 'POST':
        if not is_admin(request):
            return jsonify({'error': 'Unauthorized'}), 401
        try:
            data = request.json
            title = data.get('title', '').strip()
            description = data.get('description', '').strip()
            code = data.get('code', '').strip()
            color = data.get('color', '#4f46e5').strip()
            if not title or not code:
                return jsonify({'error': 'الاسم والرمز مطلوبان'}), 400
            c.execute('INSERT INTO subjects (title, description, code, color) VALUES (%s, %s, %s, %s)',
                      (title, description, code, color))
            conn.commit()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': str(e)}), 400
        finally:
            c.close(); conn.close()
    c.execute('SELECT * FROM subjects ORDER BY id ASC')
    subs = c.fetchall()
    c.close(); conn.close()
    return jsonify([dict(s) for s in subs])

@app.route('/api/subjects/<int:id>', methods=['GET', 'DELETE', 'PUT'])
def handle_subject(id):
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    try:
        if request.method == 'DELETE':
            if not is_admin(request):
                return jsonify({'error': 'Unauthorized'}), 401
            c.execute('DELETE FROM lessons WHERE subject_id = %s', (id,))
            c.execute('DELETE FROM subjects WHERE id = %s', (id,))
            conn.commit()
            return jsonify({'success': True})
        if request.method == 'PUT':
            if not is_admin(request):
                return jsonify({'error': 'Unauthorized'}), 401
            data = request.json
            c.execute('UPDATE subjects SET title=%s, code=%s, description=%s, color=%s WHERE id=%s',
                     (data.get('title'), data.get('code'), data.get('description'), data.get('color'), id))
            conn.commit()
            return jsonify({'success': True})
        c.execute('SELECT * FROM subjects WHERE id = %s', (id,))
        subject = c.fetchone()
        if not subject:
            return jsonify({'error': 'Subject not found'}), 404
        c.execute('SELECT * FROM lessons WHERE subject_id = %s ORDER BY id ASC', (id,))
        lessons = c.fetchall()
        return jsonify({'subject': dict(subject), 'lessons': [dict(l) for l in lessons]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        c.close(); conn.close()

@app.route('/api/subjects/<int:id>/lessons', methods=['GET'])
def get_lessons(id):
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM lessons WHERE subject_id = %s ORDER BY id ASC', (id,))
    lessons = c.fetchall()
    c.close(); conn.close()
    return jsonify([dict(l) for l in lessons])

@app.route('/api/admin/add-lesson', methods=['POST'])
def add_lesson():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        subject_id = data.get('subject_id')
        title = data.get('title', '').strip()
        url = data.get('url', '').strip()
        lesson_type = data.get('type', 'PDF')
        if not title or not url:
            return jsonify({'error': 'العنوان والرابط مطلوبان'}), 400
        conn = get_db()
        c = conn.cursor()
        c.execute('INSERT INTO lessons (subject_id, title, url, type) VALUES (%s, %s, %s, %s)',
                  (subject_id, title, url, lesson_type))
        conn.commit()
        try:
            c.execute('SELECT title FROM subjects WHERE id = %s', (subject_id,))
            result = c.fetchone()
            if result:
                type_str = "فيديو" if lesson_type == 'Video' else "ملف"
                msg = f"📢 **محاضرة جديدة ({type_str})**\n\n📚 المادة: {result[0]}\n📝 العنوان: {title}\n\nhttps://3minds-academic.vercel.app"
                send_telegram(msg)
        except: pass
        c.close(); conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/lessons/<int:id>', methods=['DELETE'])
def delete_lesson(id):
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM lessons WHERE id = %s', (id,))
    conn.commit()
    c.close(); conn.close()
    return jsonify({'success': True})

@app.route('/api/users', methods=['GET', 'DELETE'])
def handle_users():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if request.method == 'DELETE':
        user_id = request.args.get('id')
        c.execute("DELETE FROM users WHERE id = %s AND role != 'admin'", (user_id,))
        conn.commit()
        c.close(); conn.close()
        return jsonify({'success': True})
    c.execute('SELECT id, email, role, device_id FROM users ORDER BY id ASC')
    users = c.fetchall()
    c.close(); conn.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/admin/add-student', methods=['POST'])
def add_student():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    try:
        data = request.json
        email = data.get('email', '').strip()
        password = data.get('password', '')
        if not email or not password:
            return jsonify({'success': False, 'error': 'البريد وكلمة السر مطلوبان'}), 400
        conn = get_db()
        c = conn.cursor()
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)',
                  (email, generate_password_hash(password), 'student'))
        conn.commit()
        c.close(); conn.close()
        return jsonify({'success': True})
    except:
        return jsonify({'success': False, 'error': 'المستخدم موجود مسبقاً'}), 400

@app.route('/api/admin/reset-device', methods=['POST'])
def reset_device():
    if not is_admin(request):
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET device_id = NULL WHERE id = %s', (data['user_id'],))
    conn.commit()
    c.close(); conn.close()
    return jsonify({'success': True})

@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.json
    if not data.get('user_id') or not data.get('password'):
        return jsonify({'error': 'مطلوب'}), 400
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET password = %s WHERE id = %s',
              (generate_password_hash(data['password']), data['user_id']))
    conn.commit()
    c.close(); conn.close()
    return jsonify({'success': True})

@app.route('/api/announcements', methods=['GET', 'POST', 'DELETE', 'PUT'])
def handle_announcements():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    if request.method == 'POST':
        if not is_admin(request):
            return jsonify({'error': 'Unauthorized'}), 401
        data = request.json
        content = data.get('content', '').strip()
        if not content:
            return jsonify({'error': 'المحتوى مطلوب'}), 400
        c.execute('INSERT INTO announcements (content) VALUES (%s)', (content,))
        conn.commit()
        send_telegram(f"🔔 **تبليغ هام**\n\n{content}\n\nhttps://3minds-academic.vercel.app")
        c.close(); conn.close()
        return jsonify({'success': True})
    if request.method == 'PUT':
        if not is_admin(request):
            return jsonify({'error': 'Unauthorized'}), 401
        data = request.json
        ann_id = request.args.get('id')
        content = data.get('content', '').strip()
        c.execute('UPDATE announcements SET content = %s WHERE id = %s', (content, ann_id))
        conn.commit()
        c.close(); conn.close()
        return jsonify({'success': True})
    if request.method == 'DELETE':
        if not is_admin(request):
            return jsonify({'error': 'Unauthorized'}), 401
        ann_id = request.args.get('id')
        c.execute('DELETE FROM announcements WHERE id = %s', (ann_id,))
        conn.commit()
        c.close(); conn.close()
        return jsonify({'success': True})
    c.execute("SELECT id, content, to_char(created_at, 'DD-MM-YYYY  HH12:MI AM') as created_at FROM announcements ORDER BY id DESC")
    anns = c.fetchall()
    c.close(); conn.close()
    return jsonify([dict(a) for a in anns])

if __name__ == '__main__':
    app.run()
