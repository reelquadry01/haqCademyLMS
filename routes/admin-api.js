const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db, recalcModuleDuration, recalcCourseDuration, recalcInstructorDuration, recalcBundleDuration } = require('../database/db');

// Auth middleware
const requireAdmin = (req, res, next) => {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ success: false, error: 'Unauthorized' });
};

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  req.session.isAdmin = true;
  req.session.adminUser = user.username;
  res.json({ success: true, data: { username: user.username } });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/admin/me
router.get('/me', (req, res) => {
  if (req.session?.isAdmin) return res.json({ success: true, data: { username: req.session.adminUser } });
  res.json({ success: false, error: 'Not logged in' });
});

// GET /api/admin/stats
router.get('/stats', requireAdmin, (req, res) => {
  const totalCourses = db.prepare('SELECT COUNT(*) as n FROM courses').get().n;
  const totalModules = db.prepare('SELECT COUNT(*) as n FROM modules').get().n;
  const totalLessons = db.prepare('SELECT COUNT(*) as n FROM lessons').get().n;
  const totalStudents = db.prepare('SELECT COUNT(DISTINCT session_id) as n FROM user_progress').get().n;
  const totalCompletions = db.prepare('SELECT COUNT(DISTINCT session_id || course_id) as n FROM certificates').get().n;
  const totalProgress = db.prepare('SELECT COUNT(*) as n FROM user_progress').get().n;

  const recentActivity = db.prepare(`
    SELECT up.*, l.title as lesson_title, c.title as course_title
    FROM user_progress up
    JOIN lessons l ON up.lesson_id = l.id
    JOIN courses c ON up.course_id = c.id
    ORDER BY up.completed_at DESC LIMIT 10
  `).all();

  res.json({ success: true, data: { totalCourses, totalModules, totalLessons, totalStudents, totalCompletions, totalProgress, recentActivity } });
});

// ========== INSTRUCTORS ==========
router.get('/instructors', requireAdmin, (req, res) => {
  res.json({ success: true, data: db.prepare('SELECT * FROM instructors ORDER BY name').all() });
});

router.post('/instructors', requireAdmin, (req, res) => {
  const { name, email, bio, avatar_url } = req.body;
  const r = db.prepare('INSERT INTO instructors (name, email, bio, avatar_url) VALUES (?, ?, ?, ?)').run(name, email || null, bio || '', avatar_url || '');
  res.json({ success: true, data: db.prepare('SELECT * FROM instructors WHERE id = ?').get(r.lastInsertRowid) });
});

router.put('/instructors/:id', requireAdmin, (req, res) => {
  const { name, email, bio, avatar_url } = req.body;
  db.prepare('UPDATE instructors SET name=?, email=?, bio=?, avatar_url=? WHERE id=?').run(name, email || null, bio || '', avatar_url || '', req.params.id);
  res.json({ success: true, data: db.prepare('SELECT * FROM instructors WHERE id = ?').get(req.params.id) });
});

