# Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static, dark-themed one-page portfolio site for Kakumanu Rajesh Kumar at `https://RajeshKumar11.github.io/`, with a Projects section backed by real GitHub repo analysis (public + private, forks excluded).

**Architecture:** Plain HTML/CSS/vanilla JS, no build step. One generated data file (`data/projects.json`) decouples GitHub repo analysis from page rendering — the page only ever fetches a local static JSON file, never calls the GitHub API itself.

**Tech Stack:** HTML5, CSS3 (custom properties, flexbox/grid), vanilla ES6 JS (`fetch`), GitHub CLI (`gh`) for the one-time data pipeline, GitHub Pages for hosting.

**Spec:** [docs/superpowers/specs/2026-10-01-portfolio-site-design.md](../specs/2026-10-01-portfolio-site-design.md)

## Global Constraints

- Repo root = Pages root; branch `main`. No `/docs` subfolder deploy, no build output folder.
- No frameworks, no bundler, no npm dependencies.
- No GitHub token or API call ships to the browser — `data/projects.json` is static, generated ahead of time.
- Forks excluded from Projects entirely (not shown, not fetched into the JSON).
- Private repos: metadata + written analysis only, `url` field omitted, no code excerpts.
- Resume file lives at `assets/resume.pdf` (renamed from the original `Rajesh Kumar K_Node js_(2026-May).pdf` to avoid spaces/parens in a public URL).
- Dark theme only for v1 — no theme toggle.

## Review Focus

- **Empty/slow `data/projects.json` fetch** (e.g. opened via `file://`, or JSON temporarily missing) — page must show the fallback message from the spec's Error Handling section, not a blank Projects section or a JS console error visible to a recruiter who opens devtools.
- **Private project cards accidentally leaking a GitHub link** — the render function must never emit an `<a>` tag when `private === true`, even if a future data entry mistakenly includes a `url` field alongside `private: true`.
- **Mobile width (~390px) nav and project grid** — spec requires no horizontal scroll and a usable nav; a 5-link nav bar is a common overflow point at that width.
- **Filter toggle state after re-render** — clicking Public/Private/All repeatedly must correctly re-filter from the full in-memory dataset each time, not progressively filter an already-filtered DOM subset (a common bug when filtering re-reads `.project-card` elements instead of the original array).
- **Phone/email links on mobile vs desktop** — `tel:`/`mailto:` must be real functional links (not plain text), since this is a deployed site, not a sandboxed artifact; verify they use correct `tel:+91...` / `mailto:...` schemes with no formatting typos from the resume text.

---

## Task 1: Project scaffold and resume asset

**Files:**
- Create: `assets/` (directory)
- Modify: move `Rajesh Kumar K_Node js_(2026-May).pdf` → `assets/resume.pdf`
- Create: `.gitignore`

**Interfaces:**
- Produces: `assets/resume.pdf` — the stable path every later task's resume link points to.

- [ ] **Step 1: Create the assets directory and move the resume into it**

```bash
mkdir -p assets
git mv "Rajesh Kumar K_Node js_(2026-May).pdf" assets/resume.pdf
```

- [ ] **Step 2: Add a minimal `.gitignore`**

```
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Verify**

Run: `ls assets/` — expect `resume.pdf` present, and `ls` on repo root — expect the old spaced filename gone.

- [ ] **Step 4: Commit**

```bash
git add .gitignore assets/resume.pdf
git commit -m "chore: scaffold assets dir, move resume to assets/resume.pdf"
```

---

## Task 2: Generate `data/projects.json` from real GitHub repos

**Files:**
- Create: `data/projects.json`

**Interfaces:**
- Produces: a JSON array at the file's top level, each element matching:
  ```ts
  {
    name: string;            // repo slug, e.g. "neuron-perf-suite"
    displayName: string;     // human title, e.g. "Neuron Performance Suite"
    description: string;     // 1-2 sentences, written from README/metadata
    stack: string[];         // e.g. ["Node.js", "AWS Lambda"]
    impact?: string;         // short role/impact line, omit key if not inferable
    private: boolean;
    url?: string;             // ABSENT entirely when private === true
    updatedAt: string;       // ISO date from GitHub metadata
  }
  ```
- Consumed by: Task 5's `js/main.js` (`renderProjects`).

- [ ] **Step 1: List all non-fork repos for the account**

```bash
gh repo list RajeshKumar11 --limit 200 \
  --json name,description,isPrivate,isFork,primaryLanguage,updatedAt,createdAt,repositoryTopics \
  > /tmp/repos.json
