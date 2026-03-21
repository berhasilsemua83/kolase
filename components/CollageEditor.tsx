import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================
// TYPES
// =============================================
interface CollageCell {
  x: number;
  y: number;
  w: number;
  h: number;
  clip?: string;
}

interface CollageLayout {
  id: string;
  name: string;
  photoCount: number;
  category: 'kotak' | 'diagonal' | 'chevron' | 'gelombang';
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
// LAYER TYPES
// =============================================
interface BaseLayer {
  id: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}
interface TextLayer extends BaseLayer {
  kind: 'text';
  text: string;
  font: string;
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
}
interface StickerLayer extends BaseLayer {
  kind: 'sticker';
  symbol: string;
}
type Layer = TextLayer | StickerLayer;

const FONTS = [
  { id:'sans',    label:'Sans',     css:'Arial, sans-serif' },
  { id:'serif',   label:'Serif',    css:'Georgia, serif' },
  { id:'mono',    label:'Mono',     css:'"Courier New", monospace' },
  { id:'rounded', label:'Rounded',  css:'"Trebuchet MS", sans-serif' },
  { id:'display', label:'Display',  css:'Impact, fantasy' },
  { id:'script',  label:'Script',   css:'"Palatino Linotype", cursive' },
];

const STICKERS = [
  { group:'Panah',   items:['→','←','↑','↓','↗','↙','↔','↕','➡','⬅','⬆','⬇','➜','➤','⇒'] },
  { group:'Hati',    items:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💘','💝'] },
  { group:'Bintang', items:['⭐','🌟','✨','💫','⚡','🔥','💥','❄️','🌈','☀️','🌙','⚽','🎯','🏆','🎁'] },
  { group:'Tanda',   items:['✅','❌','⚠️','❗','❓','💯','🔴','🟡','🟢','🔵','⬛','🟥','📍','📌','🎀'] },
  { group:'Wajah',   items:['😊','😂','🥰','😎','😍','🤩','👍','👎','👏','🙌','💪','🤞','✌️','🫶','🎉'] },
];

const TEXT_COLORS = ['#ffffff','#000000','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4'];

const toClip = (s: string) =>
  `polygon(${s.split(',').map(p => p.trim().split(' ').join('% ') + '%').join(', ')})`;

// =============================================
// LAYOUTS (tidak berubah)
// =============================================
const COLLAGE_LAYOUTS: CollageLayout[] = [
  { id:'2_lr_50', name:'50/50 Kiri-Kanan',  category:'kotak', photoCount:2, cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:100}] },
  { id:'2_tb_50', name:'50/50 Atas-Bawah',  category:'kotak', photoCount:2, cells:[{x:0,y:0,w:100,h:50},{x:0,y:50,w:100,h:50}] },
  { id:'2_lr_60', name:'60/40 Kiri-Kanan',  category:'kotak', photoCount:2, cells:[{x:0,y:0,w:60,h:100},{x:60,y:0,w:40,h:100}] },
  { id:'2_lr_70', name:'70/30 Kiri-Kanan',  category:'kotak', photoCount:2, cells:[{x:0,y:0,w:70,h:100},{x:70,y:0,w:30,h:100}] },
  { id:'2_tb_65', name:'65/35 Atas-Bawah',  category:'kotak', photoCount:2, cells:[{x:0,y:0,w:100,h:65},{x:0,y:65,w:100,h:35}] },
  { id:'3_1l_2r', name:'1 Besar Kiri + 2 Kanan',     category:'kotak', photoCount:3, cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:50},{x:55,y:50,w:45,h:50}] },
  { id:'3_2l_1r', name:'2 Kiri + 1 Besar Kanan',     category:'kotak', photoCount:3, cells:[{x:0,y:0,w:45,h:50},{x:0,y:50,w:45,h:50},{x:45,y:0,w:55,h:100}] },
  { id:'3_1t_2b', name:'1 Besar Atas + 2 Bawah',     category:'kotak', photoCount:3, cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:50,h:45},{x:50,y:55,w:50,h:45}] },
  { id:'3_2t_1b', name:'2 Atas + 1 Besar Bawah',     category:'kotak', photoCount:3, cells:[{x:0,y:0,w:50,h:45},{x:50,y:0,w:50,h:45},{x:0,y:45,w:100,h:55}] },
  { id:'3_asym',  name:'1 Kiri + 2 Kanan Asimetris', category:'kotak', photoCount:3, cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:40},{x:50,y:40,w:50,h:60}] },
  { id:'4_grid',  name:'2x2 Grid Sama Rata',      category:'kotak', photoCount:4, cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:50,h:50},{x:50,y:50,w:50,h:50}] },
  { id:'4_1l_3r', name:'1 Besar Kiri + 3 Kanan',  category:'kotak', photoCount:4, cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:33.34},{x:55,y:33.34,w:45,h:33.33},{x:55,y:66.67,w:45,h:33.33}] },
  { id:'4_3l_1r', name:'3 Kiri + 1 Besar Kanan',  category:'kotak', photoCount:4, cells:[{x:0,y:0,w:45,h:33.34},{x:0,y:33.34,w:45,h:33.33},{x:0,y:66.67,w:45,h:33.33},{x:45,y:0,w:55,h:100}] },
  { id:'4_1t_3b', name:'1 Besar Atas + 3 Bawah',  category:'kotak', photoCount:4, cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:33.34,h:45},{x:33.34,y:55,w:33.33,h:45},{x:66.67,y:55,w:33.33,h:45}] },
  { id:'4_3t_1b', name:'3 Atas + 1 Besar Bawah',  category:'kotak', photoCount:4, cells:[{x:0,y:0,w:33.34,h:45},{x:33.34,y:0,w:33.33,h:45},{x:66.67,y:0,w:33.33,h:45},{x:0,y:45,w:100,h:55}] },
  { id:'4_lg_sm', name:'1 Besar + 3 Strip Bawah',  category:'kotak', photoCount:4, cells:[{x:0,y:0,w:100,h:65},{x:0,y:65,w:33.34,h:35},{x:33.34,y:65,w:33.33,h:35},{x:66.67,y:65,w:33.33,h:35}] },
  { id:'5_1tl_4',   name:'1 Pojok Besar + 4 Kecil', category:'kotak', photoCount:5, cells:[{x:0,y:0,w:60,h:60},{x:60,y:0,w:40,h:30},{x:60,y:30,w:40,h:30},{x:0,y:60,w:50,h:40},{x:50,y:60,w:50,h:40}] },
  { id:'5_2t_3b',   name:'2 Atas + 3 Bawah',        category:'kotak', photoCount:5, cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}] },
  { id:'5_3t_2b',   name:'3 Atas + 2 Bawah',        category:'kotak', photoCount:5, cells:[{x:0,y:0,w:33.34,h:50},{x:33.34,y:0,w:33.33,h:50},{x:66.67,y:0,w:33.33,h:50},{x:0,y:50,w:50,h:50},{x:50,y:50,w:50,h:50}] },
  { id:'5_1l_4r',   name:'1 Besar Kiri + 4 Kanan',  category:'kotak', photoCount:5, cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:25},{x:50,y:25,w:50,h:25},{x:50,y:50,w:50,h:25},{x:50,y:75,w:50,h:25}] },
  { id:'5_4l_1r',   name:'4 Kiri + 1 Besar Kanan',  category:'kotak', photoCount:5, cells:[{x:0,y:0,w:50,h:25},{x:0,y:25,w:50,h:25},{x:0,y:50,w:50,h:25},{x:0,y:75,w:50,h:25},{x:50,y:0,w:50,h:100}] },
  { id:'5_cross',   name:'Pola Plus / Cross',        category:'kotak', photoCount:5, cells:[{x:33.33,y:0,w:33.34,h:33.33},{x:0,y:33.33,w:33.33,h:33.34},{x:33.33,y:33.33,w:33.34,h:33.34},{x:66.67,y:33.33,w:33.33,h:33.34},{x:33.33,y:66.67,w:33.34,h:33.33}] },
  { id:'5_1c_4cor', name:'1 Tengah + 4 Sudut',      category:'kotak', photoCount:5, cells:[{x:25,y:25,w:50,h:50},{x:0,y:0,w:25,h:25},{x:75,y:0,w:25,h:25},{x:0,y:75,w:25,h:25},{x:75,y:75,w:25,h:25}] },
  { id:'6_2x3',  name:'6 - Grid 2x3',          category:'kotak', photoCount:6, cells:[{x:0,y:0,w:33.34,h:50},{x:33.34,y:0,w:33.33,h:50},{x:66.67,y:0,w:33.33,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}] },
  { id:'6_3x2',  name:'6 - Grid 3x2',          category:'kotak', photoCount:6, cells:[{x:0,y:0,w:50,h:33.34},{x:50,y:0,w:50,h:33.34},{x:0,y:33.34,w:50,h:33.33},{x:50,y:33.34,w:50,h:33.33},{x:0,y:66.67,w:50,h:33.33},{x:50,y:66.67,w:50,h:33.33}] },
  { id:'6_1l5r', name:'6 - 1 Besar + 5 Strip',  category:'kotak', photoCount:6, cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:20},{x:55,y:20,w:45,h:20},{x:55,y:40,w:45,h:20},{x:55,y:60,w:45,h:20},{x:55,y:80,w:45,h:20}] },
  { id:'d2_slash', name:'2 Miring /',         category:'diagonal', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,60 0,40 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'60 0,100 0,100 100,40 100' },
  ]},
  { id:'d2_back',  name:'2 Miring \\',        category:'diagonal', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,40 0,60 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'40 0,100 0,100 100,60 100' },
  ]},
  { id:'d2_horiz', name:'2 Miring Horisontal',category:'diagonal', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,100 0,100 40,0 60' },
    { x:0,y:0,w:100,h:100, clip:'0 60,100 40,100 100,0 100' },
  ]},
  { id:'d3_strips',name:'3 Strip Diagonal',   category:'diagonal', photoCount:3, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,36 0,22 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'36 0,70 0,56 100,22 100' },
    { x:0,y:0,w:100,h:100, clip:'70 0,100 0,100 100,56 100' },
  ]},
  { id:'d4_strips',name:'4 Strip Diagonal',   category:'diagonal', photoCount:4, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,28 0,16 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'28 0,53 0,41 100,16 100' },
    { x:0,y:0,w:100,h:100, clip:'53 0,78 0,66 100,41 100' },
    { x:0,y:0,w:100,h:100, clip:'78 0,100 0,100 100,66 100' },
  ]},
  { id:'d4_x',     name:'4 Segitiga X',       category:'diagonal', photoCount:4, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,100 0,50 50' },
    { x:0,y:0,w:100,h:100, clip:'100 0,100 100,50 50' },
    { x:0,y:0,w:100,h:100, clip:'0 100,100 100,50 50' },
    { x:0,y:0,w:100,h:100, clip:'0 0,50 50,0 100' },
  ]},
  { id:'d3_fan',   name:'3 Kipas Pojok',      category:'diagonal', photoCount:3, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 100,0 0,100 0' },
    { x:0,y:0,w:100,h:100, clip:'0 100,100 0,100 55,45 100' },
    { x:0,y:0,w:100,h:100, clip:'0 100,45 100,100 55,100 100' },
  ]},
  { id:'c2_right', name:'2 Panah →',    category:'chevron', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,55 0,78 50,55 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'55 0,100 0,100 100,55 100,78 50' },
  ]},
  { id:'c2_left',  name:'2 Panah ←',    category:'chevron', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,45 0,22 50,45 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'45 0,100 0,100 100,45 100,22 50' },
  ]},
  { id:'c2_v',     name:'2 Bentuk V',   category:'chevron', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,100 0,50 60,0 100' },
    { x:0,y:0,w:100,h:100, clip:'0 100,50 60,100 0,100 100' },
  ]},
  { id:'c3_right', name:'3 Chevron →',  category:'chevron', photoCount:3, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,28 0,50 50,28 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'28 0,62 0,84 50,62 100,28 100,50 50' },
    { x:0,y:0,w:100,h:100, clip:'62 0,100 0,100 100,62 100,84 50' },
  ]},
  { id:'c3_left',  name:'3 Chevron ←',  category:'chevron', photoCount:3, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,38 0,16 50,38 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'38 0,72 0,50 50,72 100,38 100,16 50' },
    { x:0,y:0,w:100,h:100, clip:'72 0,100 0,100 100,72 100,50 50' },
  ]},
  { id:'c4_chain', name:'4 Rantai →',   category:'chevron', photoCount:4, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,30 0,42 50,30 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'30 0,55 0,67 50,55 100,30 100,42 50' },
    { x:0,y:0,w:100,h:100, clip:'55 0,78 0,90 50,78 100,55 100,67 50' },
    { x:0,y:0,w:100,h:100, clip:'78 0,100 0,100 100,78 100,90 50' },
  ]},
  { id:'g2_vert',  name:'2 Gelombang |', category:'gelombang', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,46 0,50 8,55 17,57 25,55 33,50 42,45 50,43 58,46 67,52 75,54 83,52 92,48 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'46 0,100 0,100 100,48 100,52 92,54 83,52 75,46 67,43 58,45 50,50 42,55 33,57 25,55 17,50 8' },
  ]},
  { id:'g2_horiz', name:'2 Gelombang —', category:'gelombang', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,100 0,100 46,92 50,83 55,75 57,67 55,58 50,50 45,42 43,33 46,25 52,17 54,8 52,0 48' },
    { x:0,y:0,w:100,h:100, clip:'0 48,8 52,17 54,25 52,33 46,42 43,50 45,58 50,67 55,75 57,83 55,92 50,100 46,100 100,0 100' },
  ]},
  { id:'g2_ripple',name:'2 Riak',        category:'gelombang', photoCount:2, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,100 0,100 35,88 38,75 46,63 54,50 58,38 54,25 46,13 38,0 35' },
    { x:0,y:0,w:100,h:100, clip:'0 35,13 38,25 46,38 54,50 58,63 54,75 46,88 38,100 35,100 100,0 100' },
  ]},
  { id:'g3_zigzag',name:'3 Zigzag',      category:'gelombang', photoCount:3, cells:[
    { x:0,y:0,w:100,h:100, clip:'0 0,33 0,36 17,30 33,36 50,30 67,36 83,33 100,0 100' },
    { x:0,y:0,w:100,h:100, clip:'33 0,67 0,70 17,64 33,70 50,64 67,70 83,67 100,33 100,36 83,30 67,36 50,30 33,36 17' },
    { x:0,y:0,w:100,h:100, clip:'67 0,100 0,100 100,67 100,70 83,64 67,70 50,64 33,70 17' },
  ]},
];

