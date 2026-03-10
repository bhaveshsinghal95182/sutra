import { readTextFile } from '@tauri-apps/plugin-fs';
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  fileId: string;
  linkCount?: number;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    fileId: string;
  }>;
  links: Array<{
    source: string;
    target: string;
  }>;
}

interface GraphViewProps {
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
  folderPath?: string;
}

const GraphView = ({
  activeFileId,
  onFileSelect,
  folderPath,
}: GraphViewProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load graph data from .sutra/graph-data.json
  useEffect(() => {
    const loadGraphData = async () => {
      if (!folderPath) {
        setLoading(false);
        return;
      }

      try {
        const graphDataPath = `${folderPath}/.sutra/graph-data.json`;
        const content = await readTextFile(graphDataPath);
        const data: GraphData = JSON.parse(content);
        setGraphData(data);
      } catch (error) {
        console.error('Failed to load graph data:', error);
        setGraphData(null);
      } finally {
        setLoading(false);
      }
    };

    loadGraphData();
  }, [folderPath]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !graphData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Compute link counts
    const linkCount: Record<string, number> = {};
    const nodes: GraphNode[] = graphData.nodes.map((n) => ({
      ...n,
      linkCount: 0,
    }));
    const links: GraphLink[] = graphData.links.map((l) => ({ ...l }));

    // Calculate link counts
    nodes.forEach((n) => (linkCount[n.id] = 0));
    links.forEach((l) => {
      const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
      const targetId = typeof l.target === 'string' ? l.target : l.target.id;
      linkCount[sourceId] = (linkCount[sourceId] || 0) + 1;
      linkCount[targetId] = (linkCount[targetId] || 0) + 1;
    });

    // Update nodes with link counts
    nodes.forEach((n) => {
      n.linkCount = linkCount[n.id] || 0;
    });

    const g = svg.append('g');

    // Zoom
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
    );

    // Get colors from CSS variables
    const style = getComputedStyle(document.documentElement);
    const foreground = style.getPropertyValue('--foreground').trim() || '#888';
    const mutedForeground =
      style.getPropertyValue('--muted-foreground').trim() || '#888';
    const primary = style.getPropertyValue('--primary').trim() || '#888';

    // Drag handlers
    function dragstarted(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
      d: GraphNode
    ) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
      d: GraphNode
    ) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
      d: GraphNode
    ) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Simulation with ultra-smooth settings
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(90)
          .strength(0.4)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(25))
      .alphaDecay(0.01)
      .velocityDecay(0.6);

    // Links
    const link = g
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', mutedForeground)
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 2);

    // Nodes
    const node = g
      .append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => 5 + Math.sqrt(d.linkCount || 0) * 3)
      .attr('fill', (d) =>
        d.fileId === activeFileId
          ? primary
          : (d.linkCount || 0) > 0
            ? primary
            : mutedForeground
      )
      .attr('opacity', (d) => (d.fileId === activeFileId ? 1 : 0.6))
      .attr('cursor', 'pointer')
      .on('click', (_event, d) => {
        onFileSelect(d.fileId);
      })
      .call(
        d3
          .drag<SVGCircleElement, GraphNode>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended) as never
      );

    // Labels
    const label = g
      .append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.name)
      .attr('fill', foreground)
      .attr('font-size', 11)
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-weight', (d) => (d.fileId === activeFileId ? 600 : 400))
      .attr('opacity', (d) => (d.fileId === activeFileId ? 1 : 0.7))
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => 5 + Math.sqrt(d.linkCount || 0) * 3 + 14);

    // Hover highlight
    node
      .on('mouseenter', (_event, d) => {
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        links.forEach((l) => {
          const sId =
            typeof l.source === 'object'
              ? (l.source as GraphNode).id
              : l.source;
          const tId =
            typeof l.target === 'object'
              ? (l.target as GraphNode).id
              : l.target;
          if (sId === d.id) connectedIds.add(tId);
          if (tId === d.id) connectedIds.add(sId);
        });

        node.attr('opacity', (n) =>
          n.fileId === activeFileId ? 1 : connectedIds.has(n.id) ? 0.8 : 0.15
        );
        label.attr('opacity', (n) =>
          n.fileId === activeFileId ? 1 : connectedIds.has(n.id) ? 1 : 0.2
        );
        link.attr('stroke-opacity', (l) => {
          const sId =
            typeof l.source === 'object'
              ? (l.source as GraphNode).id
              : l.source;
          const tId =
            typeof l.target === 'object'
              ? (l.target as GraphNode).id
              : l.target;
          return sId === d.id || tId === d.id ? 0.8 : 0.1;
        });
      })
      .on('mouseleave', () => {
        node.attr('opacity', (n) => (n.fileId === activeFileId ? 1 : 0.6));
        label.attr('opacity', (n) => (n.fileId === activeFileId ? 1 : 0.7));
        link.attr('stroke-opacity', 0.4);
      });

    // Tick
    const padding = 50;
    simulation.on('tick', () => {
      nodes.forEach((d) => {
        d.x = Math.max(padding, Math.min(width - padding, d.x!));
        d.y = Math.max(padding, Math.min(height - padding, d.y!));
      });

      link
        .attr('x1', (d) => (d.source as GraphNode).x!)
        .attr('y1', (d) => (d.source as GraphNode).y!)
        .attr('x2', (d) => (d.target as GraphNode).x!)
        .attr('y2', (d) => (d.target as GraphNode).y!);
      node.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);
      label.attr('x', (d) => d.x!).attr('y', (d) => d.y!);
    });

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      svg.attr('width', newWidth).attr('height', newHeight);
      simulation.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
      simulation.alpha(0.3).restart();
    };

    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    return () => {
      simulation.stop();
      resizeObs.disconnect();
    };
  }, [activeFileId, onFileSelect, graphData]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Loading graph...
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        No graph data found. Add links to your files to see the graph.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        ref={svgRef}
        className="h-full w-full"
        style={{ display: 'block' }}
      />
    </div>
  );
};

export default GraphView;
