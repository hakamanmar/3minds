import os
import requests
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify, session, redirect
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import secrets
import hmac
import re
from urllib.parse import urlparse
import html

app = Flask(__name__, static_folder='static', template_folder='templates')

# ===== إعدادات الأمان المشددة =====
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    # في Development فقط - في Production لازم يكون في البيئة
    SECRET_KEY = secrets.token_hex(32)
    print("⚠️ Warning: Using auto-generated SECRET_KEY. Set SECRET_KEY environment variable for production!")

app.config['SECRET_KEY'] = SECRET_KEY
app.config['SESSION_COOKIE_NAME'] = '3m_sec_session'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_PATH'] = '/'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
app.config['SESSION_REFRESH_EACH_REQUEST'] = True
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['JSON_SORT_KEYS'] = False

# Rate Limiting
MAX_LOGIN_ATTEMPTS = 5
MAX_ADMIN_ATTEMPTS = 3
LOCKOUT_TIME = timedelta(minutes=15)
ADMIN_LOCKOUT_TIME = timedelta(minutes=30)

# ===== Input Validation Rules =====
VALIDATION_RULES = {
    'email': {'min': 5, 'max': 255, 'pattern': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'},
    'password': {'min': 8, 'max': 128},
    'title': {'min': 1, 'max': 200},
    'description': {'min': 0, 'max': 1000},
    'code': {'min': 1, 'max': 50},
    'color': {'min': 4, 'max': 7, 'pattern': r'^#[0-9A-Fa-f]{3,6}$'},
    'url': {'min': 5, 'max': 2000},
    'content': {'min': 1, 'max': 5000},
    'type': {'allowed': ['Video', 'PDF', 'File']}
}

# Database Helpers
def get_db():
    return psycopg2.connect(os.environ.get('POSTGRES_URL'))

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    c.execute('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT, device_id TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, title TEXT, description TEXT, code TEXT, color TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS lessons (id SERIAL PRIMARY KEY, subject_id INTEGER, title TEXT, url TEXT, type TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    
    try:
        c.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE')
        c.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP')
        c.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0')
        c.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP')
    except:
        pass
    
    c.execute('''CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY, 
        email TEXT, 
        ip_address TEXT, 
        success BOOLEAN, 
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT
    )''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        identifier TEXT UNIQUE,
        attempts INTEGER DEFAULT 0,
        last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    c.execute('SELECT count(*) FROM users WHERE email=%s', ('admin@3minds.edu',))
    if c.fetchone()[0] == 0:
        c.execute('INSERT INTO users (email, password, role, is_active) VALUES (%s, %s, %s, %s)', 
                  ('admin@3minds.edu', generate_password_hash('3Minds@Secure#2026!Admin'), 'admin', True))
    else:
        c.execute('UPDATE users SET password = %s, is_active = %s, failed_attempts = 0, locked_until = NULL WHERE email = %s',
                  (generate_password_hash('3Minds@Secure#2026!Admin'), True, 'admin@3minds.edu'))
    
    conn.commit()
    c.close()
    conn.close()

try: 
    init_db()
except Exception as e:
    print(f"⚠️ Database initialization error: {e}")

# Telegram Service
def send_telegram(message):
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHANNEL_ID')
    if token and chat_id:
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            requests.post(url, json={"chat_id": chat_id, "text": message}, timeout=5)
        except: 
            pass

# ===== Input Validation & Sanitization =====
def sanitize_input(text):
    """تنظيف النص من HTML وJavaScript الخبيث"""
    if not isinstance(text, str):
        return str(text)
    # إزالة HTML tags
    text = html.escape(text)
    # إزالة null bytes
    text = text.replace('\x00', '')
    return text.strip()

def validate_field(field_name, value, rules=None):
    """فحص صحة الحقل"""
    if rules is None:
        rules = VALIDATION_RULES.get(field_name, {})
    
    # التحقق من وجود القيمة
    if value is None or value == '':
        return False, f'{field_name} مطلوب'
    
    # تحويل إلى string للفحص
    value_str = str(value).strip()
    
    # فحص الطول
    if 'min' in rules and len(value_str) < rules['min']:
        return False, f'{field_name} قصير جداً (الحد الأدنى {rules["min"]} أحرف)'
    
    if 'max' in rules and len(value_str) > rules['max']:
        return False, f'{field_name} طويل جداً (الحد الأقصى {rules["max"]} حرف)'
    
    # فحص النمط (Pattern)
    if 'pattern' in rules:
        if not re.match(rules['pattern'], value_str):
            return False, f'{field_name} صيغته غير صحيحة'
    
    # فحص القيم المسموحة
    if 'allowed' in rules:
        if value not in rules['allowed']:
            return False, f'{field_name} قيمة غير مسموحة'
    
    return True, None

def validate_url(url):
    """فحص صحة الرابط"""
    try:
        result = urlparse(url)
        # السماح فقط بـ http, https
        if result.scheme not in ['http', 'https']:
            return False, 'الرابط يجب أن يبدأ بـ http:// أو https://'
        # منع javascript: و data: URIs
        if result.scheme in ['javascript', 'data', 'file']:
            return False, 'نوع الرابط غير مسموح'
        return True, None
    except:
        return False, 'صيغة الرابط غير صحيحة'

def validate_email(email):
    """فحص صحة البريد الإلكتروني"""
    return validate_field('email', email)

def validate_integer(value, min_val=None, max_val=None):
    """فحص صحة الرقم"""
    try:
        num = int(value)
        if min_val is not None and num < min_val:
            return False, f'القيمة يجب أن تكون أكبر من {min_val}'
        if max_val is not None and num > max_val:
            return False, f'القيمة يجب أن تكون أصغر من {max_val}'
        return True, None
    except:
        return False, 'القيمة يجب أن تكون رقماً'

# ===== Security Helpers =====
def log_login_attempt(email, ip_address, success, user_agent=''):
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('INSERT INTO login_logs (email, ip_address, success, user_agent) VALUES (%s, %s, %s, %s)',
                  (email, ip_address, success, user_agent))
        conn.commit()
        c.close()
        conn.close()
    except:
        pass

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    return request.remote_addr or 'unknown'

def check_rate_limit_db(identifier, max_attempts, lockout_time):
    try:
        conn = get_db()
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('SELECT attempts, last_attempt FROM rate_limits WHERE identifier = %s', (identifier,))
        result = c.fetchone()
        
        if result:
            attempts, last_attempt = result['attempts'], result['last_attempt']
            if attempts >= max_attempts:
                if datetime.now() - last_attempt < lockout_time:
                    c.close()
                    conn.close()
                    remaining = int((lockout_time - (datetime.now() - last_attempt)).total_seconds() / 60)
                    return False, f"محظور مؤقتاً. حاول بعد {remaining} دقيقة"
                else:
                    c.execute('UPDATE rate_limits SET attempts = 0, last_attempt = %s WHERE identifier = %s',
                              (datetime.now(), identifier))
                    conn.commit()
        
        c.close()
        conn.close()
        return True, None
    except:
        return True, None

def record_failed_attempt_db(identifier):
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''INSERT INTO rate_limits (identifier, attempts, last_attempt) 
                     VALUES (%s, 1, %s)
                     ON CONFLICT (identifier) 
                     DO UPDATE SET attempts = rate_limits.attempts + 1, last_attempt = %s''',
                  (identifier, datetime.now(), datetime.now()))
        conn.commit()
        c.close()
        conn.close()
    except:
        pass

def reset_attempts_db(identifier):
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('DELETE FROM rate_limits WHERE identifier = %s', (identifier,))
        conn.commit()
        c.close()
        conn.close()
    except:
        pass

# ===== Security Headers Middleware =====
@app.after_request
def set_security_headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    if os.environ.get('FLASK_ENV') == 'production':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return response

# ===== AUTHENTICATION DECORATORS =====
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return jsonify({'error': 'Session expired'}), 401
        
        session['last_activity'] = datetime.now().isoformat()
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return jsonify({'error': 'Session expired'}), 401
        
        try:
            conn = get_db()
            c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            c.execute('SELECT role, is_active FROM users WHERE id = %s', (session['user_id'],))
            user = c.fetchone()
            c.close()
            conn.close()
            
            if not user or user['role'] != 'admin':
                return jsonify({'error': 'Forbidden'}), 403
            
            if user.get('is_active') == False:
                session.clear()
                return jsonify({'error': 'Account disabled'}), 403
        except:
            return jsonify({'error': 'Server error'}), 500
        
        session['last_activity'] = datetime.now().isoformat()
        return f(*args, **kwargs)
    return decorated_function

def admin_page_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/')
        
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return redirect('/')
        
        try:
            conn = get_db()
            c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            c.execute('SELECT role, is_active FROM users WHERE id = %s', (session['user_id'],))
            user = c.fetchone()
            c.close()
            conn.close()
            
            if not user or user['role'] != 'admin' or user.get('is_active') == False:
                return redirect('/')
        except:
            return redirect('/')
        
        session['last_activity'] = datetime.now().isoformat()
        return f(*args, **kwargs)
    return decorated_function

# Routes
@app.route('/')
@app.route('/login')
@app.route('/subjects')
@app.route('/subject/<int:id>')
def index(id=None):
    return render_template('index.html')

@app.route('/admin')
@admin_page_required
def admin():
    return render_template('index.html')

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = sanitize_input(data.get('email', '')).strip()
        password = data.get('password', '')
        
        # فحص صحة البريد الإلكتروني
        valid, error = validate_email(email)
        if not valid:
            return jsonify({'success': False, 'message': error}), 400
        
        # فحص صحة كلمة السر
        valid, error = validate_field('password', password)
        if not valid:
            return jsonify({'success': False, 'message': error}), 400
        
        client_ip = get_client_ip()
        user_agent = request.headers.get('User-Agent', '')
        
        is_admin_attempt = email == 'admin@3minds.edu'
        identifier = f"login:{email}"
        max_attempts = MAX_ADMIN_ATTEMPTS if is_admin_attempt else MAX_LOGIN_ATTEMPTS
        lockout_time = ADMIN_LOCKOUT_TIME if is_admin_attempt else LOCKOUT_TIME
        
        allowed, error_msg = check_rate_limit_db(identifier, max_attempts, lockout_time)
        if not allowed:
            log_login_attempt(email, client_ip, False, user_agent)
            return jsonify({'success': False, 'message': error_msg}), 429
        
        conn = get_db()
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('SELECT * FROM users WHERE email = %s', (email,))
        user = c.fetchone()
        
        if user and check_password_hash(user['password'], password):
            if user.get('is_active') == False:
                c.close()
                conn.close()
                log_login_attempt(email, client_ip, False, user_agent)
                return jsonify({'success': False, 'message': 'الحساب معطل'}), 403
            
            if user.get('locked_until'):
                if datetime.now() < user['locked_until']:
                    c.close()
                    conn.close()
                    return jsonify({'success': False, 'message': 'الحساب محظور مؤقتاً'}), 429
            
            c.execute('UPDATE users SET last_login = %s, failed_attempts = 0, locked_until = NULL WHERE id = %s',
                      (datetime.now(), user['id']))
            conn.commit()
            c.close()
            conn.close()
            
            reset_attempts_db(identifier)
            log_login_attempt(email, client_ip, True, user_agent)
            
            session.clear()
            session['user_id'] = user['id']
            session['user_email'] = user['email']
            session['user_role'] = user['role']
            session['last_activity'] = datetime.now().isoformat()
            session['login_ip'] = client_ip
            
            if user['role'] == 'admin':
                session.permanent = False
            else:
                session.permanent = True
            
            session.modified = True
            
            return jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
        
        if user:
            failed = user.get('failed_attempts', 0) + 1
            locked_until = None
            if failed >= max_attempts:
                locked_until = datetime.now() + lockout_time
            c.execute('UPDATE users SET failed_attempts = %s, locked_until = %s WHERE id = %s',
                      (failed, locked_until, user['id']))
            conn.commit()
            c.close()
            conn.close()
        
        record_failed_attempt_db(identifier)
        log_login_attempt(email, client_ip, False, user_agent)
        
        return jsonify({'success': False, 'message': 'بيانات تسجيل الدخول غير صحيحة'}), 401
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'success': False, 'message': 'خطأ في الخادم'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/check-session', methods=['GET'])
def check_session():
    if 'user_id' in session:
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return jsonify({'authenticated': False})
        
        return jsonify({
            'authenticated': True,
            'user': {
                'id': session['user_id'],
                'email': session['user_email'],
                'role': session['user_role']
            }
        })
    return jsonify({'authenticated': False})

@app.route('/api/subjects', methods=['GET', 'POST'])
def handle_subjects():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'POST':
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            data = request.json
            
            # فحص وتنظيف المدخلات
            title = sanitize_input(data.get('title', ''))
            description = sanitize_input(data.get('description', ''))
            code = sanitize_input(data.get('code', ''))
            color = sanitize_input(data.get('color', ''))
            
            # التحقق من صحة المدخلات
            valid, error = validate_field('title', title)
            if not valid:
                return jsonify({'error': error}), 400
            
            valid, error = validate_field('description', description)
            if not valid:
                return jsonify({'error': error}), 400
            
            valid, error = validate_field('code', code)
            if not valid:
                return jsonify({'error': error}), 400
            
            valid, error = validate_field('color', color)
            if not valid:
                return jsonify({'error': error}), 400
            
            c.execute('INSERT INTO subjects (title, description, code, color) VALUES (%s, %s, %s, %s)',
                      (title, description, code, color))
            conn.commit()
            return jsonify({'success': True})
            
        except Exception as e:
            print(f"Error: {e}")
            return jsonify({'error': 'خطأ في المدخلات'}), 400
        finally:
            c.close()
            conn.close()
    
    c.execute('SELECT * FROM subjects ORDER BY id ASC')
    subs = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(s) for s in subs])

