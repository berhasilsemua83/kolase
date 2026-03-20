import React, { useState, useRef, useCallback } from 'react';

// =============================================
// TYPES
// =============================================
interface CollageCell {
  x: number;    // % dari canvas (hanya untuk sel kotak biasa)
  y: number;
  w: number;
  h: number;
  clipPath?: string; // CSS polygon/path — jika ada, sel memenuhi 100%x100% canvas
}

interface CollageLayout {
  id: string;
  name: string;
  photoCount: number;
  category: 'kotak' | 'diagonal' | 'gelombang' | 'chevron';
  cells: CollageCell[];
}

interface CellState {
  imageSrc: string | null;
  imgNaturalW: number;
  imgNaturalH: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

// =============================================
// HELPERS
// =============================================
const DEFAULT_CELL = (): CellState => ({
  imageSrc: null, imgNaturalW: 0, imgNaturalH: 0,
  scale: 1, offsetX: 0, offsetY: 0,
});

const calcMaxOffset = (
  imgW: number, imgH: number, cellW: number, cellH: number, scale: number
): { maxOffX: number; maxOffY: number } => {
  if (imgW <= 0 || imgH <= 0) return { maxOffX: 1, maxOffY: 1 };
  const containScale = Math.min(cellW / imgW, cellH / imgH);
  const visW = imgW * containScale * scale;
  const visH = imgH * containScale * scale;
  const maxPanX = (cellW + visW) / 2 - visW * 0.2;
  const maxPanY = (cellH + visH) / 2 - visH * 0.2;
  return {
    maxOffX: maxPanX / (cellW * scale),
    maxOffY: maxPanY / (cellH * scale),
  };
};

// Parse "polygon(x1% y1%, x2% y2%, ...)" → array titik {x,y} dalam pixel canvas
const parsePolygonToCanvas = (clipPath: string, W: number, H: number): {x:number;y:number}[] => {
  const match = clipPath.match(/polygon\((.+)\)/s);
  if (!match) return [];
  return match[1].split(',').map(pt => {
    const [xs, ys] = pt.trim().split(/\s+/);
    return { x: parseFloat(xs) / 100 * W, y: parseFloat(ys) / 100 * H };
  });
};

// =============================================
// LAYOUTS
// =============================================
const COLLAGE_LAYOUTS: CollageLayout[] = [

  // ══════════════════════════════════════════
  // KOTAK — rectangular grid
  // ══════════════════════════════════════════
  // 2 foto
  { id:'2_lr_50', name:'50/50 Kiri-Kanan',  photoCount:2, category:'kotak', cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:100}] },
  { id:'2_tb_50', name:'50/50 Atas-Bawah',  photoCount:2, category:'kotak', cells:[{x:0,y:0,w:100,h:50},{x:0,y:50,w:100,h:50}] },
  { id:'2_lr_60', name:'60/40 Kiri-Kanan',  photoCount:2, category:'kotak', cells:[{x:0,y:0,w:60,h:100},{x:60,y:0,w:40,h:100}] },
  { id:'2_lr_70', name:'70/30 Kiri-Kanan',  photoCount:2, category:'kotak', cells:[{x:0,y:0,w:70,h:100},{x:70,y:0,w:30,h:100}] },
  { id:'2_tb_65', name:'65/35 Atas-Bawah',  photoCount:2, category:'kotak', cells:[{x:0,y:0,w:100,h:65},{x:0,y:65,w:100,h:35}] },
  // 3 foto
  { id:'3_1l_2r', name:'1 Besar Kiri + 2 Kanan',  photoCount:3, category:'kotak', cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:50},{x:55,y:50,w:45,h:50}] },
  { id:'3_2l_1r', name:'2 Kiri + 1 Besar Kanan',  photoCount:3, category:'kotak', cells:[{x:0,y:0,w:45,h:50},{x:0,y:50,w:45,h:50},{x:45,y:0,w:55,h:100}] },
  { id:'3_1t_2b', name:'1 Besar Atas + 2 Bawah',  photoCount:3, category:'kotak', cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:50,h:45},{x:50,y:55,w:50,h:45}] },
  { id:'3_2t_1b', name:'2 Atas + 1 Besar Bawah',  photoCount:3, category:'kotak', cells:[{x:0,y:0,w:50,h:45},{x:50,y:0,w:50,h:45},{x:0,y:45,w:100,h:55}] },
  { id:'3_asym',  name:'1 Kiri + 2 Kanan Asim.',  photoCount:3, category:'kotak', cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:40},{x:50,y:40,w:50,h:60}] },
  // 4 foto
  { id:'4_grid',  name:'2x2 Grid',           photoCount:4, category:'kotak', cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:50,h:50},{x:50,y:50,w:50,h:50}] },
  { id:'4_1l_3r', name:'1 Besar + 3 Kanan',  photoCount:4, category:'kotak', cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:33.34},{x:55,y:33.34,w:45,h:33.33},{x:55,y:66.67,w:45,h:33.33}] },
  { id:'4_1t_3b', name:'1 Besar + 3 Bawah',  photoCount:4, category:'kotak', cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:33.34,h:45},{x:33.34,y:55,w:33.33,h:45},{x:66.67,y:55,w:33.33,h:45}] },
  { id:'4_lg_sm', name:'1 Besar + 3 Strip',  photoCount:4, category:'kotak', cells:[{x:0,y:0,w:100,h:65},{x:0,y:65,w:33.34,h:35},{x:33.34,y:65,w:33.33,h:35},{x:66.67,y:65,w:33.33,h:35}] },
  // 5 foto
  { id:'5_2t_3b', name:'2 Atas + 3 Bawah',  photoCount:5, category:'kotak', cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}] },
  { id:'5_1l_4r', name:'1 Besar + 4 Kanan', photoCount:5, category:'kotak', cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:25},{x:50,y:25,w:50,h:25},{x:50,y:50,w:50,h:25},{x:50,y:75,w:50,h:25}] },
  { id:'5_cross', name:'Pola Plus / Cross',  photoCount:5, category:'kotak', cells:[{x:33.33,y:0,w:33.34,h:33.33},{x:0,y:33.33,w:33.33,h:33.34},{x:33.33,y:33.33,w:33.34,h:33.34},{x:66.67,y:33.33,w:33.33,h:33.34},{x:33.33,y:66.67,w:33.34,h:33.33}] },
  // 6 foto
  { id:'6_2x3', name:'6 - Grid 2x3', photoCount:6, category:'kotak', cells:[{x:0,y:0,w:33.34,h:50},{x:33.34,y:0,w:33.33,h:50},{x:66.67,y:0,w:33.33,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}] },
  { id:'6_3x2', name:'6 - Grid 3x2', photoCount:6, category:'kotak', cells:[{x:0,y:0,w:50,h:33.34},{x:50,y:0,w:50,h:33.34},{x:0,y:33.34,w:50,h:33.33},{x:50,y:33.34,w:50,h:33.33},{x:0,y:66.67,w:50,h:33.33},{x:50,y:66.67,w:50,h:33.33}] },
  { id:'6_1l5r',name:'6 - 1 Besar + 5', photoCount:6, category:'kotak', cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:20},{x:55,y:20,w:45,h:20},{x:55,y:40,w:45,h:20},{x:55,y:60,w:45,h:20},{x:55,y:80,w:45,h:20}] },

  // ══════════════════════════════════════════
  // DIAGONAL — garis miring
  // ══════════════════════════════════════════
  {
    id:'2_diag_slash', name:'2 Miring /', photoCount:2, category:'diagonal',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 60% 0%, 40% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(60% 0%, 100% 0%, 100% 100%, 40% 100%)' },
    ],
  },
  {
    id:'2_diag_back', name:'2 Miring \\', photoCount:2, category:'diagonal',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 40% 0%, 60% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(40% 0%, 100% 0%, 100% 100%, 60% 100%)' },
    ],
  },
  {
    id:'2_diag_horiz', name:'2 Miring —', photoCount:2, category:'diagonal',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 100% 0%, 100% 40%, 0% 60%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 60%, 100% 40%, 100% 100%, 0% 100%)' },
    ],
  },
  {
    id:'3_diag_strips', name:'3 Strip Diagonal', photoCount:3, category:'diagonal',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 36% 0%, 22% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(36% 0%, 70% 0%, 56% 100%, 22% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(70% 0%, 100% 0%, 100% 100%, 56% 100%)' },
    ],
  },
  {
    id:'4_diag_x', name:'4 Segitiga X', photoCount:4, category:'diagonal',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 100% 0%, 50% 50%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(100% 0%, 100% 100%, 50% 50%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 100%, 100% 100%, 50% 50%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 50% 50%, 0% 100%)' },
    ],
  },
  {
    id:'4_diag_lr_strips', name:'4 Strip Diagonal', photoCount:4, category:'diagonal',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 28% 0%, 16% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(28% 0%, 53% 0%, 41% 100%, 16% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(53% 0%, 78% 0%, 66% 100%, 41% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(78% 0%, 100% 0%, 100% 100%, 66% 100%)' },
    ],
  },
  {
    id:'3_diag_fan', name:'3 Kipas Pojok', photoCount:3, category:'diagonal',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 100%, 0% 0%, 100% 0%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 100%, 100% 0%, 100% 55%, 45% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 100%, 45% 100%, 100% 55%, 100% 100%)' },
    ],
  },

  // ══════════════════════════════════════════
  // CHEVRON — anak panah / V / >
  // ══════════════════════════════════════════
  {
    id:'2_arrow_right', name:'2 Panah →', photoCount:2, category:'chevron',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 55% 0%, 78% 50%, 55% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(55% 0%, 100% 0%, 100% 100%, 55% 100%, 78% 50%)' },
    ],
  },
  {
    id:'2_arrow_left', name:'2 Panah ←', photoCount:2, category:'chevron',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 45% 0%, 22% 50%, 45% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(45% 0%, 100% 0%, 100% 100%, 45% 100%, 22% 50%)' },
    ],
  },
  {
    id:'3_chevron_lr', name:'3 Chevron →', photoCount:3, category:'chevron',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 28% 0%, 50% 50%, 28% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(28% 0%, 62% 0%, 84% 50%, 62% 100%, 28% 100%, 50% 50%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(62% 0%, 100% 0%, 100% 100%, 62% 100%, 84% 50%)' },
    ],
  },
  {
    id:'3_chevron_rl', name:'3 Chevron ←', photoCount:3, category:'chevron',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 38% 0%, 16% 50%, 38% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(38% 0%, 72% 0%, 50% 50%, 72% 100%, 38% 100%, 16% 50%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(72% 0%, 100% 0%, 100% 100%, 72% 100%, 50% 50%)' },
    ],
  },
  {
    id:'2_vshape', name:'2 Bentuk V', photoCount:2, category:'chevron',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 100% 0%, 50% 60%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 100%, 50% 60%, 100% 0%, 100% 100%)' },
    ],
  },
  {
    id:'4_arrow_chain', name:'4 Rantai Panah', photoCount:4, category:'chevron',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 30% 0%, 42% 50%, 30% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(30% 0%, 55% 0%, 67% 50%, 55% 100%, 30% 100%, 42% 50%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(55% 0%, 78% 0%, 90% 50%, 78% 100%, 55% 100%, 67% 50%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(78% 0%, 100% 0%, 100% 100%, 78% 100%, 90% 50%)' },
    ],
  },

  // ══════════════════════════════════════════
  // GELOMBANG — kurva & zigzag
  // ══════════════════════════════════════════
  {
    id:'2_wave_vert', name:'2 Gelombang |', photoCount:2, category:'gelombang',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 46% 0%, 50% 8%, 55% 17%, 57% 25%, 55% 33%, 50% 42%, 45% 50%, 43% 58%, 46% 67%, 52% 75%, 54% 83%, 52% 92%, 48% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(46% 0%, 100% 0%, 100% 100%, 48% 100%, 52% 92%, 54% 83%, 52% 75%, 46% 67%, 43% 58%, 45% 50%, 50% 42%, 55% 33%, 57% 25%, 55% 17%, 50% 8%)' },
    ],
  },
  {
    id:'2_wave_horiz', name:'2 Gelombang —', photoCount:2, category:'gelombang',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 100% 0%, 100% 46%, 92% 50%, 83% 55%, 75% 57%, 67% 55%, 58% 50%, 50% 45%, 42% 43%, 33% 46%, 25% 52%, 17% 54%, 8% 52%, 0% 48%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 48%, 8% 52%, 17% 54%, 25% 52%, 33% 46%, 42% 43%, 50% 45%, 58% 50%, 67% 55%, 75% 57%, 83% 55%, 92% 50%, 100% 46%, 100% 100%, 0% 100%)' },
    ],
  },
  {
    id:'3_zigzag', name:'3 Zigzag', photoCount:3, category:'gelombang',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 33% 0%, 36% 17%, 30% 33%, 36% 50%, 30% 67%, 36% 83%, 33% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(33% 0%, 67% 0%, 70% 17%, 64% 33%, 70% 50%, 64% 67%, 70% 83%, 67% 100%, 33% 100%, 36% 83%, 30% 67%, 36% 50%, 30% 33%, 36% 17%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(67% 0%, 100% 0%, 100% 100%, 67% 100%, 70% 83%, 64% 67%, 70% 50%, 64% 33%, 70% 17%)' },
    ],
  },
  {
    id:'2_ripple', name:'2 Riak', photoCount:2, category:'gelombang',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 100% 0%, 100% 35%, 88% 38%, 75% 46%, 63% 54%, 50% 58%, 38% 54%, 25% 46%, 13% 38%, 0% 35%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 35%, 13% 38%, 25% 46%, 38% 54%, 50% 58%, 63% 54%, 75% 46%, 88% 38%, 100% 35%, 100% 100%, 0% 100%)' },
    ],
  },
  {
    id:'4_wave_quad', name:'4 Gelombang Quad', photoCount:4, category:'gelombang',
    cells:[
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 0%, 48% 0%, 52% 8%, 55% 17%, 53% 25%, 48% 33%, 48% 100%, 0% 100%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(48% 0%, 100% 0%, 100% 100%, 48% 100%, 48% 33%, 53% 25%, 55% 17%, 52% 8%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(0% 100%, 48% 100%, 48% 67%, 44% 58%, 47% 50%, 48% 33%, 0% 33%)' },
      { x:0,y:0,w:100,h:100, clipPath:'polygon(48% 100%, 100% 100%, 100% 33%, 48% 33%, 47% 50%, 44% 58%, 48% 67%)' },
    ],
  },
];