```

Manually drop any entry where `isFork` is `true` before proceeding — do not include forks in the output at all.

- [ ] **Step 2: Pull README signal per kept repo**

For each remaining repo, run:

```bash
gh api repos/RajeshKumar11/<repo-name>/readme --jq '.content' | base64 -d
```

(If this 404s — no README — fall back to the repo's `description`, `primaryLanguage`, and `repositoryTopics` from Step 1's output only; do not skip the repo.)

- [ ] **Step 3: Write one JSON entry per repo**

For each repo, write an entry matching the schema in **Interfaces** above. `description` and `impact` are short, honest, written from what the README/topics/language actually show — no invented metrics. For private repos, omit the `url` key entirely (do not set it to `null` — omit the key).

- [ ] **Step 4: Assemble and validate the file**

Write the full array to `data/projects.json`. Then validate it parses:

```bash
node -e "const d=require('./data/projects.json'); console.log(Array.isArray(d), d.length)"
```

Expected: `true` followed by the repo count. Also manually confirm: no entry with `private: true` has a `url` key (`node -e "require('./data/projects.json').forEach(p=>{if(p.private&&p.url)throw new Error(p.name)})"` should print nothing / exit 0).

- [ ] **Step 5: Commit**

```bash
git add data/projects.json
git commit -m "feat: add generated project data from GitHub repo analysis"
```

---

## Task 3: Static HTML skeleton (Hero, About, Experience, Skills, Contact, Projects container)

**Files:**
- Create: `index.html`

**Interfaces:**
- Produces: section IDs `#hero #about #experience #skills #projects #contact`; inside `#projects`, an empty container `<div id="projects-grid" class="projects-grid"></div>` and a filter bar `<div class="filter-bar">` with three `<button class="filter-btn" data-filter="all|public|private">` buttons (the `all` button additionally has class `active`). These exact IDs/classes are consumed by Task 4 (CSS selectors) and Task 5 (JS `querySelector` targets).
- Consumes: `assets/resume.pdf` (Task 1), nothing from Task 2 yet (Projects grid is populated at runtime by Task 5).

- [ ] **Step 1: Write `index.html`**

