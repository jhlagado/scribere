# Incremental Publishing System

## 1. Introduction

### 1.1 Purpose of the Document

This document defines the design, operating principles, and practical implementation of an incremental publishing system intended for long-lived, high-volume content archives.

The primary goal is to make publishing scalable, deterministic, and automatable, even when the total number of articles grows into the tens of thousands. Instead of rebuilding the entire site for every small change, the system rebuilds only what has actually been modified.

The document exists to support three audiences:

- Humans maintaining the publishing pipeline
- AI agents that create, update, and manage content
- Build systems that must produce consistent, verifiable output

The system is designed so that each of these actors can do its job without requiring global knowledge of the entire archive.

---

### 1.2 Importance of Incremental Publishing

Traditional static-site publishing pipelines rely on full rebuilds. This is workable when there are dozens of files, but becomes untenable when there are thousands or tens of thousands.

Full rebuilds cause:

- Long build times
- Increased failure risk
- High resource usage
- Poor suitability for AI-driven workflows

Incremental publishing replaces global recomputation with targeted updates. If only one article changes, only that article and the indexes it affects should be touched. Everything else remains unchanged.

This allows:

- Near-instant builds
- Low energy use
- Predictable CI behavior
- AI agents to operate safely and repeatedly without causing runaway work

---

## 2. System Overview

### 2.1 High-Level Architecture

The system is intentionally split into three cooperating components:

1. **AI Content Manager**
2. **Change Journal**
3. **Build Script**

Each has a clearly defined role.

The AI is responsible for *intent* (what should exist).  
The journal is responsible for *record* (what changed).  
The build system is responsible for *materialization* (what becomes public output).

No component is allowed to collapse into another.

---

### 2.2 Key Components

#### AI Content Manager

The AI Content Manager creates and edits articles. It is responsible for:

- Writing or modifying Markdown files
- Assigning metadata such as title, tags, and status
- Recording every change into the Change Journal

The AI never touches indexes, HTML, or output files directly.

It only mutates **content** and **journal entries**.

This constraint is critical to prevent accidental corruption of the publishing surface.

---

#### Change Journal

The Change Journal is an append-only structured log. Every content mutation produces a journal entry.

Each entry records:

- The article path
- The type of operation (create, update, unpublish, etc.)
- Whether metadata changed
- Whether status changed
- A timestamp or sequence number

The journal is the *only* input the build script uses to decide what needs to be rebuilt.

It acts as the contract between the AI and the build system.

---

#### Build Script

The build script:

- Reads the Change Journal
- Determines which articles and indexes are affected
- Rebuilds only those outputs
- Leaves everything else untouched

It does not infer changes by scanning the filesystem.  
It does not guess what might have changed.  
It obeys the journal.

This makes the build deterministic, reproducible, and testable.

---

## 3. Content Status Management

### 3.1 Managing Statuses

Each article has exactly one of the following states:

- **Draft**
- **Published**
- **Unpublished**

These states determine visibility and indexing behavior.

They do **not** determine whether the file exists on disk.

---

### 3.2 State Definitions

**Draft**

- Exists only for the author or AI
- Not visible on the public site
- Not included in any index
- May be freely edited without public impact

**Published**

- Fully visible
- Appears in tag indexes, archives, feeds, and navigation
- Treated as canonical public content

**Unpublished**

- Was once published
- Now removed from all public indexes
- Content remains on disk
- Permalink may resolve to a placeholder or blank page

Unpublished is not deletion — it is reversible withdrawal.

---

### 3.3 Impact of Status Changes

When an article changes status, only index membership changes — not the article itself.

Examples:

- Draft → Published  
  The article is inserted into all relevant indexes.

- Published → Unpublished  
  The article is removed from all indexes, but the file remains.

- Unpublished → Published  
  The article is re-inserted into indexes.

These transitions are journaled and processed incrementally.

---

### 3.4 Best Practices

- Avoid flipping states back and forth
- Treat status changes as meaningful publishing events
- Use Draft and Unpublished instead of deleting files

This keeps the archive stable and auditable.

---

## 4. Incremental Publishing Workflow

### 4.1 Create Operations

When a new article is created:

1. The AI writes the Markdown file
2. The AI writes a Change Journal entry of type `create`
3. The build script:
   - Renders the article
   - Inserts it into relevant indexes

No full scan is required.

---

### 4.2 Update Operations

Updates fall into two classes.

**Content-Only Updates**

- Body text changes
- No metadata change
- No index update required

Only the article's HTML is re-rendered.

**Metadata Updates**

- Title change
- Tag change
- Category change
- Status change

These require index adjustments.

The journal entry marks the change type so the build script knows whether index updates are required.

---

### 4.3 Unpublish Operations

Unpublishing produces a journal entry.

The build script:

- Removes the article from all indexes
- Writes a placeholder or empty output page

The Markdown file remains untouched.

---

### 4.4 Best Practices

- Separate content edits from metadata edits
- Avoid unnecessary metadata churn
- Let the journal drive all rebuilds

---

## 5. Index Management

### 5.1 Incremental Index Updates

Indexes (tag lists, archives, feeds) are maintained by applying journal entries.

For each journal entry:

- If a new article appears → append to indexes
- If metadata changes → move or reclassify in indexes
- If unpublished → remove from indexes

Indexes never require full recomputation unless a catastrophic error occurs.

---

### 5.2 Deletion vs Unpublishing

Deletion removes files and requires full reconciliation.

Unpublishing simply changes visibility.

Therefore:

- Unpublishing is preferred
- Deletion should be rare and manual

---

### 5.3 Consistency Guarantees

The journal ensures:

- No orphaned index entries
- No missing references
- No accidental duplicates

The build system never trusts the filesystem — only the journal.

---

## 6. Conclusion

### 6.1 Summary of Best Practices

A robust incremental publishing system is built on:

- A strict separation between content, change tracking, and output
- An append-only change journal
- Deterministic, journal-driven builds
- Careful management of publication status

This allows AI agents to safely manage enormous archives without destroying performance or correctness.

---

### 6.2 Future Considerations

As the archive grows, further enhancements may include:

- Journal compaction
- Parallel index updates
- Cached query results
- Background rebuild workers

None of these change the core principle:

> **Only rebuild what actually changed.**

Everything else is waste.