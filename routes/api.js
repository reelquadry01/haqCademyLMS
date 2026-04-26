const express = require('express');
const router = express.Router();
const { db, recalcModuleDuration, recalcCourseDuration, recalcInstructorDuration } = require('../database/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/courses
router.get('/courses', (req, res) => {
  const courses = db.prepare(`
    SELECT c.*, i.name as instructor_name, i.avatar_url as instructor_avatar, i.bio as instructor_bio
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.id
    WHERE c.is_published = 1
    ORDER BY c.created_at DESC
  `).all();
  res.json({ success: true, data: courses });
});

// GET /api/courses/:id
router.get('/courses/:id', (req, res) => {
  const course = db.prepare(`
    SELECT c.*, i.name as instructor_name, i.avatar_url as instructor_avatar, i.bio as instructor_bio
    FROM courses c
    LEFT JOIN instructors i ON c.instructor_id = i.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY module_order').all(course.id);

  for (const mod of modules) {
    mod.lessons = db.prepare('SELECT id, title, lesson_order, duration_minutes, video_url, is_published FROM lessons WHERE module_id = ? ORDER BY lesson_order').all(mod.id);
  }

  res.json({ success: true, data: { ...course, modules } });
});

// GET /api/lessons/:id
router.get('/lessons/:id', (req, res) => {
  const lesson = db.prepare(`
    SELECT l.*, m.title as module_title, m.id as module_id, c.title as course_title, c.id as course_id,
           i.name as instructor_name
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    JOIN courses c ON l.course_id = c.id
    LEFT JOIN instructors i ON l.instructor_id = i.id
    WHERE l.id = ?
  `).get(req.params.id);

  if (!lesson) return res.status(404).json({ success: false, error: 'Lesson not found' });

  // Parse JSON fields
  try { lesson.key_concepts = JSON.parse(lesson.key_concepts || '[]'); } catch { lesson.key_concepts = []; }
  try { lesson.examples = JSON.parse(lesson.examples || '[]'); } catch { lesson.examples = []; }
  try { lesson.exercises = JSON.parse(lesson.exercises || '[]'); } catch { lesson.exercises = []; }
  try { lesson.resources = JSON.parse(lesson.resources || '[]'); } catch { lesson.resources = []; }

  // Get prev/next lessons in course
  const allLessons = db.prepare(`
    SELECT l.id, l.title, l.lesson_order, m.module_order, m.title as module_title
    FROM lessons l
    JOIN modules m ON l.module_id = m.id
    WHERE l.course_id = ? AND l.is_published = 1
    ORDER BY m.module_order, l.lesson_order
  `).all(lesson.course_id);

  const idx = allLessons.findIndex(l => l.id === lesson.id);
  lesson.prev_lesson = idx > 0 ? allLessons[idx - 1] : null;
  lesson.next_lesson = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;

  // Full sidebar: modules with lessons
  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY module_order').all(lesson.course_id);
  for (const mod of modules) {
    mod.lessons = db.prepare('SELECT id, title, lesson_order, duration_minutes FROM lessons WHERE module_id = ? AND is_published = 1 ORDER BY lesson_order').all(mod.id);
  }
  lesson.sidebar = modules;

  res.json({ success: true, data: lesson });
});

// GET /api/progress/:courseId?sid=SESSION_ID
router.get('/progress/:courseId', (req, res) => {
  const { sid } = req.query;
  if (!sid) return res.json({ success: true, data: { completed: [], percentage: 0 } });

  const completed = db.prepare('SELECT lesson_id FROM user_progress WHERE session_id = ? AND course_id = ?')
    .all(sid, req.params.courseId).map(r => r.lesson_id);

  const total = db.prepare('SELECT COUNT(*) as cnt FROM lessons WHERE course_id = ? AND is_published = 1').get(req.params.courseId).cnt;
  const percentage = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  res.json({ success: true, data: { completed, percentage, total } });
});

// POST /api/progress/complete
router.post('/progress/complete', (req, res) => {
  const { sid, lessonId, courseId } = req.body;
  if (!sid || !lessonId || !courseId) return res.status(400).json({ success: false, error: 'Missing fields' });

  db.prepare('INSERT OR IGNORE INTO user_progress (session_id, lesson_id, course_id) VALUES (?, ?, ?)').run(sid, lessonId, courseId);

  const completed = db.prepare('SELECT COUNT(*) as cnt FROM user_progress WHERE session_id = ? AND course_id = ?').get(sid, courseId).cnt;
  const total = db.prepare('SELECT COUNT(*) as cnt FROM lessons WHERE course_id = ? AND is_published = 1').get(courseId).cnt;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  res.json({ success: true, data: { percentage, completed, total, isComplete: percentage === 100 } });
});

// POST /api/progress/uncomplete
router.post('/progress/uncomplete', (req, res) => {
  const { sid, lessonId, courseId } = req.body;
  if (!sid || !lessonId) return res.status(400).json({ success: false, error: 'Missing fields' });

  db.prepare('DELETE FROM user_progress WHERE session_id = ? AND lesson_id = ?').run(sid, lessonId);
  res.json({ success: true });
});

// GET /api/certificate/:courseId?sid=SESSION_ID&name=Student+Name
router.get('/certificate/:courseId', (req, res) => {
  const { sid, name } = req.query;
  if (!sid) return res.status(400).json({ success: false, error: 'Session ID required' });

  const completed = db.prepare('SELECT COUNT(*) as cnt FROM user_progress WHERE session_id = ? AND course_id = ?').get(sid, req.params.courseId).cnt;
  const total = db.prepare('SELECT COUNT(*) as cnt FROM lessons WHERE course_id = ? AND is_published = 1').get(req.params.courseId).cnt;

  if (completed < total) return res.status(403).json({ success: false, error: 'Course not yet complete' });

  let cert = db.prepare('SELECT * FROM certificates WHERE session_id = ? AND course_id = ?').get(sid, req.params.courseId);
  if (!cert) {
    const certNum = 'HAQ-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    db.prepare('INSERT INTO certificates (session_id, course_id, student_name, certificate_number) VALUES (?, ?, ?, ?)')
      .run(sid, req.params.courseId, name || 'Student', certNum);
    cert = db.prepare('SELECT * FROM certificates WHERE session_id = ? AND course_id = ?').get(sid, req.params.courseId);
  }

  const course = db.prepare('SELECT title, total_duration_minutes FROM courses WHERE id = ?').get(req.params.courseId);
  res.json({ success: true, data: { ...cert, course_title: course?.title, total_duration_minutes: course?.total_duration_minutes } });
});

// GET /api/courses/:courseId/nav?sid=SESSION_ID (full nav with progress)
router.get('/courses/:courseId/nav', (req, res) => {
  const { sid } = req.query;
  const modules = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY module_order').all(req.params.courseId);

  const completed = sid
    ? db.prepare('SELECT lesson_id FROM user_progress WHERE session_id = ? AND course_id = ?').all(sid, req.params.courseId).map(r => r.lesson_id)
    : [];

  for (const mod of modules) {
    mod.lessons = db.prepare('SELECT id, title, lesson_order, duration_minutes FROM lessons WHERE module_id = ? AND is_published = 1 ORDER BY lesson_order').all(mod.id);
    mod.lessons.forEach(l => { l.completed = completed.includes(l.id); });
    mod.completed = mod.lessons.length > 0 && mod.lessons.every(l => l.completed);
  }

  res.json({ success: true, data: modules });
});

module.exports = router;