```html
<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kakumanu Rajesh Kumar — Senior Full Stack Developer</title>
<meta name="description" content="Senior Full Stack Developer (Node.js/NestJS/AWS) — 8+ years building high-availability backends and AI-native engineering workflows.">
<link rel="stylesheet" href="css/style.css">
</head>
<body>

<nav class="navbar">
  <span class="nav-brand">RK</span>
  <div class="nav-links">
    <a href="#about">About</a>
    <a href="#experience">Experience</a>
    <a href="#skills">Skills</a>
    <a href="#projects">Projects</a>
    <a href="#contact">Contact</a>
  </div>
</nav>

<header id="hero" class="hero">
  <p class="eyebrow">Hyderabad, India · Open to Remote</p>
  <h1>Kakumanu Rajesh Kumar</h1>
  <p class="role">Senior Full Stack Developer — Node.js / NestJS / AWS</p>
  <p class="hook">8+ years building high-availability backends and AI-native engineering workflows.</p>
  <div class="hero-actions">
    <a class="btn btn-primary" href="assets/resume.pdf" download>Download Resume</a>
    <a class="btn" href="https://www.linkedin.com/in/rajesh-kumar-kakumanu-88b9b361" target="_blank" rel="noopener">LinkedIn</a>
    <a class="btn" href="mailto:kakumanurajeshkumar@gmail.com">Email</a>
  </div>
</header>

<section id="about" class="section">
  <h2>About</h2>
  <p>
    Senior Software Engineer with 8+ years of experience specializing in high-availability
    backends (Node.js/NestJS, Python/FastAPI) and AWS cloud architectures. Expert in
    AI-Native Development, combining a deep foundation in Algorithms, Data Structures, and
    Deep Learning (RNNs) with next-gen engineering toolkits (LangChain, LangGraph, Claude Code,
    GitHub Copilot) to drive a 2x increase in engineering velocity. Driven by a hands-on,
    "learning-by-doing" methodology, consistently mastering emerging paradigms like the Model
    Context Protocol (MCP) through rapid prototyping. Proven track record of architecting
    secure, event-driven systems across healthcare, e-commerce, and automotive sectors. Adept
    at modernizing legacy infrastructures, leading cross-functional teams, and delivering
    scalable code within high-velocity Agile environments.
  </p>
</section>

<section id="experience" class="section">
  <h2>Experience</h2>
  <div class="timeline">

    <div class="timeline-item">
      <div class="timeline-header">
        <h3>TAO Digital Solutions — Senior Software Engineer</h3>
        <span class="dates">Oct 2023 – Present</span>
      </div>
      <p class="sub-role">AI Research &amp; Core Engineering (Internal R&amp;D) — Apr 2026 – Present</p>
      <ul>
        <li>Architecting stateful, multi-agent execution frameworks using LangGraph and LangChain to prototype autonomous task-routing, dynamic context-stitching, and self-correcting agent loops.</li>
      </ul>
      <p class="project-label">Neuron Performance Suite (NPS) — Client: CDK Global · Next.js, NestJS, TypeScript, PostgreSQL, AWS, GitHub Copilot (Agent Mode), MCP</p>
      <ul>
        <li>Pioneered Model Context Protocol (MCP) integration bridging AI agents with internal dev tools; implemented Figma MCP servers to automate Figma-to-Next.js component generation, cutting frontend scaffolding time by 50%.</li>
        <li>Used Playwright MCP to drive autonomous, self-healing end-to-end tests, improving test stability and coverage by 35%.</li>
        <li>Deployed GitHub Copilot (Agent Mode) for multi-step legacy refactors and Jest suite generation, accelerating feature velocity by 25%.</li>
        <li>Engineered a modular NestJS microservices architecture with AI-augmented prototyping, documenting service-to-service protocols 3x faster than traditional methods.</li>
        <li>Integrated AWS SNS/SES into a self-healing notification engine, eliminating manual distribution intervention entirely.</li>
      </ul>
      <p class="project-label">CareExpand (EMR Platform) — NestJS, TypeScript, MySQL, Sequelize ORM, Microservices</p>
      <ul>
        <li>Directed migration of legacy clinical systems to a NestJS microservices framework, reducing technical debt and increasing uptime.</li>
        <li>Architected relational schemas in MySQL for patient records under healthcare data standards.</li>
      </ul>
      <p class="project-label">twiist™ AID System — Client: Sequel · NestJS, Sequelize, AWS Lambda, SNS, SES, Cognito</p>
      <ul>
        <li>Built an orchestration portal linking Tidepool, Salesforce, and Mulesoft for insulin delivery device data.</li>
        <li>Built HIPAA-compliant portals for real-time glycemic data monitoring.</li>
      </ul>
    </div>

    <div class="timeline-item">
      <div class="timeline-header">
        <h3>Mobile Programming Pvt. Ltd. — Software Developer</h3>
        <span class="dates">Sept 2021 – Sept 2023</span>
      </div>
      <p class="project-label">Core E-commerce Microservices — Client: CaratLane · Node.js, Express, GraphQL, Redis, MySQL, AWS Redshift, Elasticsearch</p>
      <ul>
        <li>Tuned Elasticsearch for a high-traffic jewelry platform, improving product discovery speed and conversion.</li>
        <li>Built a GraphQL aggregation layer, reducing frontend over-fetching by 40%.</li>
        <li>Architected MySQL → AWS Redshift sync pipelines for real-time BI.</li>
      </ul>
      <p class="project-label">SAP Value Lifecycle Manager (VLM) — Client: SAP · Node.js, Express, SAP HANA DB</p>
      <ul>
        <li>Engineered HANA DB stored procedures automating value-realization calculations for global enterprise clients.</li>
      </ul>
      <p class="project-label">Smart Restaurant System (POS) — Node.js, Express, Parse Server, MongoDB</p>
      <ul>
        <li>Used Parse Server to rapidly deploy a secure, real-time POS system for high-volume restaurants.</li>
      </ul>
    </div>

    <div class="timeline-item">
      <div class="timeline-header">
        <h3>Consortium of Institutions of Higher Learning — Software Developer</h3>
        <span class="dates">July 2017 – Aug 2021</span>
      </div>
      <ul>
        <li>Developed web applications using Node.js and JavaScript to streamline institutional workflows.</li>
        <li>Implemented secure authentication and optimized database queries for student management systems.</li>
      </ul>
    </div>

    <div class="timeline-item">
      <div class="timeline-header">
        <h3>GoLive Gaming Solutions Pvt. Ltd. — Game Developer</h3>
        <span class="dates">Sep 2016 – Apr 2017</span>
      </div>
      <ul>
        <li>Developed interactive game logic and backend services using JavaScript and associated frameworks.</li>
      </ul>
    </div>

  </div>

  <h3 class="education-heading">Education</h3>
  <ul class="education-list">
    <li>Master of Technology (IT) — JNTUH, Hyderabad · 2015 – 2017</li>
    <li>Bachelor of Technology (Civil Engineering) — St. Mary's Group of Institutions · 2010 – 2014</li>
  </ul>
</section>

<section id="skills" class="section">
  <h2>Skills</h2>
  <div class="skills-grid">

    <div class="skills-group">
      <h3>AI &amp; Agentic Engineering</h3>
      <div class="chip-list">
        <span class="chip">Model Context Protocol (MCP)</span>
        <span class="chip">GitHub Copilot (Agent Mode)</span>
        <span class="chip">Claude Code</span>
        <span class="chip">LangChain</span>
        <span class="chip">LangGraph</span>
        <span class="chip">Agentic Workflows</span>
        <span class="chip">AI-Augmented Refactoring</span>
        <span class="chip">Prompt Engineering</span>
      </div>
    </div>

    <div class="skills-group">
      <h3>Backend &amp; Frameworks</h3>
      <div class="chip-list">
        <span class="chip">Node.js</span>
        <span class="chip">NestJS</span>
        <span class="chip">Express.js</span>
        <span class="chip">Python (FastAPI, Flask, Django)</span>
        <span class="chip">GraphQL</span>
        <span class="chip">Microservices</span>
        <span class="chip">Event-Driven Design</span>
      </div>
    </div>

    <div class="skills-group">
      <h3>AI/ML &amp; Deep Learning Stack</h3>
      <div class="chip-list">
        <span class="chip">NumPy</span>
        <span class="chip">Scikit-Learn</span>
        <span class="chip">Matplotlib / Seaborn</span>
        <span class="chip">PyTorch / TensorFlow</span>
        <span class="chip">Pandas</span>
        <span class="chip">RNN / LSTM / GRU</span>
        <span class="chip">Backpropagation Through Time</span>
        <span class="chip">Adam / RMSprop</span>
      </div>
    </div>

    <div class="skills-group">
      <h3>Frontend &amp; UI</h3>
      <div class="chip-list">
        <span class="chip">Next.js</span>
        <span class="chip">React.js</span>
        <span class="chip">TypeScript</span>
        <span class="chip">Tailwind CSS</span>
        <span class="chip">Redux / Context API</span>
        <span class="chip">Figma-to-Code (MCP)</span>
      </div>
    </div>

    <div class="skills-group">
      <h3>Cloud (AWS)</h3>
      <div class="chip-list">
        <span class="chip">Lambda</span>
        <span class="chip">Cognito</span>
        <span class="chip">SNS / SES</span>
        <span class="chip">Secrets Manager</span>
        <span class="chip">S3 / EC2</span>
        <span class="chip">API Gateway</span>
        <span class="chip">CodePipeline (CI/CD)</span>
      </div>
    </div>

    <div class="skills-group">
      <h3>Databases &amp; Caching</h3>
      <div class="chip-list">
        <span class="chip">PostgreSQL</span>
        <span class="chip">MySQL</span>
        <span class="chip">MongoDB</span>
        <span class="chip">DynamoDB</span>
        <span class="chip">SAP HANA</span>
        <span class="chip">Redis</span>
      </div>
    </div>

    <div class="skills-group">
      <h3>Testing &amp; QA</h3>
      <div class="chip-list">
        <span class="chip">Playwright MCP</span>
        <span class="chip">Jest</span>
        <span class="chip">Mocha</span>
        <span class="chip">PyTest</span>
        <span class="chip">Self-healing Locators</span>
      </div>
    </div>

    <div class="skills-group">
      <h3>APIs &amp; Security</h3>
      <div class="chip-list">
        <span class="chip">RESTful APIs</span>
        <span class="chip">Swagger / OpenAPI</span>
        <span class="chip">OAuth 2.0</span>
        <span class="chip">RBAC</span>
      </div>
    </div>

  </div>
</section>

<section id="projects" class="section">
  <h2>Projects</h2>
  <div class="filter-bar">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="public">Public</button>
    <button class="filter-btn" data-filter="private">Private</button>
  </div>
  <div id="projects-grid" class="projects-grid"></div>
  <p id="projects-fallback" class="projects-fallback" hidden>
    Projects failed to load — <a href="https://github.com/RajeshKumar11" target="_blank" rel="noopener">view on GitHub</a>.
  </p>
</section>

<section id="contact" class="section">
  <h2>Contact</h2>
  <div class="contact-list">
    <a href="mailto:kakumanurajeshkumar@gmail.com">kakumanurajeshkumar@gmail.com</a>
    <a href="tel:+919666699540">+91 96666 99540</a>
    <a href="https://www.linkedin.com/in/rajesh-kumar-kakumanu-88b9b361" target="_blank" rel="noopener">LinkedIn</a>
    <a href="assets/resume.pdf" download>Download Resume</a>
  </div>
</section>

<footer class="footer">
  <p>&copy; 2026 Kakumanu Rajesh Kumar.</p>
</footer>

<script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify**

Open `index.html` directly in a browser. Expect: all six sections visible in order, nav anchors scroll to the right section, resume/email/phone/LinkedIn links present (Projects grid will be empty until Task 5 — that's expected at this point).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add static HTML skeleton for all sections"
```

