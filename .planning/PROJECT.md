# Haq-Cademy LMS

**Vision:** A professional, template-driven Learning Management System for Excel and finance training — built for Nigerian finance professionals. After initial setup, adding content requires only pasting YouTube links and notes.

**Stack:** Node.js + Express · SQLite (better-sqlite3) · Vanilla HTML/CSS/JS · No build tools

**Principles:**
- Template-driven: lesson page structure never changes, only data changes
- Scalable: unlimited courses, modules, instructors, bundles, subscriptions
- Progress-first: localStorage session ID, server-side persistence, no forced login
- Admin-ready: full CRUD admin panel for courses, modules, lessons

**Non-negotiables:**
- Every lesson page must support: video embed, summary, key concepts, examples, exercises, resources, notes, mark-complete
- Progress tracked per session (localStorage UUID → server)
- Admin panel protected by username/password (admin/haqcademy2024)
- Certificate generated on 100% course completion
- Modern professional UI — purple/indigo primary palette, Inter font, smooth transitions

**First Course:** Modern Excel Training (10 modules, 25+ lessons) — seeded via database/seed.js

**GitHub:** https://github.com/reelquadry01/haqCademyLMS
