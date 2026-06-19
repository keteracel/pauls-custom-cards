# Flow Card Edge Routing — Technical Spec

> Product spec: specs/features/flow-card-edge-routing.md
> Tracking issue: GitHub #15

## Architecture Overview
`_renderEdge()` (`src/cards/flow-card/flow-card.ts:259-281`) currently computes one cubic Bezier per edge, independent of every other edge:

```
M (cx1,cy1) C (mx,cy1) (mx,cy2) (cx2,cy2)     // mx = midpoint x
```

The fix adds a routing pass *before* rendering that computes a perpendicular offset for each edge's control points, driven by two independent, purely geometric repulsion checks run once per render (not a graph/path-enumeration algorithm):

1. **Node-avoidance** — does edge `e`'s straight line (endpoint to endpoint) pass within a threshold distance of some *other* node `N` (`N` is not `e.from` or `e.to`)? If so, bow `e`'s curve away from `N`.
2. **Duplicate-pair fan-out** — are there other edges with the exact same `{from, to}` (in either direction)? If so, fan all edges in that group apart symmetrically instead of drawing them coincident.

This directly fixes the reported bug: in the `A→B`, `B→C`, `A→C` case, node-avoidance detects that `A→C`'s straight line passes through node `B`'s position and bows it away — which also necessarily separates it from the `A→B`/`B→C` segments, since those run along the same line near `B`. It generalizes to the 4-node chain case (`A→D` bows away from both `B` and `C`) without needing to enumerate the `A→B→C→D` path explicitly.

Both checks are O(E × N) and O(E²) respectively per render — fine at the node/edge counts this card targets (tens, not thousands).

```
render()
  └─ computeEdgeOffsets(nodes, edges)   // new: pure function, no DOM/state
       ├─ for each edge: nearby-node bow offset
       └─ for each duplicate-pair group: fan-out offset
  └─ _renderEdge(edge, cellSize, offset)   // existing, now takes a precomputed offset
```

## Data Model
No changes to `FlowNode`/`FlowEdge`/`FlowCardConfig` (types.ts) — this is purely a rendering-time computation, not a config concern. No new config fields per the product spec's "out of scope."

New internal (non-exported) type, computed per render and not part of public config:

```ts
interface EdgeOffset {
  /** perpendicular distance to bow the Bezier control point, in px; sign = direction */
  amount: number;
}
```

Keyed by edge index in `_config.edges` (stable for one render pass — recomputed each render, not cached across renders, since `setConfig()` already drives a full re-render).

## API / Interface Contract

**`computeEdgeOffsets(nodes: ResolvedNode[], edges: FlowEdge[], cellSize: number): number[]`**
- Pure function — no `this`, no `hass` dependency (offset is geometric, not state-driven, so it doesn't need to recompute on every `hass` update, only on `setConfig()`/layout changes).
- Returns one offset (px, signed) per edge, indexed to match `edges`.
- Algorithm per edge `e` at index `i`:
  1. Compute `e`'s straight-line endpoints `(cx1,cy1)`–`(cx2,cy2)` from node positions (same math as today).
  2. **Node-avoidance**: for every other node `N` not equal to `e.from`/`e.to`, compute the perpendicular distance from `N`'s center to the line `(cx1,cy1)`–`(cx2,cy2)`, restricted to the segment (not the infinite line). If any such distance is below `NODE_AVOID_THRESHOLD` (proposed: `cellSize * 0.35` — inside a node's visual footprint), accumulate a bow offset of `NODE_AVOID_OFFSET` (proposed: `cellSize * 0.25`) in the direction away from `N` (sign determined by which side of the line `N` falls on, via the 2D cross product).
  3. **Duplicate-pair fan-out**: group edges by an unordered `{from, to}` key. Within a group of size `k > 1`, assign each member an index `0..k-1` and offset by `(j - (k-1)/2) * FANOUT_SPACING` (proposed: `cellSize * 0.15`), in the direction perpendicular to the line, using a stable order (config array order) so re-renders don't flip sides.
  4. Sum the two contributions (an edge can be both part of a duplicate-pair group and need node-avoidance bowing) into the final signed `amount`.