@app.route('/api/subjects/<int:id>', methods=['GET', 'DELETE', 'PUT'])
def handle_subject(id):
    # فحص صحة ID
    valid, error = validate_integer(id, min_val=1)
    if not valid:
        return jsonify({'error': error}), 400
    
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        if request.method == 'DELETE':
            if 'user_id' not in session or session.get('user_role') != 'admin':
                return jsonify({'error': 'Unauthorized'}), 401
                
            c.execute('DELETE FROM lessons WHERE subject_id = %s', (id,))
            c.execute('DELETE FROM subjects WHERE id = %s', (id,))
            conn.commit()
            return jsonify({'success': True})
            
        if request.method == 'PUT':
            if 'user_id' not in session or session.get('user_role') != 'admin':
                return jsonify({'error': 'Unauthorized'}), 401
            
            data = request.json
            
            # فحص وتنظيف المدخلات
            title = sanitize_input(data.get('title', ''))
            code = sanitize_input(data.get('code', ''))
            description = sanitize_input(data.get('description', ''))
            color = sanitize_input(data.get('color', ''))
            
            # التحقق من صحة المدخلات
            valid, error = validate_field('title', title)
            if not valid:
                return jsonify({'error': error}), 400
            
            valid, error = validate_field('code', code)
            if not valid:
                return jsonify({'error': error}), 400
            
            valid, error = validate_field('description', description)
            if not valid:
                return jsonify({'error': error}), 400
            
            valid, error = validate_field('color', color)
            if not valid:
                return jsonify({'error': error}), 400
            
            c.execute('UPDATE subjects SET title=%s, code=%s, description=%s, color=%s WHERE id=%s', 
                     (title, code, description, color, id))
            conn.commit()
            return jsonify({'success': True})
            
        c.execute('SELECT * FROM subjects WHERE id = %s', (id,))
        subject = c.fetchone()
        
        if not subject:
            return jsonify({'error': 'Not found'}), 404
            
        c.execute('SELECT * FROM lessons WHERE subject_id = %s ORDER BY id ASC', (id,))
        lessons = c.fetchall()
        
        return jsonify({
            'subject': dict(subject),
            'lessons': [dict(l) for l in lessons]
        })

    except Exception as e:
        return jsonify({'error': 'Server error'}), 500
    finally:
        c.close()
        conn.close()

