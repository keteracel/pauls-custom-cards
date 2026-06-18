export type NodeType = 'heat_pump' | 'pump' | 'tank' | 'zone' | 'valve' | 'junction';

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
}

export interface FlowCardConfig {
  type: string;
  title?: string;
  height?: number;
  cell_size?: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ResolvedNode extends FlowNode {
  _col: number;
  _row: number;
}