---

## Task 4: Dark theme CSS

**Files:**
- Create: `css/style.css`

**Interfaces:**
- Consumes: every ID/class produced by Task 3 (`.navbar`, `.hero`, `.section`, `.timeline-item`, `.chip`, `.filter-bar`, `.filter-btn`, `#projects-grid`, `.projects-fallback`, `.contact-list`, `.footer`).
- Produces: `.project-card` and `.stack-tag` class names, which Task 5's JS must use verbatim when generating project card markup.

- [ ] **Step 1: Write `css/style.css`**

```css
:root {
  --bg: #0b0f14;
  --bg-elevated: #121821;
  --border: #233041;
  --text: #e6edf3;
  --text-dim: #8b98a5;
  --accent: #58a6ff;
  --accent-dim: #1f3a52;
  --mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  line-height: 1.6;
}

a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

.navbar {
  position: sticky;
  top: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(11, 15, 20, 0.9);
  backdrop-filter: blur(6px);
  border-bottom: 1px solid var(--border);
  z-index: 10;
}

.nav-brand { font-family: var(--mono); font-weight: 700; color: var(--accent); }

.nav-links { display: flex; gap: 1.25rem; flex-wrap: wrap; }
.nav-links a { color: var(--text-dim); font-size: 0.9rem; }
.nav-links a:hover { color: var(--text); }

.hero {
  padding: 4rem 1.5rem 3rem;
  max-width: 760px;
  margin: 0 auto;
}

.eyebrow { font-family: var(--mono); color: var(--accent); font-size: 0.85rem; margin: 0 0 0.5rem; }
.hero h1 { font-size: 2.2rem; margin: 0 0 0.5rem; }
.hero .role { color: var(--text); font-size: 1.1rem; margin: 0 0 0.75rem; }
.hero .hook { color: var(--text-dim); margin: 0 0 1.5rem; }

.hero-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

.btn {
  display: inline-block;
  padding: 0.6rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 0.9rem;
}
.btn:hover { border-color: var(--accent); text-decoration: none; }
.btn-primary { background: var(--accent); color: #06111c; border-color: var(--accent); font-weight: 600; }

.section {
  max-width: 760px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
  border-top: 1px solid var(--border);
}
.section h2 {
  font-family: var(--mono);
  font-size: 1.4rem;
  color: var(--accent);
  margin: 0 0 1.5rem;
}

.timeline-item { margin-bottom: 2rem; }
.timeline-header { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; }
.timeline-header h3 { margin: 0; font-size: 1.05rem; }
.dates { font-family: var(--mono); color: var(--text-dim); font-size: 0.85rem; white-space: nowrap; }
.sub-role { color: var(--text-dim); font-style: italic; margin: 0.25rem 0 0.75rem; }
.project-label { font-weight: 600; margin: 1rem 0 0.25rem; }
.timeline-item ul { margin: 0.25rem 0 0.5rem 1.2rem; padding: 0; }
.timeline-item li { margin-bottom: 0.35rem; color: var(--text-dim); }

.education-heading { font-size: 1.1rem; margin-top: 2.5rem; }
.education-list { margin: 0.5rem 0 0 1.2rem; color: var(--text-dim); }

.skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
.skills-group h3 { font-size: 0.95rem; margin: 0 0 0.6rem; color: var(--text); }
.chip-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.chip {
  font-family: var(--mono);
  font-size: 0.75rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.filter-bar { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
.filter-btn {
  font-family: var(--mono);
  font-size: 0.85rem;
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
}
.filter-btn.active { background: var(--accent-dim); color: var(--text); border-color: var(--accent); }

.projects-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem; }

.project-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.project-card h3 { margin: 0; font-size: 1rem; }
.project-card p { margin: 0; color: var(--text-dim); font-size: 0.9rem; }
.project-card .stack-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
.stack-tag { font-family: var(--mono); font-size: 0.7rem; color: var(--accent); background: var(--accent-dim); padding: 0.2rem 0.5rem; border-radius: 4px; }
.private-badge { align-self: flex-start; font-family: var(--mono); font-size: 0.7rem; color: #f0883e; border: 1px solid #f0883e; padding: 0.15rem 0.5rem; border-radius: 4px; }

.projects-fallback { color: var(--text-dim); }

.contact-list { display: flex; flex-wrap: wrap; gap: 1.25rem; }

.footer { text-align: center; padding: 2rem 1.5rem; color: var(--text-dim); font-size: 0.85rem; }

@media (max-width: 600px) {
  .navbar { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .nav-links { gap: 0.9rem; }
  .hero h1 { font-size: 1.7rem; }
  .timeline-header { flex-direction: column; }
}
```

