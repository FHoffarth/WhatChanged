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