**`_renderEdge(edge, cellSize, offset)`** (modified signature, was `_renderEdge(edge, cellSize)`)
- Applies `offset` to the existing single bezier control point: instead of `mx = (cx1+cx2)/2` as the control x with `cy1`/`cy2` as control y (i.e., today's S-curve through the midpoint), compute the line's perpendicular unit vector and push the control point `offset` px along it from the straight-line midpoint. Zero offset reproduces today's exact curve (regression-safe default).

**`render()`** (`flow-card.ts:283-309`) — one extra step: compute `const offsets = computeEdgeOffsets(this._nodes, this._config.edges, cellSize);` before the edges map, then pass `offsets[i]` into each `_renderEdge` call.

## Implementation Plan
1. **Geometry helpers** (~S) — pure functions: `pointToSegmentDistance`, `perpendicularUnitVector`, `sideOfLine` (sign via cross product). No behavior change; can be added with no render-path wiring yet.
2. **`computeEdgeOffsets()`** (~M, depends on #1) — implements node-avoidance + duplicate-pair fan-out as described above. Unit-testable in isolation against hand-built node/edge arrays (no DOM/hass needed).
3. **Wire into `_renderEdge`/`render()`** (~S, depends on #2) — change `_renderEdge` to accept and apply an offset; compute offsets once per `render()` call; verify the zero-offset case is pixel-identical to current output (regression check for the "no behavior change for non-overlapping configs" acceptance criterion).
4. **Testbed: bypass example** (~S, can be done in parallel with #1-3) — add a static example section to `testbed.html` with 3 collinear nodes (`A→B→C` plus `A→C`) and a second example with the 4-node chain + shortcut, purely for manual visual verification (this repo has no automated visual regression tooling).
5. **Manual verification pass** (~S, depends on #3 and #4) — confirm via the new testbed examples that overlapping edges are now visually separated, and re-screenshot the existing static/interactive sections to confirm no visual change there.

Tasks 1-3 must ship together (one PR) since #2 has no caller without #3 and #3 has nothing to call without #2. Task 4 can land in the same PR or a quick follow-up; task 5 is verification, not a code change.

## Technical Risks & Trade-offs
- **Threshold tuning**: `NODE_AVOID_THRESHOLD`/`NODE_AVOID_OFFSET`/`FANOUT_SPACING` are proposed starting values relative to `cellSize`; they may need adjusting once seen against the new testbed examples. Low risk since they're internal constants, easy to retune without an architecture change.
- **Rejected alternative — explicit path-overlap detection**: enumerating all `from→to` paths through the graph to find when a direct edge duplicates a multi-hop path was considered and rejected. It requires path search (worse complexity, and ambiguous for cyclic graphs), and doesn't generalize to the duplicate-`{from,to}`-pair case (two edges between the same two nodes have no "path" to enumerate). The geometric node-avoidance approach handles both with one mechanism.
- **Rejected alternative — general edge-bundling**: grouping all edges sharing an endpoint and fanning them uniformly was considered but would needlessly perturb simple, non-overlapping configs (e.g. a junction with 3 distinct downstream edges that don't visually overlap) — violates the "existing configs render unchanged" acceptance criterion more than the targeted approach does.
- **Determinism**: offset direction must be a stable function of the config (not render order or floating-point flakiness), or the diagram could visually jitter between renders. Addressed by deriving the sign from the cross product (geometric, not arbitrary) and using stable array order for fan-out indexing.
- **Cosmetic side effect**: a config that's collinear *by coincidence* (not intentionally a bypass) will now show a bowed curve where it used to show a straight line through the intermediate node. Accepted trade-off — a bowed-but-correct curve is preferable to a hidden/overlapping one, and the visual difference is minor at the proposed offset magnitudes.

## Out of Scope (Technical)
- General graph layout/crossing-minimization for edges that don't share endpoints or overlap geometrically.
- Any new `FlowEdge`/`FlowNode` config fields for manual routing hints.
- Editor (`flow-card-editor.ts`) changes.
- Automated visual regression tooling (screenshots remain a manual verification step, consistent with how this repo already tests the testbed).
