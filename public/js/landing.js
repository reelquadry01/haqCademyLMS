(async () => {
  const data = await api.get('/api/courses');
  if (!data.success || !data.data.length) return;

  const course = data.data[0];
  const hours = Math.floor(course.total_duration_minutes / 60);
  const mins = course.total_duration_minutes % 60;

  // Hero stats
  const el = (id) => document.getElementById(id);
  if (el('statHours')) el('statHours').textContent = hours + (mins > 0 ? `h ${mins}m` : 'h+');
  if (el('statLessons')) el('statLessons').textContent = course.total_lessons;
  if (el('statModules')) el('statModules').textContent = course.total_modules;

  // Course meta row
  if (el('metaDuration')) el('metaDuration').textContent = api.formatDuration(course.total_duration_minutes);
  if (el('metaLessons')) el('metaLessons').textContent = course.total_lessons;
  if (el('metaModules')) el('metaModules').textContent = course.total_modules;

  // Instructor
  if (course.instructor_name) {
    if (el('instructorName')) el('instructorName').textContent = course.instructor_name;
    if (el('instructorBio')) el('instructorBio').textContent = course.instructor_bio || '';
    if (el('instStatHours')) {
      const iHours = Math.floor((course.total_duration_minutes || 0) / 60);
      el('instStatHours').textContent = iHours + 'h+';
    }
    if (el('instStatLessons')) el('instStatLessons').textContent = course.total_lessons;
  }

  // Load course details for modules grid
  const detail = await api.get(`/api/courses/${course.id}`);
  if (!detail.success) return;

  const modules = detail.data.modules || [];
  const grid = el('modulesGrid');
  if (!grid) return;

  grid.innerHTML = modules.map((mod, i) => `
    <a href="/course/${course.id}" class="module-chip" style="text-decoration:none">
      <div class="module-chip-num">${i + 1}</div>
      <div class="module-chip-text">${mod.title.replace(/^MODULE \d+ — /, '')}</div>
    </a>
  `).join('');
})();
