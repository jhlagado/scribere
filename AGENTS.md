# AGENTS.md - AI Operating Guidelines

This document defines **mandatory constraints and operating principles** for AI agents working in this repository. It is **normative**. If an AI-generated change conflicts with this document or referenced specs, the change is wrong.

AGENTS.md is the required entry point for any AI or automation before proposing changes. The AI is expected to read and internalize this document before proposing code, templates, queries, or structural changes.

---

## 1. Role Assumption

You are operating as an **expert collaborator**, not a junior developer.

Assumptions:

- You understand HTML, CSS, Markdown, static publishing, and build pipelines.
- You do not require frameworks to compensate for lack of knowledge.
- You are capable of reasoning from first principles.

Do **not** introduce tools, abstractions, or patterns "for safety" or "best practice" unless explicitly justified.

---

## 2. Canonical Specifications (Must Be Obeyed)

The following documents are authoritative and must not be contradicted:

- `docs/PRD.md`
- `docs/queries.md`
- `docs/articles-frontmatter.md`
- `docs/article-spec.md`
- `docs/queries-spec.md`
- `docs/queries-builtin.md`
- `docs/templating.md`
- `docs/templating-conventions.md`
- `docs/templating-javascript.md`
- `docs/styling.md`
- `docs/ci-pipeline.md`
- `docs/design-reference.md`

If you detect an ambiguity or tension between documents, do not resolve it silently. Surface the issue explicitly and ask for clarification.

---

## 3. Core Architectural Invariants

These invariants must never be eroded:

1. **Templates are pure HTML**

   - no logic
   - no DSLs
   - no metadata access

2. **Queries are the only selection mechanism**

   - declarative
   - named
   - centralized
   - JSON only

3. **Metadata is index and summary-only**

   - never used for full article rendering
   - templates never read metadata directly
   - summary views are built-in exceptions that render frontmatter

4. **Markdown defines visible content for full articles**

   - if it appears on the page, it must exist in the Markdown body

5. **Filesystem layout is canonical**

   ```
  content/YYYY/MM/DD/NN-slug/
   ```

   Where `NN` is a mandatory 2-digit ordinal prefix within the leaf directory. Any attempt to remove, flatten, or conflate this prefix is an architectural violation.
   Scribere ships with an `example/` instance. The engine uses `/content/` when it exists and falls back to `/example/` otherwise.

If a proposed change weakens any of these, it is invalid.

---

## 4. Tooling Discipline

Default stance:

- prefer small, explicit scripts
- prefer boring, inspectable code
- avoid frameworks and heavy dependencies

Allowed dependencies:

- Markdown parsing
- HTML parsing (if truly required)
- minification or optimization tools (optional, late-stage)

Forbidden by default:

- React, Vue, Svelte, etc.
- template engines (Handlebars, Mustache, Jinja, etc.)
- build systems that hide control flow
- client-side rendering

If you believe a dependency is justified, explain why the problem is non-trivial, explain why a custom solution would be worse, and wait for explicit approval.

---

## 5. Query and Templating Discipline

- Templates **never** decide what content exists.
- Queries **never** decide how content looks.
- Rendering is **mechanical stamping**, not interpretation.

Do not:

- add conditional logic to templates
- invent new query operators
- add implicit behaviors
- infer author intent

If something cannot be expressed cleanly, add a new query, add a new template, or ask before extending the system.

---

## 6. Progressive Enhancement Boundary

JavaScript is **optional and additive**.

You must not:

- move rendering to runtime
- perform queries in the browser
- hide content behind JavaScript
- convert the site into an application

If JavaScript fails to load, the site must remain readable, navigable, and complete.

---

## 7. Change Protocol

When proposing changes:

1. State which spec(s) the change touches.
2. State whether the change is additive, clarifying, or breaking.
3. Identify any invariant being stressed.
4. Stop and ask if the change alters philosophy.

Silent reinterpretation is not acceptable.
If behavior matters, specify it explicitly. Do not introduce smart defaults or silent guessing.

---

### 7.1 Environment and Dependency Sanity

You must **never** install new dependencies, create `package.json` entries, or mutate the project environment (e.g., adding `node_modules`) without explicit, written permission for the specific tool. 

Being "proactive" does not extend to environmental mutation. If a task requires a new library:
1. Propose it in an Implementation Plan.
2. Explain the trade-offs.
3. Wait for the user to say "Approve" or "Install".

Silent environmental changes are considered an architectural breach.

---

## 7.2 Guidance Discovery (Mandatory)

Before proposing changes, scan for existing guidance documents beyond this file, including any project docs that define AI behavior, operations, or workflow. If a relevant document exists, update it instead of creating a new one. Do not add new guidance documents without explicit approval.

This repo also includes AI skills under `docs/skills/`. When a request matches those skills, read the relevant `SKILL.md` and follow it.

---

## 8. Preferred AI Behavior

Do:

- point out inconsistencies
- flag accidental complexity
- challenge overengineering
- preserve human legibility

Do not:

- optimize prematurely
- generalize abstractly
- "future-proof" speculatively
- introduce hidden control flow

---

## 9. Documentation Style and Prose Expectations

Documentation quality is part of the product and must be treated as a first-class deliverable. All documentation produced for this project must prioritize **human-oriented prose** over AI-optimized brevity.

### 9.1 Primary Audience

Documentation is written first and foremost for:

- the future human author
- technically literate readers
- long-term maintainers
- historically curious readers

AI agents are expected to adapt to human documentation, not the reverse.

### 9.2 Prose Over Bullets (Default)

Default documentation style must be paragraph-driven, explanatory, and readable top-to-bottom without scanning.

Bullet points are allowed only when they genuinely improve clarity, such as enumerating fixed rules, listing invariants, or presenting mutually exclusive options.

Bullet lists must not replace explanation. If a bullet list appears without surrounding prose that explains why the items exist, it is incomplete.

### 9.3 Explicitly Discouraged Styles

Avoid terse "AI cheat-sheet" formatting, dense unmotivated lists, keyword dumps, abstract summaries without context, or documentation that reads like prompt instructions.

Documentation that optimizes for machine parsing at the expense of human understanding is considered a design failure.

### 9.4 Acceptable Level of Redundancy

Some redundancy is intentional and desirable. Re-explaining core ideas in different documents or sections is acceptable when it reinforces invariants, aids recall, and supports standalone reading.

Do not aggressively deduplicate prose if it harms clarity.

### 9.5 Tone and Voice

Preferred tone is calm, precise, explanatory, and confident but not verbose. Avoid marketing language, instructional condescension, or overly compressed "spec-speak."

The goal is for a technically competent human to read the documentation months or years later and immediately regain full context.

### 9.6 Final Check

Before producing or modifying documentation, ask:

> "Would a careful human reader understand not just what this does, but why it exists?"

If the answer is no, expand the prose.

### 9.7 Writing Style Compliance

Any prose generation must comply with [authoring.md](docs/authoring.md).

---

## 10. Final Rule

If you find yourself thinking:

> "This would be easier if we just..."

Stop.

Ease is not the goal. Clarity, durability, and correctness are.

---

## Status

This document is **locked**. Any AI-generated contribution that violates it should be rejected, even if it "works".
