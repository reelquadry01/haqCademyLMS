# Roadmap: Haq-Cademy LMS MVP
milestone: v1.0
milestone_name: Haq-Cademy LMS MVP

## Phase 1 — Backend Infrastructure
status: complete
goal: Express server, SQLite schema, public API routes, admin API routes with auth
success_criteria:
  - server.js starts without errors
  - All API endpoints respond correctly
  - Admin login protected by bcrypt

## Phase 2 — CSS Design System
status: complete
goal: Full CSS design system with vars, main, landing, dashboard, lesson, and admin styles
success_criteria:
  - All 6 CSS files written
  - Responsive breakpoints defined
  - Animation and transition classes in place

## Phase 3 — Seed Data
status: complete
goal: Modern Excel Training course fully seeded — 10 modules, 25 lessons with rich content
success_criteria:
  - All 10 modules seeded with ordered lessons
  - Each lesson has summary, key_concepts, examples, exercises, resources
  - Duration recalc runs after seed

## Phase 4 — Landing & Dashboard HTML
status: complete
goal: Landing page (hero, features, course preview, instructor, testimonials, CTA, footer) and Dashboard page
success_criteria:
  - index.html and dashboard.html written
  - Responsive navigation included
  - Skeleton loading states present

## Phase 5 — Remaining HTML Pages
status: not_started
goal: Write course.html, lesson.html, certificate.html, and admin/index.html
requirements:
  - course.html: course header with stats, expandable module/lesson list, start/continue button
  - lesson.html: sidebar nav with progress, video section, content tabs (summary/concepts/examples/exercises/resources/notes), sticky completion bar
  - certificate.html: beautiful certificate design with print/download
  - admin/index.html: full SPA with login, dashboard stats, and CRUD for courses/modules/lessons/instructors
success_criteria:
  - All 4 HTML files written and structurally complete
  - Lesson page has all tab panels
  - Admin panel has login and all management sections

## Phase 6 — JavaScript Files
status: not_started
goal: Write all client-side JS — api-client.js, landing.js, dashboard.js, course.js, lesson.js, admin.js
requirements:
  - api-client.js: fetch wrapper, session ID management, toast notifications
  - landing.js: load course stats, modules grid, instructor data
  - dashboard.js: load courses with progress, resume card, stats
  - course.js: load course detail, expandable modules, progress tracking
  - lesson.js: YouTube embed, content tabs, sidebar nav, mark-complete, prev/next navigation, notes persistence
  - admin.js: login, dashboard stats, full CRUD SPA with modals
success_criteria:
  - All 6 JS files written
  - Session ID generated and stored in localStorage
  - Progress persists across page reloads
  - Admin login gates all CRUD operations

## Phase 7 — Dependencies & Database
status: not_started
goal: npm install, seed database, verify server starts and responds
success_criteria:
  - npm install succeeds
  - node database/seed.js runs without error
  - GET /api/courses returns Modern Excel Training
  - GET /api/courses/:id returns modules and lessons

## Phase 8 — Git & GitHub Push
status: not_started
goal: Initialize git, add .gitignore, commit all files, push to GitHub
requirements:
  - .gitignore excludes node_modules/, database/lms.db, .env
  - Remote: https://github.com/reelquadry01/haqCademyLMS
success_criteria:
  - git init and initial commit done
  - Pushed to main branch on GitHub
