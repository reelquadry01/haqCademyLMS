/**
 * Haq-Cademy LMS — Seed Data
 *
 * Adds initial course data. Run: node database/seed.js
 * To add more courses, duplicate the course/module/lesson blocks below.
 * Each course is fully independent with its own modules and lessons.
 */

const { db, recalcModuleDuration, recalcCourseDuration, recalcInstructorDuration } = require('./db');

function seed() {
  console.log('🌱 Starting seed...');

  // ────────────────────────────────────────────────
  // INSTRUCTORS
  // ────────────────────────────────────────────────
  const instructors = [
    {
      name: 'Haq-Cademy Instructor',
      email: 'instructor@haqcademy.com',
      bio: 'Finance professional and Excel expert with 10+ years of experience in financial modeling, data analytics, and corporate finance across Nigerian and international markets.',
      avatar_url: ''
    }
  ];

  const instructorIds = {};
  for (const inst of instructors) {
    const existing = db.prepare('SELECT id FROM instructors WHERE email = ?').get(inst.email);
    if (existing) {
      instructorIds[inst.email] = existing.id;
      console.log(`  ↳ Instructor already exists: ${inst.name}`);
    } else {
      const r = db.prepare('INSERT INTO instructors (name, email, bio, avatar_url) VALUES (?, ?, ?, ?)').run(inst.name, inst.email, inst.bio, inst.avatar_url);
      instructorIds[inst.email] = r.lastInsertRowid;
      console.log(`  ✓ Instructor: ${inst.name}`);
    }
  }

  // ────────────────────────────────────────────────
  // COURSE 1 — Modern Excel Training
  // ────────────────────────────────────────────────
  seedCourse({
    course: {
      title: 'Modern Excel Training',
      description: 'Master Microsoft Excel from fundamentals to advanced financial modeling. Learn professional techniques used in Nigerian and international finance, including data analysis, dynamic arrays, Power Query, and interactive dashboard creation.',
      instructor_email: 'instructor@haqcademy.com',
      thumbnail_url: '',
      level: 'Beginner to Advanced',
      category: 'Excel'
    },
    modules: excelModules,
    instructorIds
  });

  // ────────────────────────────────────────────────
  // ADD FUTURE COURSES HERE — same pattern as above
  // ────────────────────────────────────────────────
  // seedCourse({ course: { title: 'Power BI Mastery', ... }, modules: powerBiModules, instructorIds });
  // seedCourse({ course: { title: 'Financial Modeling', ... }, modules: finModelModules, instructorIds });
  // seedCourse({ course: { title: 'DAX Fundamentals', ... }, modules: daxModules, instructorIds });

  console.log('\n✅ Seed complete!\n');
}

