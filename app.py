import os
import requests
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify, session, redirect
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from functools import wraps
import secrets

app = Flask(__name__, static_folder='static', template_folder='templates')

# ===== إعدادات الأمان المشددة للـ SESSIONS والـ COOKIES =====
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# إعدادات الكوكيز - الحماية القصوى
app.config['SESSION_COOKIE_NAME'] = '3m_sec_session'  # اسم مخصص غير معروف
app.config['SESSION_COOKIE_HTTPONLY'] = True  # منع JavaScript من الوصول (XSS Protection)
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS فقط (مهم جداً)
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'  # حماية من CSRF
app.config['SESSION_COOKIE_PATH'] = '/'  # المسار المحدد
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)  # مدة الجلسة 30 دقيقة
app.config['SESSION_REFRESH_EACH_REQUEST'] = True  # تجديد الجلسة مع كل طلب

# إعدادات أمان إضافية
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # حد أقصى 16MB للرفع
app.config['JSON_SORT_KEYS'] = False  # تحسين الأداء

# تتبع محاولات تسجيل الدخول الفاشلة (حماية من Brute Force)
login_attempts = {}
admin_login_attempts = {}  # تتبع خاص بمحاولات الأدمن
MAX_LOGIN_ATTEMPTS = 5
MAX_ADMIN_ATTEMPTS = 3  # محاولات أقل للأدمن
LOCKOUT_TIME = timedelta(minutes=15)
ADMIN_LOCKOUT_TIME = timedelta(minutes=30)  # وقت حظر أطول للأدمن

# تتبع محاولات الوصول المشبوهة
suspicious_ips = {}
MAX_SUSPICIOUS_ATTEMPTS = 10

# Database Helpers
def get_db():
    return psycopg2.connect(os.environ.get('POSTGRES_URL'))

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE, password TEXT, role TEXT, device_id TEXT, is_active BOOLEAN DEFAULT TRUE, last_login TIMESTAMP)')
    c.execute('CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, title TEXT, description TEXT, code TEXT, color TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS lessons (id SERIAL PRIMARY KEY, subject_id INTEGER, title TEXT, url TEXT, type TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS announcements (id SERIAL PRIMARY KEY, content TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)')
    
    # إضافة جدول لتسجيل محاولات الدخول (Audit Log)
    c.execute('''CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY, 
        email TEXT, 
        ip_address TEXT, 
        success BOOLEAN, 
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT
    )''')
    
    # إنشاء حساب الأدمن بكلمة سر قوية جداً
    c.execute('SELECT count(*) FROM users WHERE email=%s', ('admin@3minds.edu',))
    if c.fetchone()[0] == 0:
        # كلمة السر الجديدة: 3Minds@Secure#2026!Admin
        c.execute('INSERT INTO users (email, password, role, is_active) VALUES (%s, %s, %s, %s)', 
                  ('admin@3minds.edu', generate_password_hash('3Minds@Secure#2026!Admin'), 'admin', True))
    else:
        # تحديث كلمة السر والتأكد من تفعيل الحساب
        c.execute('UPDATE users SET password = %s, is_active = %s WHERE email = %s',
                  (generate_password_hash('3Minds@Secure#2026!Admin'), True, 'admin@3minds.edu'))
    conn.commit()
    c.close()
    conn.close()

try: init_db()
except: pass

# Telegram Service
def send_telegram(message):
    token = os.environ.get('TELEGRAM_BOT_TOKEN')
    chat_id = os.environ.get('TELEGRAM_CHANNEL_ID')
    if token and chat_id:
        try:
            url = f"https://api.telegram.org/bot{token}/sendMessage"
            requests.post(url, json={"chat_id": chat_id, "text": message}, timeout=5)
        except: pass

# ===== Security Logging =====
def log_login_attempt(email, ip_address, success, user_agent=''):
    """تسجيل محاولات تسجيل الدخول"""
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
    """الحصول على IP الزائر"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0]
    return request.remote_addr

def check_suspicious_ip(ip):
    """فحص IP المشبوه"""
    if ip in suspicious_ips:
        attempts, last_attempt = suspicious_ips[ip]
        if attempts >= MAX_SUSPICIOUS_ATTEMPTS:
            if datetime.now() - last_attempt < timedelta(hours=24):
                return False
            else:
                suspicious_ips[ip] = [0, datetime.now()]
    return True

def record_suspicious_activity(ip):
    """تسجيل نشاط مشبوه"""
    if ip in suspicious_ips:
        attempts, _ = suspicious_ips[ip]
        suspicious_ips[ip] = [attempts + 1, datetime.now()]
    else:
        suspicious_ips[ip] = [1, datetime.now()]

# ===== Security Headers Middleware =====
@app.after_request
def set_security_headers(response):
    """إضافة رؤوس الأمان لكل استجابة"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
    return response