router.delete('/instructors/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM instructors WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ========== COURSES ==========
router.get('/courses', requireAdmin, (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, i.name as instructor_name
    FROM courses c LEFT JOIN instructors i ON c.instructor_id = i.id
    ORDER BY c.created_at DESC
  `).all();
  res.json({ success: true, data: courses });
});

router.post('/courses', requireAdmin, (req, res) => {
  const { title, description, instructor_id, thumbnail_url, level, category } = req.body;
  const r = db.prepare('INSERT INTO courses (title, description, instructor_id, thumbnail_url, level, category) VALUES (?, ?, ?, ?, ?, ?)')
    .run(title, description || '', instructor_id || null, thumbnail_url || '', level || 'Beginner', category || 'Excel');
  res.json({ success: true, data: db.prepare('SELECT * FROM courses WHERE id = ?').get(r.lastInsertRowid) });
});

router.put('/courses/:id', requireAdmin, (req, res) => {
  const { title, description, instructor_id, thumbnail_url, level, category, is_published } = req.body;
  db.prepare('UPDATE courses SET title=?, description=?, instructor_id=?, thumbnail_url=?, level=?, category=?, is_published=? WHERE id=?')
    .run(title, description || '', instructor_id || null, thumbnail_url || '', level || 'Beginner', category || 'Excel', is_published ?? 1, req.params.id);
  res.json({ success: true, data: db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id) });
});

router.delete('/courses/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ========== MODULES ==========
router.get('/courses/:courseId/modules', requireAdmin, (req, res) => {
  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY module_order').all(req.params.courseId);
  for (const m of modules) {
    m.lessons = db.prepare('SELECT id, title, lesson_order, duration_minutes, video_url FROM lessons WHERE module_id = ? ORDER BY lesson_order').all(m.id);
  }
  res.json({ success: true, data: modules });
});

router.post('/courses/:courseId/modules', requireAdmin, (req, res) => {
  const { title, module_order } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(module_order), 0) + 1 as next FROM modules WHERE course_id = ?').get(req.params.courseId).next;
  const r = db.prepare('INSERT INTO modules (course_id, title, module_order) VALUES (?, ?, ?)').run(req.params.courseId, title, module_order ?? maxOrder);
  recalcCourseDuration(req.params.courseId);
  res.json({ success: true, data: db.prepare('SELECT * FROM modules WHERE id = ?').get(r.lastInsertRowid) });
});

router.put('/modules/:id', requireAdmin, (req, res) => {
  const { title, module_order } = req.body;
  const mod = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!mod) return res.status(404).json({ success: false, error: 'Module not found' });
  db.prepare('UPDATE modules SET title=?, module_order=? WHERE id=?').run(title, module_order ?? mod.module_order, req.params.id);
  res.json({ success: true, data: db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id) });
});

router.delete('/modules/:id', requireAdmin, (req, res) => {
  const mod = db.prepare('SELECT * FROM modules WHERE id = ?').get(req.params.id);
  if (!mod) return res.status(404).json({ success: false, error: 'Module not found' });
  db.prepare('DELETE FROM modules WHERE id = ?').run(req.params.id);
  recalcCourseDuration(mod.course_id);
  res.json({ success: true });
});

// ========== LESSONS ==========
router.get('/lessons', requireAdmin, (req, res) => {
  const { courseId, moduleId } = req.query;
  let sql = 'SELECT l.*, m.title as module_title, c.title as course_title FROM lessons l JOIN modules m ON l.module_id = m.id JOIN courses c ON l.course_id = c.id';
  const params = [];
  if (moduleId) { sql += ' WHERE l.module_id = ?'; params.push(moduleId); }
  else if (courseId) { sql += ' WHERE l.course_id = ?'; params.push(courseId); }
  sql += ' ORDER BY m.module_order, l.lesson_order';
  res.json({ success: true, data: db.prepare(sql).all(...params) });
});

router.get('/lessons/:id', requireAdmin, (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: lesson });
});

router.post('/lessons', requireAdmin, (req, res) => {
  const { module_id, course_id, instructor_id, title, lesson_order, video_url, duration_minutes, summary, key_concepts, examples, exercises, resources, notes } = req.body;
  const maxOrder = db.prepare('SELECT COALESCE(MAX(lesson_order), 0) + 1 as next FROM lessons WHERE module_id = ?').get(module_id).next;
  const r = db.prepare(`
    INSERT INTO lessons (module_id, course_id, instructor_id, title, lesson_order, video_url, duration_minutes, summary, key_concepts, examples, exercises, resources, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(module_id, course_id, instructor_id || null, title, lesson_order ?? maxOrder, video_url || '', duration_minutes || 0,
    summary || '', JSON.stringify(key_concepts || []), JSON.stringify(examples || []), JSON.stringify(exercises || []), JSON.stringify(resources || []), notes || '');

  recalcModuleDuration(module_id);
  recalcCourseDuration(course_id);
  if (instructor_id) recalcInstructorDuration(instructor_id);

  res.json({ success: true, data: db.prepare('SELECT * FROM lessons WHERE id = ?').get(r.lastInsertRowid) });
});

router.put('/lessons/:id', requireAdmin, (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ success: false, error: 'Not found' });

  const { title, lesson_order, video_url, duration_minutes, summary, key_concepts, examples, exercises, resources, notes, is_published, instructor_id } = req.body;
  db.prepare(`
    UPDATE lessons SET title=?, lesson_order=?, video_url=?, duration_minutes=?, summary=?,
    key_concepts=?, examples=?, exercises=?, resources=?, notes=?, is_published=?, instructor_id=?
    WHERE id=?
  `).run(title ?? lesson.title, lesson_order ?? lesson.lesson_order, video_url ?? lesson.video_url,
    duration_minutes ?? lesson.duration_minutes, summary ?? lesson.summary,
    JSON.stringify(key_concepts ?? JSON.parse(lesson.key_concepts || '[]')),
    JSON.stringify(examples ?? JSON.parse(lesson.examples || '[]')),
    JSON.stringify(exercises ?? JSON.parse(lesson.exercises || '[]')),
    JSON.stringify(resources ?? JSON.parse(lesson.resources || '[]')),
    notes ?? lesson.notes, is_published ?? lesson.is_published,
    instructor_id ?? lesson.instructor_id, req.params.id);

  recalcModuleDuration(lesson.module_id);
  recalcCourseDuration(lesson.course_id);
  if (lesson.instructor_id) recalcInstructorDuration(lesson.instructor_id);

  res.json({ success: true, data: db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id) });
});

router.delete('/lessons/:id', requireAdmin, (req, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(req.params.id);
  if (!lesson) return res.status(404).json({ success: false, error: 'Not found' });
  db.prepare('DELETE FROM lessons WHERE id = ?').run(req.params.id);
  recalcModuleDuration(lesson.module_id);
  recalcCourseDuration(lesson.course_id);
  if (lesson.instructor_id) recalcInstructorDuration(lesson.instructor_id);
  res.json({ success: true });
});

// GET /api/admin/progress — monitor student progress
router.get('/progress', requireAdmin, (req, res) => {
  const data = db.prepare(`
    SELECT up.session_id, up.course_id, c.title as course_title,
           COUNT(*) as completed_lessons,
           (SELECT COUNT(*) FROM lessons WHERE course_id = up.course_id AND is_published = 1) as total_lessons,
           MAX(up.completed_at) as last_activity
    FROM user_progress up
    JOIN courses c ON up.course_id = c.id
    GROUP BY up.session_id, up.course_id
    ORDER BY last_activity DESC
    LIMIT 100
  `).all();
  res.json({ success: true, data });
});

// POST /api/admin/recalc — recalculate all durations
router.post('/recalc', requireAdmin, (req, res) => {
  const modules = db.prepare('SELECT id, course_id FROM modules').all();
  for (const m of modules) recalcModuleDuration(m.id);

  const courses = db.prepare('SELECT id FROM courses').all();
  for (const c of courses) recalcCourseDuration(c.id);

  const instructors = db.prepare('SELECT id FROM instructors').all();
  for (const i of instructors) recalcInstructorDuration(i.id);

  const bundles = db.prepare('SELECT id FROM bundles').all();
  for (const b of bundles) recalcBundleDuration(b.id);

  res.json({ success: true, message: 'All durations recalculated' });
});

module.exports = router;