const ASPECT_OPTIONS = [
  { value:'1:1',  label:'1:1',  sub:'Square' },
  { value:'9:16', label:'9:16', sub:'Portrait' },
  { value:'16:9', label:'16:9', sub:'Landscape' },
  { value:'4:5',  label:'4:5',  sub:'Instagram' },
  { value:'3:4',  label:'3:4',  sub:'Portrait' },
  { value:'4:3',  label:'4:3',  sub:'Landscape' },
];

const BG_PRESETS = ['#000000','#ffffff','#1e293b','#0f0f0f','#4f46e5','#be185d','#b45309','#166534'];

const CATEGORY_LABELS: Record<string, string> = {
  kotak: '⬜ Kotak',
  diagonal: '↗ Diagonal',
  chevron: '❯ Chevron',
  gelombang: '〜 Gelombang',
};

// =============================================
// CELL EDITOR
// =============================================
interface CellEditorProps {
  cs: CellState; idx: number;
  isDragOver: boolean; isSelected: boolean;
  onSelect: (i: number) => void;
  onUpdate: (i: number, patch: Partial<CellState>) => void;
  onUpload: (i: number, file: File) => void;
  onRemove: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, i: number) => void;
}

const CellEditor: React.FC<CellEditorProps> = ({
  cs, idx, isDragOver, isSelected,
  onSelect, onUpdate, onUpload, onRemove,
  onDragOver, onDragLeave, onDrop,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging   = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cs.imageSrc) return;
    e.preventDefault();
    onSelect(idx);
    isDragging.current = true;
    const startX = e.clientX, startY = e.clientY;
    const startOffX = cs.offsetX, startOffY = cs.offsetY;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cW = rect.width, cH = rect.height, s = cs.scale;
      const { maxOffX, maxOffY } = calcMaxOffset(cs.imgNaturalW, cs.imgNaturalH, cW, cH, s);
      onUpdate(idx, {
        offsetX: Math.max(-maxOffX, Math.min(maxOffX, startOffX + (ev.clientX - startX) / (cW * s))),
        offsetY: Math.max(-maxOffY, Math.min(maxOffY, startOffY + (ev.clientY - startY) / (cH * s))),
      });
    };
    const onUp = () => { isDragging.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const touchStart = useRef({ x:0, y:0, offX:0, offY:0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!cs.imageSrc || e.touches.length !== 1) return;
    onSelect(idx); isDragging.current = true;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, offX: cs.offsetX, offY: cs.offsetY };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1 || !containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const cW = rect.width, cH = rect.height, s = cs.scale;
    const { maxOffX, maxOffY } = calcMaxOffset(cs.imgNaturalW, cs.imgNaturalH, cW, cH, s);
    onUpdate(idx, {
      offsetX: Math.max(-maxOffX, Math.min(maxOffX, touchStart.current.offX + (e.touches[0].clientX - touchStart.current.x) / (cW * s))),
      offsetY: Math.max(-maxOffY, Math.min(maxOffY, touchStart.current.offY + (e.touches[0].clientY - touchStart.current.y) / (cH * s))),
    });
  };
  const handleTouchEnd = () => { isDragging.current = false; };

  const getImgStyle = (): React.CSSProperties => {
    if (!cs.imageSrc) return { display: 'none' };
    return {
      display: 'block', width: '100%', height: '100%',
      objectFit: 'contain' as const, objectPosition: 'center',
      transformOrigin: 'center center',
      transform: `scale(${cs.scale}) translate(${cs.offsetX * 100}%, ${cs.offsetY * 100}%)`,
      userSelect: 'none' as const, pointerEvents: 'none' as const, willChange: 'transform',
    };
  };

  return (
    <div className="relative w-full h-full"
      onDragOver={e => onDragOver(e, idx)} onDragLeave={onDragLeave} onDrop={e => onDrop(e, idx)}>
      <div ref={containerRef}
        className={`relative w-full h-full overflow-hidden group ${cs.imageSrc ? 'cursor-grab active:cursor-grabbing' : ''} ${isSelected && cs.imageSrc ? 'ring-2 ring-inset ring-indigo-500' : ''} ${isDragOver ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
        style={{ background: 'rgba(15,23,42,0.9)' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onClick={() => cs.imageSrc && onSelect(idx)}
      >
        {cs.imageSrc ? (
          <>
            <img src={cs.imageSrc} alt="" draggable={false} style={getImgStyle()} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-start justify-between p-1 pointer-events-none group-hover:pointer-events-auto">
              <span className="text-[9px] font-bold bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center">{idx + 1}</span>
              <button type="button" onClick={e => { e.stopPropagation(); onRemove(idx); }} className="w-5 h-5 bg-red-600/90 hover:bg-red-500 text-white rounded text-xs flex items-center justify-center">✕</button>
            </div>
            <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="text-[8px] text-white/80 bg-black/60 px-1 py-0.5 rounded font-mono">{(cs.scale * 100).toFixed(0)}%</span>
            </div>
            {isSelected && (
              <div className="absolute bottom-1 right-1 pointer-events-none">
                <span className="text-[8px] text-white/70 bg-black/60 px-1 py-0.5 rounded">✋ geser</span>
              </div>
            )}
          </>
        ) : isDragOver ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8"/></svg>
            <span className="text-[10px] text-indigo-300 font-bold">Lepaskan!</span>
          </div>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30 transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { onUpload(idx, e.target.files[0]); onSelect(idx); } e.target.value = ''; }} />
            <svg className="w-4 h-4 text-slate-500 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
            <span className="text-[9px] text-slate-500">Foto {idx + 1}</span>
          </label>
        )}
      </div>
    </div>
  );
};

// =============================================
// MAIN COMPONENT
// =============================================
const CollageEditor: React.FC = () => {
  const [selectedLayout, setSelectedLayout] = useState<CollageLayout>(COLLAGE_LAYOUTS[0]);
  const [aspectRatio, setAspectRatio]   = useState('1:1');
  const [gap, setGap]                   = useState(4);
  const [bgColor, setBgColor]           = useState('#000000');
  const [cells, setCells]               = useState<CellState[]>([DEFAULT_CELL()]);
  const [filterCount, setFilterCount]   = useState<number | null>(null);
  const [filterCat, setFilterCat]       = useState<string | null>(null);
  const [isExporting, setIsExporting]   = useState(false);
  const [dragOverCell, setDragOverCell] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  useEffect(() => {
    setCells(prev => selectedLayout.cells.map((_, i) => prev[i] ?? DEFAULT_CELL()));
    setSelectedCell(null);
  }, [selectedLayout]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-collage-area]')) setSelectedCell(null);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const updateCell     = useCallback((i: number, patch: Partial<CellState>) => setCells(prev => prev.map((c, ci) => ci !== i ? c : { ...c, ...patch })), []);
  const handleRemove   = useCallback((i: number) => { updateCell(i, DEFAULT_CELL()); setSelectedCell(null); }, [updateCell]);
  const handleDragOver = useCallback((e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverCell(i); }, []);
  const handleDragLeave= useCallback(() => setDragOverCell(null), []);
  const handleUpload = useCallback((i: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => updateCell(i, { imageSrc: src, imgNaturalW: img.naturalWidth, imgNaturalH: img.naturalHeight, scale: 1, offsetX: 0, offsetY: 0 });
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [updateCell]);


  const handleDrop     = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault(); setDragOverCell(null);
    const f = e.dataTransfer.files[0];
    if (f) { handleUpload(i, f); setSelectedCell(i); }
  }, []);


  // getCellStyle: untuk kotak pakai rect+gap, untuk shaped pakai 100%x100%+clipPath
  const getCellStyle = useCallback((cell: CollageCell): React.CSSProperties => {
    if (cell.clipPath) {
      return { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', clipPath: cell.clipPath };
    }
    const g = gap / 2, eps = 0.05;
    return {
      position: 'absolute',
      left: `${cell.x}%`, top: `${cell.y}%`, width: `${cell.w}%`, height: `${cell.h}%`,
      paddingTop:    cell.y < eps ? 0 : g,
      paddingBottom: cell.y + cell.h > 100 - eps ? 0 : g,
      paddingLeft:   cell.x < eps ? 0 : g,
      paddingRight:  cell.x + cell.w > 100 - eps ? 0 : g,
    };
  }, [gap]);

  const handleScaleChange = useCallback((i: number, newScale: number) => {
    setCells(prev => prev.map((c, ci) => {
      if (ci !== i) return c;
      const iW = c.imgNaturalW || 1, iH = c.imgNaturalH || 1;
      const { maxOffX, maxOffY } = calcMaxOffset(iW, iH, iW, iH, newScale);
      return { ...c, scale: newScale, offsetX: Math.max(-maxOffX, Math.min(maxOffX, c.offsetX)), offsetY: Math.max(-maxOffY, Math.min(maxOffY, c.offsetY)) };
    }));
  }, []);

  // Export canvas
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [expW, expH] = aspectRatio.split(':').map(Number);
      const W = 1080, H = Math.round(W * expH / expW);
      const gPx = gap, eps = 0.05;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < selectedLayout.cells.length; i++) {
        const cell = selectedLayout.cells[i];
        const cs   = cells[i];
        if (!cs?.imageSrc) continue;

        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = cs.imageSrc!;
          if (im.complete && im.naturalWidth > 0) res(im);
        });

        // Tentukan bounding box cell di canvas
        let cX: number, cY: number, cW: number, cH: number;
        if (cell.clipPath) {
          // Shaped: full canvas, clip polygon
          cX = 0; cY = 0; cW = W; cH = H;
        } else {
          const pT = cell.y < eps ? 0 : gPx / 2;
          const pB = cell.y + cell.h > 100 - eps ? 0 : gPx / 2;
          const pL = cell.x < eps ? 0 : gPx / 2;
          const pR = cell.x + cell.w > 100 - eps ? 0 : gPx / 2;
          cX = (cell.x / 100) * W + pL; cY = (cell.y / 100) * H + pT;
          cW = (cell.w / 100) * W - pL - pR; cH = (cell.h / 100) * H - pT - pB;
        }

        // Contain + zoom + pan
        const containScale = Math.min(cW / img.naturalWidth, cH / img.naturalHeight);
        const containW = img.naturalWidth  * containScale;
        const containH = img.naturalHeight * containScale;
        const finalW   = containW * cs.scale;
        const finalH   = containH * cs.scale;
        const cellCX   = cX + cW / 2;
        const cellCY   = cY + cH / 2;
        const imgCX    = cellCX + cs.offsetX * cW * cs.scale;
        const imgCY    = cellCY + cs.offsetY * cH * cs.scale;
        const drawX    = imgCX - finalW / 2;
        const drawY    = imgCY - finalH / 2;

        ctx.save();
        ctx.beginPath();
        if (cell.clipPath) {
          // Parse polygon% → canvas px
          const pts = parsePolygonToCanvas(cell.clipPath, W, H);
          if (pts.length > 0) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
            ctx.closePath();
          } else {
            ctx.rect(0, 0, W, H);
          }
        } else {
          ctx.rect(cX, cY, cW, cH);
        }
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, finalW, finalH);
        ctx.restore();
      }

      canvas.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `kolase_${Date.now()}.png`;
        document.body.appendChild(a); a.click();
        requestAnimationFrame(() => { document.body.removeChild(a); URL.revokeObjectURL(url); });
      }, 'image/png');
    } catch (err) { console.error('Export error:', err); }
    finally { setIsExporting(false); }
  };

  const [arW, arH]  = aspectRatio.split(':').map(Number);
  const photoCounts = [...new Set(COLLAGE_LAYOUTS.map(l => l.photoCount))].sort((a,b) => a - b);
  const categories  = ['kotak', 'diagonal', 'chevron', 'gelombang'];

  const filteredLayouts = COLLAGE_LAYOUTS.filter(l =>
    (filterCount === null || l.photoCount === filterCount) &&
    (filterCat   === null || l.category  === filterCat)
  );

  const filledCount = cells.filter(c => c?.imageSrc).length;
  const selCs       = selectedCell !== null ? cells[selectedCell] : null;

  return (
    <div className="space-y-6" data-collage-area>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ═══ PANEL KIRI ═══ */}
        <div className="space-y-5">

          {/* Aspek Rasio */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Aspek Rasio Output</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_OPTIONS.map(opt => (
                <button key={opt.value} type="button" onClick={() => setAspectRatio(opt.value)}
                  className={`py-2 px-2 rounded-lg text-center transition-all border ${aspectRatio === opt.value ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:border-indigo-500/50'}`}>
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className="text-[10px] opacity-70">{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Kontrol foto terpilih */}
          <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${selCs?.imageSrc ? 'border-indigo-500/60 bg-indigo-950/40' : 'border-slate-700 bg-slate-800/40'}`}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${selCs?.imageSrc ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-sm font-semibold text-slate-300">
                  {selectedCell !== null && selCs?.imageSrc ? `Foto ${selectedCell + 1} Dipilih` : 'Klik foto untuk edit'}
                </span>
              </div>
              {selCs?.imageSrc && (
                <button type="button" onClick={() => updateCell(selectedCell!, { scale:1, offsetX:0, offsetY:0 })}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors">↺ Reset</button>
              )}
            </div>
            <div className="px-4 py-3 space-y-4">
              {selCs?.imageSrc ? (
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-400">Zoom / Perbesar</label>
                      <span className="text-sm font-bold text-indigo-400 font-mono bg-slate-700 px-2 py-0.5 rounded">{(selCs.scale * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => handleScaleChange(selectedCell!, Math.max(0.3, selCs.scale - 0.1))}
                        className="w-8 h-8 flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center text-lg font-bold transition-colors select-none">−</button>
                      <input type="range" min={30} max={300} step={1} value={Math.round(selCs.scale * 100)}
                        onChange={e => handleScaleChange(selectedCell!, Number(e.target.value) / 100)}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700" />
                      <button type="button" onClick={() => handleScaleChange(selectedCell!, Math.min(3, selCs.scale + 0.1))}
                        className="w-8 h-8 flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center text-lg font-bold transition-colors select-none">+</button>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-10"><span>30%</span><span>300%</span></div>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-700/40 rounded-lg px-3 py-2">
                    <span className="text-base">✋</span>
                    <div>
                      <p className="text-[11px] text-indigo-300 font-semibold">Drag langsung untuk geser posisi</p>
                      <p className="text-[10px] text-slate-500">Zoom in lalu drag untuk crop bagian tertentu</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500 text-center py-3">Upload foto ke slot, lalu klik untuk mengatur zoom &amp; posisi</p>
              )}
            </div>
          </div>

          {/* Gap — hanya efektif untuk layout kotak */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Jarak Antar Foto</label>
              <span className="text-sm font-bold text-indigo-400 bg-slate-700 px-2 py-0.5 rounded">{gap}px</span>
            </div>
            <input type="range" min={0} max={24} value={gap} onChange={e => setGap(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700" />
            <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Tanpa Jarak</span><span>Lebar</span></div>
            {selectedLayout.cells.some(c => c.clipPath) && (
              <p className="text-[10px] text-amber-400/70 mt-1">⚡ Jarak tidak berlaku untuk layout berbentuk (diagonal/gelombang) — latar background terlihat sebagai pemisah</p>
            )}
          </div>

          {/* Background */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Warna Background</label>
            <div className="flex items-center gap-3 mb-2">
              <label className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600 hover:border-indigo-500 overflow-hidden flex-shrink-0" style={{ background: bgColor }}>
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="opacity-0 w-0 h-0" />
              </label>
              <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500" />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {BG_PRESETS.map(c => (
                <button key={c} type="button" onClick={() => setBgColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${bgColor === c ? 'border-white scale-110' : 'border-slate-600'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Layout Picker */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Pilih Layout Kolase</label>

            {/* Filter jumlah foto */}
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <button type="button" onClick={() => setFilterCount(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterCount === null ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Semua</button>
              {photoCounts.map(n => (
                <button key={n} type="button" onClick={() => setFilterCount(n === filterCount ? null : n)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterCount === n ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{n} Foto</button>
              ))}
            </div>

            {/* Filter kategori bentuk */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button type="button" onClick={() => setFilterCat(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterCat === null ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Semua Bentuk</button>
              {categories.map(cat => (
                <button key={cat} type="button" onClick={() => setFilterCat(cat === filterCat ? null : cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterCat === cat ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredLayouts.map(layout => {
                const isActive = selectedLayout.id === layout.id;
                return (
                  <button key={layout.id} type="button" onClick={() => setSelectedLayout(layout)} title={layout.name}
                    className={`group rounded-lg overflow-hidden transition-all ${isActive ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-800 scale-105' : 'ring-1 ring-slate-600 hover:ring-indigo-400'}`}>
                    <div className="aspect-square bg-slate-900 relative overflow-hidden">
                      {layout.cells.map((cell, ci) => (
                        <div key={ci}
                          className={`absolute border border-slate-900 ${isActive ? 'bg-indigo-500/70' : 'bg-slate-500/60 group-hover:bg-indigo-400/50'}`}
                          style={cell.clipPath
                            ? { left:0, top:0, width:'100%', height:'100%', clipPath: cell.clipPath }
                            : { left:`${cell.x}%`, top:`${cell.y}%`, width:`${cell.w}%`, height:`${cell.h}%` }
                          }
                        />
                      ))}
                    </div>
                    <div className="bg-slate-800 px-1 py-0.5">
                      <p className="text-[8px] text-slate-400 truncate text-center">{layout.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export */}
          <div className="pt-2">
            <button type="button" onClick={handleExport} disabled={isExporting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5">
              {isExporting
                ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Mengekspor...</>
                : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Download Kolase (PNG)</>
              }
            </button>
            <p className="text-center text-xs text-slate-500 mt-1.5">Output 1080px × aspek rasio terpilih</p>
          </div>
        </div>

        {/* ═══ PANEL KANAN: Preview ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Preview Kolase</span>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                selectedLayout.category === 'diagonal' ? 'bg-amber-600/30 text-amber-300' :
                selectedLayout.category === 'chevron'  ? 'bg-green-600/30 text-green-300' :
                selectedLayout.category === 'gelombang'? 'bg-blue-600/30 text-blue-300' :
                'bg-slate-600/30 text-slate-400'
              }`}>{CATEGORY_LABELS[selectedLayout.category]}</span>
              <span className="text-xs text-slate-500 italic">{selectedLayout.name} · {aspectRatio}</span>
            </div>
          </div>

          <div className="w-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-700 relative"
            style={{ aspectRatio: `${arW} / ${arH}`, background: bgColor }}>
            {selectedLayout.cells.map((cell, i) => (
              <div key={`${selectedLayout.id}-${i}`} style={getCellStyle(cell)}>
                <CellEditor
                  cs={cells[i] ?? DEFAULT_CELL()} idx={i}
                  isDragOver={dragOverCell === i} isSelected={selectedCell === i}
                  onSelect={setSelectedCell} onUpdate={updateCell}
                  onUpload={handleUpload} onRemove={handleRemove}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              {selectedLayout.cells.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${cells[i]?.imageSrc ? (selectedCell === i ? 'bg-indigo-400 w-5' : 'bg-indigo-600 w-4') : 'bg-slate-600 w-2'}`} />
              ))}
            </div>
            <span className="text-xs text-slate-500">{filledCount} / {selectedLayout.cells.length} foto</span>
          </div>

          <div className="mt-3 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400">💡 Tips:</p>
            <p className="text-[10px] text-slate-500">1. Klik foto di preview → border biru muncul</p>
            <p className="text-[10px] text-slate-500">2. <span className="text-slate-300">Drag langsung</span> untuk geser posisi gambar</p>
            <p className="text-[10px] text-slate-500">3. Slider +/− untuk zoom in/out</p>
            <p className="text-[10px] text-slate-500">4. Warna background terlihat sebagai pemisah di layout diagonal/gelombang</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CollageEditor;
