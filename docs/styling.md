# CSS and Styling Specification

This document defines the principles, constraints, and conventions governing CSS in this project. It aligns with `docs/templating.md` and is normative; any styling work that conflicts with it is incorrect unless the document is explicitly revised.

## 1. Purpose and Philosophy

CSS exists to improve readability, support a clear information hierarchy, adapt layouts to different devices, and respect user preferences and accessibility needs. It does not exist to express application logic, encode content semantics, replicate framework abstractions, or pursue visual novelty for its own sake. The visual design should feel authored, calm, and durable.

## 2. Semantic HTML First

CSS must be written to style semantic HTML elements rather than generic containers. When layout or styling requires repeated use of non-semantic wrappers, the HTML structure should be reconsidered before adding CSS complexity. If an element cannot be styled cleanly using semantic selectors, the markup is the first thing to fix.

## 3. Minimal Toolchain

CSS is written as plain CSS. Preprocessors, utility frameworks, CSS-in-JS, and build-time class generators are not part of the default toolchain. Modern native features are expected, including CSS variables, flexbox, grid, media queries, and `@supports` for progressive enhancement.

## 4. Scope and Organization

A logical file structure helps keep styles legible. The following layout is recommended but not required:

```
css/
  base.css        # element defaults, typography, reset
  layout.css      # global layout rules
  components.css  # reusable components
  themes.css      # color tokens and theme variants
```

Early in MVP, a single CSS file is acceptable if it keeps the system easier to understand.

CSS should rely on the natural cascade and avoid over-specific selectors. `!important` should not be used, IDs should not be used for styling, and deep selector chains should be avoided. When a rule requires high specificity to function, the underlying HTML structure is likely wrong.

## 5. Class Naming

Class names should describe role or meaning rather than appearance. Names like `.article-tags`, `.post-meta`, and `.nav-primary` are preferred over names like `.blue-text` or `.left-column`. A lightweight BEM-style pattern is acceptable when it improves clarity, but strict adherence is not required.

## 6. Typography and Readability

Typography is a primary concern and should be treated as a usability feature, not decoration. Default fonts should favor system fonts or modest, readable families rather than novelty choices. A calm typographic scale is expected, with a base body size around 16 to 18px equivalent and heading steps that do not jump aggressively.

Body text should target a line length around 60 to 75 characters, line height around 1.5 to 1.7, and generous vertical spacing between sections. Headings should follow a strict hierarchy without skipping levels, and they should be distinct without becoming banners. Code content must use a monospace font, preserve whitespace, and remain readable without excessive horizontal scrolling.

Inline emphasis should remain subtle and legible. Links must be identifiable without relying solely on colour, and underlines should not be removed unless replaced by an equally clear affordance.

## 7. Responsive Design

CSS must be written mobile-first, with base styles targeting small screens and enhancements applied via `min-width` queries. Layouts should adapt using flexbox, grid, and flow-based layout rather than floats or absolute positioning. Fixed widths and pixel-perfect assumptions should be avoided.

## 8. Accessibility

Styles must support accessibility by default. Colour contrast must be sufficient, focus states must be visible, and text must remain readable at 200 percent zoom. Avoid relying on colour alone for meaning. Focus outlines must not be removed unless replaced by an equally visible alternative.

## 9. Themes and User Preferences

All colours should be defined via CSS variables. Hard-coded colours outside variable definitions are discouraged. The system should respect user colour-scheme preferences using `prefers-color-scheme`, with manual theme switching optional and not required for MVP.

Example tokens:

```css
:root {
  --color-bg: #ffffff;
  --color-text: #111111;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f0f0f;
    --color-text: #f0f0f0;
  }
}
```

## 10. Progressive Enhancement

Styling must degrade gracefully. When advanced features are unsupported, layout should remain readable, content must remain accessible, and navigation must remain usable. Use `@supports` sparingly to layer enhancements rather than fork the design.

## 11. Performance Constraints

CSS must remain lightweight. Avoid large unused rule sets, overly general selectors, and runtime recalculation hacks. Minification is optional and can be introduced late in the pipeline once the stylesheet is stable.

## 12. Relationship to Templates

CSS should assume static HTML output and must not rely on JavaScript-driven state or dynamic class injection. Summary views defined in `docs/templating.md` provide a fixed HTML structure and stable class names that should be styled directly rather than recreated.

## 13. Reference Base CSS

The following base CSS is a reference implementation that reflects the principles above. It is not a mandate to copy verbatim.

```css
html {
  box-sizing: border-box;
  font-size: 100%;
}

*, *::before, *::after {
  box-sizing: inherit;
}

body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1.6;
  color: var(--color-text, #111);
  background: var(--color-bg, #fff);
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1.3;
  margin-top: 2rem;
  margin-bottom: 1rem;
}

p {
  margin: 1rem 0;
  max-width: 65ch;
}

a {
  color: inherit;
  text-decoration: underline;
}

a:focus {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

main {
  padding: 1rem;
  max-width: 72rem;
  margin: 0 auto;
}
```

## Status

This specification is locked. All styling decisions must conform to it unless explicitly revised.
