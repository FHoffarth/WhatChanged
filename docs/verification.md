# V0.1 verification — 2026-09-08

- Environment: Windows, Node 24.18.0, installed Google Chrome in headless mode through Playwright 1.63.0.
- `npm test`: **46 passed, 0 failed**, including normalization, all required value examples/evidence, structural/token diff, ambiguous/repeated/moved text, input limits, comparison work budget and 100 deterministic reconstruction cases.
- `npm run build`: **exit 0**, Vite 8.2.2, 11 modules transformed. Final output: HTML 4.39 kB; CSS 7.33 kB; application/PDF.js JS 443.58 kB; PDF.js worker 1,265.41 kB, plus locally copied PDF.js support assets. Build output is ignored by Git.
- `npm run test:browser`: **11 passed, 0 failed (31.2 s)** against the production build. These are real browser tests, not jsdom.
- `npm run dev -- --port 48176 --strictPort`: local server started; actual Chrome text comparison and stylesheet verified, no console/page errors. Development uses a fresh style nonce for Vite; production retains the stricter policy.

Browser coverage: old/new text entry; word/token marks; currency, duration and date evidence; block addition/removal; previous/next and J/K; editing invalidates stale results and keeps input focus; visible focus outline; two locally generated multi-page text PDFs; page ordering and extraction notice; invalid, empty/textless, non-PDF, oversized and over-page-limit files; PDF selection/drop, batch rejection, clear and in-flight cancellation; HTML/script/image input stays text; 1280, 375 and 320 px with 900-character unbroken words and 200% root text size, no page overflow; console/page errors, network requests, cookies, local/session storage, IndexedDB and service-worker registrations checked during successful text/PDF flows.

Desktop and 320 px production screenshots were also visually inspected. Screenshots and diagnostic scripts are not committed.

Evidence gaps: only desktop Chrome was run, with emulated narrow viewports; no physical mobile devices, Safari, Firefox or screen reader. Enlarged text used a 200% root font, not OS scaling or native browser zoom. Text entry used browser automation, not the operating-system clipboard. PDF fixtures cover straightforward text and blank PDFs; no image-only scan, encrypted PDF, complex real-world column/font corpus or timed 20-second/item-limit exhaustion fixture was exercised. Source code implements password rejection, time and item limits; those paths are not claimed as browser-tested. Network/storage checks cover the exercised flows, not every possible PDF. No visual PDF equivalence is claimed.

No website deployment or publication was performed. The authorized publication is source code in the GitHub repository only.

## V0.1.1 verification — 2026-09-09

Baseline verified through GitHub before changes: `main` was `ff483efc26c5873ae827d7bef37a2565e8e69d1d`. Comparison, normalization, limits and PDF extraction source remain unchanged.

- `npm test`: **61 passed, 0 failed** (46 existing core tests + 15 export tests). Markdown/Text/CSV cover existing value and block evidence, exclusion of unchanged rows, stable ordering/IDs, missing optional fields, Unicode, multiline contents, CSV column order/quoting/commas/semicolons/newlines, protected Markdown fences and deterministic filenames. Export uses supplied results without mutation or diff recomputation.
- `npm run build`: **exit 0**, Vite 8.2.2, 12 modules, **1.44 s**. HTML 4.77 kB; CSS 7.73 kB; application/PDF.js JS 447.06 kB; PDF.js worker 1,265.41 kB plus existing local assets.
- `npm run test:browser`: **19 passed, 0 failed (34.8 s)** in real headless Google Chrome: 11 existing regression checks + 8 export checks.
- Browser downloads of **all three formats were actually captured and read from disk as UTF-8**. Assertions inspect file contents, categories, old/new values, Unicode, multiline source context, IDs, exclusion of unchanged context, and exact date-based filenames. Browser checks cover disabled state before comparison/for identical inputs, enablement after changes, immediate invalidation after editing/clearing, keyboard Enter/Tab/Escape and visible focus, no page/console errors, no document-content network traffic or storage, and eventual revocation of every download Object URL. Export menu bounds and page overflow pass at 375 and 320 px.
- The local test server starts the installed Vite executable directly; an initial `npm exec` startup timed out. Final browser checks ran successfully using the direct local command. A detected 1.6 px mobile menu overhang was fixed before the final run.
- `git diff --check`: passed. No dependencies, network permissions, hosting or workflows added.

Evidence gaps: tested Chrome on Windows with emulated viewport widths, not physical mobile, Safari, Firefox, a screen reader or a native Save As dialog. Browser multiline assertions use actual multi-line document input and multi-line evidence context; the unchanged core model represents text blocks as single lines. Synthetic multiline block serialization is additionally unit-tested. No interpretation, ranking, deployment, release or tag is part of V0.1.1.

## CSV formula-injection remediation — 2026-09-09

Starting repository truth: `origin` was `https://github.com/FHoffarth/WhatChanged.git`; branch `main`; local `HEAD`, local `origin/main`, and GitHub's `main` were all `98cb4b554e925f0939fd7b8d316ee43de37278e5`; the working tree was clean.

Defect reproduction before implementation: two new unit tests failed because CSV emitted formula-like content literally, for example `"=1+1"`. The real Chrome download regression also failed on the exact unprotected CSV bytes while the UI retained the source text.

Remediation policy: for every CSV data field, prefix the entire field with one literal apostrophe when the field start or any embedded line starts with `=`, `+`, `-`, or `@` after zero or more ASCII characters U+0000 through U+0020. This intentionally includes ordinary negative numbers. The original Unicode and multiline content remains otherwise unchanged, then existing quote doubling and CSV quoting run normally. Non-whitespace Unicode before a formula marker is the deliberate boundary and does not trigger neutralization. Markdown and TXT are unchanged. This specifies generated bytes, not universal spreadsheet behavior.

Final validation: `npm ci` installed 21 packages and audited 22 with 0 vulnerabilities; `npm test` passed 64/64 tests; `npm run build` completed in 1.19 s with 12 modules transformed; `npm run test:browser` passed 20/20 tests in 35.1 s in installed headless Google Chrome; `npm audit --audit-level=high` found 0 vulnerabilities; `git diff --check` passed. A source search across application, HTML, scripts and configuration found no `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, browser storage, cookie, service-worker, remote-font or external-script references. The first `npm ci` attempt was blocked by a native Vite/Rolldown file held by the running local preview; after stopping that workspace server, the required clean installation passed.

Adversarial coverage verifies exact CSV bytes for formula markers after spaces, tab, carriage return, newline and embedded line breaks; dangerous old/new values, multiline context and change IDs; embedded quotes, comma, semicolon, CRLF, Unicode before and after a marker, and ordinary unchanged text. The deliberate boundary is a non-whitespace Unicode character before the marker, such as `Ä=1`, which remains literal because the marker is not at a spreadsheet-formula position under this policy.
