// Admin SPA
const adminApp = {
  currentSection: 'dashboard',
  courses: [],
  instructors: [],

  async init() {
    // Check auth
    const me = await api.get('/api/admin/me');
    if (me.success && me.data?.username) {
      this.showApp(me.data.username);
      this.loadSection('dashboard');
    } else {
      document.getElementById('loginScreen').style.display = 'flex';
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('loginUser').value;
      const pass = document.getElementById('loginPass').value;
      const err = document.getElementById('loginError');
      err.style.display = 'none';
      const res = await api.post('/api/admin/login', { username: user, password: pass });
      if (res.success) {
        this.showApp(res.data.username);
        this.loadSection('dashboard');
      } else {
        err.textContent = 'Invalid username or password.';
        err.style.display = 'block';
      }
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await api.post('/api/admin/logout', {});
      window.location.reload();
    });

    document.querySelectorAll('.admin-nav-link[data-section]').forEach(link => {
      link.addEventListener('click', () => {
        this.loadSection(link.dataset.section);
      });
    });
  },

  showApp(username) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'flex';
    document.getElementById('adminUsername').textContent = username;
  },

  setActiveNav(section) {
    document.querySelectorAll('.admin-nav-link[data-section]').forEach(l => {
      l.classList.toggle('active', l.dataset.section === section);
    });
    const titles = { dashboard: 'Dashboard', courses: 'Courses', modules: 'Modules', lessons: 'Lessons', instructors: 'Instructors', progress: 'Student Progress' };
    document.getElementById('topbarTitle').textContent = titles[section] || section;
  },

  async loadSection(section) {
    this.currentSection = section;
    this.setActiveNav(section);
    const content = document.getElementById('adminContent');
    const tpl = document.getElementById(`tpl${section.charAt(0).toUpperCase() + section.slice(1)}`);
    if (!tpl) { content.innerHTML = '<p>Section coming soon.</p>'; return; }
    content.innerHTML = '';
    content.appendChild(tpl.content.cloneNode(true));

    switch (section) {
      case 'dashboard': await this.loadDashboard(); break;
      case 'courses': await this.loadCourses(); break;
      case 'modules': await this.loadModules(); break;
      case 'lessons': await this.loadLessons(); break;
      case 'instructors': await this.loadInstructors(); break;
      case 'progress': await this.loadProgress(); break;
    }
  },

  // ── DASHBOARD ──
  async loadDashboard() {
    const res = await api.get('/api/admin/stats');
    if (!res.success) return;
    const s = res.data;

    document.getElementById('adminStats').innerHTML = [
      { label: 'Total Courses', value: s.totalCourses, icon: '📚', color: 'var(--primary-100)' },
      { label: 'Total Lessons', value: s.totalLessons, icon: '🎬', color: '#D1FAE5' },
      { label: 'Active Students', value: s.totalStudents, icon: '👥', color: '#DBEAFE' },
      { label: 'Completion Rate', value: s.totalStudents > 0 ? Math.round((s.totalCompletions / s.totalStudents) * 100) + '%' : '0%', icon: '🏆', color: '#FEF3C7' },
    ].map(stat => `
      <div class="admin-stat-card">
        <div class="admin-stat-header">
          <div class="admin-stat-title">${stat.label}</div>
          <div class="admin-stat-icon" style="background:${stat.color}">${stat.icon}</div>
        </div>
        <div class="admin-stat-value">${stat.value}</div>
      </div>`).join('');

    const activity = document.getElementById('recentActivity');
    if (!s.recentActivity?.length) {
      activity.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">📊</div><p>No student activity yet.</p></div>';
    } else {
      activity.innerHTML = `<table class="admin-table">
        <thead><tr><th>Student</th><th>Lesson</th><th>Course</th><th>Time</th></tr></thead>
        <tbody>${s.recentActivity.map(a => `
          <tr>
            <td><code style="font-size:0.75rem;color:var(--text-muted)">${a.session_id.substr(0, 16)}...</code></td>
            <td>${a.lesson_title}</td>
            <td>${a.course_title}</td>
            <td>${api.timeAgo(a.completed_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;
    }
  },

  async recalcDurations() {
    const res = await api.post('/api/admin/recalc', {});
    showToast(res.success ? 'Durations recalculated ✓' : 'Recalc failed', res.success ? 'success' : 'error');
  },

  // ── COURSES ──
  async loadCourses() {
    const [cRes, iRes] = await Promise.all([
      api.get('/api/admin/courses'),
      api.get('/api/admin/instructors')
    ]);
    this.courses = cRes.success ? cRes.data : [];
    this.instructors = iRes.success ? iRes.data : [];

    document.getElementById('coursesTbody').innerHTML = this.courses.map(c => `
      <tr>
        <td>
          <div style="font-weight:600">${c.title}</div>
          <div style="font-size:0.8rem;color:var(--text-muted)">${c.category} · ${c.level}</div>
        </td>
        <td>${c.instructor_name || '—'}</td>
        <td>${api.formatDuration(c.total_duration_minutes)}</td>
        <td>${c.total_lessons} lessons · ${c.total_modules} modules</td>
        <td><span class="badge ${c.is_published ? 'badge-success' : 'badge-gray'}">${c.is_published ? 'Published' : 'Draft'}</span></td>
        <td>
          <div class="td-actions">
            <a href="/course/${c.id}" target="_blank" class="btn btn-ghost btn-sm">View</a>
            <button class="btn btn-secondary btn-sm" onclick="adminApp.openCourseModal(${c.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="adminApp.deleteCourse(${c.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">No courses yet. Add your first course.</td></tr>';
  },

  openCourseModal(id) {
    const course = id ? this.courses.find(c => c.id === id) : null;
    const instructorOptions = this.instructors.map(i => `<option value="${i.id}" ${course?.instructor_id === i.id ? 'selected' : ''}>${i.name}</option>`).join('');
    openModal(course ? 'Edit Course' : 'Add Course', `
      <div class="form-group"><label class="form-label">Course Title *</label>
        <input class="form-control" id="fCourseTitle" value="${course?.title || ''}" placeholder="e.g. Modern Excel Training"></div>
      <div class="form-group"><label class="form-label">Description</label>
        <textarea class="form-control" id="fCourseDesc" rows="3">${course?.description || ''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Instructor</label>
          <select class="form-control" id="fCourseInstructor"><option value="">None</option>${instructorOptions}</select></div>
        <div class="form-group"><label class="form-label">Category</label>
          <input class="form-control" id="fCourseCategory" value="${course?.category || 'Excel'}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Level</label>
          <input class="form-control" id="fCourseLevel" value="${course?.level || 'Beginner to Advanced'}"></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" id="fCoursePublished">
            <option value="1" ${course?.is_published !== 0 ? 'selected' : ''}>Published</option>
            <option value="0" ${course?.is_published === 0 ? 'selected' : ''}>Draft</option>
          </select></div>
      </div>`, async () => {
        const body = {
          title: document.getElementById('fCourseTitle').value,
          description: document.getElementById('fCourseDesc').value,
          instructor_id: document.getElementById('fCourseInstructor').value || null,
          category: document.getElementById('fCourseCategory').value,
          level: document.getElementById('fCourseLevel').value,
          is_published: parseInt(document.getElementById('fCoursePublished').value)
        };
        if (!body.title) { showToast('Title is required', 'error'); return; }
        const res = id ? await api.put(`/api/admin/courses/${id}`, body) : await api.post('/api/admin/courses', body);
        if (res.success) { closeModal(); showToast(`Course ${id ? 'updated' : 'created'} ✓`, 'success'); this.loadCourses(); }
        else showToast(res.error || 'Error', 'error');
    });
  },

  async deleteCourse(id) {
    if (!confirm('Delete this course and all its modules and lessons?')) return;
    const res = await api.del(`/api/admin/courses/${id}`);
    if (res.success) { showToast('Course deleted', 'success'); this.loadCourses(); }
    else showToast(res.error || 'Error', 'error');
  },

  // ── MODULES ──
  async loadModules(filterCourseId) {
    const [cRes] = await Promise.all([api.get('/api/admin/courses')]);
    this.courses = cRes.success ? cRes.data : [];

    const courseFilter = document.getElementById('moduleCourseFilter');
    if (courseFilter) {
      courseFilter.innerHTML = '<option value="">All Courses</option>' +
        this.courses.map(c => `<option value="${c.id}" ${filterCourseId == c.id ? 'selected' : ''}>${c.title}</option>`).join('');
      courseFilter.onchange = () => this.loadModules(courseFilter.value);
    }

    let url = filterCourseId ? `/api/admin/courses/${filterCourseId}/modules` : '/api/admin/courses';
    let modules = [];
    if (filterCourseId) {
      const res = await api.get(url);
      modules = res.success ? res.data : [];
    } else {
      for (const c of this.courses) {
        const res = await api.get(`/api/admin/courses/${c.id}/modules`);
        if (res.success) modules.push(...res.data.map(m => ({ ...m, course_title: c.title })));
      }
    }

    document.getElementById('modulesTbody').innerHTML = modules.map(m => `
      <tr>
        <td style="color:var(--text-muted)">${m.module_order}</td>
        <td><div style="font-weight:600">${m.title}</div></td>
        <td>${m.course_title || this.courses.find(c => c.id == m.course_id)?.title || '—'}</td>
        <td>${m.lessons?.length || 0}</td>
        <td>${api.formatDuration(m.duration_minutes)}</td>
        <td>
          <div class="td-actions">
            <button class="btn btn-secondary btn-sm" onclick="adminApp.openModuleModal(${m.id}, ${m.course_id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="adminApp.deleteModule(${m.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px">No modules found.</td></tr>';
  },

  openModuleModal(id, courseId) {
    const courseOptions = this.courses.map(c => `<option value="${c.id}" ${c.id == courseId ? 'selected' : ''}>${c.title}</option>`).join('');
    openModal(id ? 'Edit Module' : 'Add Module', `
      <div class="form-group"><label class="form-label">Course *</label>
        <select class="form-control" id="fModuleCourse">${courseOptions}</select></div>
      <div class="form-group"><label class="form-label">Module Title *</label>
        <input class="form-control" id="fModuleTitle" placeholder="e.g. MODULE 1 — Foundations"></div>
      <div class="form-group"><label class="form-label">Order</label>
        <input class="form-control" type="number" id="fModuleOrder" placeholder="Auto">
      </div>`, async () => {
        const cId = document.getElementById('fModuleCourse').value;
        const body = { title: document.getElementById('fModuleTitle').value, module_order: document.getElementById('fModuleOrder').value || undefined };
        if (!body.title) { showToast('Title required', 'error'); return; }
        const res = id ? await api.put(`/api/admin/modules/${id}`, body) : await api.post(`/api/admin/courses/${cId}/modules`, body);
        if (res.success) { closeModal(); showToast('Module saved ✓', 'success'); this.loadModules(); }
        else showToast(res.error || 'Error', 'error');
    });
  },

  async deleteModule(id) {
    if (!confirm('Delete this module and all its lessons?')) return;
    const res = await api.del(`/api/admin/modules/${id}`);
    if (res.success) { showToast('Module deleted', 'success'); this.loadModules(); }
  },

  // ── LESSONS ──
  async loadLessons(filterCourseId, filterModuleId) {
    const [cRes, iRes] = await Promise.all([api.get('/api/admin/courses'), api.get('/api/admin/instructors')]);
    this.courses = cRes.success ? cRes.data : [];
    this.instructors = iRes.success ? iRes.data : [];

    const cf = document.getElementById('lessonCourseFilter');
    const mf = document.getElementById('lessonModuleFilter');
    if (cf) {
      cf.innerHTML = '<option value="">All Courses</option>' + this.courses.map(c => `<option value="${c.id}" ${c.id == filterCourseId ? 'selected' : ''}>${c.title}</option>`).join('');
      cf.onchange = async () => {
        filterModuleId = '';
        await this.populateModuleFilter(cf.value, mf, filterModuleId);
        this.loadLessons(cf.value, '');
      };
    }
    if (cf?.value) await this.populateModuleFilter(cf.value, mf, filterModuleId);
    if (mf) mf.onchange = () => this.loadLessons(cf?.value, mf.value);

    let url = '/api/admin/lessons';
    if (filterModuleId) url += `?moduleId=${filterModuleId}`;
    else if (filterCourseId) url += `?courseId=${filterCourseId}`;
    const res = await api.get(url);
    const lessons = res.success ? res.data : [];

    document.getElementById('lessonsTbody').innerHTML = lessons.map(l => `
      <tr>
        <td style="color:var(--text-muted)">${l.lesson_order}</td>
        <td>
          <div style="font-weight:600;max-width:240px">${l.title}</div>
        </td>
        <td style="font-size:0.8rem;color:var(--text-muted)">${l.module_title}</td>
        <td>${api.formatDuration(l.duration_minutes)}</td>
        <td>${l.video_url ? `<span class="badge badge-success">✓ Set</span>` : `<span class="badge badge-gray">No video</span>`}</td>
        <td><span class="badge ${l.is_published ? 'badge-success' : 'badge-gray'}">${l.is_published ? 'Live' : 'Draft'}</span></td>
        <td>
          <div class="td-actions">
            <a href="/lesson/${l.id}" target="_blank" class="btn btn-ghost btn-sm">View</a>
            <button class="btn btn-secondary btn-sm" onclick="adminApp.openLessonModal(${l.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="adminApp.deleteLesson(${l.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px">No lessons found.</td></tr>';
  },

  async populateModuleFilter(courseId, mf, selectedId) {
    if (!mf) return;
    mf.innerHTML = '<option value="">All Modules</option>';
    if (!courseId) return;
    const res = await api.get(`/api/admin/courses/${courseId}/modules`);
    if (res.success) mf.innerHTML += res.data.map(m => `<option value="${m.id}" ${m.id == selectedId ? 'selected' : ''}>${m.title}</option>`).join('');
  },

  async openLessonModal(id) {
    let lesson = null;
    if (id) {
      const res = await api.get(`/api/admin/lessons/${id}`);
      lesson = res.success ? res.data : null;
    }

    // Build module options grouped by course
    let moduleOptions = '';
    for (const c of this.courses) {
      const mRes = await api.get(`/api/admin/courses/${c.id}/modules`);
      if (mRes.success && mRes.data.length) {
        moduleOptions += `<optgroup label="${c.title}">`;
        moduleOptions += mRes.data.map(m => `<option value="${m.id}" data-course="${c.id}" ${lesson?.module_id == m.id ? 'selected' : ''}>${m.title}</option>`).join('');
        moduleOptions += '</optgroup>';
      }
    }
    const instrOptions = this.instructors.map(i => `<option value="${i.id}" ${lesson?.instructor_id == i.id ? 'selected' : ''}>${i.name}</option>`).join('');

    const kc = lesson ? JSON.parse(lesson.key_concepts || '[]') : [];
    const parseArr = (field) => { try { return JSON.parse(lesson?.[field] || '[]'); } catch { return []; } };

    openModal(id ? 'Edit Lesson' : 'Add Lesson', `
      <div class="form-group"><label class="form-label">Module *</label>
        <select class="form-control" id="fLessonModule" onchange="adminApp.onModuleSelect(this)">${moduleOptions}</select></div>
      <input type="hidden" id="fLessonCourse" value="${lesson?.course_id || ''}">
      <div class="form-group"><label class="form-label">Lesson Title *</label>
        <input class="form-control" id="fLessonTitle" value="${lesson?.title || ''}" placeholder="e.g. Lesson 1.1 — Excel Basics"></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Duration (minutes)</label>
          <input class="form-control" type="number" id="fLessonDuration" value="${lesson?.duration_minutes || 20}"></div>
        <div class="form-group"><label class="form-label">Lesson Order</label>
          <input class="form-control" type="number" id="fLessonOrder" value="${lesson?.lesson_order || ''}"></div>
      </div>
      <div class="form-group"><label class="form-label">YouTube Video URL</label>
        <input class="form-control" id="fLessonVideo" value="${lesson?.video_url || ''}" placeholder="https://youtube.com/watch?v=... or video ID"></div>
      <div class="form-group"><label class="form-label">Summary</label>
        <textarea class="form-control" id="fLessonSummary" rows="3">${lesson?.summary || ''}</textarea></div>
      <div class="form-group"><label class="form-label">Key Concepts (one per line)</label>
        <textarea class="form-control" id="fLessonConcepts" rows="4" placeholder="Each line = one concept">${kc.join('\n')}</textarea></div>
      <div class="form-group"><label class="form-label">Instructor Notes</label>
        <textarea class="form-control" id="fLessonNotes" rows="3">${lesson?.notes || ''}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Instructor</label>
          <select class="form-control" id="fLessonInstructor"><option value="">None</option>${instrOptions}</select></div>
        <div class="form-group"><label class="form-label">Status</label>
          <select class="form-control" id="fLessonPublished">
            <option value="1" ${lesson?.is_published !== 0 ? 'selected' : ''}>Published</option>
            <option value="0" ${lesson?.is_published === 0 ? 'selected' : ''}>Draft</option>
          </select></div>
      </div>`, async () => {
        const moduleEl = document.getElementById('fLessonModule');
        const selectedOption = moduleEl.options[moduleEl.selectedIndex];
        const courseId = selectedOption?.dataset.course || document.getElementById('fLessonCourse').value;
        const concepts = document.getElementById('fLessonConcepts').value.split('\n').map(s => s.trim()).filter(Boolean);
        const body = {
          module_id: moduleEl.value,
          course_id: courseId,
          title: document.getElementById('fLessonTitle').value,
          duration_minutes: parseInt(document.getElementById('fLessonDuration').value) || 0,
          lesson_order: document.getElementById('fLessonOrder').value || undefined,
          video_url: document.getElementById('fLessonVideo').value.trim(),
          summary: document.getElementById('fLessonSummary').value,
          key_concepts: concepts,
          notes: document.getElementById('fLessonNotes').value,
          instructor_id: document.getElementById('fLessonInstructor').value || null,
          is_published: parseInt(document.getElementById('fLessonPublished').value)
        };
        if (!body.title || !body.module_id) { showToast('Title and module are required', 'error'); return; }
        const res = id ? await api.put(`/api/admin/lessons/${id}`, body) : await api.post('/api/admin/lessons', body);
        if (res.success) { closeModal(); showToast(`Lesson ${id ? 'updated' : 'created'} ✓`, 'success'); this.loadLessons(); }
        else showToast(res.error || 'Error', 'error');
    });
  },

  onModuleSelect(sel) {
    const opt = sel.options[sel.selectedIndex];
    if (opt) document.getElementById('fLessonCourse').value = opt.dataset.course || '';
  },

  async deleteLesson(id) {
    if (!confirm('Delete this lesson?')) return;
    const res = await api.del(`/api/admin/lessons/${id}`);
    if (res.success) { showToast('Lesson deleted', 'success'); this.loadLessons(); }
  },

  // ── INSTRUCTORS ──
  async loadInstructors() {
    const res = await api.get('/api/admin/instructors');
    this.instructors = res.success ? res.data : [];

    document.getElementById('instructorsTbody').innerHTML = this.instructors.map(i => `
      <tr>
        <td><div style="font-weight:600">${i.name}</div></td>
        <td>${i.email || '—'}</td>
        <td>${api.formatDuration(i.total_teaching_minutes)}</td>
        <td>
          <div class="td-actions">
            <button class="btn btn-secondary btn-sm" onclick="adminApp.openInstructorModal(${i.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="adminApp.deleteInstructor(${i.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:40px">No instructors yet.</td></tr>';
  },

  openInstructorModal(id) {
    const inst = id ? this.instructors.find(i => i.id === id) : null;
    openModal(id ? 'Edit Instructor' : 'Add Instructor', `
      <div class="form-group"><label class="form-label">Name *</label>
        <input class="form-control" id="fInstName" value="${inst?.name || ''}"></div>
      <div class="form-group"><label class="form-label">Email</label>
        <input class="form-control" type="email" id="fInstEmail" value="${inst?.email || ''}"></div>
      <div class="form-group"><label class="form-label">Bio</label>
        <textarea class="form-control" id="fInstBio" rows="3">${inst?.bio || ''}</textarea></div>`, async () => {
        const body = { name: document.getElementById('fInstName').value, email: document.getElementById('fInstEmail').value, bio: document.getElementById('fInstBio').value };
        if (!body.name) { showToast('Name required', 'error'); return; }
        const res = id ? await api.put(`/api/admin/instructors/${id}`, body) : await api.post('/api/admin/instructors', body);
        if (res.success) { closeModal(); showToast('Instructor saved ✓', 'success'); this.loadInstructors(); }
    });
  },

  async deleteInstructor(id) {
    if (!confirm('Delete this instructor?')) return;
    await api.del(`/api/admin/instructors/${id}`);
    showToast('Deleted', 'success');
    this.loadInstructors();
  },

  // ── PROGRESS ──
  async loadProgress() {
    const res = await api.get('/api/admin/progress');
    const rows = res.success ? res.data : [];
    document.getElementById('progressTbody').innerHTML = rows.map(r => {
      const pct = Math.round((r.completed_lessons / r.total_lessons) * 100);
      return `<tr>
        <td><code style="font-size:0.75rem">${r.session_id.substr(0, 20)}...</code></td>
        <td>${r.course_title}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="progress-bar" style="width:80px"><div class="progress-fill" style="width:${pct}%"></div></div>
            <span style="font-size:0.8rem;color:var(--text-muted)">${pct}%</span>
          </div>
        </td>
        <td>${r.completed_lessons} / ${r.total_lessons}</td>
        <td>${api.timeAgo(r.last_activity)}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px">No student progress yet.</td></tr>';
  }
};

// Modal helpers
let modalSaveFn = null;
function openModal(title, bodyHTML, onSave) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalOverlay').classList.add('open');
  modalSaveFn = onSave;
  document.getElementById('modalSaveBtn').onclick = () => modalSaveFn?.();
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  modalSaveFn = null;
}
document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

adminApp.init();
