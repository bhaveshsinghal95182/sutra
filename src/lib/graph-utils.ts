export interface GraphNodeData {
  id: string;
  name: string;
  fileId: string;
}

export interface GraphLinkData {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNodeData[];
  links: GraphLinkData[];
}

export interface GraphNode {
  id: string;
  name: string;
  fileId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  linkCount: number;
}

export interface GraphLink {
  source: string;
  target: string;
}

/**
 * Build a runtime graph from precomputed JSON data.
 * The JSON only needs `nodes` (id, name, fileId) and `links` (source, target).
 */
export function buildGraphFromData(data: GraphData): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const nodes: GraphNode[] = data.nodes.map((n) => ({
    id: n.id,
    name: n.name,
    fileId: n.fileId,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    linkCount: 0,
  }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = data.links.filter(
    (l) => nodeIds.has(l.source) && nodeIds.has(l.target)
  );

  // Count links per node
  links.forEach((l) => {
    const s = nodes.find((n) => n.id === l.source);
    const t = nodes.find((n) => n.id === l.target);
    if (s) s.linkCount++;
    if (t) t.linkCount++;
  });

  return { nodes, links };
}
