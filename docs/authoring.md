# Authoring and Prose Specification

This document defines the **voice and style** for all prose generated or edited by AI agents in this project. It is mandated by `AGENTS.md`.

The goal is to preserve a **human-first, authored "soul"** across the technical diary, specifications, and eventual blog posts.

---

## 1. The Core Directive: Kill the Machine Voice

AI-generated text often defaults to a "corporate-optimistic" tone characterized by vague metaphors and repetitive vocabulary. This is strictly forbidden. 

We prioritise:
- **Directness** over generalization.
- **Concrete facts** over abstract summaries.
- **Human experience** over "AI expertise."
- **Active voice** and specific verbs.

---

## 2. Banned Clichés (The Blacklist)

If any of the following words or phrases appear in your output without an extremely narrow technical justification (e.g., "unlocking a mutex"), the prose is incorrect.

| Category | Forbidden AI-isms |
| :--- | :--- |
| **Pivotal/Transformative** | pivotal, game-changer, unlock, unleash, revolutionizing, landscape |
| **Exploring/Navigating** | delve, dive into, navigate the complexities, embark on a journey |
| **Optimisation/Efficiency** | streamline, synergize, maximize, leverage (use "use"), tap into |
| **Vague Value** | comprehensive, robust, bespoke, seamless transition, vibrant |
| **Summary Crutches** | In today's fast-paced world, in conclusion (unless in a spec), looking ahead |

---

## 2.1 Additional Lazy Writing Ticks

These patterns flatten voice and should be avoided in prose. They are not “technical errors”, but they quickly make a piece read like a generic explainer.

Avoid scene-setting clichés such as “In the age of…”, “In an age of…”, or “In the era of…”. Fold the context into the sentence without that prefabricated frame.

Avoid empty finale phrases like “Ultimately”, “In conclusion”, or “At the end of the day”. End on a concrete point, a specific decision, or a personal observation instead.

Avoid buzzwords that imply significance without stating it. Terms like “empower”, “revolutionary”, and “game-changer” remove detail and replace it with bluster.

---

## 3. Structural Rules: Prose First

### 3.1 Narrative Flow
Prose should read linearly. Avoid jumping immediately to bullet points. Explain **why** a decision was made before listing **what** the decision was. 

### 3.2 The First-Person Anchor
The blog is a personal technical diary. When drafting blog posts or diary entries, use the first person ("I decided," "I observed") to ground the text in the author's narrative. 

### 3.3 Sentence Variety
Avoid the repetitive [Subject] [Verb] [Object] cadence common in LLM output. Vary sentence length and structure to create a natural human rhythm.

### 3.4 Anti-Contrast Pair Rule
Avoid sentence pairs that define an idea by negation followed by correction. The pattern reads like a staged reveal and tends to flatten thought. State what something is, then deepen it with texture or a concrete verb.

Patterns to watch:

> X is not A. It is B.
> This is not about A. It is about B.
> These are not X. They are Y.

Bad:

> The writing is not decoration. It is how the system learns.

Better:

> The writing teaches the system what it can become.

Bad:

> This project is not about finished ideas. It is about unfinished ones.

Better:

> This project lives in the middle of ideas while they are still taking shape.

### 3.5 Summary Length and Clarity

Frontmatter summaries must be at least two sentences. Aim for two or three short, factual sentences that state what the piece covers and why it matters. Avoid fragments, slogans, or single-line summaries.

### 3.6 Audience, Intent, and Two-Level Reading

Every article must be written for a specific reader, not for “the internet”. That reader is a concrete person with a goal, a level of knowledge, and a reason to care. Before drafting, decide who you are writing for and what you want them to take away. This is non-negotiable because clarity comes from aiming at someone, not from polishing sentences in the abstract.

Each article must operate on at least two levels at once. One level conveys information: facts, mechanics, or a decision. The other level conveys intent: the author’s purpose, stance, or reason for caring. The reader should be able to learn something concrete and also feel why the piece exists. This is the distinction practitioners of persuasive writing expect: the piece is not only accurate, it is motivated.

If the intent is unclear, the article fails. The reader should be able to answer, in their own words, why the author wrote it and what the author wants the reader to believe, do, or notice.

To keep that intent visible, keep these questions in mind while drafting:

1. Who is the reader, and what do they already know?
2. What question or tension does the article resolve?
3. What should the reader understand or do by the end?
4. What attitude or value does the author want to reinforce?

Do not hide the intent behind scene-setting or “not this, but that” framing. State the point, then deepen it with concrete detail and a clear sense of purpose.

---

## 4. Technical Precision

### 4.1 No "Buffer" Adjectives
Do not call a system "powerful," "elegant," or "sophisticated." If the system is good, let the technical description prove it.

### 4.2 Honesty over Polish 
If a technical step was frustrating, messy, or a hack, document it as such. The "soul" of the diary is the truth of the process, not a sanitized version of it.

---

## 5. Self-Checklist for Agents

Before emitting prose, run this mental audit:
1. Did I use any words from the Blacklist?
2. Did I use "delve"? (Delete it.)
3. Are there more than three bulleted lists in a row without a paragraph between them?
4. Does this sound like a human narrating their day, or a robot explaining a concept?
5. Is the main point buried under "In conclusion..."? (Move it to the top.)
6. Can I name the target reader and the reason this piece exists?
7. Does the article deliver both information and intent?

---

## Status

This specification is **normative**. Prose that violates these rules is considered a technical failure on par with a broken build.