# ===== دالة فحص محاولات تسجيل الدخول =====
def check_login_attempts(email, is_admin=False):
    """فحص إذا الحساب محظور مؤقتاً بسبب محاولات فاشلة كثيرة"""
    attempts_dict = admin_login_attempts if is_admin else login_attempts
    max_attempts = MAX_ADMIN_ATTEMPTS if is_admin else MAX_LOGIN_ATTEMPTS
    lockout_time = ADMIN_LOCKOUT_TIME if is_admin else LOCKOUT_TIME
    
    if email in attempts_dict:
        attempts, last_attempt = attempts_dict[email]
        if attempts >= max_attempts:
            if datetime.now() - last_attempt < lockout_time:
                remaining = int((lockout_time - (datetime.now() - last_attempt)).total_seconds() / 60)
                return False, f"الحساب محظور مؤقتاً بسبب محاولات فاشلة متعددة. حاول بعد {remaining} دقيقة"
            else:
                # انتهت مدة الحظر، إعادة تعيين
                attempts_dict[email] = [0, datetime.now()]
    return True, None

def record_failed_login(email, is_admin=False):
    """تسجيل محاولة فاشلة"""
    attempts_dict = admin_login_attempts if is_admin else login_attempts
    if email in attempts_dict:
        attempts, _ = attempts_dict[email]
        attempts_dict[email] = [attempts + 1, datetime.now()]
    else:
        attempts_dict[email] = [1, datetime.now()]

def reset_login_attempts(email, is_admin=False):
    """إعادة تعيين المحاولات عند نجاح تسجيل الدخول"""
    attempts_dict = admin_login_attempts if is_admin else login_attempts
    if email in attempts_dict:
        del attempts_dict[email]

def regenerate_session():
    """تجديد معرّف الجلسة لمنع Session Fixation"""
    user_data = {
        'user_id': session.get('user_id'),
        'user_email': session.get('user_email'),
        'user_role': session.get('user_role'),
        'last_activity': session.get('last_activity')
    }
    session.clear()
    session.update(user_data)
    session.modified = True

# ===== AUTHENTICATION DECORATORS =====
def login_required(f):
    """يتطلب تسجيل دخول المستخدم"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized - Login required'}), 401
        
        # فحص صلاحية الجلسة
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return jsonify({'error': 'Session expired - Please login again'}), 401
        
        # تحديث وقت آخر نشاط
        session['last_activity'] = datetime.now().isoformat()
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """يتطلب صلاحيات الأدمن فقط"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized - Login required'}), 401
        
        # فحص صلاحية الجلسة
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return jsonify({'error': 'Session expired - Please login again'}), 401
        
        # التحقق من أن المستخدم أدمن ونشط
        conn = get_db()
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('SELECT role, is_active FROM users WHERE id = %s', (session['user_id'],))
        user = c.fetchone()
        c.close()
        conn.close()
        
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Forbidden - Admin access only'}), 403
        
        if not user.get('is_active', True):
            session.clear()
            return jsonify({'error': 'Account is disabled'}), 403
        
        # تحديث وقت آخر نشاط
        session['last_activity'] = datetime.now().isoformat()
        return f(*args, **kwargs)
    return decorated_function