function seedCourse({ course, modules, instructorIds }) {
  const instructorId = instructorIds[course.instructor_email];
  const existing = db.prepare('SELECT id FROM courses WHERE title = ?').get(course.title);
  if (existing) {
    console.log(`\n  ℹ Course already seeded: ${course.title} (id=${existing.id})`);
    return;
  }

  const courseRow = db.prepare('INSERT INTO courses (title, description, instructor_id, thumbnail_url, level, category) VALUES (?, ?, ?, ?, ?, ?)')
    .run(course.title, course.description, instructorId || null, course.thumbnail_url || '', course.level || 'Beginner', course.category || 'General');
  const courseId = courseRow.lastInsertRowid;
  console.log(`\n  ✓ Course: ${course.title} (id=${courseId})`);

  for (let mi = 0; mi < modules.length; mi++) {
    const mod = modules[mi];
    const modRow = db.prepare('INSERT INTO modules (course_id, title, module_order) VALUES (?, ?, ?)').run(courseId, mod.title, mi + 1);
    const moduleId = modRow.lastInsertRowid;
    console.log(`    Module ${mi + 1}: ${mod.title}`);

    for (let li = 0; li < mod.lessons.length; li++) {
      const lesson = mod.lessons[li];
      db.prepare(`INSERT INTO lessons (module_id, course_id, instructor_id, title, lesson_order, video_url, duration_minutes, summary, key_concepts, examples, exercises, resources, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(moduleId, courseId, instructorId || null, lesson.title, li + 1, lesson.video_url || '', lesson.duration_minutes || 20,
          lesson.summary || '', JSON.stringify(lesson.key_concepts || []), JSON.stringify(lesson.examples || []),
          JSON.stringify(lesson.exercises || []), JSON.stringify(lesson.resources || []), lesson.notes || '');
      console.log(`      Lesson ${li + 1}: ${lesson.title}`);
    }

    recalcModuleDuration(moduleId);
  }

  recalcCourseDuration(courseId);
  if (instructorId) recalcInstructorDuration(instructorId);

  const final = db.prepare('SELECT total_duration_minutes, total_lessons, total_modules FROM courses WHERE id = ?').get(courseId);
  const hours = Math.floor(final.total_duration_minutes / 60);
  const mins = final.total_duration_minutes % 60;
  console.log(`\n  📊 ${course.title}: ${final.total_modules} modules · ${final.total_lessons} lessons · ${hours}h ${mins}m`);
}

// ────────────────────────────────────────────────
// MODERN EXCEL TRAINING — MODULE DEFINITIONS
// ────────────────────────────────────────────────
const excelModules = [
  {
    title: 'MODULE 1 — Foundations',
    lessons: [
      {
        title: 'Lesson 1.1 — Excel Basics',
        duration_minutes: 28,
        video_url: '',
        summary: 'Get familiar with the Excel environment. We cover the core interface components, data types, essential keyboard shortcuts, and efficient data entry methods using a Nigerian Business Invoices dataset.',
        key_concepts: [
          'Interface Components: Cell, Name Box, Formula Bar, Ribbon, Sheet Tabs, Status Bar',
          'Data Types: Number, Text, Date/Time, Boolean, Error',
          'Essential Keyboard Shortcuts: Navigation, Selection, Editing, Formatting',
          'Data Entry Methods: Direct typing, Fill handle, Ctrl+Enter, Paste Special, Flash Fill'
        ],
        examples: [
          { title: 'Interface Tour', description: 'Walk through each component of the Excel ribbon and identify key areas used daily in financial work.' },
          { title: 'Flash Fill in Action', description: 'Use Flash Fill to extract first names from a full name column in the Nigerian Business Invoices dataset.' }
        ],
        exercises: [
          { title: 'Interface Identification', description: 'Label 10 interface components on a screenshot of Excel. Identify the Name Box, Formula Bar, Sheet Tabs, and Status Bar.' },
          { title: 'Keyboard Shortcut Practice', description: 'Navigate a 50-row invoice dataset using only keyboard shortcuts — no mouse allowed.' },
          { title: 'Data Entry Challenge', description: 'Enter 20 invoice records into a structured table using Ctrl+Enter and Fill Handle.' }
        ],
        resources: [
          { title: 'Nigerian Business Invoices Dataset', type: 'Excel', url: '' },
          { title: 'Keyboard Shortcuts Cheatsheet', type: 'PDF', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 1.2 — Cell References',
        duration_minutes: 25,
        video_url: '',
        summary: 'Master the three reference types in Excel — Relative, Absolute, and Mixed. Understand how formulas shift when copied, and apply references to VAT calculations, invoice pricing, and cross-sheet lookups.',
        key_concepts: [
          'Relative Reference (A1): Shifts when copied — row and column both adjust',
          'Absolute Reference ($A$1): Locked — row and column never change',
          'Mixed Reference ($A1 or A$1): One axis locked, one free',
          'Cross-Sheet Reference: SheetName!CellAddress syntax',
          'Copying Behavior: Vertical copying shifts rows; horizontal copying shifts columns'
        ],
        examples: [
          { title: 'VAT Calculation', description: 'Calculate 7.5% VAT on invoice amounts using absolute reference to a VAT rate cell, then copy the formula down 100 rows.' },
          { title: 'Multiplication Grid', description: 'Build a 10x10 multiplication table using mixed references — lock column in one reference, row in another.' },
          { title: 'Cross-Sheet Pricing', description: 'Reference a product price table on Sheet2 from an invoice on Sheet1.' }
        ],
        exercises: [
          { title: 'Reference Type Challenge', description: 'Identify whether each formula in a workbook uses relative, absolute, or mixed references.' },
          { title: 'Invoice VAT Calculation', description: 'Add a VAT column to 50 invoice rows. Use $B$1 for the VAT rate. Change the rate once and confirm all values update.' },
          { title: 'Price Grid Build', description: 'Create a 12x12 multiplication grid in one formula using mixed references.' }
        ],
        resources: [
          { title: 'Reference Types Practice Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 1.3 — Named Ranges',
        duration_minutes: 22,
        video_url: '',
        summary: 'Replace cryptic cell addresses with meaningful names. Learn how Named Ranges improve formula readability, reduce errors, and power professional financial models. Build a set of finance assumption names used throughout the course.',
        key_concepts: [
          'Benefits: Readability, Auditability, Shorter formulas, Easier debugging',
          'Creation Methods: Name Box, Name Manager (Ctrl+F3), Create From Selection',
          'Naming Rules: Must start with a letter, no spaces, cannot be a cell reference',
          'Finance Assumptions: BaseRevenue, GrowthRate, VATRate, CITRate, WHTRate, Years, DiscountRate'
        ],
        examples: [
          { title: 'Revenue Projection', description: 'Build a 5-year revenue projection using =BaseRevenue*(1+GrowthRate)^Year instead of =$B$2*(1+$C$2)^A8.' },
          { title: 'VAT with Named Range', description: 'Calculate VAT using =InvoiceAmount*VATRate — instantly readable to any reviewer.' },
          { title: 'After-Tax Income', description: 'Compute after-CIT income using =GrossProfit*(1-CITRate).' }
        ],
        exercises: [
          { title: 'Finance Model Names', description: 'Create 7 named ranges for the finance assumptions: BaseRevenue, GrowthRate, VATRate, CITRate, WHTRate, Years, DiscountRate.' },
          { title: 'Formula Rewrite', description: 'Rewrite 5 hard-coded formulas using named ranges. Test that results match.' },
          { title: 'Name Manager Audit', description: 'Use Name Manager to find and delete 3 broken named ranges from a provided workbook.' }
        ],
        resources: [
          { title: 'Finance Assumptions Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 1.4 — Tables',
        duration_minutes: 25,
        video_url: '',
        summary: 'Convert data ranges into intelligent Excel Tables. Learn how structured references, auto-expansion, and calculated columns make financial data management dramatically more reliable and maintainable.',
        key_concepts: [
          'Core Features: Auto-expand, AutoFilter, Total Row, Calculated Columns, Structured References',
          'Structured Reference Syntax: tblName[Column], tblName[@Column], tblName[[#Totals],[Column]]',
          'Keyboard Shortcut: Ctrl+T to create a table',
          'Table Management: Naming, Resizing, Applying styles, Converting to range'
        ],
        examples: [
          { title: 'Client Invoice Table', description: 'Convert a 200-row invoice list into a Table. Add a calculated VAT column and enable the Total Row.' },
          { title: 'Auto-Expand Demo', description: 'Show how formulas auto-extend when new rows are added to the table.' },
          { title: 'Structured Reference Formula', description: 'Write =SUM(tblInvoices[Net Amount]) and compare to a plain SUM range.' }
        ],
        exercises: [
          { title: 'Convert and Name', description: 'Convert 3 different datasets to Tables. Name each one appropriately (tblSales, tblExpenses, tblPayroll).' },
          { title: 'Structured Reference Practice', description: 'Write 5 formulas referencing table columns using structured syntax.' },
          { title: 'Total Row Configuration', description: 'Enable the Total Row on tblSales and configure SUM, AVERAGE, and COUNT for different columns.' }
        ],
        resources: [
          { title: 'Client Invoices Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 2 — Data Quality & Formatting',
    lessons: [
      {
        title: 'Lesson 2.1 — Data Validation',
        duration_minutes: 24,
        video_url: '',
        summary: 'Prevent data entry errors before they happen. Build robust validation rules using lists, number constraints, and custom formulas. Create dependent dropdown lists for journal entry forms used in real-world accounting.',
        key_concepts: [
          'Validation Types: List, Whole Number, Decimal, Date, Text Length, Custom Formula',
          'Dependent Dropdowns: INDIRECT() function + Named ranges by category',
          'Error Alert: Stop vs. Warning vs. Information',
          'Input Message: Guide users with on-hover instructions',
          'Journal Entry Form Fields: JE Date, GL Account, Description, Debit, Credit, Entity, Approver'
        ],
        examples: [
          { title: 'GL Account Dropdown', description: 'Create a dropdown list of 20 GL accounts for the GL Account field in a journal entry form.' },
          { title: 'Dependent Entity-Approver', description: 'Use INDIRECT() to show only approvers relevant to the selected entity.' },
          { title: 'Debit/Credit Validation', description: 'Restrict Debit and Credit columns to positive numbers only, with a Stop alert for text input.' }
        ],
        exercises: [
          { title: 'Journal Entry Form Build', description: 'Build a complete journal entry template with validation on all 7 fields: Date, GL Account, Description, Debit, Credit, Entity, Approver.' },
          { title: 'Dependent Dropdown Chain', description: 'Create a 3-level dependent dropdown: Region → State → City.' },
          { title: 'Custom Formula Validation', description: 'Write a custom validation that ensures Debit + Credit = 0 at the row level.' }
        ],
        resources: [
          { title: 'Journal Entry Form Template', type: 'Excel', url: '' },
          { title: 'GL Account Chart of Accounts', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 2.2 — Number Formatting',
        duration_minutes: 20,
        video_url: '',
        summary: 'Understand the critical rule: formatting changes display only — never the underlying value. Master custom format codes to display Naira amounts, IFRS-compliant negatives, percentages, and zero dashes used in professional financial statements.',
        key_concepts: [
          'Core Rule: Formatting changes display only — the cell value remains unchanged',
          'Built-in Types: Currency, Accounting, Percentage, Comma, Date',
          'Custom Format Structure: positive ; negative ; zero ; text',
          'Professional Accounting Format: #,##0.00_);(#,##0.00);"-"_);@',
          'Naira Symbol: ₦#,##0.00',
          'IFRS Standard: Negatives in parentheses, zero as dash'
        ],
        examples: [
          { title: 'Naira Financial Statement', description: 'Apply ₦#,##0.00 formatting to an income statement. Show thousands separator and two decimal places.' },
          { title: 'IFRS Number Format', description: 'Format P&L figures so positives show normally, negatives show in brackets, and zeros show as "–".' },
          { title: 'Date Display', description: 'Format a date column to show "15 April 2024" in one column and "Apr-24" in another — same underlying value.' }
        ],
        exercises: [
          { title: 'Custom Format Challenge', description: 'Write 5 custom format codes: Naira, Thousands (K), Millions (M), Percentage (1dp), and IFRS brackets.' },
          { title: 'Financial Statement Formatting', description: 'Apply professional formatting to a 3-statement financial model (P&L, Balance Sheet, Cash Flow).' }
        ],
        resources: [
          { title: 'Custom Format Reference Card', type: 'PDF', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 3 — Formula Mastery',
    lessons: [
      {
        title: 'Lesson 3.1 — Formula Anatomy',
        duration_minutes: 30,
        video_url: '',
        summary: 'Understand how Excel evaluates formulas step by step. Master operator precedence, use formula auditing tools to trace dependencies, and build the foundational accounting calculation patterns used in every professional model.',
        key_concepts: [
          'Formula Components: Constants, Cell References, Named Ranges, Operators, Functions, Parentheses',
          'Operator Precedence: Parentheses → Exponent → Multiply/Divide → Add/Subtract → Concatenation → Comparison',
          'Auditing Tools: Show Formulas (Ctrl+`), Trace Precedents, Trace Dependents, Evaluate Formula, Error Checking',
          'Accounting Patterns: Revenue − COGS = GP, GP Margin %, VAT, WHT, Net After Tax, Compound Growth, YoY Change'
        ],
        examples: [
          { title: 'P&L Calculation Chain', description: 'Build Revenue → COGS → Gross Profit → EBITDA → EBIT → PBT → PAT using proper formula structure.' },
          { title: 'Evaluate Formula Walkthrough', description: 'Use Evaluate Formula to step through a complex nested formula one operation at a time.' },
          { title: 'YoY Growth Formula', description: 'Calculate =(Current−Prior)/ABS(Prior) and handle the case where Prior is negative.' }
        ],
        exercises: [
          { title: 'Precedence Prediction', description: 'Predict the result of 10 formulas before entering them. Verify with Excel.' },
          { title: 'Audit Trail', description: 'Use Trace Precedents on every formula in a 15-row income statement. Find one circular reference.' },
          { title: 'P&L Build', description: 'Construct a complete P&L from Revenue to PAT using 12 formulas. Apply accounting patterns.' }
        ],
        resources: [
          { title: 'Formula Anatomy Reference', type: 'PDF', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 3.2 — Math & Statistics',
        duration_minutes: 20,
        video_url: '',
        summary: 'Apply Excel\'s core mathematical and statistical functions to real sales data. Calculate totals, averages, medians, and standard deviations to analyse business performance and GP margins.',
        key_concepts: [
          'SUM: Adds a range of numbers',
          'AVERAGE: Arithmetic mean of a range',
          'MEDIAN: Middle value — more robust than average for skewed data',
          'STDEV: Standard deviation — measures data spread and volatility',
          'GP Margin: =Gross_Profit/Revenue — key profitability metric'
        ],
        examples: [
          { title: 'Sales Dataset Analysis', description: 'Calculate total sales, average order value, median transaction, and standard deviation across 200 transactions.' },
          { title: 'GP Margin by Product', description: 'Compute GP Margin % for each product in the dataset. Identify top and bottom performers.' }
        ],
        exercises: [
          { title: 'Statistical Summary Table', description: 'Build a summary table: Total, Average, Median, Min, Max, and StDev for Revenue, COGS, and GP.' },
          { title: 'Outlier Detection', description: 'Flag transactions more than 2 standard deviations from the mean.' }
        ],
        resources: [
          { title: 'Sales Analysis Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 3.3 — Logical Functions',
        duration_minutes: 22,
        video_url: '',
        summary: 'Build decision logic into formulas using IF, IFS, AND, OR, and NOT. Apply to Nigerian tax bracket logic to automate tax rate assignment based on income thresholds.',
        key_concepts: [
          'IF(condition, value_if_true, value_if_false): Basic conditional',
          'IFS(condition1, result1, condition2, result2, ...): Multiple conditions without nesting',
          'AND(cond1, cond2): TRUE only when ALL conditions are true',
          'OR(cond1, cond2): TRUE when ANY condition is true',
          'NOT(condition): Reverses a logical value'
        ],
        examples: [
          { title: 'Tax Bracket Logic', description: 'Use IFS to assign PAYE tax rates based on annual income: 7%, 11%, 15%, 19%, 21%, 24%.' },
          { title: 'Invoice Approval Logic', description: 'Flag invoices for review using AND: amount > ₦500,000 AND not yet approved.' }
        ],
        exercises: [
          { title: 'PAYE Calculator', description: 'Build a PAYE calculator for 30 employees using IFS. Verify totals match manual calculation.' },
          { title: 'Multi-Condition Flag', description: 'Flag records where Region = "Lagos" AND Amount > ₦1,000,000 AND Status = "Pending".' }
        ],
        resources: [
          { title: 'Nigerian Tax Rates Reference', type: 'PDF', url: '' },
          { title: 'Payroll Practice Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 3.4 — Text Functions',
        duration_minutes: 20,
        video_url: '',
        summary: 'Extract, split, and transform text data. Master LEFT, MID, RIGHT for legacy extraction and the powerful modern functions TEXTSPLIT, TEXTBEFORE, and TEXTAFTER for clean data transformation.',
        key_concepts: [
          'LEFT(text, num_chars): Extract from left side',
          'MID(text, start, num_chars): Extract from middle',
          'RIGHT(text, num_chars): Extract from right side',
          'TEXTBEFORE(text, delimiter): Everything before a delimiter',
          'TEXTAFTER(text, delimiter): Everything after a delimiter',
          'TEXTSPLIT(text, col_delimiter, row_delimiter): Split into array'
        ],
        examples: [
          { title: 'Employee ID Extraction', description: 'Extract department code (first 3 characters) and employee number (last 4) from an ID like "FIN-EMP-0042".' },
          { title: 'Name Splitting', description: 'Use TEXTBEFORE and TEXTAFTER to split "FirstName LastName" into separate columns.' }
        ],
        exercises: [
          { title: 'Data Cleaning Exercise', description: 'Clean a messy employee dataset: extract first name, last name, department, and employee number from combined columns.' },
          { title: 'TEXTSPLIT Array', description: 'Split a comma-separated list of regions into individual cells using TEXTSPLIT.' }
        ],
        resources: [
          { title: 'Messy Text Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 3.5 — Date Functions',
        duration_minutes: 22,
        video_url: '',
        summary: 'Work with dates professionally. Calculate elapsed time, working days, month-end dates, and future dates using Excel\'s date function library. Essential for financial reporting, payroll, and project timelines.',
        key_concepts: [
          'DATE(year, month, day): Construct a date from components',
          'DATEDIF(start, end, unit): Calculate difference in days/months/years',
          'NETWORKDAYS(start, end, holidays): Count working days excluding weekends',
          'EDATE(start_date, months): Date n months forward or back',
          'EOMONTH(start_date, months): Last day of a month',
          'TEXT(date, format): Display date as formatted text'
        ],
        examples: [
          { title: 'Invoice Aging', description: 'Calculate days outstanding for each invoice using =TODAY()-InvoiceDate. Classify 0-30, 31-60, 61-90, 90+ days.' },
          { title: 'Loan Schedule Dates', description: 'Generate 12 monthly payment dates starting from a loan start date using EDATE.' }
        ],
        exercises: [
          { title: 'Accounts Receivable Aging', description: 'Build an AR aging schedule for 40 invoices. Flag invoices over 60 days.' },
          { title: 'Working Days Counter', description: 'Calculate working days between contract signing and delivery dates, excluding Nigerian public holidays.' }
        ],
        resources: [
          { title: 'Nigerian Public Holidays 2024-2025', type: 'Excel', url: '' },
          { title: 'AR Aging Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 3.6 — Conditional Aggregation',
        duration_minutes: 25,
        video_url: '',
        summary: 'Summarise large datasets with precision using SUMIFS, COUNTIFS, AVERAGEIFS, and MAXIFS. Apply to payroll analysis to compute department totals, headcount, average salary, and maximum pay by multiple criteria.',
        key_concepts: [
          'SUMIFS(sum_range, criteria_range1, criteria1, ...): Sum matching multiple conditions',
          'COUNTIFS(range1, criteria1, ...): Count matching multiple conditions',
          'AVERAGEIFS(avg_range, criteria_range1, criteria1, ...): Average matching conditions',
          'MAXIFS(max_range, criteria_range1, criteria1, ...): Maximum matching conditions',
          'Wildcards: * (any text), ? (single character) in criteria'
        ],
        examples: [
          { title: 'Payroll by Department', description: 'Calculate total salary for each department using SUMIFS with Department and Month criteria.' },
          { title: 'Headcount Analysis', description: 'Count employees per grade level per department using COUNTIFS.' }
        ],
        exercises: [
          { title: 'Payroll Summary Table', description: 'Build a summary table showing Total Salary, Headcount, Average Salary, and Max Salary by Department and Gender.' },
          { title: 'Multi-Period Analysis', description: 'Use SUMIFS to calculate Q1, Q2, Q3, Q4 totals for each product category.' }
        ],
        resources: [
          { title: 'Payroll Analysis Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 4 — Lookups & Data Management',
    lessons: [
      {
        title: 'Lesson 4.1 — VLOOKUP & XLOOKUP',
        duration_minutes: 27,
        video_url: '',
        summary: 'Find and retrieve data across tables using Excel\'s lookup functions. Understand VLOOKUP\'s limitations and how XLOOKUP solves them with flexible search direction, error handling, and multi-column returns.',
        key_concepts: [
          'VLOOKUP(lookup_value, table_array, col_index, match_type): Classic lookup — searches left column only',
          'XLOOKUP(lookup, lookup_array, return_array, if_not_found, match_mode, search_mode): Modern flexible lookup',
          'XLOOKUP advantages: Search any column, return multiple columns, built-in error handling',
          'Exact vs Approximate Match: 0 for exact, 1 for approximate (sorted data)',
          'Error Handling: =XLOOKUP(A2, tblProducts[Code], tblProducts[Price], "Not Found")'
        ],
        examples: [
          { title: 'Product Catalog Lookup', description: 'Use XLOOKUP to pull product names and prices from a product table into an invoice sheet.' },
          { title: 'XLOOKUP with Error', description: 'Return "Product Not Found" when a code doesn\'t exist in the catalog.' }
        ],
        exercises: [
          { title: 'Invoice Auto-Fill', description: 'Build an invoice template where entering a product code auto-fills Name, Category, and Unit Price using XLOOKUP.' },
          { title: 'Convert VLOOKUP to XLOOKUP', description: 'Rewrite 5 existing VLOOKUP formulas as XLOOKUP. Confirm identical results.' }
        ],
        resources: [
          { title: 'Product Catalog Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 4.2 — INDEX MATCH',
        duration_minutes: 25,
        video_url: '',
        summary: 'Master the INDEX/MATCH combination — the power user\'s lookup. Perform left lookups, 2-dimensional lookups, and dynamic range selections that VLOOKUP cannot handle.',
        key_concepts: [
          'INDEX(array, row_num, col_num): Returns a value from a specific position in a range',
          'MATCH(lookup_value, lookup_array, match_type): Returns the position of a value in a range',
          'Combined Pattern: =INDEX(return_range, MATCH(lookup_value, lookup_range, 0))',
          '2D Lookup: INDEX with nested MATCH for both row and column',
          'Left Lookup: Return a column to the left of the search column (impossible with VLOOKUP)'
        ],
        examples: [
          { title: 'Left Lookup', description: 'Look up an invoice number (right column) to return the client name (left column) — impossible with VLOOKUP.' },
          { title: '2D Matrix Lookup', description: 'Find a price from a product × region pricing matrix using nested INDEX/MATCH.' }
        ],
        exercises: [
          { title: 'Left Lookup Challenge', description: 'Retrieve 3 pieces of data using left lookups that VLOOKUP cannot handle.' },
          { title: 'Dynamic Header Lookup', description: 'Build a formula that returns data from whichever column the user types in a header cell.' }
        ],
        resources: [
          { title: 'INDEX MATCH Practice Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 4.3 — Sort & Filter',
        duration_minutes: 22,
        video_url: '',
        summary: 'Organise and subset data dynamically. Use manual sort and AutoFilter for quick analysis, then replace them with SORT, SORTBY, and FILTER dynamic array functions that automatically update when data changes.',
        key_concepts: [
          'Manual Sort: Single-level and multi-level sort by multiple columns',
          'AutoFilter: Quick filter with dropdown criteria, text filters, number filters',
          'SORT(array, sort_index, sort_order): Dynamic sort that auto-updates',
          'SORTBY(array, by_array1, order1, ...): Sort by a separate array',
          'FILTER(array, include, if_empty): Return matching rows based on criteria'
        ],
        examples: [
          { title: 'Dynamic Top 10', description: 'Use =SORT(FILTER(tblSales, tblSales[Amount]>100000), 2, -1) to show top transactions auto-sorted by value.' },
          { title: 'Region Filter', description: 'Create a live table that shows only Lagos transactions, updating as new data is added.' }
        ],
        exercises: [
          { title: 'Multi-Level Sort', description: 'Sort a 500-row dataset by Region (A-Z), then by Amount (largest first).' },
          { title: 'Dynamic Filter Dashboard', description: 'Build a FILTER formula that responds to a dropdown selection to show relevant records.' }
        ],
        resources: [
          { title: 'Large Sales Dataset (500 rows)', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 4.4 — Pivot Tables',
        duration_minutes: 28,
        video_url: '',
        summary: 'Summarise thousands of rows in seconds with Pivot Tables. Build interactive reports, add Slicers for visual filtering, group dates by month/quarter, and create calculated fields for custom metrics.',
        key_concepts: [
          'Pivot Table Anatomy: Rows, Columns, Values, Filters areas',
          'Value Field Settings: Sum, Count, Average, % of Total, % of Column, % of Row',
          'Grouping: Group dates by month, quarter, year automatically',
          'Slicers: Visual click-filter buttons linked to Pivot Table',
          'Calculated Field: Add custom metrics like GP Margin directly in the Pivot'
        ],
        examples: [
          { title: 'Monthly Sales by Region', description: 'Build a Pivot Table showing monthly revenue by region from a 12-month sales dataset.' },
          { title: 'Slicer Dashboard', description: 'Connect 3 Slicers (Region, Category, Month) to a Pivot Table for interactive filtering.' }
        ],
        exercises: [
          { title: 'Product Performance Pivot', description: 'Create a Pivot Table showing Revenue, Units Sold, Average Price, and GP Margin by Product Category.' },
          { title: 'YTD vs Prior Year', description: 'Add a calculated field to show YoY growth % in the Pivot.' }
        ],
        resources: [
          { title: 'Full Year Sales Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 5 — Visualization',
    lessons: [
      {
        title: 'Lesson 5.1 — Charts & Dashboards',
        duration_minutes: 30,
        video_url: '',
        summary: 'Tell compelling data stories with professional charts. Learn when to use each chart type, how to format them to IFRS/boardroom standards, and how to build combo charts that show multiple measures simultaneously.',
        key_concepts: [
          'Chart Types: Column (comparison), Line (trends), Pie (composition), Scatter (correlation), Combo (dual-axis)',
          'Professional Formatting: Clean titles, data labels, removed gridlines, colour coding',
          'Dynamic Charts: Link charts to Tables so they auto-expand with new data',
          'Combo Chart: Secondary axis for showing both revenue (bars) and margin % (line)',
          'Sparklines: Mini inline charts for trend-at-a-glance in dashboards'
        ],
        examples: [
          { title: 'Revenue vs Margin Combo', description: 'Build a combo chart: column bars for monthly revenue + line for GP margin % on a secondary axis.' },
          { title: 'Regional Performance Bar', description: 'Horizontal bar chart ranked by region performance with data labels and conditional colours.' }
        ],
        exercises: [
          { title: 'Chart Selection Challenge', description: 'Choose the appropriate chart type for 8 different business scenarios. Justify each choice.' },
          { title: 'Board-Ready Chart', description: 'Format a revenue chart to board presentation standard: clean background, branded colours, clear title.' }
        ],
        resources: [
          { title: 'Chart Formatting Guide', type: 'PDF', url: '' },
          { title: 'Dashboard Dataset', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 6 — Dynamic Arrays',
    lessons: [
      {
        title: 'Lesson 6.1 — Dynamic Array Functions',
        duration_minutes: 28,
        video_url: '',
        summary: 'Enter the modern Excel era with spilling array formulas. UNIQUE, SORT, FILTER, and SEQUENCE eliminate the need for manual updates, enabling live lists and grids that react instantly to data changes.',
        key_concepts: [
          'UNIQUE(array): Returns distinct values — eliminating duplicates automatically',
          'SORT(array): Returns sorted array that spills into neighbouring cells',
          'FILTER(array, include): Returns rows meeting criteria — live subset',
          'SEQUENCE(rows, cols, start, step): Generate number sequences for dynamic ranges',
          'Advanced: CHOOSECOLS, TAKE, DROP, VSTACK for array manipulation'
        ],
        examples: [
          { title: 'Live Unique Customer List', description: 'Use =UNIQUE(tblSales[Customer]) to create a self-updating customer dropdown source.' },
          { title: 'Dynamic Top 5 Products', description: 'Combine SORT and FILTER to show the top 5 products by revenue, updated live.' }
        ],
        exercises: [
          { title: 'Dynamic Report', description: 'Build a report that shows unique regions, sorted by total sales, auto-updated with UNIQUE+SORT+SUMIFS.' },
          { title: 'SEQUENCE Calendar', description: 'Generate a month calendar grid using SEQUENCE(6,7) and DATE functions.' }
        ],
        resources: [
          { title: 'Dynamic Arrays Practice Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 6.2 — LET & LAMBDA',
        duration_minutes: 25,
        video_url: '',
        summary: 'Eliminate formula duplication with LET (named variables inside formulas) and LAMBDA (create your own reusable functions). Build a custom compound interest function usable anywhere in the workbook.',
        key_concepts: [
          'LET(name1, value1, name2, value2, ..., result): Assign names to calculations within a formula',
          'LET Benefits: Calculates repeated sub-expressions once, improves readability',
          'LAMBDA(param1, param2, ..., formula): Create a custom named function',
          'LAMBDA in Name Manager: Save as a named range to reuse like a built-in function',
          'Example: =LAMBDA(principal, rate, years, principal*(1+rate)^years)'
        ],
        examples: [
          { title: 'LET for Complex Formula', description: 'Rewrite a long nested formula using LET to name intermediate steps: revenue, cogs, gp, margin.' },
          { title: 'Compound Interest LAMBDA', description: 'Create a LAMBDA named CompoundValue and use it as =CompoundValue(1000000, 12%, 5).' }
        ],
        exercises: [
          { title: 'LET Refactor', description: 'Refactor 3 complex formulas using LET. Confirm identical output and measure readability improvement.' },
          { title: 'Custom Tax LAMBDA', description: 'Build a LAMBDA function that calculates PAYE tax given an annual income input.' }
        ],
        resources: [
          { title: 'LET and LAMBDA Practice Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 6.3 — SUMPRODUCT',
        duration_minutes: 22,
        video_url: '',
        summary: 'Harness SUMPRODUCT\'s unique ability to multiply arrays and sum results in a single formula. Calculate weighted averages, perform conditional counts without COUNTIFS, and solve advanced data challenges.',
        key_concepts: [
          'SUMPRODUCT(array1, array2, ...): Multiplies corresponding elements then sums the results',
          'Weighted Average: =SUMPRODUCT(weights, values)/SUM(weights)',
          'Conditional Count: =SUMPRODUCT((criteria_range=criteria)*1)',
          '1/COUNTIF trick: Count unique values with =SUMPRODUCT(1/COUNTIF(range, range))',
          'Multi-criteria: =SUMPRODUCT((A:A="X")*(B:B>100)*C:C)'
        ],
        examples: [
          { title: 'Weighted Average Rate', description: 'Calculate weighted average interest rate across multiple loans with different balances and rates.' },
          { title: 'Unique Count', description: 'Count the number of unique customers in a 1,000-row transaction list using the 1/COUNTIF trick.' }
        ],
        exercises: [
          { title: 'Weighted Portfolio Return', description: 'Calculate weighted portfolio return for 10 assets using SUMPRODUCT.' },
          { title: 'Advanced Conditional', description: 'Use SUMPRODUCT to calculate total revenue for transactions that are: Lagos region + Q2 + Amount > ₦50,000.' }
        ],
        resources: [
          { title: 'SUMPRODUCT Practice Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 7 — Advanced Logic',
    lessons: [
      {
        title: 'Lesson 7.1 — Advanced IF Functions',
        duration_minutes: 24,
        video_url: '',
        summary: 'Replace deeply nested IF statements with cleaner, more readable alternatives. Use IFS for multiple conditions, SWITCH for exact-match logic, and CHOOSE for position-based selection. Build elegant, audit-friendly logic.',
        key_concepts: [
          'IFS(cond1, val1, cond2, val2, ..., TRUE, default): Multiple conditions without nesting',
          'SWITCH(expr, val1, result1, val2, result2, ..., default): Clean exact-match lookup',
          'CHOOSE(index, val1, val2, ...): Return a value based on position number',
          'Nested IF limit: 64 levels allowed, but IFS is cleaner for 3+ conditions'
        ],
        examples: [
          { title: 'Grade Classification', description: 'Classify performance scores (0-100) into bands using IFS: Fail, Pass, Credit, Distinction, Distinction+.' },
          { title: 'Department Code to Name', description: 'Use SWITCH to convert department codes (FIN, OPS, HR, MKT) to full names.' }
        ],
        exercises: [
          { title: 'Tax Bracket Comparison', description: 'Build the same PAYE tax calculator using IF, IFS, and SWITCH. Compare formula length and readability.' },
          { title: 'Performance Rating', description: 'Rate 50 employees as Excellent/Good/Average/Poor based on multiple KPI thresholds using IFS.' }
        ],
        resources: [
          { title: 'Advanced Logic Practice Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 7.2 — Error Handling',
        duration_minutes: 20,
        video_url: '',
        summary: 'Build professional, error-free models. Understand what each Excel error means, trace the root cause, and use IFERROR and IFNA to display meaningful messages instead of ugly error codes.',
        key_concepts: [
          '#VALUE!: Wrong data type in formula (e.g. text where number expected)',
          '#REF!: Formula references a deleted cell or invalid range',
          '#N/A: Lookup value not found in search range',
          '#DIV/0!: Division by zero or empty denominator',
          'IFERROR(value, value_if_error): Catch any error and replace with fallback',
          'IFNA(value, value_if_na): Catch only #N/A errors (lookup specific)'
        ],
        examples: [
          { title: 'Safe Division', description: 'Wrap all margin % formulas with IFERROR to show "–" when revenue is zero.' },
          { title: 'Lookup with Fallback', description: 'Use IFNA(XLOOKUP(...), "New Product") to handle products not yet in the catalog.' }
        ],
        exercises: [
          { title: 'Error Detective', description: 'Identify and fix 10 errors in a broken financial model workbook.' },
          { title: 'Error-Proof Model', description: 'Add IFERROR and IFNA to all 20 formulas in a lookup-heavy dashboard.' }
        ],
        resources: [
          { title: 'Broken Model for Debugging', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 8 — Finance & Modeling',
    lessons: [
      {
        title: 'Lesson 8.1 — Financial Functions',
        duration_minutes: 32,
        video_url: '',
        summary: 'Apply Excel\'s Time Value of Money (TVM) functions to real financial decisions. Calculate loan payments, investment returns, NPV for project appraisal, and IRR for capital allocation decisions.',
        key_concepts: [
          'PV(rate, nper, pmt): Present Value — what future cash flows are worth today',
          'FV(rate, nper, pmt, pv): Future Value — what today\'s investment grows to',
          'PMT(rate, nper, pv): Payment — monthly loan or lease instalment',
          'NPV(rate, values): Net Present Value — discounted value of future cash flows',
          'IRR(values): Internal Rate of Return — implied return of an investment',
          'XNPV / XIRR: NPV and IRR with irregular cash flow dates'
        ],
        examples: [
          { title: 'Loan Repayment Schedule', description: 'Calculate monthly payment for a ₦50M loan at 18% p.a. over 5 years using PMT.' },
          { title: 'Project NPV', description: 'Appraise a 5-year project with initial ₦200M investment and forecast cash flows using NPV and IRR.' }
        ],
        exercises: [
          { title: 'Loan Comparison', description: 'Compare three loan options (different rates and tenors) using PMT and total interest cost.' },
          { title: 'Investment Appraisal', description: 'Calculate NPV and IRR for 2 competing projects. Recommend which to approve based on results.' }
        ],
        resources: [
          { title: 'Financial Functions Reference', type: 'PDF', url: '' },
          { title: 'Project Appraisal Template', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 8.2 — Data Modeling',
        duration_minutes: 35,
        video_url: '',
        summary: 'Build a professional 5-Year Profit and Loss model from scratch. Integrate named inputs, sensitivity tables, and scenario analysis. This is the foundation of financial modeling used by analysts and CFOs.',
        key_concepts: [
          'Model Structure: Inputs → Calculations → Outputs (always separate layers)',
          'Named Inputs: All assumptions in one input section with named ranges',
          'Sensitivity Tables: Data Table (one-variable and two-variable) for scenario analysis',
          'Dynamic Labels: Use TEXT function to build automatic period headers',
          'Model Best Practices: Hard-coded inputs in blue, formulas in black, links from other sheets in green'
        ],
        examples: [
          { title: '5-Year P&L Model', description: 'Build Revenue, COGS, GP, Opex, EBITDA, EBIT, Finance Costs, PBT, Tax, PAT for 5 years from 3 assumptions.' },
          { title: 'Sensitivity Table', description: 'Create a 2-variable sensitivity showing PAT under different Revenue Growth and Margin scenarios.' }
        ],
        exercises: [
          { title: 'Model Audit', description: 'Audit a pre-built model: find 3 errors, fix circular references, and add missing error handling.' },
          { title: 'Own P&L Model', description: 'Build a 3-year P&L model for a Nigerian manufacturing company from a brief provided.' }
        ],
        resources: [
          { title: 'Financial Modeling Best Practices', type: 'PDF', url: '' },
          { title: '5-Year Model Starter Template', type: 'Excel', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 8.3 — Goal Seek & Scenarios',
        duration_minutes: 25,
        video_url: '',
        summary: 'Answer "what-if" questions in reverse. Use Goal Seek to find the input required to achieve a target output. Use Scenario Manager to save and compare multiple business scenarios (Base, Bull, Bear).',
        key_concepts: [
          'Goal Seek: Set a target value for a formula cell by changing one input — works backwards',
          'Scenario Manager: Save named sets of inputs to switch between Base/Bull/Bear cases',
          'Scenario Summary: Generate a comparison table of all scenarios automatically',
          'Data Table (What-If): Test multiple input values systematically in a grid',
          'Use Case: Find break-even revenue, minimum margin, or required growth rate'
        ],
        examples: [
          { title: 'Break-Even Analysis', description: 'Use Goal Seek to find the minimum revenue needed to achieve ₦0 net profit (break-even).' },
          { title: 'Three Scenarios', description: 'Create Base, Bull, and Bear scenarios in Scenario Manager with different growth and cost assumptions.' }
        ],
        exercises: [
          { title: 'Target Margin', description: 'Use Goal Seek to find the price per unit required to achieve a 25% GP margin.' },
          { title: 'Scenario Comparison Report', description: 'Build a Scenario Summary showing PAT under Base, Bull, and Bear cases. Format for board presentation.' }
        ],
        resources: [
          { title: 'Scenario Analysis Workbook', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 9 — Automation & ETL',
    lessons: [
      {
        title: 'Lesson 9.1 — Power Query',
        duration_minutes: 30,
        video_url: '',
        summary: 'Automate data import and transformation with Power Query. Connect to multiple data sources, clean messy raw data, reshape tables, and build a repeatable ETL pipeline that refreshes in one click.',
        key_concepts: [
          'ETL Workflow: Extract → Transform → Load',
          'Import Sources: Excel files, CSV, web, databases, folders',
          'Transforms: Remove columns, filter rows, split columns, change types, pivot, unpivot',
          'Merge Queries: Join two tables on a common key (like SQL JOIN)',
          'Append Queries: Stack multiple tables vertically (like SQL UNION)',
          'Refresh: Reload all data with one click without repeating manual steps'
        ],
        examples: [
          { title: 'Bank Statement Cleanup', description: 'Import a raw bank statement CSV, remove blank rows, split date columns, clean amount formatting, and load to Excel Table.' },
          { title: 'Multi-File Consolidation', description: 'Use "From Folder" to combine 12 monthly sales files into one table automatically.' }
        ],
        exercises: [
          { title: 'ETL Pipeline Build', description: 'Build a complete Power Query pipeline: import 3 separate files, clean each, merge on Customer ID, load to analysis sheet.' },
          { title: 'Monthly Refresh Test', description: 'Add a new month of data to the source folder. Refresh and verify the output updates correctly.' }
        ],
        resources: [
          { title: 'Raw Bank Statement Files (12 months)', type: 'CSV', url: '' },
          { title: 'Power Query Reference Guide', type: 'PDF', url: '' }
        ],
        notes: ''
      },
      {
        title: 'Lesson 9.2 — M Language Basics',
        duration_minutes: 25,
        video_url: '',
        summary: 'Go beyond the Power Query UI by reading and writing M code directly. Understand M\'s functional syntax, add conditional logic, create custom columns, and write transformations that the GUI cannot generate automatically.',
        key_concepts: [
          'M Language: Functional language behind Power Query UI',
          'let...in Structure: Sequential named steps leading to a final output',
          'each _ Shorthand: Shorthand for row-level function',
          'Table.AddColumn: Add a computed column with custom logic',
          'if...then...else: Conditional logic in M',
          'Text.Proper, Number.Round, Date.Year: Built-in M functions'
        ],
        examples: [
          { title: 'Custom Tax Column', description: 'Add a Tax column in M: if [Income] > 3600000 then [Income]*0.24 else [Income]*0.07.' },
          { title: 'Fiscal Year Column', description: 'Add a FY column using Date.Year([Date]) and Date.Month([Date]) to handle Nigerian fiscal year (Oct-Sep).' }
        ],
        exercises: [
          { title: 'M Code Reading', description: 'Read the M code generated by 5 Power Query UI steps. Explain what each step does.' },
          { title: 'Custom Column in M', description: 'Write M code to add a Revenue Band column: "Small", "Medium", or "Large" based on revenue thresholds.' }
        ],
        resources: [
          { title: 'M Language Reference', type: 'PDF', url: '' }
        ],
        notes: ''
      }
    ]
  },
  {
    title: 'MODULE 10 — Capstone Project',
    lessons: [
      {
        title: 'Lesson 10.1 — Interactive Dashboard Capstone',
        duration_minutes: 60,
        video_url: '',
        summary: 'Apply every skill from the course to build a professional, interactive Excel dashboard. Integrate KPI panels, department tables, dynamic charts, slicers, and conditional formatting into one boardroom-ready deliverable.',
        key_concepts: [
          'Dashboard Design Principles: Single view, clear hierarchy, no clutter, guided story',
          'KPI Cards: Revenue, Expenses, Net Profit, GP Margin with sparklines and variance arrows',
          'Dynamic Charts: Linked to Tables — auto-update with new data',
          'Slicer Integration: Connect slicers to multiple Pivot Tables simultaneously',
          'Conditional Formatting: Heat maps, data bars, traffic light icons',
          'Print Layout: Set print area, page breaks, headers and footers for PDF export'
        ],
        examples: [
          { title: 'KPI Panel Build', description: 'Create 4 KPI cards: Revenue vs Budget, GP Margin, Net Profit, and Headcount — each with a sparkline.' },
          { title: 'Department Performance Table', description: 'Pivot Table showing Revenue, Cost, and Margin by Department with conditional formatting heat map.' },
          { title: 'Trend Chart', description: '12-month revenue and margin combo chart with a target line overlay.' }
        ],
        exercises: [
          { title: 'Full Dashboard Build', description: 'Complete the capstone dashboard using the provided 12-month company dataset. Must include: 4 KPIs, 2 Pivot Tables, 3 Charts, 2 Slicers, conditional formatting.' },
          { title: 'Dashboard Review', description: 'Exchange dashboards with a peer. Provide structured feedback on: clarity, accuracy, design, interactivity.' }
        ],
        resources: [
          { title: 'Company Annual Dataset (12 months)', type: 'Excel', url: '' },
          { title: 'Dashboard Design Checklist', type: 'PDF', url: '' },
          { title: 'Capstone Submission Template', type: 'Excel', url: '' }
        ],
        notes: ''
      }
    ]
  }
];

seed();
