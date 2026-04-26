(async () => {
  const courseId = window.location.pathname.split('/').pop();
  const sid = api.getSessionId();

  const [courseRes, progressRes] = await Promise.all([
    api.get(`/api/courses/${courseId}`),
    api.get(`/api/progress/${courseId}?sid=${sid}`)
  ]);

  if (!courseRes.success) {
    document.body.innerHTML = '<div style="text-align:center;padding:80px"><h2>Course not found</h2><a href="/dashboard">← Back</a></div>';
    return;
  }

  const course = courseRes.data;
  const progress = progressRes.success ? progressRes.data : { completed: [], percentage: 0, total: 0 };
  const completedSet = new Set(progress.completed || []);

  const el = (id) => document.getElementById(id);
  const hours = Math.floor(course.total_duration_minutes / 60);
  const mins = course.total_duration_minutes % 60;
  const durStr = hours > 0 ? `${hours}h ${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;

  // Header
  document.title = `${course.title} — Haq-Cademy`;
  el('courseCategory').textContent = course.category || 'Excel';
  el('courseTitle').textContent = course.title;
  el('courseDesc').textContent = course.description || '';
  el('metaDuration').textContent = durStr;
  el('metaLessons').textContent = course.total_lessons;
  el('metaModules').textContent = course.total_modules;
  el('metaLevel').textContent = course.level || 'Beginner to Advanced';

  // Sidebar
  el('sidebarTitle').textContent = course.title;
  el('sidebarDuration').textContent = durStr;
  el('sidebarLessons').textContent = course.total_lessons + ' lessons';
  el('sidebarModules').textContent = course.total_modules + ' modules';
  el('sidebarInstructor').innerHTML = `<strong>${course.instructor_name || 'Haq-Cademy'}</strong>`;

  // Find first lesson
  const firstLesson = course.modules?.[0]?.lessons?.[0];
  // Find last viewed / first incomplete
  let resumeLesson = firstLesson;
  const lastLessonData = JSON.parse(localStorage.getItem('haq_last_lesson') || 'null');
  if (lastLessonData?.courseId == courseId && lastLessonData?.lessonId) {
    resumeLesson = { id: lastLessonData.lessonId };
  } else {
    // Find first incomplete
    outer: for (const mod of (course.modules || [])) {
      for (const les of (mod.lessons || [])) {
        if (!completedSet.has(les.id)) { resumeLesson = les; break outer; }
      }
    }
  }

  if (resumeLesson) {
    const btnLabel = progress.percentage > 0 ? '▶ Continue Learning' : '▶ Start First Lesson';
    el('startBtn').textContent = btnLabel;
    el('startBtn').href = `/lesson/${resumeLesson.id}`;
    el('sidebarBtn').textContent = btnLabel;
    el('sidebarBtn').href = `/lesson/${resumeLesson.id}`;
  }

  // Progress ring
  if (progress.percentage > 0) {
    el('progressRingWrap').style.display = 'flex';
    el('progressPct').textContent = progress.percentage + '%';
    const circumference = 2 * Math.PI * 25;
    const offset = circumference - (progress.percentage / 100) * circumference;
    el('progressRingFill').style.strokeDashoffset = offset;
  }

  if (progress.percentage === 100) {
    el('certBtn').style.display = 'flex';
    el('certBtn').href = `/certificate/${courseId}`;
  }

  // Modules Accordion
  const container = el('modulesContainer');
  container.innerHTML = (course.modules || []).map((mod, mi) => {
    const modLessons = mod.lessons || [];
    const modCompleted = modLessons.filter(l => completedSet.has(l.id)).length;
    const modDone = modCompleted === modLessons.length && modLessons.length > 0;

    return `
    <div class="module-accordion ${mi === 0 ? 'open' : ''}" data-mod="${mi}">
      <div class="module-accordion-header" onclick="toggleModule(${mi})">
        <div class="module-num ${modDone ? 'complete' : ''}">${modDone ? '✓' : mi + 1}</div>
        <div class="module-header-info">
          <div class="module-header-title">${mod.title}</div>
          <div class="module-header-meta">
            <span>${modLessons.length} lesson${modLessons.length !== 1 ? 's' : ''}</span>
            <span>⏱ ${api.formatDuration(mod.duration_minutes)}</span>
            ${modCompleted > 0 ? `<span style="color:var(--success)">✓ ${modCompleted}/${modLessons.length}</span>` : ''}
          </div>
        </div>
        <span class="module-arrow">▾</span>
      </div>
      <div class="module-lessons">
        ${modLessons.map((les, li) => {
          const done = completedSet.has(les.id);
          return `
          <a href="/lesson/${les.id}" class="lesson-row ${done ? 'completed' : ''}">
            <div class="lesson-check">${done ? '✓' : ''}</div>
            <div class="lesson-row-info">
              <div class="lesson-row-title">${les.title}</div>
              <div class="lesson-row-meta">Lesson ${li + 1}</div>
            </div>
            <div class="lesson-row-duration">${api.formatDuration(les.duration_minutes)}</div>
            <div class="lesson-play-btn">▶</div>
          </a>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
})();

function toggleModule(idx) {
  const acc = document.querySelectorAll('.module-accordion')[idx];
  acc.classList.toggle('open');
}