- [ ] **Step 2: Verify**

Reload `index.html` in a browser at desktop width (~1280px) and mobile width (~390px via devtools). Expect: dark background, no horizontal scroll at either width, nav wraps to a second line cleanly at 390px instead of overflowing.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add dark theme CSS"
```

---

## Task 5: Render projects from JSON (fetch, filter, error fallback)

**Files:**
- Create: `js/main.js`

**Interfaces:**
- Consumes: `data/projects.json` (schema from Task 2), DOM targets `#projects-grid`, `#projects-fallback`, `.filter-btn[data-filter]` (from Task 3), CSS classes `.project-card .stack-tags .stack-tag .private-badge` (from Task 4).
- Produces: nothing consumed by later tasks (this is the last code task).

- [ ] **Step 1: Write `js/main.js`**

```javascript
(function () {
  const grid = document.getElementById('projects-grid');
  const fallback = document.getElementById('projects-fallback');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let projects = [];
  let currentFilter = 'all';

  function cardHtml(project) {
    const stackTags = project.stack
      .map((tag) => `<span class="stack-tag">${escapeHtml(tag)}</span>`)
      .join('');

    const privateBadge = project.private
      ? '<span class="private-badge">Private</span>'
      : '';

    const titleHtml = (!project.private && project.url)
      ? `<h3><a href="${escapeAttr(project.url)}" target="_blank" rel="noopener">${escapeHtml(project.displayName)}</a></h3>`
      : `<h3>${escapeHtml(project.displayName)}</h3>`;

    const impactHtml = project.impact
      ? `<p class="impact">${escapeHtml(project.impact)}</p>`
      : '';

    return `
      <div class="project-card" data-visibility="${project.private ? 'private' : 'public'}">
        ${privateBadge}
        ${titleHtml}
        <p>${escapeHtml(project.description)}</p>
        ${impactHtml}
        <div class="stack-tags">${stackTags}</div>
      </div>
    `;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }

  function render() {
    const visible = projects.filter((p) => {
      if (currentFilter === 'all') return true;
      if (currentFilter === 'public') return !p.private;
      if (currentFilter === 'private') return p.private;
      return true;
    });
    grid.innerHTML = visible.map(cardHtml).join('');
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      render();
    });
  });

  fetch('data/projects.json')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load projects.json');
      return res.json();
    })
    .then((data) => {
      projects = data;
      render();
    })
    .catch(() => {
      fallback.hidden = false;
    });
})();
```

