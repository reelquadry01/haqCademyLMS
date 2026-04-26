(async () => {
  const sid = api.getSessionId();

  const coursesRes = await api.get('/api/courses');
  if (!coursesRes.success) { showToast('Failed to load courses', 'error'); return; }

  const courses = coursesRes.data;
  const el = (id) => document.getElementById(id);

  el('statCourses').textContent = courses.length;
  el('courseCount').textContent = courses.length + ' available';

  if (!courses.length) {
    el('coursesGrid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📚</div>
        <div class="empty-state-title">No courses yet</div>
        <div class="empty-state-desc">Add courses from the admin panel to get started.</div>
        <a href="/admin" class="btn btn-primary">Go to Admin Panel</a>
      </div>`;
    el('statCompleted').textContent = '0';
    el('statStreak').textContent = '0%';
    el('statCerts').textContent = '0';
    return;
  }

  // Load progress for all courses
  const progressMap = {};
  let totalCompleted = 0;
  let totalLessons = 0;
  let lastLesson = null;
  let lastCourse = null;
  let lastCourseId = null;
  let certs = 0;

  await Promise.all(courses.map(async (course) => {
    const p = await api.get(`/api/progress/${course.id}?sid=${sid}`);
    if (p.success) {
      progressMap[course.id] = p.data;
      totalCompleted += p.data.completed?.length || 0;
      totalLessons += p.data.total || 0;
      if (p.data.percentage === 100) certs++;
    }
  }));

  const overallPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;
  el('statCompleted').textContent = totalCompleted;
  el('statStreak').textContent = overallPct + '%';
  el('statCerts').textContent = certs;

  // Render course cards
  el('coursesGrid').innerHTML = courses.map(course => {
    const p = progressMap[course.id] || { percentage: 0, completed: [], total: 0 };
    const hours = Math.floor(course.total_duration_minutes / 60);
    const mins = course.total_duration_minutes % 60;
    const durStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return `
    <a href="/course/${course.id}" class="course-card" style="text-decoration:none">
      <div class="course-card-thumb">
        <div class="course-card-thumb-icon">📊</div>
        <div class="course-card-level">${course.level || 'Beginner'}</div>
      </div>
      <div class="course-card-body">
        <div class="course-card-category">${course.category || 'Excel'}</div>
        <div class="course-card-title">${course.title}</div>
        <div class="course-card-instructor">${course.instructor_name || 'Haq-Cademy'}</div>
        <div class="course-card-meta">
          <div class="course-card-meta-item">⏱ ${durStr}</div>
          <div class="course-card-meta-item">📚 ${course.total_lessons} lessons</div>
          <div class="course-card-meta-item">📁 ${course.total_modules} modules</div>
        </div>
        <div class="course-progress-section">
          <div class="course-progress-label">
            <span class="course-progress-text">${p.percentage === 100 ? '✅ Complete!' : p.percentage > 0 ? 'In Progress' : 'Not Started'}</span>
            <span class="course-progress-pct">${p.percentage}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${p.percentage === 100 ? 'complete' : ''}" style="width:${p.percentage}%"></div>
          </div>
        </div>
      </div>
    </a>`;
  }).join('');

  // Resume card — find last completed lesson across all courses
  const resumeData = JSON.parse(localStorage.getItem('haq_last_lesson') || 'null');
  if (resumeData && resumeData.lessonId) {
    el('resumeSection').style.display = 'block';
    el('resumeTitle').textContent = resumeData.lessonTitle || 'Continue Learning';
    el('resumeModule').textContent = resumeData.moduleTitle || '';
    el('resumeBtn').href = `/lesson/${resumeData.lessonId}`;
  }
})();
