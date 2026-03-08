import { animate, useMotionValue, useSpring } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import graphData from '@/lib/graph-data.json';
import {
  buildGraphFromData,
  type GraphLink,
  type GraphNode,
} from '@/lib/graph-utils';

interface GraphViewProps {
  activeFileId: string;
  onFileSelect: (fileId: string) => void;
}

const GraphView = ({ activeFileId, onFileSelect }: GraphViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);
  const animFrameRef = useRef(0);
  const dragNodeRef = useRef<GraphNode | null>(null);
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const [, setHovered] = useState(false);

  const camX = useMotionValue(0);
  const camY = useMotionValue(0);
  const camZoom = useMotionValue(1);
  const springX = useSpring(camX, { stiffness: 58, damping: 44, mass: 1.05 });
  const springY = useSpring(camY, { stiffness: 58, damping: 44, mass: 1.05 });
  const springZoom = useSpring(camZoom, {
    stiffness: 90,
    damping: 46,
    mass: 1.1,
  });

  useEffect(() => {
    const g = buildGraphFromData(graphData);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    g.nodes.forEach((n, i) => {
      const angle = (i / g.nodes.length) * Math.PI * 2;
      const radius = Math.min(w, h) * 0.25;
      n.x = w / 2 + Math.cos(angle) * radius;
      n.y = h / 2 + Math.sin(angle) * radius;
    });
    nodesRef.current = g.nodes;
    linksRef.current = g.links;
    camX.set(0);
    camY.set(0);
    camZoom.set(1);
  }, [camX, camY, camZoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };
    resize();
    const obs = new ResizeObserver(resize);
    obs.observe(canvas);

    const damping = 0.78;
    const bounceFactor = 0.18;
    const edgeStiffness = 0.05;
    const maxVelocity = 1.8;

    const tick = () => {
      if (!running) return;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const nodes = nodesRef.current;
      const links = linksRef.current;
      const idealDist =
        (Math.min(w, h) / Math.max(2, nodes.length * 0.45)) * 0.8;

      links.forEach((l) => {
        const s = nodes.find((n) => n.id === l.source);
        const t = nodes.find((n) => n.id === l.target);
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - idealDist) * edgeStiffness;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < idealDist * 1.25) {
            const force = ((idealDist * 1.25 - dist) / dist) * 0.18;
            a.vx -= dx * force;
            a.vy -= dy * force;
            b.vx += dx * force;
            b.vy += dy * force;
          }
        }
      }

      const pad = 30;
      nodes.forEach((n) => {
        if (n === dragNodeRef.current) return;
        n.vx *= damping;
        n.vy *= damping;
        n.vx = Math.max(-maxVelocity, Math.min(maxVelocity, n.vx));
        n.vy = Math.max(-maxVelocity, Math.min(maxVelocity, n.vy));
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < pad) {
          n.x = pad;
          n.vx = Math.abs(n.vx) * bounceFactor;
        }
        if (n.x > w - pad) {
          n.x = w - pad;
          n.vx = -Math.abs(n.vx) * bounceFactor;
        }
        if (n.y < pad) {
          n.y = pad;
          n.vy = Math.abs(n.vy) * bounceFactor;
        }
        if (n.y > h - pad) {
          n.y = h - pad;
          n.vy = -Math.abs(n.vy) * bounceFactor;
        }
      });

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ox = springX.get();
      const oy = springY.get();
      const z = springZoom.get();
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(z, z);
      ctx.translate(-w / 2 + ox, -h / 2 + oy);

      const styles = getComputedStyle(canvas);
      const fg = styles.getPropertyValue('color') || '#cdd6f4';
      const muted = styles.getPropertyValue('--muted-foreground')
        ? `hsl(${styles.getPropertyValue('--muted-foreground')})`
        : 'rgba(205,214,244,0.3)';
      const accent = styles.getPropertyValue('--primary')
        ? `hsl(${styles.getPropertyValue('--primary')})`
        : '#89b4fa';

      links.forEach((l) => {
        const s = nodes.find((n) => n.id === l.source);
        const t = nodes.find((n) => n.id === l.target);
        if (!s || !t) return;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = muted;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      nodes.forEach((n) => {
        const r = 4 + n.linkCount * 1.5;
        const isActive = n.fileId === activeFileId;
        const isHovered = n === hoveredNodeRef.current;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + (isHovered ? 2 : 0), 0, Math.PI * 2);
        ctx.fillStyle = isActive ? accent : isHovered ? accent : fg;
        ctx.globalAlpha = isActive ? 1 : isHovered ? 0.9 : 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.font = `${isActive || isHovered ? '600' : '400'} 11px Inter, system-ui, sans-serif`;
        ctx.fillStyle = fg;
        ctx.globalAlpha = isActive ? 1 : isHovered ? 0.95 : 0.7;
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + r + 14);
        ctx.globalAlpha = 1;
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
      obs.disconnect();
    };
  }, [activeFileId, springX, springY, springZoom]);

  const toWorld = useCallback(
    (cx: number, cy: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const mx = cx - rect.left;
      const my = cy - rect.top;
      const w = rect.width;
      const h = rect.height;
      const z = springZoom.get();
      const ox = springX.get();
      const oy = springY.get();
      return {
        x: (mx - w / 2) / z + w / 2 - ox,
        y: (my - h / 2) / z + h / 2 - oy,
      };
    },
    [springX, springY, springZoom]
  );

  const findNode = useCallback((wx: number, wy: number) => {
    return nodesRef.current.find((n) => {
      const r = (4 + n.linkCount * 1.5 + 2) * 1.7;
      return (n.x - wx) ** 2 + (n.y - wy) ** 2 < r * r;
    });
  }, []);

  const flingMultiplier = 0.05;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = toWorld(e.clientX, e.clientY);
      const node = findNode(x, y);
      if (node) {
        dragNodeRef.current = node;
        node.vx = 0;
        node.vy = 0;
        velocityRef.current = { x: 0, y: 0 };
      } else {
        isPanningRef.current = true;
      }
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [toWorld, findNode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = toWorld(e.clientX, e.clientY);
      if (dragNodeRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        velocityRef.current = { x: dx, y: dy };
        dragNodeRef.current.x = x;
        dragNodeRef.current.y = y;
      } else if (isPanningRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        const z = springZoom.get();
        camX.set(camX.get() + dx / z);
        camY.set(camY.get() + dy / z);
      } else {
        const node = findNode(x, y);
        hoveredNodeRef.current = node || null;
        setHovered(Boolean(node));
      }
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    },
    [toWorld, findNode, camX, camY, springZoom]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (dragNodeRef.current) {
        dragNodeRef.current.vx = velocityRef.current.x * flingMultiplier;
        dragNodeRef.current.vy = velocityRef.current.y * flingMultiplier;
        const dist =
          Math.abs(e.clientX - dragStartRef.current.x) +
          Math.abs(e.clientY - dragStartRef.current.y);
        if (dist < 4) onFileSelect(dragNodeRef.current.fileId);
        dragNodeRef.current = null;
      }
      isPanningRef.current = false;
    },
    [onFileSelect]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const newZoom = Math.max(
        0.3,
        Math.min(3, camZoom.get() - e.deltaY * 0.001)
      );
      animate(camZoom, newZoom, { duration: 0.18 });
    },
    [camZoom]
  );

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        dragNodeRef.current = null;
        isPanningRef.current = false;
        hoveredNodeRef.current = null;
        setHovered(false);
      }}
      onWheel={handleWheel}
    />
  );
};

export default GraphView;