@app.route('/api/subjects/<int:id>/lessons', methods=['GET'])
def get_lessons(id):
    valid, error = validate_integer(id, min_val=1)
    if not valid:
        return jsonify({'error': error}), 400
    
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM lessons WHERE subject_id = %s ORDER BY id ASC', (id,))
    lessons = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(l) for l in lessons])

@app.route('/api/admin/add-lesson', methods=['POST'])
@admin_required
def add_lesson():
    try:
        data = request.json
        
        # فحص وتنظيف المدخلات
        subject_id = data.get('subject_id')
        title = sanitize_input(data.get('title', ''))
        url = sanitize_input(data.get('url', ''))
        lesson_type = data.get('type', '')
        
        # التحقق من صحة المدخلات
        valid, error = validate_integer(subject_id, min_val=1)
        if not valid:
            return jsonify({'error': error}), 400
        
        valid, error = validate_field('title', title)
        if not valid:
            return jsonify({'error': error}), 400
        
        valid, error = validate_url(url)
        if not valid:
            return jsonify({'error': error}), 400
        
        valid, error = validate_field('type', lesson_type)
        if not valid:
            return jsonify({'error': error}), 400
        
        conn = get_db()
        c = conn.cursor()
        c.execute('INSERT INTO lessons (subject_id, title, url, type) VALUES (%s, %s, %s, %s)',
                  (subject_id, title, url, lesson_type))
        conn.commit()
        
        try:
            c.execute('SELECT title FROM subjects WHERE id = %s', (subject_id,))
            result = c.fetchone()
            if result:
                subject_title = result[0]
                type_str = "فيديو" if lesson_type == 'Video' else "ملف"
                msg = f"📢 **محاضرة جديدة ({type_str})**\n\n📚 المادة: {subject_title}\n📝 العنوان: {title}\n\nتصفح المحاضرة الآن 👇\nhttps://3minds-academic.vercel.app"
                send_telegram(msg)
        except: 
            pass
        
        c.close()
        conn.close()
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'خطأ في المدخلات'}), 400

