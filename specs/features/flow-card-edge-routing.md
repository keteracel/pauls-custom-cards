# Flow Card Edge Routing — Product Spec

> Tracking issue: GitHub #15

## Problem & Goal
`_renderEdge()` in `flow-card.ts` draws every edge as an independent cubic Bezier directly between its `from`/`to` node centers, with no awareness of other edges. When a config has a redundant/parallel path — most commonly a direct shortcut edge alongside a multi-hop chain through collinear nodes (`A→B`, `B→C`, `A→C`) — the shortcut's curve coincides with the chain's path and paints over it, since edges are drawn in config order. The diagram then looks like it's missing a connection or has one broken pipe instead of three valid ones.

Goal: any set of edges in a valid config renders so every individual edge stays visually distinguishable, regardless of node layout.

## Users
Paul, defining heating/cooling system diagrams via the Flow Card's YAML config — specifically when a system has a bypass/shortcut path alongside its normal multi-hop flow (a legitimate, common topology, not a misconfiguration).

## Scope

### In scope
- Detecting when an edge's drawn path would visually coincide with another edge or a chain of edges.
- A routing/drawing strategy that separates such overlapping edges so each remains independently visible (distinct active/inactive state, distinct color).
- Generalizing beyond the specific 3-collinear-node example used to report the bug — arbitrary node positions/layouts.

### Out of scope
- General graph layout/crossing-minimization (e.g. avoiding an edge crossing visually near an unrelated third node it doesn't connect to, beyond the node-avoidance behavior described in the technical spec).
- New YAML config fields or editor UI for manually specifying routing hints.
- Changes to node shapes, types, or positioning logic.
- Fixing unrelated rendering issues in `flow-card.ts`.

## User Stories
1. As a user, I want to define a direct `A→C` edge alongside `A→B`/`B→C` edges so I can model a bypass without the lines becoming visually unreadable.
2. As a user, I want my existing configs with no redundant/overlapping edges to render exactly as they do today — this fix shouldn't change anything for the common case.

## Acceptance Criteria
- [ ] Given nodes A, B, C laid out in a row with edges `A→B`, `B→C`, `A→C`, all three pipes are visually distinguishable — no pipe's path is fully coincident with another's within the rendered SVG.
- [ ] Each pipe in such an overlapping set remains individually readable: its own active/inactive state (color, dash animation) is visible and not obscured by a neighboring pipe drawn on top of it.
- [ ] The existing testbed examples ("Simple", "Full system", the interactive section) — none of which have redundant edges — render visually unchanged after this fix.
- [ ] The fix is verified against at least one scenario beyond the 3-node case from the bug report (a 4-node chain `A→B→C→D` plus shortcut `A→D`).
- [ ] No new console errors/warnings when rendering configs with or without overlapping edges.

## Open Questions
Resolved in the technical spec:
- Routing strategy: perpendicular-offset ("bow away") rather than alternate-channel routing or general edge-bundling — see Technical Spec Architecture Overview for why.
- Overlap detection: geometric (distance-based), not structural path-enumeration — see Technical Spec Data Model / Risks.

Still open:
- Whether near-but-not-exact overlaps (edges visually very close but not perfectly collinear) need the same treatment as exact overlaps, or whether the chosen distance threshold already covers this well enough in practice. To be evaluated during/after implementation against real configs.
