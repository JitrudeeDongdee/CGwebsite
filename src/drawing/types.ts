export interface Point {
  x: number
  y: number
}

export interface DrawNode extends Point {
  id: string
}

export interface DrawWall {
  id: string
  a: string
  b: string
}

export interface DrawingState {
  nodes: Record<string, DrawNode>
  walls: DrawWall[]
}

export type SnapTarget =
  | { type: 'node'; nodeId: string; point: Point }
  | { type: 'wallMidpoint'; wallId: string; point: Point }