@app.route('/api/lessons/<int:id>', methods=['DELETE'])
@admin_required
def delete_lesson(id):
    valid, error = validate_integer(id, min_val=1)
    if not valid:
        return jsonify({'error': error}), 400
    
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM lessons WHERE id = %s', (id,))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/users', methods=['GET', 'DELETE'])
@admin_required
def handle_users():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'DELETE':
        user_id = request.args.get('id')
        
        valid, error = validate_integer(user_id, min_val=1)
        if not valid:
            return jsonify({'error': error}), 400
        
        c.execute('DELETE FROM users WHERE id = %s AND role != \'admin\'', (user_id,))
        conn.commit()
        c.close()
        conn.close()
        return jsonify({'success': True})
        
    c.execute('SELECT id, email, role, device_id FROM users ORDER BY id ASC')
    users = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route('/api/admin/add-student', methods=['POST'])
@admin_required
def add_student():
    try:
        data = request.json
        
        email = sanitize_input(data.get('email', ''))
        password = data.get('password', '')
        
        # التحقق من صحة المدخلات
        valid, error = validate_email(email)
        if not valid:
            return jsonify({'success': False, 'error': error}), 400
        
        valid, error = validate_field('password', password)
        if not valid:
            return jsonify({'success': False, 'error': error}), 400
        
        conn = get_db()
        c = conn.cursor()
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)',
                  (email, generate_password_hash(password), 'student'))
        conn.commit()
        c.close()
        conn.close()
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'success': False, 'error': 'المستخدم موجود مسبقاً'}), 400

