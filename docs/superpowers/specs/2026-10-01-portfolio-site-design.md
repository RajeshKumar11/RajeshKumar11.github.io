# Portfolio / GitHub Profile Site — Design Spec

## Purpose

Personal portfolio site for Kakumanu Rajesh Kumar (GitHub: `RajeshKumar11`), built to
support remote-job search by presenting an authentic, evidence-backed profile:
resume summary, work history, skills, and an honest accounting of real projects
worked on over the years — both public and private GitHub repos. First version
ships now; improvements come in later iterations.

## Constraints / decisions already made

- Repo IS the deploy target: `RajeshKumar11.github.io`, served by GitHub Pages
  from the `main` branch root. This folder is that repo's root.
- Plain static HTML/CSS/vanilla JS. No build step, no framework, no bundler.
- Dark theme, code/terminal-flavored visual tone (monospace accents for
  headings/tags), responsive down to mobile widths.
- Project data (title/description/stack/impact) is generated once by Claude
  analyzing repos via `gh` CLI (already authenticated, `repo` scope — covers
  public + private), not fetched live from the visitor's browser. No GitHub
  token ships to the client, no live API calls, no rate-limit risk for
  visitors.
- Forks excluded. Archived/irrelevant repos judged case-by-case during
  analysis.
- Private repos: metadata + Claude's analysis only. No code snippets, no
  links back to the private repo, no indication of which private org/client
  owns it beyond what the user's own repo description already says. Marked
  with a "Private" badge instead of a GitHub link.
- Resume PDF already placed in repo root: `Rajesh Kumar K_Node js_(2026-May).pdf`,
  linked as a download button.
- No automated refresh of project data — re-running the generation step
  later is a manual, deliberate action (matches "deploy now, improve later").

## Content inputs (already collected, final)

- **Name / role**: Kakumanu Rajesh Kumar, Senior Full Stack Developer
  (Node.js/NestJS/AWS), 8 years experience.
- **Location**: Hyderabad, India — open to Remote.
- **Contact**: kakumanurajeshkumar@gmail.com, +91 96666 99540,
  linkedin.com/in/rajesh-kumar-kakumanu-88b9b361.
- **Summary**: provided resume summary paragraph (AI-native backend/cloud
  engineer, Node.js/NestJS/Python/FastAPI, AWS, AI-agentic tooling, deep
  learning foundations, healthcare/e-commerce/automotive domains).
- **Skills**: provided technical proficiencies list, grouped by category
  (AI & Agentic Engineering, Backend & Frameworks, Mathematical/Deep Learning
  Stack, Core AI/ML Algorithms, Core Data Structures & Complexity, Automated
  Testing & QA, Frontend & UI, Cloud/AWS, Databases & Caching, APIs & Security).
- **Experience timeline** (newest first):
  1. TAO Digital Solutions — Senior Software Engineer, Oct 2023–Present
     (incl. AI Research & Core Engineering sub-role, Apr 2026–Present), with
     project bullets: Neuron Performance Suite (CDK Global), CareExpand (EMR),
     twiist™ AID System (Sequel).
  2. Mobile Programming Pvt. Ltd. — Software Developer, Sept 2021–Sept 2023,
     with project bullets: CaratLane e-commerce microservices, SAP VLM,
     Smart Restaurant POS.
  3. Consortium of Institutions of Higher Learning — Software Developer,
     July 2017–Aug 2021.
  4. GoLive Gaming Solutions Pvt. Ltd. — Game Developer, Sep 2016–Apr 2017.
  5. Education: M.Tech (IT), JNTUH 2015–2017; B.Tech (Civil), St. Mary's
     Group of Institutions 2010–2014.
- **Projects**: derived by Claude from GitHub repos (see Data Pipeline),
  non-fork, both public and private.

## Architecture

```
RajeshKumar11.github.io/            (repo root = Pages root)
├── index.html                      (single page, all sections)
├── css/
│   └── style.css                   (dark theme, responsive)
├── js/
│   └── main.js                     (renders projects.json into DOM, nav/filter behavior)
├── data/
│   └── projects.json               (generated once by Claude via gh CLI analysis)
├── assets/
│   └── Rajesh Kumar K_Node js_(2026-May).pdf   (resume, already present)
└── docs/superpowers/specs/...      (this spec)
```

