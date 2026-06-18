import { LitElement, html, svg, css, type CSSResultGroup, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant } from 'custom-card-helpers';
import type { FlowCardConfig, FlowEdge, ResolvedNode } from './types.js';

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
      if (!node.type) throw new Error(`[paul-flow-card] Node "${node.id}" must have a type.`);
      if (seenIds.has(node.id)) throw new Error(`[paul-flow-card] Duplicate node id: "${node.id}".`);
      seenIds.add(node.id);
    }
    for (const edge of config.edges) {
      if (!seenIds.has(edge.from)) throw new Error(`[paul-flow-card] Edge references unknown node: "${edge.from}".`);
      if (!seenIds.has(edge.to))   throw new Error(`[paul-flow-card] Edge references unknown node: "${edge.to}".`);
    }

    this._nodes = config.nodes.map(n => {
      const [_col, _row] = Array.isArray(n.position)
        ? n.position
        : [n.position.col, n.position.row];
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

  private _isEdgeActive(edge: FlowEdge): boolean {
    if (edge.active_entity) {
      return this.hass.states[edge.active_entity]?.state === 'on';
    }
    const fromNode = this._nodeMap.get(edge.from);
    if (!fromNode) return false;
    return this._isNodeOn(fromNode);
  }

  private _getDisplayTemp(node: ResolvedNode): string | null {
    const e = node.entities;
    if (!e) return null;

    if (node.type === 'heat_pump') {
      const tin  = e.temp_in  ? this.hass.states[e.temp_in]  : undefined;
      const tout = e.temp_out ? this.hass.states[e.temp_out] : undefined;
      if (tin && tout) {
        return `${Math.round(parseFloat(tin.state))}→${Math.round(parseFloat(tout.state))}°`;
      }
      if (tin)  return `${parseFloat(tin.state).toFixed(1)}°`;
      if (tout) return `${parseFloat(tout.state).toFixed(1)}°`;
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
        if (s) return `${parseFloat(s.state).toFixed(1)}°`;
      }
      return null;
    }

    if (e.temperature) {
      const s = this.hass.states[e.temperature];
      if (s) return `${parseFloat(s.state).toFixed(1)}°`;
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
    }
  }

  private _labelOffsetY(type: ResolvedNode['type']): number {
    switch (type) {
      case 'tank':     return 34;
      case 'junction': return 14;
      default:         return 28;
    }
  }

  private _renderNode(node: ResolvedNode, cellSize: number): TemplateResult {
    const cx     = (node._col + 0.5) * cellSize;
    const cy     = (node._row + 0.5) * cellSize;
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

  private _renderEdge(edge: FlowEdge, cellSize: number): TemplateResult {
    const fromNode = this._nodeMap.get(edge.from);
    const toNode   = this._nodeMap.get(edge.to);
    if (!fromNode || !toNode) return svg``;

    const cx1 = (fromNode._col + 0.5) * cellSize;
    const cy1 = (fromNode._row + 0.5) * cellSize;
    const cx2 = (toNode._col   + 0.5) * cellSize;
    const cy2 = (toNode._row   + 0.5) * cellSize;
    const mx  = (cx1 + cx2) / 2;
    const d   = `M ${cx1} ${cy1} C ${mx} ${cy1} ${mx} ${cy2} ${cx2} ${cy2}`;

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

    const cellSize = this._config.cell_size ?? 120;
    const height   = this._config.height ?? 300;
    const maxCol   = Math.max(...this._nodes.map(n => n._col));
    const maxRow   = Math.max(...this._nodes.map(n => n._row));
    const vbW      = (maxCol + 1) * cellSize;
    const vbH      = (maxRow + 1) * cellSize;

    return html`
      <ha-card>
        ${this._config.title ? html`<div class="card-header">${this._config.title}</div>` : ''}
        <div class="flow-wrapper" style="height:${height}px">
          <svg viewBox="0 0 ${vbW} ${vbH}" preserveAspectRatio="xMidYMid meet"
               xmlns="http://www.w3.org/2000/svg">
            <g class="edges">
              ${this._config.edges.map(e => this._renderEdge(e, cellSize))}
            </g>
            <g class="nodes">
              ${this._nodes.map(n => this._renderNode(n, cellSize))}
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