@app.route('/api/admin/reset-device', methods=['POST'])
@admin_required
def reset_device():
    data = request.json
    user_id = data.get('user_id')
    
    valid, error = validate_integer(user_id, min_val=1)
    if not valid:
        return jsonify({'error': error}), 400
    
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET device_id = NULL WHERE id = %s', (user_id,))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    user_id = data.get('user_id')
    password = data.get('password', '')
    
    valid, error = validate_integer(user_id, min_val=1)
    if not valid:
        return jsonify({'error': error}), 400
    
    valid, error = validate_field('password', password)
    if not valid:
        return jsonify({'error': error}), 400
    
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET password = %s WHERE id = %s',
              (generate_password_hash(password), user_id))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/announcements', methods=['GET', 'POST', 'DELETE', 'PUT'])
def handle_announcements():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'POST':
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            data = request.json
            content = sanitize_input(data.get('content', ''))
            
            valid, error = validate_field('content', content)
            if not valid:
                return jsonify({'error': error}), 400
            
            c.execute('INSERT INTO announcements (content) VALUES (%s)', (content,))
            conn.commit()
            msg = f"🔔 **تبليغ هام**\n\n{content}\n\nhttps://3minds-academic.vercel.app"
            send_telegram(msg)
            c.close()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': 'خطأ في المدخلات'}), 400
        
    if request.method == 'PUT':
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            data = request.json
            id = request.args.get('id')
            content = sanitize_input(data.get('content', ''))
            
            valid, error = validate_integer(id, min_val=1)
            if not valid:
                return jsonify({'error': error}), 400
            
            valid, error = validate_field('content', content)
            if not valid:
                return jsonify({'error': error}), 400
            
            c.execute('UPDATE announcements SET content = %s WHERE id = %s', (content, id))
            conn.commit()
            c.close()
            conn.close()
            return jsonify({'success': True})
        except Exception as e:
            return jsonify({'error': 'خطأ في المدخلات'}), 400
        
    if request.method == 'DELETE':
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
        
        id = request.args.get('id')
        
        valid, error = validate_integer(id, min_val=1)
        if not valid:
            return jsonify({'error': error}), 400
        
        c.execute('DELETE FROM announcements WHERE id = %s', (id,))
        conn.commit()
        c.close()
        conn.close()
        return jsonify({'success': True})
    
    c.execute("SELECT id, content, to_char(created_at, 'DD-MM-YYYY  HH12:MI AM') as created_at FROM announcements ORDER BY id DESC")
    anns = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(a) for a in anns])

if __name__ == '__main__':
    app.run()