// =============================================
// CONSTANTS
// =============================================
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
  kotak: '⬜ Kotak', diagonal: '↗ Diagonal', chevron: '❯ Chevron', gelombang: '〜 Gelombang',
};

const DEFAULT_CELL = (): CellState => ({
  imageSrc: null, imgNaturalW: 0, imgNaturalH: 0, scale: 1, offsetX: 0, offsetY: 0,
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
      const cellW = rect.width, cellH = rect.height, s = cs.scale;
      const { maxOffX, maxOffY } = calcMaxOffset(cs.imgNaturalW, cs.imgNaturalH, cellW, cellH, s);
      onUpdate(idx, {
        offsetX: Math.max(-maxOffX, Math.min(maxOffX, startOffX + (ev.clientX - startX) / (cellW * s))),
        offsetY: Math.max(-maxOffY, Math.min(maxOffY, startOffY + (ev.clientY - startY) / (cellH * s))),
      });
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const touchStart   = useRef({ x: 0, y: 0, offX: 0, offY: 0 });
  const pinchStart   = useRef({ dist: 0, scale: 1, midX: 0, midY: 0, offX: 0, offY: 0 });
  const isPinching   = useRef(false);

  const getTouchDist = (t: React.TouchList) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const getTouchMid  = (t: React.TouchList) => ({
    x: (t[0].clientX + t[1].clientX) / 2,
    y: (t[0].clientY + t[1].clientY) / 2,
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!cs.imageSrc) return;
    e.preventDefault();
    onSelect(idx);
    if (e.touches.length === 2) {
      isPinching.current = true;
      isDragging.current = false;
      pinchStart.current = {
        dist:  getTouchDist(e.touches),
        scale: cs.scale,
        midX:  getTouchMid(e.touches).x,
        midY:  getTouchMid(e.touches).y,
        offX:  cs.offsetX,
        offY:  cs.offsetY,
      };
    } else if (e.touches.length === 1 && !isPinching.current) {
      isDragging.current = true;
      touchStart.current = {
        x: e.touches[0].clientX, y: e.touches[0].clientY,
        offX: cs.offsetX, offY: cs.offsetY,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!cs.imageSrc || !containerRef.current) return;
    e.preventDefault();
    const rect  = containerRef.current.getBoundingClientRect();
    const cellW = rect.width, cellH = rect.height;
    if (e.touches.length === 2 && isPinching.current) {
      const newDist  = getTouchDist(e.touches);
      const ratio    = newDist / pinchStart.current.dist;
      const newScale = Math.max(0.3, Math.min(3, pinchStart.current.scale * ratio));
      const { maxOffX, maxOffY } = calcMaxOffset(cs.imgNaturalW, cs.imgNaturalH, cellW, cellH, newScale);
      onUpdate(idx, {
        scale:   newScale,
        offsetX: Math.max(-maxOffX, Math.min(maxOffX, pinchStart.current.offX)),
        offsetY: Math.max(-maxOffY, Math.min(maxOffY, pinchStart.current.offY)),
      });
    } else if (e.touches.length === 1 && isDragging.current && !isPinching.current) {
      const s = cs.scale;
      const { maxOffX, maxOffY } = calcMaxOffset(cs.imgNaturalW, cs.imgNaturalH, cellW, cellH, s);
      onUpdate(idx, {
        offsetX: Math.max(-maxOffX, Math.min(maxOffX, touchStart.current.offX + (e.touches[0].clientX - touchStart.current.x) / (cellW * s))),
        offsetY: Math.max(-maxOffY, Math.min(maxOffY, touchStart.current.offY + (e.touches[0].clientY - touchStart.current.y) / (cellH * s))),
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) isPinching.current = false;
    if (e.touches.length === 0) isDragging.current = false;
    if (e.touches.length === 1 && !isPinching.current) {
      isDragging.current = true;
      touchStart.current = {
        x: e.touches[0].clientX, y: e.touches[0].clientY,
        offX: cs.offsetX, offY: cs.offsetY,
      };
    }
  };

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
        className={`relative w-full h-full overflow-hidden group
          ${cs.imageSrc ? 'cursor-grab active:cursor-grabbing' : ''}
          ${isSelected && cs.imageSrc ? 'ring-2 ring-inset ring-indigo-500' : ''}
          ${isDragOver ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
        style={{ background: 'rgba(15,23,42,0.9)', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onClick={() => cs.imageSrc && onSelect(idx)}
      >
        {cs.imageSrc ? (
          <>
            <img src={cs.imageSrc} alt="" draggable={false} style={getImgStyle()} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-start justify-between p-1 pointer-events-none group-hover:pointer-events-auto">
              <span className="text-[9px] font-bold bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center">{idx + 1}</span>
              <button type="button" onClick={e => { e.stopPropagation(); onRemove(idx); }}
                className="w-5 h-5 bg-red-600/90 hover:bg-red-500 text-white rounded text-xs flex items-center justify-center">✕</button>
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
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v8"/>
            </svg>
            <span className="text-[10px] text-indigo-300 font-bold">Lepaskan!</span>
          </div>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30 transition-colors">
            <input type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) { onUpload(idx, e.target.files[0]); onSelect(idx); } e.target.value = ''; }} />
            <svg className="w-4 h-4 text-slate-500 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/>
            </svg>
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
interface StagedPhoto {
  imageSrc: string;
  imgNaturalW: number;
  imgNaturalH: number;
}

const CollageEditor: React.FC = () => {
  const [staged, setStaged]             = useState<(StagedPhoto | null)[]>([null, null]);
  const [selectedLayout, setSelectedLayout] = useState<CollageLayout | null>(null);
  const [cells, setCells]               = useState<CellState[]>([]);

  const [aspectRatio, setAspectRatio]   = useState('1:1');
  const [gap, setGap]                   = useState(4);
  const [bgColor, setBgColor]           = useState('#000000');
  const [filterCat, setFilterCat]       = useState<string | null>(null);
  const [isExporting, setIsExporting]   = useState(false);
  const [dragOverStaged, setDragOverStaged] = useState<number | null>(null);
  const [dragOverCell, setDragOverCell] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);

  const [layers, setLayers]             = useState<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<'foto'|'teks'|'stiker'>('foto');
  const [showStickerGroup, setShowStickerGroup] = useState('Panah');

  // ── State form teks (inline di CollageEditor) ──
  const [tfFont,   setTfFont]   = useState('sans');
  const [tfColor,  setTfColor]  = useState('#ffffff');
  const [tfSize,   setTfSize]   = useState(40);
  const [tfBold,   setTfBold]   = useState(false);
  const [tfItalic, setTfItalic] = useState(false);
  const [tfShadow, setTfShadow] = useState(true);
  const tfTextareaRef = useRef<HTMLTextAreaElement>(null);
  const tfPreviewRef  = useRef<HTMLSpanElement>(null);

  const previewRef = useRef<HTMLDivElement>(null);

  // Ref untuk drag layer (1 jari)
  const layerDrag = useRef<{ id:string; startX:number; startY:number; origX:number; origY:number } | null>(null);

  // FIX PINCH: Ref baru untuk melacak state pinch-to-resize layer
  const layerPinch = useRef<{ id: string; startDist: number; startSize: number } | null>(null);

  const filledCount = staged.filter(s => s !== null).length;

  const matchingLayouts = filledCount > 0
    ? COLLAGE_LAYOUTS.filter(l =>
        l.photoCount === filledCount &&
        (filterCat === null || l.category === filterCat)
      )
    : [];

  const handleSelectLayout = useCallback((layout: CollageLayout) => {
    setSelectedLayout(layout);
    setSelectedCell(null);
    const newCells: CellState[] = layout.cells.map((_, i) => {
      const s = staged[i];
      if (s) return { imageSrc: s.imageSrc, imgNaturalW: s.imgNaturalW, imgNaturalH: s.imgNaturalH, scale: 1, offsetX: 0, offsetY: 0 };
      return DEFAULT_CELL();
    });
    setCells(newCells);
  }, [staged]);

  useEffect(() => {
    if (!selectedLayout) return;
    if (filledCount !== selectedLayout.photoCount) {
      setSelectedLayout(null);
      setCells([]);
      return;
    }
    setCells(prev => selectedLayout.cells.map((_, i) => {
      const s = staged[i];
      const existing = prev[i];
      if (s) {
        if (existing?.imageSrc === s.imageSrc) return existing;
        return { imageSrc: s.imageSrc, imgNaturalW: s.imgNaturalW, imgNaturalH: s.imgNaturalH, scale: 1, offsetX: 0, offsetY: 0 };
      }
      return DEFAULT_CELL();
    }));
  }, [staged, selectedLayout, filledCount]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-collage-area]')) setSelectedCell(null);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  const uploadToStaged = useCallback((i: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setStaged(prev => {
          const next = [...prev];
          next[i] = { imageSrc: src, imgNaturalW: img.naturalWidth, imgNaturalH: img.naturalHeight };
          return next;
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const uploadMultiple = useCallback((files: FileList) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 6);
    imgs.forEach((file) => {
      const reader = new FileReader();
      reader.onload = e => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          setStaged(prev => {
            const next = [...prev];
            let slotIdx = next.findIndex(s => !s);
            if (slotIdx === -1) {
              if (next.length < 6) { next.push(null); slotIdx = next.length - 1; }
              else return next;
            }
            next[slotIdx] = { imageSrc: src, imgNaturalW: img.naturalWidth, imgNaturalH: img.naturalHeight };
            return next;
          });
        };
        img.src = src;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const addSlot = useCallback(() => {
    if (staged.length >= 6) return;
    setStaged(prev => [...prev, null]);
  }, [staged.length]);

  const removeSlot = useCallback((i: number) => {
    setStaged(prev => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length === 0 ? [null] : next;
    });
    setSelectedLayout(null);
    setCells([]);
    setSelectedCell(null);
  }, []);

  const updateCell = useCallback((i: number, patch: Partial<CellState>) => {
    setCells(prev => prev.map((c, ci) => ci !== i ? c : { ...c, ...patch }));
  }, []);

  const handleRemoveCell  = useCallback((i: number) => { updateCell(i, DEFAULT_CELL()); setSelectedCell(null); }, [updateCell]);
  const handleDragOver    = useCallback((e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverCell(i); }, []);
  const handleDragLeave   = useCallback(() => setDragOverCell(null), []);
  const handleDrop        = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault(); setDragOverCell(null);
    const f = e.dataTransfer.files[0];
    if (f) { uploadToStaged(i, f); }
  }, [uploadToStaged]);

  const getCellStyle = useCallback((cell: CollageCell): React.CSSProperties => {
    if (cell.clip) {
      return { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', clipPath: toClip(cell.clip) };
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
      const imgW = c.imgNaturalW || 1, imgH = c.imgNaturalH || 1;
      const { maxOffX, maxOffY } = calcMaxOffset(imgW, imgH, imgW, imgH, newScale);
      return { ...c, scale: newScale, offsetX: Math.max(-maxOffX, Math.min(maxOffX, c.offsetX)), offsetY: Math.max(-maxOffY, Math.min(maxOffY, c.offsetY)) };
    }));
  }, []);

  // ── Layer helpers ──

  // Tambah layer teks — baca nilai langsung dari DOM ref, tidak dari state
  const addTextLayerFromForm = () => {
    const t = (tfTextareaRef.current?.value ?? '').trim();
    if (!t) return;
    const layer: TextLayer = {
      kind: 'text', id: `t_${Date.now()}`,
      text: t, font: tfFont, color: tfColor, size: tfSize,
      bold: tfBold, italic: tfItalic, shadow: tfShadow,
      x: 50, y: 50, rotation: 0,
    };
    setLayers(prev => [...prev, layer]);
    setSelectedLayer(layer.id);
    if (tfTextareaRef.current) tfTextareaRef.current.value = '';
    if (tfPreviewRef.current) tfPreviewRef.current.textContent = 'Preview Teks';
  };

  const addStickerLayer = useCallback((symbol: string) => {
    const layer: StickerLayer = {
      kind: 'sticker', id: `s_${Date.now()}`,
      symbol, size: 48, x: 50, y: 50, rotation: 0,
    };
    setLayers(prev => [...prev, layer]);
    setSelectedLayer(layer.id);
  }, []);

  const updateLayer = useCallback((id: string, patch: Partial<Layer>) => {
    setLayers(prev => prev.map(l => l.id !== id ? l : { ...l, ...patch } as Layer));
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    setSelectedLayer(null);
  }, []);

  // Drag layer via mouse
  const handleLayerMouseDown = useCallback((e: React.MouseEvent, id: string, lx: number, ly: number) => {
    e.stopPropagation();
    setSelectedLayer(id);
    layerDrag.current = { id, startX: e.clientX, startY: e.clientY, origX: lx, origY: ly };
    const onMove = (ev: MouseEvent) => {
      if (!layerDrag.current || !previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const dx = (ev.clientX - layerDrag.current.startX) / rect.width * 100;
      const dy = (ev.clientY - layerDrag.current.startY) / rect.height * 100;
      updateLayer(layerDrag.current.id, {
        x: Math.max(0, Math.min(100, layerDrag.current.origX + dx)),
        y: Math.max(0, Math.min(100, layerDrag.current.origY + dy)),
      });
    };
    const onUp = () => { layerDrag.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [updateLayer]);

  // =============================================
  // FIX PINCH-TO-ZOOM LAYER:
  // handleLayerTouchStart sekarang menerima parameter `currentSize`
  // dan membedakan 2 skenario:
  //   - 1 jari → drag (posisi layer)
  //   - 2 jari → pinch untuk ubah ukuran (size) layer
  // Keduanya menggunakan window event listener agar gesture tetap jalan
  // walau jari bergerak keluar batas elemen.
  // =============================================
  const handleLayerTouchStart = useCallback((
    e: React.TouchEvent,
    id: string,
    lx: number,
    ly: number,
    currentSize: number,
  ) => {
    e.stopPropagation();
    setSelectedLayer(id);

    if (e.touches.length === 2) {
      // ── 2 jari: pinch untuk resize ──
      layerDrag.current = null; // batalkan drag jika ada
      const startDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      layerPinch.current = { id, startDist, startSize: currentSize };

      const onMove = (ev: TouchEvent) => {
        if (!layerPinch.current || ev.touches.length < 2) return;
        ev.preventDefault();
        const newDist = Math.hypot(
          ev.touches[0].clientX - ev.touches[1].clientX,
          ev.touches[0].clientY - ev.touches[1].clientY,
        );
        const ratio    = newDist / layerPinch.current.startDist;
        const newSize  = Math.max(10, Math.min(200, Math.round(layerPinch.current.startSize * ratio)));
        updateLayer(layerPinch.current.id, { size: newSize });
      };

      const onEnd = (ev: TouchEvent) => {
        // Selesai pinch ketika jari kurang dari 2
        if (ev.touches.length < 2) {
          layerPinch.current = null;
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onEnd);
        }
      };

      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
      return;
    }

    // ── 1 jari: drag posisi layer ──
    if (e.touches.length !== 1) return;
    layerDrag.current = {
      id,
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      origX: lx,
      origY: ly,
    };

    const onMove = (ev: TouchEvent) => {
      if (!layerDrag.current || ev.touches.length !== 1 || !previewRef.current) return;
      ev.preventDefault();
      const rect = previewRef.current.getBoundingClientRect();
      const dx = (ev.touches[0].clientX - layerDrag.current.startX) / rect.width * 100;
      const dy = (ev.touches[0].clientY - layerDrag.current.startY) / rect.height * 100;
      updateLayer(layerDrag.current.id, {
        x: Math.max(0, Math.min(100, layerDrag.current.origX + dx)),
        y: Math.max(0, Math.min(100, layerDrag.current.origY + dy)),
      });
    };

    const onEnd = () => {
      layerDrag.current = null;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [updateLayer]);

  const handleExport = async () => {
    if (!selectedLayout) return;
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

        let cX: number, cY: number, cW: number, cH: number;
        if (cell.clip) {
          cX = 0; cY = 0; cW = W; cH = H;
        } else {
          const pT = cell.y < eps ? 0 : gPx / 2, pB = cell.y + cell.h > 100 - eps ? 0 : gPx / 2;
          const pL = cell.x < eps ? 0 : gPx / 2, pR = cell.x + cell.w > 100 - eps ? 0 : gPx / 2;
          cX = (cell.x / 100) * W + pL; cY = (cell.y / 100) * H + pT;
          cW = (cell.w / 100) * W - pL - pR; cH = (cell.h / 100) * H - pT - pB;
        }

        const containScale = Math.min(cW / img.naturalWidth, cH / img.naturalHeight);
        const finalW = img.naturalWidth * containScale * cs.scale;
        const finalH = img.naturalHeight * containScale * cs.scale;
        const drawX  = (cX + cW / 2) + cs.offsetX * cW * cs.scale - finalW / 2;
        const drawY  = (cY + cH / 2) + cs.offsetY * cH * cs.scale - finalH / 2;

        ctx.save();
        ctx.beginPath();
        if (cell.clip) {
          const pts = cell.clip.split(',').map(p => { const [x, y] = p.trim().split(' '); return { x: parseFloat(x) / 100 * W, y: parseFloat(y) / 100 * H }; });
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j = 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.closePath();
        } else {
          ctx.rect(cX, cY, cW, cH);
        }
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, finalW, finalH);
        ctx.restore();
      }

      for (const layer of layers) {
        const lx = layer.x / 100 * W;
        const ly = layer.y / 100 * H;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        if (layer.kind === 'text') {
          const fontStr = `${layer.italic ? 'italic ' : ''}${layer.bold ? 'bold ' : ''}${layer.size * (W / 400)}px ${FONTS.find(f => f.id === layer.font)?.css || 'Arial'}`;
          ctx.font = fontStr;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (layer.shadow) {
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = layer.size * 0.15 * (W / 400);
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
          }
          ctx.fillStyle = layer.color;
          ctx.fillText(layer.text, 0, 0);
        } else {
          const sz = layer.size * (W / 400);
          ctx.font = `${sz}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(layer.symbol, 0, 0);
        }
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

  const [arW, arH] = aspectRatio.split(':').map(Number);
  const categories = ['kotak', 'diagonal', 'chevron', 'gelombang'];
  const selCs = selectedCell !== null ? cells[selectedCell] : null;
  const step = filledCount === 0 ? 1 : !selectedLayout ? 2 : 3;

  return (
    <div className="space-y-6" data-collage-area>

      {/* ── STEP INDICATOR ── */}
      <div className="flex items-center gap-2">
        {[
          { n:1, label:'Upload Foto' },
          { n:2, label:'Pilih Layout' },
          { n:3, label:'Atur & Download' },
        ].map((s, idx) => (
          <React.Fragment key={s.n}>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              step === s.n ? 'bg-indigo-600 text-white shadow-lg' :
              step > s.n  ? 'bg-indigo-900/50 text-indigo-400' :
              'bg-slate-700/50 text-slate-500'
            }`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                step > s.n ? 'bg-indigo-500 text-white' : step === s.n ? 'bg-white text-indigo-600' : 'bg-slate-600 text-slate-400'
              }`}>{step > s.n ? '✓' : s.n}</span>
              {s.label}
            </div>
            {idx < 2 && <div className={`flex-1 h-0.5 rounded ${step > s.n ? 'bg-indigo-600' : 'bg-slate-700'}`}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ═══ PANEL KIRI ═══ */}
        <div className="space-y-5">

          {/* ── STEP 1: UPLOAD FOTO ── */}
          <div className={`rounded-xl border transition-all ${step === 1 ? 'border-indigo-500/60 bg-indigo-950/20' : 'border-slate-700 bg-slate-800/30'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step > 1 ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>
                  {step > 1 ? '✓' : '1'}
                </span>
                <span className="text-sm font-semibold text-white">Upload Foto</span>
                <span className="text-xs text-slate-500">({filledCount}/{staged.length} terisi · maks 6)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-8-8l-4 4m0 0l4 4m-4-4h12"/></svg>
                  Upload semua
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                    if (e.target.files?.length) uploadMultiple(e.target.files);
                    e.target.value = '';
                  }}/>
                </label>
                {staged.length < 6 && (
                  <button type="button" onClick={addSlot}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                    + Slot
                  </button>
                )}
              </div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2">
                {staged.map((photo, i) => {
                  const isOver = dragOverStaged === i;
                  return (
                    <div key={i} className="relative aspect-square">
                      <div
                        className={`w-full h-full rounded-lg overflow-hidden border-2 border-dashed transition-all ${
                          photo ? 'border-transparent' : isOver ? 'border-indigo-400 bg-slate-700' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                        }`}
                        onDragOver={e => { e.preventDefault(); setDragOverStaged(i); }}
                        onDragLeave={() => setDragOverStaged(null)}
                        onDrop={e => { e.preventDefault(); setDragOverStaged(null); Array.from(e.dataTransfer.files).forEach((f, fi) => { if (i + fi < 6) uploadToStaged(i + fi, f); }); }}
                      >
                        {photo ? (
                          <>
                            <img src={photo.imageSrc} className="w-full h-full object-cover" alt={`Foto ${i+1}`}/>
                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                              <label className="cursor-pointer p-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-white">
                                Ganti
                                <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                                  if (!e.target.files?.length) return;
                                  const files = Array.from(e.target.files);
                                  setStaged(prev => {
                                    let next = [...prev];
                                    while (next.length < Math.min(6, i + files.length)) next.push(null);
                                    return next;
                                  });
                                  files.forEach((f, fi) => { if (i + fi < 6) uploadToStaged(i + fi, f); });
                                  e.target.value='';
                                }}/>
                              </label>
                              <button type="button" onClick={() => removeSlot(i)} className="p-1 bg-red-600/80 hover:bg-red-600 rounded text-[10px] text-white">Hapus</button>
                            </div>
                          </>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                              if (!e.target.files?.length) return;
                              const files = Array.from(e.target.files);
                              setStaged(prev => {
                                let next = [...prev];
                                while (next.length < Math.min(6, i + files.length)) next.push(null);
                                return next;
                              });
                              files.forEach((f, fi) => { if (i + fi < 6) uploadToStaged(i + fi, f); });
                              e.target.value='';
                            }}/>
                            <svg className="w-5 h-5 text-slate-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/>
                            </svg>
                            <span className="text-[9px] text-slate-500">Foto {i+1}</span>
                          </label>
                        )}
                      </div>
                      <span className="absolute top-1 left-1 w-4 h-4 bg-black/60 text-white text-[8px] font-bold rounded-full flex items-center justify-center pointer-events-none">{i+1}</span>
                    </div>
                  );
                })}
              </div>
              <label className="flex items-center justify-center gap-2 w-full mt-2 py-2 rounded-lg border border-dashed border-indigo-500/40 bg-indigo-950/20 hover:bg-indigo-950/40 cursor-pointer transition-colors">
                <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                  if (!e.target.files) return;
                  uploadMultiple(e.target.files);
                  e.target.value='';
                }}/>
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                <span className="text-xs text-indigo-400 font-medium">Upload beberapa foto sekaligus</span>
                <span className="text-[10px] text-slate-500">(pilih banyak di galeri)</span>
              </label>
              {filledCount === 0 && (
                <p className="text-[10px] text-slate-500 text-center mt-1">Layout muncul otomatis sesuai jumlah foto yang diupload</p>
              )}
              {filledCount > 0 && !selectedLayout && (
                <p className="text-[10px] text-indigo-400 text-center mt-1 animate-pulse">
                  ✓ {filledCount} foto siap — pilih layout di bawah
                </p>
              )}
            </div>
          </div>

          {/* ── TAB: TEKS & STIKER ── */}
          {selectedLayout && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/30">
              <div className="flex border-b border-slate-700">
                {(['foto','teks','stiker'] as const).map(tab => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${activeTab === tab ? 'bg-indigo-600/30 text-white border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-300'}`}>
                    {tab === 'foto' ? '🖼 Foto' : tab === 'teks' ? '✏️ Teks' : '🎨 Stiker'}
                  </button>
                ))}
              </div>

              {/* Form teks diinline langsung — tidak ada komponen terpisah,
                  tidak ada prop, tidak ada boundary yang bisa memblokir fokus */}
              {activeTab === 'teks' && (
                <div className="p-3 space-y-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Teks</label>
                    <textarea
                      ref={tfTextareaRef}
                      rows={2}
                      placeholder="Ketik teks di sini..."
                      onInput={e => {
                        if (tfPreviewRef.current)
                          tfPreviewRef.current.textContent = (e.target as HTMLTextAreaElement).value || 'Preview Teks';
                      }}
                      style={{ resize: 'none' }}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Font</label>
                    <div className="grid grid-cols-3 gap-1">
                      {FONTS.map(f => (
                        <button key={f.id} type="button" onClick={() => setTfFont(f.id)}
                          className={`py-1.5 px-2 rounded-lg text-xs border truncate transition-colors ${tfFont===f.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:border-indigo-500/50'}`}
                          style={{ fontFamily: f.css }}>{f.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Warna</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {TEXT_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setTfColor(c)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${tfColor===c ? 'border-white scale-125' : 'border-slate-600 hover:scale-110'}`}
                          style={{ background: c }}/>
                      ))}
                      <label className="w-6 h-6 rounded-full border-2 border-slate-500 overflow-hidden cursor-pointer" style={{ background: tfColor }}>
                        <input type="color" value={tfColor} onChange={e => setTfColor(e.target.value)} className="opacity-0 w-0 h-0"/>
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-1">Ukuran: {tfSize}px</label>
                      <input type="range" min={12} max={120} value={tfSize} onChange={e => setTfSize(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
                    </div>
                    <div className="flex gap-1 pt-4">
                      <button type="button" onClick={() => setTfBold(v => !v)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${tfBold ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>B</button>
                      <button type="button" onClick={() => setTfItalic(v => !v)}
                        className={`w-8 h-8 rounded-lg text-sm italic transition-colors ${tfItalic ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>I</button>
                      <button type="button" onClick={() => setTfShadow(v => !v)}
                        className={`w-8 h-8 rounded-lg text-sm transition-colors ${tfShadow ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400'}`}>S</button>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-2 text-center min-h-[44px] flex items-center justify-center">
                    <span ref={tfPreviewRef} style={{
                      fontFamily: FONTS.find(f => f.id===tfFont)?.css,
                      color: tfColor, fontSize: `${Math.min(tfSize,36)}px`,
                      fontWeight: tfBold ? 'bold' : 'normal',
                      fontStyle: tfItalic ? 'italic' : 'normal',
                      textShadow: tfShadow ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>Preview Teks</span>
                  </div>
                  <button type="button" onClick={addTextLayerFromForm}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors">
                    + Tambah ke Kolase
                  </button>
                </div>
              )}

              {activeTab === 'stiker' && (
                <div className="p-3 space-y-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {STICKERS.map(g => (
                      <button key={g.group} type="button" onClick={() => setShowStickerGroup(g.group)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${showStickerGroup === g.group ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                        {g.group}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {STICKERS.find(g => g.group === showStickerGroup)?.items.map(sym => (
                      <button key={sym} type="button" onClick={() => addStickerLayer(sym)}
                        className="aspect-square rounded-lg bg-slate-700 hover:bg-slate-600 text-xl flex items-center justify-center transition-colors hover:scale-110 active:scale-95">
                        {sym}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">Klik stiker untuk menambahkan ke kolase</p>
                </div>
              )}
            </div>
          )}

          {/* ── DAFTAR LAYER AKTIF ── */}
          {selectedLayout && layers.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                <span className="text-xs font-semibold text-slate-300">Layer ({layers.length})</span>
                <button type="button" onClick={() => setLayers([])} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">Hapus Semua</button>
              </div>
              <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
                {[...layers].reverse().map(layer => {
                  const isSel = selectedLayer === layer.id;
                  return (
                    <div key={layer.id} onClick={() => setSelectedLayer(isSel ? null : layer.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${isSel ? 'bg-indigo-600/30 border border-indigo-500/40' : 'bg-slate-700/40 hover:bg-slate-700/60'}`}>
                      <span className="text-sm">{layer.kind === 'sticker' ? layer.symbol : '✏️'}</span>
                      <span className="text-xs text-slate-300 truncate flex-1">
                        {layer.kind === 'text' ? layer.text : `Stiker ${layer.symbol}`}
                      </span>
                      {isSel && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <input type="range" min={layer.kind === 'text' ? 14 : 20} max={layer.kind === 'text' ? 120 : 150}
                            value={layer.size}
                            onChange={e => updateLayer(layer.id, { size: Number(e.target.value) })}
                            className="w-16 h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-600"
                            onClick={e => e.stopPropagation()}
                          />
                        </div>
                      )}
                      <button type="button" onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                        className="w-5 h-5 flex-shrink-0 bg-red-600/60 hover:bg-red-500 rounded text-[10px] text-white flex items-center justify-center">✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 2: PILIH LAYOUT ── */}
          {filledCount > 0 && (
            <div className={`rounded-xl border transition-all ${!selectedLayout ? 'border-indigo-500/60 bg-indigo-950/20' : 'border-slate-700 bg-slate-800/30'}`}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedLayout ? 'bg-indigo-500 text-white' : 'bg-indigo-600 text-white'}`}>
                  {selectedLayout ? '✓' : '2'}
                </span>
                <span className="text-sm font-semibold text-white">Pilih Layout</span>
                <span className="text-xs text-slate-400 bg-indigo-600/20 px-2 py-0.5 rounded-full">
                  {matchingLayouts.length} layout untuk {filledCount} foto
                </span>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex gap-1.5 flex-wrap">
                  <button type="button" onClick={() => setFilterCat(null)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterCat === null ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Semua</button>
                  {categories.map(cat => {
                    const hasAny = COLLAGE_LAYOUTS.some(l => l.photoCount === filledCount && l.category === cat);
                    if (!hasAny) return null;
                    return (
                      <button key={cat} type="button" onClick={() => setFilterCat(cat === filterCat ? null : cat)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${filterCat === cat ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                        {CATEGORY_LABELS[cat]}
                      </button>
                    );
                  })}
                </div>

                {matchingLayouts.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Tidak ada layout untuk {filledCount} foto dengan filter ini</p>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto pr-1">
                    {matchingLayouts.map(layout => {
                      const isActive = selectedLayout?.id === layout.id;
                      const CA = ['#4338ca','#818cf8','#312e81','#a5b4fc','#3730a3','#6366f1'];
                      const CI = ['#475569','#94a3b8','#1e293b','#64748b','#334155','#7f8ea3'];
                      const STROKE = '#000000';
                      return (
                        <button key={layout.id} type="button" onClick={() => handleSelectLayout(layout)} title={layout.name}
                          className={`group rounded-lg overflow-hidden transition-all ${isActive ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-800 scale-105' : 'ring-1 ring-slate-600 hover:ring-indigo-400'}`}>
                          <div className="aspect-square bg-black">
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{display:'block',width:'100%',height:'100%'}}>
                              {layout.cells.map((cell, ci) => {
                                const fill = isActive ? CA[ci % CA.length] : CI[ci % CI.length];
                                if (cell.clip) {
                                  const pts = cell.clip.split(',').map(p=>p.trim().split(' ').join(',')).join(' ');
                                  return <polygon key={ci} points={pts} fill={fill} stroke={STROKE} strokeWidth="2"/>;
                                }
                                return <rect key={ci} x={cell.x+0.75} y={cell.y+0.75} width={cell.w-1.5} height={cell.h-1.5} fill={fill} stroke={STROKE} strokeWidth="1.5"/>;
                              })}
                            </svg>
                          </div>
                          <div className="bg-slate-800 px-1 py-0.5">
                            <p className="text-[8px] text-slate-400 truncate text-center">{layout.name}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: PENGATURAN ── */}
          {selectedLayout && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 space-y-0 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white">3</span>
                <span className="text-sm font-semibold text-white">Pengaturan</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Aspek Rasio Output</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ASPECT_OPTIONS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setAspectRatio(opt.value)}
                        className={`py-1.5 px-1 rounded-lg text-center transition-all border ${aspectRatio === opt.value ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:border-indigo-500/50'}`}>
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className="text-[9px] opacity-70">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Jarak Antar Foto</label>
                    <span className="text-xs font-bold text-indigo-400 bg-slate-700 px-2 py-0.5 rounded">{gap}px</span>
                  </div>
                  <input type="range" min={0} max={24} value={gap} onChange={e => setGap(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
                  {selectedLayout.cells.some(c => c.clip) && (
                    <p className="text-[10px] text-amber-400/60 mt-1">⚡ Jarak tidak berlaku untuk layout berbentuk</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Warna Background</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="w-8 h-8 rounded-lg cursor-pointer border-2 border-slate-600 hover:border-indigo-500 overflow-hidden flex-shrink-0" style={{ background: bgColor }}>
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="opacity-0 w-0 h-0" />
                    </label>
                    <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)}
                      className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"/>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {BG_PRESETS.map(c => (
                      <button key={c} type="button" onClick={() => setBgColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${bgColor === c ? 'border-white scale-110' : 'border-slate-600'}`}
                        style={{ background: c }}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export */}
          {selectedLayout && (
            <div className="pt-1">
              <button type="button" onClick={handleExport} disabled={isExporting}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5">
                {isExporting
                  ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Mengekspor...</>
                  : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Download Kolase (PNG)</>
                }
              </button>
              <p className="text-center text-xs text-slate-500 mt-1.5">Output 1080px × aspek rasio terpilih</p>
            </div>
          )}
        </div>

        {/* ═══ PANEL KANAN: Preview ═══ */}
        <div>
          {!selectedLayout ? (
            <div className="w-full rounded-xl overflow-hidden ring-1 ring-slate-700 bg-slate-800/50 flex flex-col items-center justify-center py-16 gap-4 text-center px-6"
              style={{ minHeight: '280px' }}>
              {filledCount === 0 ? (
                <>
                  <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  <div>
                    <p className="text-slate-400 font-semibold">Upload foto dulu</p>
                    <p className="text-xs text-slate-600 mt-1">Layout akan muncul otomatis sesuai jumlah foto</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl">🖼️</div>
                  <div>
                    <p className="text-slate-400 font-semibold">{filledCount} foto siap</p>
                    <p className="text-xs text-slate-600 mt-1">Pilih layout dari panel kiri untuk melihat preview</p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Preview Kolase</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                    selectedLayout.category === 'diagonal'  ? 'bg-amber-600/30 text-amber-300' :
                    selectedLayout.category === 'chevron'   ? 'bg-green-600/30 text-green-300' :
                    selectedLayout.category === 'gelombang' ? 'bg-blue-600/30 text-blue-300' :
                    'bg-slate-600/30 text-slate-400'}`}>
                    {CATEGORY_LABELS[selectedLayout.category]}
                  </span>
                  <span className="text-xs text-slate-500 italic">{selectedLayout.name}</span>
                  <button type="button" onClick={() => { setSelectedLayout(null); setCells([]); setSelectedCell(null); }}
                    className="text-[10px] text-slate-500 hover:text-red-400 transition-colors">✕ ganti</button>
                </div>
              </div>

              <div
                ref={previewRef}
                className="w-full rounded-xl shadow-2xl ring-1 ring-slate-700"
                style={{ position: 'relative', paddingBottom: `${(arH / arW) * 100}%` }}
                onClick={() => setSelectedLayer(null)}
              >
                {/* Foto */}
                <div
                  className="absolute inset-0 rounded-xl overflow-hidden"
                  style={{ background: bgColor }}
                >
                  {selectedLayout.cells.map((cell, i) => (
                    <div key={`${selectedLayout.id}-${i}`} style={getCellStyle(cell)}>
                      <CellEditor
                        cs={cells[i] ?? DEFAULT_CELL()} idx={i}
                        isDragOver={dragOverCell === i} isSelected={selectedCell === i}
                        onSelect={setSelectedCell} onUpdate={updateCell}
                        onUpload={(i, f) => uploadToStaged(i, f)} onRemove={handleRemoveCell}
                        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                      />
                    </div>
                  ))}
                </div>

                {/* Layer teks & stiker */}
                {layers.map(layer => {
                  const isSel = selectedLayer === layer.id;
                  const isText = layer.kind === 'text';
                  const tl = layer as TextLayer;
                  const sl = layer as StickerLayer;
                  const fontCss = isText
                    ? (FONTS.find(f => f.id === tl.font)?.css || 'Arial, sans-serif')
                    : 'serif';
                  return (
                    <div
                      key={layer.id}
                      style={{
                        position: 'absolute',
                        left: `${layer.x}%`,
                        top: `${layer.y}%`,
                        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                        cursor: 'grab',
                        userSelect: 'none',
                        zIndex: 10,
                        padding: '3px 6px',
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                        outline: isSel ? '2px dashed #818cf8' : 'none',
                        outlineOffset: '2px',
                        // Tampilkan hint pinch saat layer dipilih di mobile
                        touchAction: 'none',
                      }}
                      onMouseDown={e => { e.stopPropagation(); handleLayerMouseDown(e, layer.id, layer.x, layer.y); }}
                      // FIX PINCH: Kirim layer.size sebagai parameter currentSize
                      onTouchStart={e => { e.stopPropagation(); handleLayerTouchStart(e, layer.id, layer.x, layer.y, layer.size); }}
                    >
                      {isText ? (
                        <span style={{
                          display: 'block',
                          fontFamily: fontCss,
                          fontSize: `${layer.size}px`,
                          fontWeight: tl.bold ? 'bold' : 'normal',
                          fontStyle: tl.italic ? 'italic' : 'normal',
                          color: tl.color,
                          textShadow: tl.shadow ? '2px 2px 6px rgba(0,0,0,1), -1px -1px 3px rgba(0,0,0,0.8)' : 'none',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.2,
                        }}>
                          {tl.text}
                        </span>
                      ) : (
                        <span style={{
                          display: 'block',
                          fontSize: `${layer.size}px`,
                          lineHeight: 1,
                        }}>
                          {sl.symbol}
                        </span>
                      )}
                      {/* Hint pinch di mobile */}
                      {isSel && (
                        <span style={{
                          position: 'absolute',
                          bottom: -18,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: 9,
                          color: 'rgba(255,255,255,0.6)',
                          background: 'rgba(0,0,0,0.5)',
                          padding: '1px 5px',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                        }}>
                          🤏 pinch untuk resize
                        </span>
                      )}
                      {isSel && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                          style={{
                            position: 'absolute',
                            top: -10, right: -10,
                            width: 20, height: 20,
                            background: '#ef4444',
                            borderRadius: '50%',
                            border: '2px solid white',
                            color: 'white',
                            fontSize: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 20,
                          }}
                        >✕</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1">
                  {selectedLayout.cells.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${cells[i]?.imageSrc ? (selectedCell === i ? 'bg-indigo-400 w-5' : 'bg-indigo-600 w-4') : 'bg-slate-600 w-2'}`}/>
                  ))}
                </div>
                <span className="text-xs text-slate-500">{cells.filter(c=>c?.imageSrc).length} / {selectedLayout.cells.length} foto</span>
              </div>

              {/* ZOOM CONTROLS */}
              <div className={`mt-3 rounded-xl border transition-all duration-200 overflow-hidden ${selCs?.imageSrc ? 'border-indigo-500/50 bg-indigo-950/30' : 'border-slate-700/50 bg-slate-800/30'}`}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${selCs?.imageSrc ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`}/>
                    <span className="text-xs font-semibold text-slate-300">
                      {selectedCell !== null && selCs?.imageSrc ? `Zoom Foto ${selectedCell + 1}` : 'Klik foto untuk zoom & geser'}
                    </span>
                  </div>
                  {selCs?.imageSrc && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-400 font-mono bg-slate-700 px-2 py-0.5 rounded">
                        {(selCs.scale * 100).toFixed(0)}%
                      </span>
                      <button type="button"
                        onClick={() => updateCell(selectedCell!, { scale: 1, offsetX: 0, offsetY: 0 })}
                        className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-700/50 hover:bg-slate-700 transition-colors">
                        ↺ Reset
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-3 py-3">
                  {selCs?.imageSrc ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => handleScaleChange(selectedCell!, Math.max(0.3, selCs.scale - 0.1))}
                          className="w-10 h-10 flex-shrink-0 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-xl flex items-center justify-center text-xl font-bold transition-colors select-none touch-manipulation">
                          −
                        </button>
                        <input type="range" min={30} max={300} step={1}
                          value={Math.round(selCs.scale * 100)}
                          onChange={e => handleScaleChange(selectedCell!, Number(e.target.value) / 100)}
                          className="flex-1 h-3 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
                        <button type="button"
                          onClick={() => handleScaleChange(selectedCell!, Math.min(3, selCs.scale + 0.1))}
                          className="w-10 h-10 flex-shrink-0 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white rounded-xl flex items-center justify-center text-xl font-bold transition-colors select-none touch-manipulation">
                          +
                        </button>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 px-12">
                        <span>Kecil</span>
                        <span>✋ Drag foto untuk geser</span>
                        <span>Zoom</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-1">Klik foto di preview, lalu zoom di sini</p>
                  )}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-600 text-center">
                Layout diagonal/gelombang: ubah warna background untuk efek pemisah berbeda
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default CollageEditor;
