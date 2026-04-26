const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'lms.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      bio TEXT,
      avatar_url TEXT,
      total_teaching_minutes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      instructor_id INTEGER,
      thumbnail_url TEXT,
      total_duration_minutes INTEGER DEFAULT 0,
      total_lessons INTEGER DEFAULT 0,
      total_modules INTEGER DEFAULT 0,
      level TEXT DEFAULT 'Beginner',
      category TEXT DEFAULT 'Excel',
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (instructor_id) REFERENCES instructors(id)
    );

    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      module_order INTEGER DEFAULT 0,
      duration_minutes INTEGER DEFAULT 0,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lessons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      instructor_id INTEGER,
      title TEXT NOT NULL,
      lesson_order INTEGER DEFAULT 0,
      video_url TEXT DEFAULT '',
      duration_minutes INTEGER DEFAULT 0,
      summary TEXT DEFAULT '',
      key_concepts TEXT DEFAULT '[]',
      examples TEXT DEFAULT '[]',
      exercises TEXT DEFAULT '[]',
      resources TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (instructor_id) REFERENCES instructors(id)
    );

    CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      lesson_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_id, lesson_id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      course_id INTEGER NOT NULL,
      student_name TEXT DEFAULT 'Student',
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      certificate_number TEXT UNIQUE,
      FOREIGN KEY (course_id) REFERENCES courses(id)
    );

    CREATE TABLE IF NOT EXISTS bundles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      total_duration_minutes INTEGER DEFAULT 0,
      is_published INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bundle_courses (
      bundle_id INTEGER,
      course_id INTEGER,
      PRIMARY KEY (bundle_id, course_id),
      FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscription_courses (
      subscription_id INTEGER,
      course_id INTEGER,
      PRIMARY KEY (subscription_id, course_id),
      FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const adminExists = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!adminExists) {
    const hash = bcrypt.hashSync('haqcademy2024', 10);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Default admin created: admin / haqcademy2024');
  }
}

function recalcModuleDuration(moduleId) {
  const result = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as total FROM lessons WHERE module_id = ? AND is_published = 1').get(moduleId);
  db.prepare('UPDATE modules SET duration_minutes = ? WHERE id = ?').run(result.total, moduleId);
}

function recalcCourseDuration(courseId) {
  const dur = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as total FROM modules WHERE course_id = ?').get(courseId);
  const lessons = db.prepare('SELECT COUNT(*) as cnt FROM lessons WHERE course_id = ? AND is_published = 1').get(courseId);
  const modules = db.prepare('SELECT COUNT(*) as cnt FROM modules WHERE course_id = ?').get(courseId);
  db.prepare('UPDATE courses SET total_duration_minutes = ?, total_lessons = ?, total_modules = ? WHERE id = ?')
    .run(dur.total, lessons.cnt, modules.cnt, courseId);
}

function recalcInstructorDuration(instructorId) {
  const result = db.prepare('SELECT COALESCE(SUM(duration_minutes), 0) as total FROM lessons WHERE instructor_id = ? AND is_published = 1').get(instructorId);
  db.prepare('UPDATE instructors SET total_teaching_minutes = ? WHERE id = ?').run(result.total, instructorId);
}

function recalcBundleDuration(bundleId) {
  const result = db.prepare(`
    SELECT COALESCE(SUM(c.total_duration_minutes), 0) as total
    FROM bundle_courses bc
    JOIN courses c ON bc.course_id = c.id
    WHERE bc.bundle_id = ?
  `).get(bundleId);
  db.prepare('UPDATE bundles SET total_duration_minutes = ? WHERE id = ?').run(result.total, bundleId);
}

initSchema();

module.exports = { db, recalcModuleDuration, recalcCourseDuration, recalcInstructorDuration, recalcBundleDuration };