No server, no build. GitHub Pages serves the repo root as-is on push to `main`.

## Data pipeline (one-time, done by Claude before first deploy)

1. `gh repo list RajeshKumar11 --limit 200 --json name,description,isPrivate,isFork,primaryLanguage,languages,updatedAt,createdAt,repositoryTopics` —
   enumerate all repos, filter out `isFork == true`.
2. For each remaining repo: pull README via `gh api repos/RajeshKumar11/<repo>/readme`
   (or `gh repo view <repo> --json description` as fallback), inspect languages/topics
   already returned above. No full clone needed; README + metadata is enough
   signal for description/stack/impact in the vast majority of cases. If a
   repo's README is missing/unhelpful, fall back to name + language + topics
   only (per user: "extract as much detail as possible without cloning"; full
   clone is a later fallback if this proves insufficient, not part of v1).
3. Claude writes one entry per kept repo into `data/projects.json`:
   ```json
   {
     "name": "repo-name",
     "displayName": "Human Readable Title",
     "description": "1-2 sentence description written by Claude from README/metadata",
     "stack": ["Node.js", "AWS Lambda", "..."],
     "impact": "short impact/role line, or omitted if not inferable",
     "private": false,
     "url": "https://github.com/RajeshKumar11/repo-name",
     "updatedAt": "2026-..."
   }
   ```
   For `private: true` entries, `url` is omitted entirely.
4. File is committed as static data; `js/main.js` fetches it client-side
   (same-origin, no auth) and renders cards.

## Page structure (single page, anchor nav: About / Experience / Skills / Projects / Contact)

- **Hero** — name, title, location, one-line hook, resume download button,
  LinkedIn/email/phone icons.
- **About** — summary paragraph.
- **Experience** — vertical timeline, newest first, company/title/dates header
  per entry, project sub-bullets where provided.
- **Skills** — grouped chip lists by category from the proficiencies list.
- **Projects** — card grid rendered from `data/projects.json`; All/Public/Private
  filter toggle (client-side filter on the `private` field, no refetch).
- **Contact** — email (mailto), phone (tel, shown as text per artifact-link
  caveats — not applicable here since this is a real static site, plain
  `tel:`/`mailto:` links are fine), LinkedIn link, resume download repeated.
- Fixed/sticky top nav with anchor links; dark theme throughout; monospace
  accents for section headers, skill tags, project stack tags.

## Error handling

- If `data/projects.json` fails to load (e.g., opened via `file://` without a
  local server — `fetch` of local JSON can be blocked by CORS in some
  browsers), show a static "Projects failed to load — view on GitHub" fallback
  message with a link to the GitHub profile, rather than a blank section.
- No other dynamic failure modes exist (no forms, no external API calls at
  runtime).

## Testing / verification

- Manual only, matching the plain-static scope:
  - Serve locally (`python -m http.server` or VS Code Live Server) and check
    `fetch('data/projects.json')` resolves (avoids the `file://` CORS fallback
    path during dev).
  - Visually check all sections render at desktop width and ~390px mobile
    width (no horizontal scroll, nav usable).
  - Click-check all links: resume download, mailto, tel, LinkedIn, each
    project's GitHub link (public only).
  - Confirm private project cards show no GitHub link and the badge renders.
- No automated test suite — not warranted for a static brochure site.

## Deployment

1. Commit all files to `main`.
2. Create GitHub repo `RajeshKumar11.github.io` (if not already existing) and
   push.
3. In repo Settings → Pages, confirm source = `main` branch, `/ (root)` —
   usually auto-detected for the `<username>.github.io` repo naming
   convention.
4. Site live at `https://RajeshKumar11.github.io/`.

## Explicitly out of scope for v1 (future improvements)

- Automated/periodic refresh of `projects.json`.
- Full repo cloning for deeper code analysis.
- Any backend, build step, or framework migration.
- Blog, dark/light theme toggle, analytics, contact form.
