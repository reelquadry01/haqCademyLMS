(async () => {
  const el = (id) => document.getElementById(id);

  const data = await api.get('/api/courses');
  if (!data.success || !data.data.length) return;

  const courses = data.data;
  const course = courses[0]; // first published course = Modern Excel Training

  // Hero stats — show totals across published courses
  let totalLessons = 0, totalMinutes = 0;
  for (const c of courses) {
    totalLessons += (c.total_lessons || 0);
    totalMinutes += (c.total_duration_minutes || 0);
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (el('statHours')) el('statHours').textContent = hours + (mins > 0 ? `h ${mins}m` : 'h+');
  if (el('statLessons')) el('statLessons').textContent = totalLessons + '+';
  if (el('statCourses')) el('statCourses').textContent = 4; // published + coming soon

  // Excel course card meta
  if (el('excelMeta1')) el('excelMeta1').textContent = '⏱ ' + api.formatDuration(course.total_duration_minutes);
  if (el('excelMeta2')) el('excelMeta2').textContent = '📚 ' + (course.total_lessons || 0) + ' lessons';
  if (el('excelCourseCard')) el('excelCourseCard').href = `/course/${course.id}`;

  // Course meta row (modules preview section)
  if (el('metaDuration')) el('metaDuration').textContent = api.formatDuration(course.total_duration_minutes);
  if (el('metaLessons')) el('metaLessons').textContent = course.total_lessons;
  if (el('metaModules')) el('metaModules').textContent = course.total_modules;

  // Instructor section
  if (course.instructor_name) {
    if (el('instructorName')) el('instructorName').textContent = course.instructor_name;
    if (el('instructorBio')) el('instructorBio').textContent = course.instructor_bio || '';
    const iHours = Math.floor((course.total_duration_minutes || 0) / 60);
    if (el('instStatHours')) el('instStatHours').textContent = iHours + 'h+';
    if (el('instStatLessons')) el('instStatLessons').textContent = course.total_lessons;
    if (el('instructorTaughtHours')) el('instructorTaughtHours').textContent = api.formatDuration(course.total_duration_minutes) + ' of content';
  }

  // Load modules grid for Excel course
  const detail = await api.get(`/api/courses/${course.id}`);
  if (!detail.success) return;

  const modules = detail.data.modules || [];
  const grid = el('modulesGrid');
  const wrap = el('excelModulesWrap');

  if (grid && modules.length) {
    grid.innerHTML = modules.map((mod, i) => `
      <a href="/course/${course.id}" class="module-chip" style="text-decoration:none">
        <div class="module-chip-num">${i + 1}</div>
        <div class="module-chip-text">${mod.title.replace(/^MODULE \d+ — /i, '')}</div>
      </a>
    `).join('');
  }

  if (wrap) wrap.style.display = 'block';
})();