def admin_page_required(f):
    """حماية صفحات الأدمن - إعادة توجيه للصفحة الرئيسية"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/')
        
        # فحص صلاحية الجلسة
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return redirect('/')
        
        conn = get_db()
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('SELECT role, is_active FROM users WHERE id = %s', (session['user_id'],))
        user = c.fetchone()
        c.close()
        conn.close()
        
        if not user or user['role'] != 'admin':
            return redirect('/')
        
        if not user.get('is_active', True):
            session.clear()
            return redirect('/')
        
        # تحديث وقت آخر نشاط
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
    data = request.json
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    client_ip = get_client_ip()
    user_agent = request.headers.get('User-Agent', '')
    
    # فحص IP المشبوه
    if not check_suspicious_ip(client_ip):
        return jsonify({'success': False, 'message': 'عنوان IP محظور بسبب نشاط مشبوه'}), 403
    
    # التحقق إذا كان محاولة دخول للأدمن
    is_admin_attempt = email == 'admin@3minds.edu'
    
    # فحص محاولات تسجيل الدخول
    allowed, error_msg = check_login_attempts(email, is_admin_attempt)
    if not allowed:
        log_login_attempt(email, client_ip, False, user_agent)
        record_suspicious_activity(client_ip)
        return jsonify({'success': False, 'message': error_msg}), 429
    
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    c.execute('SELECT * FROM users WHERE email = %s', (email,))
    user = c.fetchone()
    
    if user and check_password_hash(user['password'], password):
        # التحقق من أن الحساب نشط
        if not user.get('is_active', True):
            c.close()
            conn.close()
            log_login_attempt(email, client_ip, False, user_agent)
            return jsonify({'success': False, 'message': 'الحساب معطل. اتصل بالإدارة'}), 403
        
        # نجح تسجيل الدخول - تحديث آخر دخول
        c.execute('UPDATE users SET last_login = %s WHERE id = %s', (datetime.now(), user['id']))
        conn.commit()
        c.close()
        conn.close()
        
        # إعادة تعيين المحاولات
        reset_login_attempts(email, is_admin_attempt)
        
        # تسجيل النجاح
        log_login_attempt(email, client_ip, True, user_agent)
        
        # مسح الجلسة القديمة وإنشاء جلسة جديدة (حماية من Session Fixation)
        session.clear()
        
        # حفظ بيانات المستخدم في الـ session
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        session['user_role'] = user['role']
        session['last_activity'] = datetime.now().isoformat()
        session['login_ip'] = client_ip  # حفظ IP تسجيل الدخول
        
        # ===== الأدمن: Session غير دائمة (تنتهي بإغلاق المتصفح) =====
        if user['role'] == 'admin':
            session.permanent = False  # لا يتم حفظ الجلسة بعد إغلاق المتصفح
        else:
            # الطلاب: Session عادية
            session.permanent = True
        
        # تجديد معرّف الجلسة
        session.modified = True
        
        return jsonify({'success': True, 'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}})
    
    # فشل تسجيل الدخول
    if user:
        c.close()
        conn.close()
    
    record_failed_login(email, is_admin_attempt)
    record_suspicious_activity(client_ip)
    log_login_attempt(email, client_ip, False, user_agent)
    
    attempts_dict = admin_login_attempts if is_admin_attempt else login_attempts
    max_attempts = MAX_ADMIN_ATTEMPTS if is_admin_attempt else MAX_LOGIN_ATTEMPTS
    remaining_attempts = max_attempts - attempts_dict.get(email, [0])[0]
    
    if remaining_attempts > 0:
        return jsonify({'success': False, 'message': f'بيانات تسجيل الدخول غير صحيحة. المحاولات المتبقية: {remaining_attempts}'}), 401
    else:
        lockout_time = ADMIN_LOCKOUT_TIME if is_admin_attempt else LOCKOUT_TIME
        lockout_minutes = int(lockout_time.total_seconds() / 60)
        return jsonify({'success': False, 'message': f'تم تجاوز الحد الأقصى للمحاولات. الحساب محظور مؤقتاً لمدة {lockout_minutes} دقيقة'}), 429

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/check-session', methods=['GET'])
def check_session():
    """للتحقق من حالة تسجيل الدخول"""
    if 'user_id' in session:
        # فحص صلاحية الجلسة
        if 'last_activity' in session:
            last_activity = session['last_activity']
            if datetime.now() - datetime.fromisoformat(last_activity) > app.config['PERMANENT_SESSION_LIFETIME']:
                session.clear()
                return jsonify({'authenticated': False, 'reason': 'session_expired'})
        
        # فحص تغيير IP (اختياري - يمكن تعطيله إذا المستخدمين يتنقلون بين شبكات)
        # if session.get('login_ip') != get_client_ip():
        #     session.clear()
        #     return jsonify({'authenticated': False, 'reason': 'ip_changed'})
        
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
        # حماية إضافة المواد - للأدمن فقط
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
            
        data = request.json
        c.execute('INSERT INTO subjects (title, description, code, color) VALUES (%s, %s, %s, %s)', (data['title'], data['description'], data['code'], data['color']))
        conn.commit()
        return jsonify({'success': True})
    
    c.execute('SELECT * FROM subjects ORDER BY id ASC')
    subs = c.fetchall()
    c.close()
    conn.close()
    return jsonify([dict(s) for s in subs])

@app.route('/api/subjects/<int:id>', methods=['GET', 'DELETE', 'PUT'])
def handle_subject(id):
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    try:
        if request.method == 'DELETE':
            # حماية حذف المواد - للأدمن فقط
            if 'user_id' not in session or session.get('user_role') != 'admin':
                return jsonify({'error': 'Unauthorized'}), 401
                
            c.execute('DELETE FROM lessons WHERE subject_id = %s', (id,))
            c.execute('DELETE FROM subjects WHERE id = %s', (id,))
            conn.commit()
            return jsonify({'success': True})
            
        if request.method == 'PUT':
            # حماية تعديل المواد - للأدمن فقط
            if 'user_id' not in session or session.get('user_role') != 'admin':
                return jsonify({'error': 'Unauthorized'}), 401
                
            data = request.json
            c.execute('UPDATE subjects SET title=%s, code=%s, description=%s, color=%s WHERE id=%s', 
                     (data['title'], data['code'], data['description'], data['color'], id))
            conn.commit()
            return jsonify({'success': True})
            
        # FIXED: Get Subject and Lessons Separately to avoid errors
        c.execute('SELECT * FROM subjects WHERE id = %s', (id,))
        subject = c.fetchone()
        
        if not subject:
            return jsonify({'error': 'Subject not found'}), 404
            
        c.execute('SELECT * FROM lessons WHERE subject_id = %s ORDER BY id ASC', (id,))
        lessons = c.fetchall()
        
        return jsonify({
            'subject': dict(subject),
            'lessons': [dict(l) for l in lessons]
        })

    except Exception as e:
        print(f"Error handling subject {id}: {e}")
        return jsonify({'error': str(e)}), 500
    finally:
        c.close()
        conn.close()

@app.route('/api/subjects/<int:id>/lessons', methods=['GET'])
def get_lessons(id):
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
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('INSERT INTO lessons (subject_id, title, url, type) VALUES (%s, %s, %s, %s)', (data['subject_id'], data['title'], data['url'], data['type']))
    conn.commit()
    
    try:
        c.execute('SELECT title FROM subjects WHERE id = %s', (data['subject_id'],))
        subject_title = c.fetchone()[0]
        type_str = "فيديو" if data['type'] == 'Video' else "ملف"
        msg = f"📢 **محاضرة جديدة ({type_str})**\n\n📚 المادة: {subject_title}\n📝 العنوان: {data['title']}\n\nتصفح المحاضرة الآن 👇\nhttps://3minds-academic.vercel.app"
        send_telegram(msg)
    except: pass
    
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/lessons/<int:id>', methods=['DELETE'])
@admin_required
def delete_lesson(id):
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
    data = request.json
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute('INSERT INTO users (email, password, role) VALUES (%s, %s, %s)', (data['email'], generate_password_hash(data['password']), 'student'))
        conn.commit()
        return jsonify({'success': True})
    except:
        return jsonify({'success': False, 'error': 'User already exists'})
    finally:
        c.close()
        conn.close()

@app.route('/api/admin/reset-device', methods=['POST'])
@admin_required
def reset_device():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET device_id = NULL WHERE id = %s', (data['user_id'],))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET password = %s WHERE id = %s', (generate_password_hash(data['password']), data['user_id']))
    conn.commit()
    c.close()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/announcements', methods=['GET', 'POST', 'DELETE', 'PUT'])
def handle_announcements():
    conn = get_db()
    c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    if request.method == 'POST':
        # حماية إضافة الإعلانات - للأدمن فقط
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
            
        data = request.json
        c.execute('INSERT INTO announcements (content) VALUES (%s)', (data['content'],))
        conn.commit()
        msg = f"🔔 **تبليغ هام**\n\n{data['content']}\n\nhttps://3minds-academic.vercel.app"
        send_telegram(msg)
        c.close()
        conn.close()
        return jsonify({'success': True})
        
    if request.method == 'PUT':
        # حماية تعديل الإعلانات - للأدمن فقط
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
            
        data = request.json
        id = request.args.get('id')
        c.execute('UPDATE announcements SET content = %s WHERE id = %s', (data['content'], id))
        conn.commit()
        c.close()
        conn.close()
        return jsonify({'success': True})
        
    if request.method == 'DELETE':
        # حماية حذف الإعلانات - للأدمن فقط
        if 'user_id' not in session or session.get('user_role') != 'admin':
            return jsonify({'error': 'Unauthorized'}), 401
            
        id = request.args.get('id')
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
