# System design garden (app)

The website for the learning garden. It reads notes from a separate knowledge
repo and turns them into linked pages, clickable diagrams, a knowledge graph,
and spaced-repetition flashcards.

## Run it

```bash
npm install
cp .env.example .env     # point KNOWLEDGE_PATH at the knowledge repo
npm run dev              # http://localhost:4321
```

Expected folder layout (default `KNOWLEDGE_PATH`):

```
workspace/
  knowbase-ui/                <- this repo
  knoldgebase-storage/         <- notes repo (notes/*.md)
```

Edit a note in the knowledge folder and the browser reloads on its own.

## Pages

| Page | What it does |
|---|---|
| `/` | Today's topic, stats, mini graph, all topics |
| `/notes/<slug>/` | Note with section chips, stacked side panels (desktop) or bottom sheet (phone) |
| `/graph/` | Full knowledge graph; tap a node to open it |
| `/review/` | Flashcards scheduled with FSRS (keys: space, 1–4) |
| `/notes.json` | Every note as JSON; panels, graph and review read this |

## How notes are written

```markdown
---
title: Load balancer
tags: [networking]
day: 2
summary: One-line summary shown on cards and panels.
status: stub            # optional; marks a short placeholder note
---

## Problem it solves
Link other notes with [[horizontal-scaling]] or [[sticky-sessions|custom text]].

```mermaid
flowchart LR
  LB[Load balancer] --> S1[Server]
  click LB "note:load-balancer"     # makes the diagram box open that note
```

## Flashcards
Question text :: Answer text
```

## Where things live

- `src/lib/knowledge.ts`: the adapter. The only file that knows the note format.
- `src/scripts/panels.ts`: stacked panels and mobile bottom sheet.
- `src/scripts/graph.ts`, `review.ts`, `diagrams.ts`, `ask.ts`: one feature each.
- `src/styles/global.css`: Notebook theme, light and dark.

## Chat

`PUBLIC_CHAT_MODE` is `off`, `local` (retriever + Ollama on your Mac), or
`cloud` (Vercel function + Groq). The retriever and cloud function come next.
