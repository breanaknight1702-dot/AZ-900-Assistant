# AZ-900 Drill Room

A static study site for the AZ-900 Azure Fundamentals exam. No build step, no
dependencies, no accounts, no tracking — four study modes driven by one data
file.

**Modes**

- **Cards** — two flashcard decks: *Traps & distinctions* (90 cards; the
  "they sound the same" cues the exam hides answers in) and *Full coverage*
  (137 cards; every definition, domain by domain). Filter by domain, shuffle,
  flip with tap/space, move with the arrow keys.
- **Match** — pair cues with answers, eight pairs a round, drawn from a pool
  of 48.
- **Scenarios** — 35 pick-the-service drills with instant verdicts and
  explanations.
- **Exam** — a timed mock drawing 15/30/45 random questions from a
  79-question bank, with a question palette, optional countdown, and a full
  per-question review (with a wrong-only filter) at the end.

Domain colour is used consistently everywhere: mint = Domain 1 (cloud
concepts), azure = Domain 2 (architecture & services), amber = Domain 3
(management & governance).

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure |
| `styles.css` | All styling |
| `data.js` | **All study content** — the only file you edit to add material |
| `app.js` | Behaviour (tabs, decks, match rounds, scenarios, exam engine) |

## Run it locally

Double-click `index.html`. That's it — everything works from the file system.
The web fonts load from Google Fonts when online; offline, the site falls back
to system fonts and everything still functions.

## Publish on GitHub Pages

1. Create a new repository on GitHub and upload these five files to its root
   (drag-and-drop in the web UI works fine).
2. Repository **Settings → Pages**.
3. Under *Build and deployment*, set **Source** to *Deploy from a branch*,
   pick `main` and `/ (root)`, and save.
4. After a minute or two the site is live at
   `https://<your-username>.github.io/<repo-name>/`.

**Visibility caveat:** on a free personal GitHub plan, Pages only publishes
from **public** repositories — the repo (including the full answer bank) will
be world-readable. Publishing from a private repo requires a paid plan
(Pro/Team/Enterprise), and even then the *published site* is still public;
genuinely private Pages needs GitHub Enterprise Cloud. If that matters, just
use the site locally instead — it needs no server.

## Editing the content

Everything lives in `data.js` as one object, `AZ_DATA`. Append to the arrays;
the UI picks up counts automatically.

```js
trapCards / fullCards : { c: "front text", a: "answer", w: "one-line why", d: 1|2|3 }
examBank / scenarios  : { q: "question", opts: ["A","B","C","D"], c: indexOfCorrect, w: "why", d: 1|2|3 }
matchPairs            : { c: "short cue", a: "short answer", d: 1|2|3 }
```

`d` is the exam domain (1 = concepts, 2 = architecture & services,
3 = management & governance) and drives the colour rail and tags.

## Design decisions

- **Nothing persists — by request.** There is no localStorage, no cookies, no
  analytics. Mock-exam results exist only until the tab closes or refreshes:
  screenshot the results screen if you want to compare attempts.
- **Content provenance.** Every card, question and scenario derives from the
  AZ-900 content reference PDF this site was built from, which is anchored to
  the official Microsoft skills outline (updated 14 Jan 2026). Where anything
  here disagrees with Microsoft Learn, Learn is correct.
- **Verify at booking.** The 700/1000 pass mark is a scaled score, not 70% of
  questions (confirmed by Microsoft). Question count, exam duration and cost
  are third-party figures and vary — confirm them when you book.