- [ ] **Step 2: Verify locally (must use a local server, not `file://`, to avoid the fetch-CORS fallback path)**

```bash
python -m http.server 8080
```

Open `http://localhost:8080/` in a browser. Expect: Projects section populates with cards from `data/projects.json`; private cards show the "Private" badge and have a plain `<h3>` with no link; public cards' titles link out to GitHub. Click Public/Private/All repeatedly — expect each click to correctly re-filter the full set (not progressively narrow).

- [ ] **Step 3: Verify the error fallback path**

Temporarily rename `data/projects.json` to `data/projects.json.bak`, reload the page. Expect: the "Projects failed to load — view on GitHub" message appears, no console-visible crash beyond the caught fetch error. Rename the file back to `data/projects.json` before continuing.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: render projects from JSON with filter and error fallback"
```

---

## Task 6: Full manual verification pass

**Files:** none (verification only).

- [ ] **Step 1: Serve locally and click every link**

With `python -m http.server 8080` still running, open `http://localhost:8080/` and click: Download Resume (both in hero and contact — expect `assets/resume.pdf` to download/open), Email (expect mail client prompt with `kakumanurajeshkumar@gmail.com`), Phone (expect `tel:+919666699540`), LinkedIn (expect new tab to the correct profile URL), each public project card's title link (expect the correct GitHub repo URL), and all five nav anchors (expect smooth-scroll to the matching section).

