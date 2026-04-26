(async () => {
  const lessonId = window.location.pathname.split('/').pop();
  const sid = api.getSessionId();
  const el = (id) => document.getElementById(id);

  const lessonRes = await api.get(`/api/lessons/${lessonId}`);

  if (!lessonRes.success) {
    document.body.innerHTML = `<div style="text-align:center;padding:80px;color:var(--text)">
      <h2>Lesson not found</h2><p><a href="/dashboard">← Back to Dashboard</a></p></div>`;
    return;
  }

  const lesson = lessonRes.data;
  const courseId = lesson.course_id;

  const [prog, navRes] = await Promise.all([
    api.get(`/api/progress/${courseId}?sid=${sid}`),
    api.get(`/api/courses/${courseId}/nav?sid=${sid}`)
  ]);

  const progress = prog.success ? prog.data : { completed: [], percentage: 0 };
  const completedSet = new Set(progress.completed || []);

  document.title = `${lesson.title} — Haq-Cademy`;

  el('navCourseName').textContent = lesson.course_title;
  el('navCourseLink').href = `/course/${courseId}`;
  el('navCourseLink').textContent = lesson.course_title;
  updateNavProgress(progress.percentage);

  el('breadcrumbCourse').textContent = lesson.course_title;
  el('breadcrumbCourse').href = `/course/${courseId}`;
  el('breadcrumbModule').textContent = lesson.module_title;

  el('lessonModuleLabel').textContent = lesson.module_title;
  el('lessonNumberBadge').textContent = `Lesson ${lesson.lesson_order}`;
  el('lessonTitle').textContent = lesson.title;

  // Show DB duration initially; YouTube API will update it when video loads
  const dbDuration = lesson.duration_minutes;
  el('videoDuration').textContent = dbDuration > 0
    ? `⏱ ${api.formatDuration(dbDuration)}`
    : '⏱ Loading duration...';

  el('sidebarCourseTitle').textContent = lesson.course_title;
  updateSidebarProgress(progress.percentage);

  if (navRes.success) buildSidebar(navRes.data, lessonId, completedSet);

  // ── Video embed with YouTube iframe API for dynamic duration ──
  if (lesson.video_url) {
    const videoId = extractYouTubeId(lesson.video_url);
    if (videoId) {
      el('videoWrapper').innerHTML = `<div id="ytPlayer"></div>`;

      loadYouTubeAPI().then(() => {
        new YT.Player('ytPlayer', {
          videoId,
          playerVars: { rel: 0, modestbranding: 1, color: 'white' },
          width: '100%',
          height: '100%',
          events: {
            onReady(e) {
              const secs = e.target.getDuration();
              if (secs > 0) {
                const mins = Math.round(secs / 60);
                el('videoDuration').textContent = `⏱ ${api.formatDuration(mins)}`;
              }
            }
          }
        });
      });
    } else {
      el('videoWrapper').innerHTML = `<div class="video-placeholder">
        <div class="video-placeholder-icon">▶</div>
        <div class="video-placeholder-text">Unable to embed video. <a href="${lesson.video_url}" target="_blank" style="color:#93C5FD">Watch on YouTube</a></div>
      </div>`;
    }
  }

  // ── Content ──
  el('summaryText').textContent = lesson.summary || 'No summary available for this lesson yet.';

  el('conceptsList').innerHTML = (lesson.key_concepts || []).length
    ? lesson.key_concepts.map(c => `
        <div class="concept-item">
          <div class="concept-icon">💡</div>
          <div class="concept-text">${c}</div>
        </div>`).join('')
    : '<p style="color:var(--text-muted);padding:20px">No key concepts listed yet.</p>';

  el('examplesList').innerHTML = (lesson.examples || []).length
    ? lesson.examples.map((ex, i) => `
        <div class="example-card">
          <div class="example-card-header">
            <div class="example-number">${i + 1}</div>
            <div class="example-title">${ex.title || `Example ${i+1}`}</div>
          </div>
          <div class="example-body">${ex.description || ''}</div>
        </div>`).join('')
    : '<p style="color:var(--text-muted);padding:20px">No examples listed yet.</p>';

  el('exercisesList').innerHTML = (lesson.exercises || []).length
    ? lesson.exercises.map((ex, i) => `
        <div class="exercise-card">
          <div class="exercise-num">${i + 1}</div>
          <div class="exercise-content">
            <div class="exercise-title">${ex.title || `Exercise ${i+1}`}</div>
            <div class="exercise-desc">${ex.description || ''}</div>
          </div>
        </div>`).join('')
    : '<p style="color:var(--text-muted);padding:20px">No exercises listed yet.</p>';

  if ((lesson.resources || []).length) {
    el('resourcesList').innerHTML = lesson.resources.map(r => {
      const t = (r.type || '').toLowerCase();
      const iconClass = t === 'excel' || t === 'xlsx' || t === 'xls' ? 'excel'
        : t === 'pdf' ? 'pdf'
        : t === 'word' || t === 'doc' || t === 'docx' ? 'word'
        : 'csv';
      const svgIcons = {
        excel: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/><path d="m7 12 2 3 4-6"/></svg>`,
        pdf:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="10" y1="9" x2="14" y2="9"/></svg>`,
        csv:   `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>`,
        word:  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="12" y2="9"/></svg>`,
      };
      const downloadIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
      return `
        <div class="resource-item">
          <div class="resource-icon ${iconClass}">${svgIcons[iconClass]}</div>
          <div class="resource-info">
            <div class="resource-name">${r.title || r.url}</div>
            <div class="resource-type">${r.type || 'File'}</div>
          </div>
          ${r.url ? `<a href="${r.url}" class="resource-download" download title="Download">${downloadIcon}</a>` : `<span class="resource-download" style="opacity:0.25" title="Coming soon">${downloadIcon}</span>`}
        </div>`;
    }).join('');
  }

  // Notes
  const notesKey = `haq_notes_${lessonId}`;
  const saved = localStorage.getItem(notesKey);
  if (saved) el('notesArea').value = saved;
  if (lesson.notes) el('notesArea').placeholder = `Instructor notes:\n\n${lesson.notes}\n\n— Your notes below —`;
  let notesSaveTimer;
  el('notesArea').addEventListener('input', () => {
    clearTimeout(notesSaveTimer);
    el('notesSaveHint').textContent = 'Saving...';
    notesSaveTimer = setTimeout(() => {
      localStorage.setItem(notesKey, el('notesArea').value);
      el('notesSaveHint').textContent = 'Notes saved ✓';
      setTimeout(() => el('notesSaveHint').textContent = 'Notes auto-save to your browser.', 2000);
    }, 800);
  });

  // Mark complete
  setCompleteState(completedSet.has(parseInt(lessonId)));

  el('markCompleteBtn').addEventListener('click', async () => {
    const currently = el('markCompleteBtn').classList.contains('completed');
    const endpoint = currently ? '/api/progress/uncomplete' : '/api/progress/complete';
    const res = await api.post(endpoint, { sid, lessonId: parseInt(lessonId), courseId });
    if (res.success) {
      setCompleteState(!currently);
      if (!currently) {
        showToast('Lesson marked complete! 🎉', 'success');
        updateNavProgress(res.data?.percentage || progress.percentage);
        updateSidebarProgress(res.data?.percentage || progress.percentage);
        if (res.data?.isComplete) {
          showToast('🏆 Course complete! Check your certificate.', 'success');
          setTimeout(() => {
            if (confirm('Congratulations! You completed the course. View your certificate?')) {
              window.location.href = `/certificate/${courseId}`;
            }
          }, 1500);
        } else if (lesson.next_lesson) {
          setTimeout(() => {
            if (confirm('Nice work! Ready for the next lesson?')) {
              window.location.href = `/lesson/${lesson.next_lesson.id}`;
            }
          }, 800);
        }
      } else {
        showToast('Lesson unmarked', 'info');
      }
      const nav2 = await api.get(`/api/courses/${courseId}/nav?sid=${sid}`);
      if (nav2.success) buildSidebar(nav2.data, lessonId, new Set(nav2.data.flatMap(m => m.lessons.filter(l => l.completed).map(l => l.id))));
    }
  });

  // Prev / Next
  if (lesson.prev_lesson) {
    ['prevBtn', 'prevBtnBottom'].forEach(id => {
      el(id).disabled = false;
      el(id).onclick = () => window.location.href = `/lesson/${lesson.prev_lesson.id}`;
    });
  }
  if (lesson.next_lesson) {
    ['nextBtn', 'nextBtnBottom'].forEach(id => {
      el(id).disabled = false;
      el(id).onclick = () => window.location.href = `/lesson/${lesson.next_lesson.id}`;
    });
  }

  localStorage.setItem('haq_last_lesson', JSON.stringify({
    lessonId: parseInt(lessonId),
    lessonTitle: lesson.title,
    moduleTitle: lesson.module_title,
    courseId,
    courseTitle: lesson.course_title
  }));

  // Content tabs
  document.querySelectorAll('.content-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab)?.classList.add('active');
    });
  });

  // Mobile sidebar
  const sidebar = el('lessonSidebar');
  const overlay = el('sidebarOverlay');
  const mobileBtn = el('mobileSidebarBtn');
  const sidebarToggle = el('sidebarToggle');

  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

  if (mobileBtn) mobileBtn.addEventListener('click', openSidebar);
  if (sidebarToggle) sidebarToggle.addEventListener('click', openSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);

  function checkMobile() {
    const isMobile = window.innerWidth <= 1024;
    if (mobileBtn) mobileBtn.style.display = isMobile ? 'flex' : 'none';
    if (sidebarToggle) sidebarToggle.style.display = isMobile ? 'flex' : 'none';
  }
  window.addEventListener('resize', checkMobile);
  checkMobile();
})();

function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(); return; }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function setCompleteState(completed) {
  const btn = document.getElementById('markCompleteBtn');
  const icon = document.getElementById('markCompleteIcon');
  const text = document.getElementById('markCompleteText');
  if (completed) {
    btn.classList.add('completed');
    icon.textContent = '✓';
    text.textContent = 'Completed!';
  } else {
    btn.classList.remove('completed');
    icon.textContent = '○';
    text.textContent = 'Mark as Complete';
  }
}

function updateNavProgress(pct) {
  const fill = document.getElementById('navProgressFill');
  const pctEl = document.getElementById('navProgressPct');
  if (fill) fill.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

function updateSidebarProgress(pct) {
  const fill = document.getElementById('sidebarProgressFill');
  const text = document.getElementById('sidebarProgressText');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = pct + '% complete';
}

function buildSidebar(modules, currentLessonId, completedSet) {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;
  const curId = parseInt(currentLessonId);

  nav.innerHTML = modules.map((mod, mi) => {
    const hasActive = mod.lessons.some(l => l.id === curId);
    return `
    <div class="sidebar-module ${hasActive ? 'open' : ''}">
      <div class="sidebar-module-header" onclick="this.parentElement.classList.toggle('open')">
        <div class="sidebar-module-number ${mod.completed ? 'complete' : ''}">${mod.completed ? '✓' : mi + 1}</div>
        <div class="sidebar-module-title">${mod.title}</div>
        <div class="sidebar-module-arrow">›</div>
      </div>
      <div class="sidebar-lessons">
        ${mod.lessons.map(les => `
          <a href="/lesson/${les.id}" class="sidebar-lesson ${les.id === curId ? 'active' : ''} ${les.completed ? 'completed' : ''}">
            <div class="sidebar-lesson-check">${les.completed ? '✓' : ''}</div>
            <div class="sidebar-lesson-title">${les.title}</div>
            <div class="sidebar-lesson-duration">${api.formatDuration(les.duration_minutes)}</div>
          </a>`).join('')}
      </div>
    </div>`;
  }).join('');
}
