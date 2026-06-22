export type NodeType = 'heat_pump' | 'pump' | 'tank' | 'zone' | 'valve' | 'junction';

/** Which side of a node a pipe connects to: North, South, East, or West. */
export type AnchorSide = 'N' | 'S' | 'E' | 'W';

export interface NodeEntities {
  state?: string;
  temperature?: string;
  temp_in?: string;
  temp_out?: string;
  climate?: string;
  valve?: string;
}

export interface FlowNode {
  id: string;
  type: NodeType;
  label?: string;
  position: { col: number; row: number } | [number, number];
  entities?: NodeEntities;
}

export interface FlowEdge {
  from: string;
  to: string;
  active_entity?: string;
  color?: string;
  /** Overrides which side of the `from` node this pipe leaves from. Auto-picked if unset. */
  anchor_start?: AnchorSide;
  /** Overrides which side of the `to` node this pipe enters. Auto-picked if unset. */
  anchor_end?: AnchorSide;
}

export interface FlowCardConfig {
  type: string;
  title?: string;
  height?: number;
  /** @deprecated Use cell_width/cell_height instead. Used as a fallback for either axis. */
  cell_size?: number;
  cell_width?: number;
  cell_height?: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ResolvedNode extends FlowNode {
  _col: number;
  _row: number;
}