- [ ] **Step 2: Check responsive layout**

In browser devtools, check widths 1440px, 768px, and 390px. Expect at every width: no horizontal page scroll, nav fully usable (wrapped, not clipped), skills chips wrap instead of overflowing, project cards stack to a single column below ~600px.

- [ ] **Step 3: Confirm no private repo leakage**

Open devtools, inspect each `.project-card[data-visibility="private"]` element. Expect: no `<a>` tag anywhere inside it, no GitHub URL string appears in its HTML.

- [ ] **Step 4: Commit (only if Step 1-3 required fixes; otherwise skip — nothing to commit)**

```bash
git add -A
git commit -m "fix: address manual verification findings"
```

---

## Task 7: Deploy to GitHub Pages

**Files:** none (repo/hosting configuration only).

- [ ] **Step 1: Create the GitHub repo (if it doesn't already exist)**

```bash
gh repo create RajeshKumar11/RajeshKumar11.github.io --public --source=. --remote=origin
```

If it already exists, instead run: `git remote add origin https://github.com/RajeshKumar11/RajeshKumar11.github.io.git`

- [ ] **Step 2: Push**

```bash
git push -u origin main
```

- [ ] **Step 3: Confirm Pages is serving from the right source**

```bash
gh api repos/RajeshKumar11/RajeshKumar11.github.io/pages
```

Expect `"source": {"branch": "main", "path": "/"}`. If Pages isn't enabled yet, enable it:

```bash
gh api -X POST repos/RajeshKumar11/RajeshKumar11.github.io/pages -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 4: Verify the live site**

Wait ~1 minute, then open `https://RajeshKumar11.github.io/` in a browser. Expect the exact same page verified locally in Task 6, now live — check the Projects section loads `data/projects.json` over HTTPS (not blocked the way `file://` was).

---
