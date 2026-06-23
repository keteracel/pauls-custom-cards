import { LitElement, html, svg, css, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { AnchorSide, FlowCardConfig, FlowEdge, NodeType, ResolvedNode } from './types.js';

const VALID_NODE_TYPES = new Set<NodeType>(['heat_pump', 'pump', 'tank', 'zone', 'valve', 'junction']);
const VALID_ANCHOR_SIDES = new Set<AnchorSide>(['N', 'S', 'E', 'W']);

@customElement('paul-flow-card')
export class FlowCard extends LitElement {

  @property({ attribute: false })
  public hass!: HomeAssistant;

  @state()
  private _config!: FlowCardConfig;

  private _nodes: ResolvedNode[] = [];
  private _nodeMap = new Map<string, ResolvedNode>();
  private _entityIds: string[] = [];

  public static async getConfigElement(): Promise<HTMLElement> {
    try {
      await import('./flow-card-editor.js');
    } catch (err) {
      console.error('[paul-flow-card] Failed to load config editor:', err);
    }
    return document.createElement('paul-flow-card-editor');
  }

  public static getStubConfig(): FlowCardConfig {
    return {
      type: 'custom:paul-flow-card',
      title: 'Heating System',
      height: 300,
      nodes: [
        {
          id: 'hp', type: 'heat_pump', label: 'Heat Pump', position: [0, 1],
          entities: {
            state: 'binary_sensor.heat_pump_running',
            temp_in: 'sensor.hp_flow_temp',
            temp_out: 'sensor.hp_return_temp',
          },
        },
        {
          id: 'pump', type: 'pump', label: 'Circ Pump', position: [1, 1],
          entities: { state: 'binary_sensor.pump_running' },
        },
        {
          id: 'tank', type: 'tank', label: 'Buffer Tank', position: [2, 0],
          entities: { state: 'binary_sensor.tank_valve', temperature: 'sensor.tank_temp' },
        },
        {
          id: 'zone', type: 'zone', label: 'Living Room', position: [3, 1],
          entities: { climate: 'climate.living_room', valve: 'switch.zone_valve' },
        },
      ],
      edges: [
        { from: 'hp',   to: 'pump', color: '#ff6600' },
        { from: 'pump', to: 'tank' },
        { from: 'tank', to: 'zone', color: '#ff6600' },
      ],
    };
  }

  public setConfig(config: FlowCardConfig): void {
    if (!config.nodes || config.nodes.length === 0) {
      throw new Error('[paul-flow-card] You must define at least one node.');
    }
    if (!config.edges) {
      throw new Error('[paul-flow-card] You must define an edges list (may be empty).');
    }

    const seenIds = new Set<string>();
    for (const node of config.nodes) {
      if (!node.id)   throw new Error('[paul-flow-card] Every node must have an id.');
      if (!node.type || !VALID_NODE_TYPES.has(node.type)) throw new Error(`[paul-flow-card] Node "${node.id}" has invalid type: "${node.type}". Valid types: ${[...VALID_NODE_TYPES].join(', ')}.`);
      if (seenIds.has(node.id)) throw new Error(`[paul-flow-card] Duplicate node id: "${node.id}".`);
      seenIds.add(node.id);
    }
    for (const edge of config.edges) {
      if (!seenIds.has(edge.from)) throw new Error(`[paul-flow-card] Edge references unknown node: "${edge.from}".`);
      if (!seenIds.has(edge.to))   throw new Error(`[paul-flow-card] Edge references unknown node: "${edge.to}".`);
      if (edge.anchor_start !== undefined && !VALID_ANCHOR_SIDES.has(edge.anchor_start)) {
        throw new Error(`[paul-flow-card] Edge "${edge.from}"->"${edge.to}" has invalid anchor_start: "${edge.anchor_start}". Valid sides: N, S, E, W.`);
      }
      if (edge.anchor_end !== undefined && !VALID_ANCHOR_SIDES.has(edge.anchor_end)) {
        throw new Error(`[paul-flow-card] Edge "${edge.from}"->"${edge.to}" has invalid anchor_end: "${edge.anchor_end}". Valid sides: N, S, E, W.`);
      }
    }
    for (const field of ['cell_size', 'cell_width', 'cell_height'] as const) {
      const value = config[field];
      if (value !== undefined && (value <= 0 || !Number.isFinite(value))) {
        throw new Error(`[paul-flow-card] ${field} must be a positive number.`);
      }
    }
    if (config.height !== undefined && (config.height <= 0 || !Number.isFinite(config.height))) {
      throw new Error('[paul-flow-card] height must be a positive number.');
    }

    this._nodes = config.nodes.map(n => {
      if (!n.position) throw new Error(`[paul-flow-card] Node "${n.id}" must have a position.`);
      const [_col, _row] = Array.isArray(n.position)
        ? n.position
        : [n.position.col, n.position.row];
      if (!Number.isFinite(_col) || !Number.isFinite(_row)) {
        throw new Error(`[paul-flow-card] Node "${n.id}" has invalid position coordinates.`);
      }
      return { ...n, _col, _row };
    });
    this._nodeMap = new Map(this._nodes.map(n => [n.id, n]));

    const entityIds = new Set<string>();
    for (const node of config.nodes) {
      for (const val of Object.values(node.entities ?? {})) {
        if (val) entityIds.add(val);
      }
    }
    for (const edge of config.edges) {
      if (edge.active_entity) entityIds.add(edge.active_entity);
    }
    this._entityIds = [...entityIds];

    this._config = config;
  }

  protected override shouldUpdate(changed: PropertyValues): boolean {
    if (changed.has('hass') && !changed.has('_config')) {
      if (!this._config) return false;
      const old = changed.get('hass') as HomeAssistant | undefined;
      if (!old) return true;
      return this._entityIds.some(id => old.states[id] !== this.hass.states[id]);
    }
    return true;
  }

  private _isNodeOn(node: ResolvedNode): boolean {
    if (node.type === 'junction') return true;
    // Tanks are passive vessels — they have no on/off concept, so entities.state
    // (if set) is ignored for rendering; they always render with the neutral/passive style.
    if (node.type === 'tank') return false;
    const e = node.entities;
    if (!e) return false;
    if (node.type === 'zone') {
      const id = e.valve ?? e.state;
      if (id) return this.hass.states[id]?.state === 'on';
      if (e.climate) {
        const s = this.hass.states[e.climate]?.state;
        return s === 'heat' || s === 'cool' || s === 'heat_cool';
      }
      return false;
    }
    return e.state ? this.hass.states[e.state]?.state === 'on' : false;
  }

  /** Tanks and junctions are passive conduits — they have no on/off state of their own. */
  private _isPassthrough(node: ResolvedNode): boolean {
    return node.type === 'tank' || node.type === 'junction';
  }

  private _isNodePassable(node: ResolvedNode): boolean {
    return this._isPassthrough(node) || this._isNodeOn(node);
  }

  private _isEdgeActive(edge: FlowEdge, visited: Set<string> = new Set()): boolean {
    if (edge.active_entity) {
      return this.hass.states[edge.active_entity]?.state === 'on';
    }
    const fromNode = this._nodeMap.get(edge.from);
    const toNode = this._nodeMap.get(edge.to);
    if (!fromNode || !toNode) return false;
    if (!this._isNodePassable(fromNode)) return false;
    if (!this._isPassthrough(toNode)) return this._isNodeOn(toNode);

    // toNode is a tank/junction — passthrough; active only if the path actually
    // reaches an active node further downstream (recursing through chains of them).
    if (visited.has(toNode.id)) return false; // guard against cyclic configs
    visited.add(toNode.id);
    return this._config.edges.some(e => e.from === toNode.id && this._isEdgeActive(e, visited));
  }

  private _getDisplayTemp(node: ResolvedNode): string | null {
    const e = node.entities;
    if (!e) return null;

    if (node.type === 'heat_pump') {
      const tin  = e.temp_in  ? this.hass.states[e.temp_in]  : undefined;
      const tout = e.temp_out ? this.hass.states[e.temp_out] : undefined;
      if (tin && tout) {
        const tInVal = parseFloat(tin.state);
        const tOutVal = parseFloat(tout.state);
        if (Number.isFinite(tInVal) && Number.isFinite(tOutVal)) {
          return `${Math.round(tInVal)}→${Math.round(tOutVal)}°`;
        }
      }
      if (tin)  { const v = parseFloat(tin.state);  if (Number.isFinite(v)) return `${v.toFixed(1)}°`; }
      if (tout) { const v = parseFloat(tout.state); if (Number.isFinite(v)) return `${v.toFixed(1)}°`; }
      return null;
    }

    if (node.type === 'zone') {
      if (e.climate) {
        const s = this.hass.states[e.climate];
        const t = s?.attributes?.['current_temperature'] as number | undefined;
        if (t != null) return `${t}°`;
      }
      if (e.temperature) {
        const s = this.hass.states[e.temperature];
        if (s) { const v = parseFloat(s.state); if (Number.isFinite(v)) return `${v.toFixed(1)}°`; }
      }
      return null;
    }

    if (e.temperature) {
      const s = this.hass.states[e.temperature];
      if (s) { const v = parseFloat(s.state); if (Number.isFinite(v)) return `${v.toFixed(1)}°`; }
    }
    return null;
  }

  private _renderShape(node: ResolvedNode, cx: number, cy: number, isOn: boolean): TemplateResult {
    const fill   = isOn ? 'var(--primary-color, #03a9f4)' : 'var(--card-background-color, #1c1c1e)';
    const stroke = isOn ? 'var(--primary-color, #03a9f4)' : '#666';

    switch (node.type) {
      case 'heat_pump':
        return svg`<rect x="${cx - 24}" y="${cy - 16}" width="48" height="32"
                         rx="6" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      case 'tank':
        return svg`<rect x="${cx - 18}" y="${cy - 22}" width="36" height="44"
                         rx="4" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      case 'pump':
        return svg`<circle cx="${cx}" cy="${cy}" r="16"
                            fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      case 'valve':
        return svg`<polygon
                     points="${cx},${cy - 16} ${cx + 16},${cy} ${cx},${cy + 16} ${cx - 16},${cy}"
                     fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      case 'zone':
        return svg`<polygon
                     points="${cx},${cy - 20} ${cx + 20},${cy - 4} ${cx + 20},${cy + 16} ${cx - 20},${cy + 16} ${cx - 20},${cy - 4}"
                     fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
      case 'junction':
        return svg`<circle cx="${cx}" cy="${cy}" r="6"
                            fill="#666" stroke="#666" stroke-width="1"/>`;
      default:
        return svg``;
    }
  }

  private _labelOffsetY(type: ResolvedNode['type']): number {
    switch (type) {
      case 'tank':     return 34;
      case 'junction': return 14;
      default:         return 28;
    }
  }

  private _renderNode(node: ResolvedNode, cellWidth: number, cellHeight: number): TemplateResult {
    const cx     = (node._col + 0.5) * cellWidth;
    const cy     = (node._row + 0.5) * cellHeight;
    const isOn   = this._isNodeOn(node);
    const temp   = this._getDisplayTemp(node);
    const labelY = cy + this._labelOffsetY(node.type);

    return svg`
      <g class="node node--${node.type}">
        ${this._renderShape(node, cx, cy, isOn)}
        ${temp ? svg`
          <text x="${cx}" y="${cy}" class="node-temp"
                text-anchor="middle" dominant-baseline="middle">${temp}</text>
        ` : svg``}
        ${node.label ? svg`
          <text x="${cx}" y="${labelY}" class="node-label"
                text-anchor="middle" dominant-baseline="auto">${node.label}</text>
        ` : svg``}
      </g>
    `;
  }

  /** Distance from a node's center to its N/S/E/W boundary, used as pipe anchor offsets. */
  private _anchorOffsets(type: ResolvedNode['type']): { N: number; S: number; E: number; W: number } {
    switch (type) {
      case 'heat_pump': return { N: 16, S: 16, E: 24, W: 24 };
      case 'tank':      return { N: 22, S: 22, E: 18, W: 18 };
      case 'zone':      return { N: 20, S: 16, E: 20, W: 20 };
      case 'junction':  return { N: 6,  S: 6,  E: 6,  W: 6 };
      default:          return { N: 16, S: 16, E: 16, W: 16 }; // pump, valve
    }
  }

  private _anchorPoint(node: ResolvedNode, side: AnchorSide, cellWidth: number, cellHeight: number): [number, number] {
    const cx = (node._col + 0.5) * cellWidth;
    const cy = (node._row + 0.5) * cellHeight;
    const o  = this._anchorOffsets(node.type);
    switch (side) {
      case 'N': return [cx, cy - o.N];
      case 'S': return [cx, cy + o.S];
      case 'E': return [cx + o.E, cy];
      case 'W': return [cx - o.W, cy];
    }
  }

  /** Picks the N/S/E/W anchor pair facing each other, based on which axis separates the nodes more. */
  private _defaultSides(fromNode: ResolvedNode, toNode: ResolvedNode, cellWidth: number, cellHeight: number):
    { from: AnchorSide; to: AnchorSide } {
    const dx = (toNode._col - fromNode._col) * cellWidth;
    const dy = (toNode._row - fromNode._row) * cellHeight;
    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? { from: 'E', to: 'W' } : { from: 'W', to: 'E' };
    }
    return dy >= 0 ? { from: 'S', to: 'N' } : { from: 'N', to: 'S' };
  }

  /** Resolves an edge's anchor sides, letting `anchor_start`/`anchor_end` override the automatic pick. */
  private _resolveSides(edge: FlowEdge, fromNode: ResolvedNode, toNode: ResolvedNode, cellWidth: number, cellHeight: number):
    { from: AnchorSide; to: AnchorSide } {
    const defaults = this._defaultSides(fromNode, toNode, cellWidth, cellHeight);
    return {
      from: edge.anchor_start ?? defaults.from,
      to:   edge.anchor_end   ?? defaults.to,
    };
  }

  /**
   * Builds an orthogonal (Manhattan-style) polyline between two anchored points. When both
   * anchors are on the same axis (e.g. both E/W), the path bows through a midpoint on the
   * other axis. When they're on perpendicular axes (e.g. one E/W, one N/S) — which only
   * happens with an explicit `anchor_start`/`anchor_end` override — it's a single-corner path.
   */
  private _orthogonalPoints(x1: number, y1: number, x2: number, y2: number, fromSide: AnchorSide, toSide: AnchorSide): [number, number][] {
    const fromHorizontal = fromSide === 'E' || fromSide === 'W';
    const toHorizontal   = toSide === 'E' || toSide === 'W';

    if (fromHorizontal && toHorizontal) {
      if (y1 === y2) return [[x1, y1], [x2, y2]];
      const mx = (x1 + x2) / 2;
      return [[x1, y1], [mx, y1], [mx, y2], [x2, y2]];
    }
    if (!fromHorizontal && !toHorizontal) {
      if (x1 === x2) return [[x1, y1], [x2, y2]];
      const my = (y1 + y2) / 2;
      return [[x1, y1], [x1, my], [x2, my], [x2, y2]];
    }
    // Perpendicular anchors: a single corner, on whichever axis the start leaves along.
    return fromHorizontal ? [[x1, y1], [x2, y1], [x2, y2]] : [[x1, y1], [x1, y2], [x2, y2]];
  }

  /** Renders a polyline as a path with soft (curved, not sharp) corners. */
  private _roundedPath(points: [number, number][], radius: number): string {
    if (points.length < 2) return '';
    let d = `M ${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length - 1; i++) {
      const [px, py] = points[i - 1];
      const [cx, cy]  = points[i];
      const [nx, ny] = points[i + 1];
      const distPrev = Math.hypot(cx - px, cy - py);
      const distNext = Math.hypot(nx - cx, ny - cy);
      const r = Math.min(radius, distPrev / 2, distNext / 2);
      const p1x = cx + (px - cx) * (r / distPrev);
      const p1y = cy + (py - cy) * (r / distPrev);
      const p2x = cx + (nx - cx) * (r / distNext);
      const p2y = cy + (ny - cy) * (r / distNext);
      d += ` L ${p1x} ${p1y} Q ${cx} ${cy} ${p2x} ${p2y}`;
    }
    const [lastX, lastY] = points[points.length - 1];
    d += ` L ${lastX} ${lastY}`;
    return d;
  }

  private _renderEdge(edge: FlowEdge, cellWidth: number, cellHeight: number): TemplateResult {
    const fromNode = this._nodeMap.get(edge.from);
    const toNode   = this._nodeMap.get(edge.to);
    if (!fromNode || !toNode) return svg``;

    const { from: fromSide, to: toSide } = this._resolveSides(edge, fromNode, toNode, cellWidth, cellHeight);
    const [x1, y1] = this._anchorPoint(fromNode, fromSide, cellWidth, cellHeight);
    const [x2, y2] = this._anchorPoint(toNode, toSide, cellWidth, cellHeight);

    const points = this._orthogonalPoints(x1, y1, x2, y2, fromSide, toSide);
    const d      = this._roundedPath(points, 18);

    const isActive = this._isEdgeActive(edge);
    const color    = edge.color ?? '#ff6600';

    if (isActive) {
      return svg`<path d="${d}" class="pipe pipe--active"
                       stroke="${color}" stroke-width="4" fill="none"
                       stroke-dasharray="12 8"/>`;
    }
    return svg`<path d="${d}" class="pipe pipe--inactive"
                     stroke="#444" stroke-width="2" fill="none"/>`;
  }

  protected override render() {
    if (!this._config || !this.hass) return html``;

    const cellWidth  = this._config.cell_width  ?? this._config.cell_size ?? 120;
    const cellHeight = this._config.cell_height ?? this._config.cell_size ?? 120;
    const height   = this._config.height ?? 300;
    const maxCol   = Math.max(...this._nodes.map(n => n._col));
    const maxRow   = Math.max(...this._nodes.map(n => n._row));
    const vbW      = (maxCol + 1) * cellWidth;
    const vbH      = (maxRow + 1) * cellHeight;

    return html`
      <ha-card>
        ${this._config.title ? html`<div class="card-header">${this._config.title}</div>` : ''}
        <div class="flow-wrapper" style="aspect-ratio:${vbW} / ${vbH}; min-height:${height}px">
          <svg viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"
               xmlns="http://www.w3.org/2000/svg">
            <g class="edges">
              ${this._config.edges.map(e => this._renderEdge(e, cellWidth, cellHeight))}
            </g>
            <g class="nodes">
              ${this._nodes.map(n => this._renderNode(n, cellWidth, cellHeight))}
            </g>
          </svg>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host { display: block; }
      ha-card { display: block; overflow: hidden; }

      .card-header {
        padding: 16px 16px 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--primary-text-color);
      }

      .flow-wrapper {
        width: 100%;
        box-sizing: border-box;
        padding: 12px;
      }

      .flow-wrapper svg {
        width: 100%;
        height: 100%;
        display: block;
      }

      @keyframes flow-anim {
        to { stroke-dashoffset: -20; }
      }

      .pipe--active {
        animation: flow-anim 0.8s linear infinite;
      }

      .node-label {
        font-size: 11px;
        fill: var(--secondary-text-color, #888);
        pointer-events: none;
      }

      .node-temp {
        font-size: 9px;
        fill: var(--primary-text-color, #e5e5ea);
        font-weight: 600;
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'paul-flow-card': FlowCard;
  }
}
