# V0.1 implementation plan

Goal: implement the supplied WhatChanged? V0.1 specification and verify the public GitHub source repository. No deployment.

Architecture: browser-only JavaScript UI; pure conservative normalization, bounded structural/token diff, and evidence-backed value scanning; bundled PDF.js worker. Vite builds local assets. Node tests cover pure logic; Playwright runs a real Chromium browser.

1. Write behavioral tests for normalization, structural pairing, value evidence, ambiguity and limits. Run them before implementing `src/core.js` and `src/limits.js`.
2. Implement bounded line LCS, mutual unique similarity matching and token LCS. Treat each line (including blank lines) as a structural block. Scan complete corresponding lines with unchanged non-value templates and shared units. Test all requested examples.
3. Implement `src/pdf.js` with a local worker, page order, no OCR, a byte limit before reading, page/text limits, extraction cancellation and honest errors.
4. Implement semantic German inputs, safe text-node rendering, factual summary, side-by-side diff, navigation and keyboard behavior in `src/main.js`, `index.html` and `src/style.css`.
5. Add browser tests covering actual inputs, PDF fixtures, errors, responsive layout, focus, HTML safety, requests and storage. Run tests and build; fix evidenced defects only.
6. Write README and MIT license. Inspect staged files, run diff whitespace check, commit completed source. Recheck absence of target repository, create empty public repository, push main, independently verify metadata, tree and commit through GitHub API. Stop.

Limits: each side 50,000 UTF-16 code units, 500 lines, 1,000 code units per line; 2,000,000 DP cells per comparison; similarity matching only within hunks of at most 10 old and 10 new lines. PDFs: 10 MiB, 50 pages, 20,000 extracted items per page, 20 seconds. Never truncate content to fit.
