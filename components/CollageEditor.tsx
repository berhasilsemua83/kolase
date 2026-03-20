import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================
// TYPES
// =============================================
interface CollageCell {
  x: number; y: number; w: number; h: number;
  clip?: string; // polygon points pakai % — jika ada, sel menutupi 100%x100%
}
interface CollageLayout {
  id: string; name: string; photoCount: number;
  category: 'kotak' | 'diagonal' | 'chevron' | 'gelombang';
  cells: CollageCell[];
}
interface CellState {
  imageSrc: string | null;
  imgW: number; imgH: number;
  scale: number; offX: number; offY: number;
}

// =============================================
// CONSTANTS
// =============================================
const EMPTY = (): CellState => ({ imageSrc: null, imgW: 0, imgH: 0, scale: 1, offX: 0, offY: 0 });

const BG = ['#000000','#ffffff','#1e293b','#0f0f0f','#4f46e5','#be185d','#b45309','#166534'];

const AR = [
  { v:'1:1',  l:'1:1',  s:'Square' },
  { v:'9:16', l:'9:16', s:'Portrait' },
  { v:'16:9', l:'16:9', s:'Landscape' },
  { v:'4:5',  l:'4:5',  s:'Instagram' },
  { v:'3:4',  l:'3:4',  s:'Portrait' },
  { v:'4:3',  l:'4:3',  s:'Landscape' },
];

const CAT: Record<string, string> = {
  kotak:'⬜ Kotak', diagonal:'↗ Diagonal', chevron:'❯ Chevron', gelombang:'〜 Gelombang'
};

// Semua layout
const LAYOUTS: CollageLayout[] = [
  // KOTAK
  { id:'k2a', name:'50/50 Kiri-Kanan',   photoCount:2, category:'kotak', cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:100}] },
  { id:'k2b', name:'50/50 Atas-Bawah',   photoCount:2, category:'kotak', cells:[{x:0,y:0,w:100,h:50},{x:0,y:50,w:100,h:50}] },
  { id:'k2c', name:'60/40 Kiri-Kanan',   photoCount:2, category:'kotak', cells:[{x:0,y:0,w:60,h:100},{x:60,y:0,w:40,h:100}] },
  { id:'k2d', name:'70/30 Kiri-Kanan',   photoCount:2, category:'kotak', cells:[{x:0,y:0,w:70,h:100},{x:70,y:0,w:30,h:100}] },
  { id:'k3a', name:'1 Besar + 2 Kanan',  photoCount:3, category:'kotak', cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:50},{x:55,y:50,w:45,h:50}] },
  { id:'k3b', name:'2 Kiri + 1 Besar',   photoCount:3, category:'kotak', cells:[{x:0,y:0,w:45,h:50},{x:0,y:50,w:45,h:50},{x:45,y:0,w:55,h:100}] },
  { id:'k3c', name:'1 Atas + 2 Bawah',   photoCount:3, category:'kotak', cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:50,h:45},{x:50,y:55,w:50,h:45}] },
  { id:'k3d', name:'2 Atas + 1 Bawah',   photoCount:3, category:'kotak', cells:[{x:0,y:0,w:50,h:45},{x:50,y:0,w:50,h:45},{x:0,y:45,w:100,h:55}] },
  { id:'k4a', name:'2x2 Grid',            photoCount:4, category:'kotak', cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:50,h:50},{x:50,y:50,w:50,h:50}] },
  { id:'k4b', name:'1 Besar + 3 Kanan',  photoCount:4, category:'kotak', cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:33.34},{x:55,y:33.34,w:45,h:33.33},{x:55,y:66.67,w:45,h:33.33}] },
  { id:'k4c', name:'1 Besar + 3 Bawah',  photoCount:4, category:'kotak', cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:33.34,h:45},{x:33.34,y:55,w:33.33,h:45},{x:66.67,y:55,w:33.33,h:45}] },
  { id:'k5a', name:'2 Atas + 3 Bawah',   photoCount:5, category:'kotak', cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}] },
  { id:'k5b', name:'1 Besar + 4 Kanan',  photoCount:5, category:'kotak', cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:25},{x:50,y:25,w:50,h:25},{x:50,y:50,w:50,h:25},{x:50,y:75,w:50,h:25}] },
  { id:'k5c', name:'Pola Plus',           photoCount:5, category:'kotak', cells:[{x:33.33,y:0,w:33.34,h:33.33},{x:0,y:33.33,w:33.33,h:33.34},{x:33.33,y:33.33,w:33.34,h:33.34},{x:66.67,y:33.33,w:33.33,h:33.34},{x:33.33,y:66.67,w:33.34,h:33.33}] },
  { id:'k6a', name:'6 - Grid 2x3',        photoCount:6, category:'kotak', cells:[{x:0,y:0,w:33.34,h:50},{x:33.34,y:0,w:33.33,h:50},{x:66.67,y:0,w:33.33,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}] },
  { id:'k6b', name:'6 - Grid 3x2',        photoCount:6, category:'kotak', cells:[{x:0,y:0,w:50,h:33.34},{x:50,y:0,w:50,h:33.34},{x:0,y:33.34,w:50,h:33.33},{x:50,y:33.34,w:50,h:33.33},{x:0,y:66.67,w:50,h:33.33},{x:50,y:66.67,w:50,h:33.33}] },
  { id:'k6c', name:'6 - 1 Besar + 5',     photoCount:6, category:'kotak', cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:20},{x:55,y:20,w:45,h:20},{x:55,y:40,w:45,h:20},{x:55,y:60,w:45,h:20},{x:55,y:80,w:45,h:20}] },

  // DIAGONAL
  { id:'d2a', name:'2 Miring /',         photoCount:2, category:'diagonal', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,60 0,40 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'60 0,100 0,100 100,40 100'},
  ]},
  { id:'d2b', name:'2 Miring \\',        photoCount:2, category:'diagonal', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,40 0,60 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'40 0,100 0,100 100,60 100'},
  ]},
  { id:'d2c', name:'2 Miring Horisontal',photoCount:2, category:'diagonal', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,100 0,100 40,0 60'},
    {x:0,y:0,w:100,h:100, clip:'0 60,100 40,100 100,0 100'},
  ]},
  { id:'d3a', name:'3 Strip Diagonal',   photoCount:3, category:'diagonal', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,36 0,22 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'36 0,70 0,56 100,22 100'},
    {x:0,y:0,w:100,h:100, clip:'70 0,100 0,100 100,56 100'},
  ]},
  { id:'d4a', name:'4 Strip Diagonal',   photoCount:4, category:'diagonal', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,28 0,16 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'28 0,53 0,41 100,16 100'},
    {x:0,y:0,w:100,h:100, clip:'53 0,78 0,66 100,41 100'},
    {x:0,y:0,w:100,h:100, clip:'78 0,100 0,100 100,66 100'},
  ]},
  { id:'d4b', name:'4 Segitiga X',       photoCount:4, category:'diagonal', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,100 0,50 50'},
    {x:0,y:0,w:100,h:100, clip:'100 0,100 100,50 50'},
    {x:0,y:0,w:100,h:100, clip:'0 100,100 100,50 50'},
    {x:0,y:0,w:100,h:100, clip:'0 0,50 50,0 100'},
  ]},
  { id:'d3b', name:'3 Kipas Pojok',      photoCount:3, category:'diagonal', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 100,0 0,100 0'},
    {x:0,y:0,w:100,h:100, clip:'0 100,100 0,100 55,45 100'},
    {x:0,y:0,w:100,h:100, clip:'0 100,45 100,100 55,100 100'},
  ]},

  // CHEVRON
  { id:'c2a', name:'2 Panah Kanan →',   photoCount:2, category:'chevron', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,55 0,78 50,55 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'55 0,100 0,100 100,55 100,78 50'},
  ]},
  { id:'c2b', name:'2 Panah Kiri ←',    photoCount:2, category:'chevron', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,45 0,22 50,45 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'45 0,100 0,100 100,45 100,22 50'},
  ]},
  { id:'c3a', name:'3 Chevron →',        photoCount:3, category:'chevron', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,28 0,50 50,28 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'28 0,62 0,84 50,62 100,28 100,50 50'},
    {x:0,y:0,w:100,h:100, clip:'62 0,100 0,100 100,62 100,84 50'},
  ]},
  { id:'c3b', name:'3 Chevron ←',        photoCount:3, category:'chevron', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,38 0,16 50,38 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'38 0,72 0,50 50,72 100,38 100,16 50'},
    {x:0,y:0,w:100,h:100, clip:'72 0,100 0,100 100,72 100,50 50'},
  ]},
  { id:'c2c', name:'2 Bentuk V',         photoCount:2, category:'chevron', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,100 0,50 60,0 100'},
    {x:0,y:0,w:100,h:100, clip:'0 100,50 60,100 0,100 100'},
  ]},
  { id:'c4a', name:'4 Rantai Panah',     photoCount:4, category:'chevron', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,30 0,42 50,30 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'30 0,55 0,67 50,55 100,30 100,42 50'},
    {x:0,y:0,w:100,h:100, clip:'55 0,78 0,90 50,78 100,55 100,67 50'},
    {x:0,y:0,w:100,h:100, clip:'78 0,100 0,100 100,78 100,90 50'},
  ]},

  // GELOMBANG
  { id:'g2a', name:'2 Gelombang |',      photoCount:2, category:'gelombang', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,46 0,50 8,55 17,57 25,55 33,50 42,45 50,43 58,46 67,52 75,54 83,52 92,48 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'46 0,100 0,100 100,48 100,52 92,54 83,52 75,46 67,43 58,45 50,50 42,55 33,57 25,55 17,50 8'},
  ]},
  { id:'g2b', name:'2 Gelombang —',      photoCount:2, category:'gelombang', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,100 0,100 46,92 50,83 55,75 57,67 55,58 50,50 45,42 43,33 46,25 52,17 54,8 52,0 48'},
    {x:0,y:0,w:100,h:100, clip:'0 48,8 52,17 54,25 52,33 46,42 43,50 45,58 50,67 55,75 57,83 55,92 50,100 46,100 100,0 100'},
  ]},
  { id:'g3a', name:'3 Zigzag',           photoCount:3, category:'gelombang', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,33 0,36 17,30 33,36 50,30 67,36 83,33 100,0 100'},
    {x:0,y:0,w:100,h:100, clip:'33 0,67 0,70 17,64 33,70 50,64 67,70 83,67 100,33 100,36 83,30 67,36 50,30 33,36 17'},
    {x:0,y:0,w:100,h:100, clip:'67 0,100 0,100 100,67 100,70 83,64 67,70 50,64 33,70 17'},
  ]},
  { id:'g2c', name:'2 Riak',             photoCount:2, category:'gelombang', cells:[
    {x:0,y:0,w:100,h:100, clip:'0 0,100 0,100 35,88 38,75 46,63 54,50 58,38 54,25 46,13 38,0 35'},
    {x:0,y:0,w:100,h:100, clip:'0 35,13 38,25 46,38 54,50 58,63 54,75 46,88 38,100 35,100 100,0 100'},
  ]},
];

// =============================================
// HELPERS
// =============================================
const toClipPath = (clip: string) => `polygon(${clip.split(',').map(p => p.trim().split(' ').join('% ') + '%').join(', ')})`;

const maxOff = (iW: number, iH: number, cW: number, cH: number, s: number) => {
  if (!iW || !iH) return { mx: 1, my: 1 };
  const cs = Math.min(cW / iW, cH / iH);
  const vW = iW * cs * s, vH = iH * cs * s;
  return {
    mx: ((cW + vW) / 2 - vW * 0.2) / (cW * s),
    my: ((cH + vH) / 2 - vH * 0.2) / (cH * s),
  };
};

// =============================================
// CELL EDITOR
// =============================================
const Cell: React.FC<{
  cs: CellState; idx: number; isDrop: boolean; isSel: boolean;
  onSel(i:number):void; onUpd(i:number,p:Partial<CellState>):void;
  onUp(i:number,f:File):void; onRm(i:number):void;
  onDgO(e:React.DragEvent,i:number):void; onDgL():void; onDrop(e:React.DragEvent,i:number):void;
}> = ({ cs, idx, isDrop, isSel, onSel, onUpd, onUp, onRm, onDgO, onDgL, onDrop }) => {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef(false);
  const ts = useRef({ x:0, y:0, ox:0, oy:0 });

  const doMove = (dx: number, dy: number) => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const s = cs.scale;
    const { mx, my } = maxOff(cs.imgW, cs.imgH, r.width, r.height, s);
    onUpd(idx, {
      offX: Math.max(-mx, Math.min(mx, cs.offX + dx / (r.width  * s))),
      offY: Math.max(-my, Math.min(my, cs.offY + dy / (r.height * s))),
    });
  };

  const onMD = (e: React.MouseEvent) => {
    if (!cs.imageSrc) return;
    e.preventDefault(); onSel(idx); drag.current = true;
    const sx = e.clientX, sy = e.clientY, ox = cs.offX, oy = cs.offY;
    const mv = (ev: MouseEvent) => {
      if (!drag.current || !ref.current) return;
      const r = ref.current.getBoundingClientRect(), s = cs.scale;
      const { mx, my } = maxOff(cs.imgW, cs.imgH, r.width, r.height, s);
      onUpd(idx, {
        offX: Math.max(-mx, Math.min(mx, ox + (ev.clientX - sx) / (r.width  * s))),
        offY: Math.max(-my, Math.min(my, oy + (ev.clientY - sy) / (r.height * s))),
      });
    };
    const up = () => { drag.current = false; window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
  };

  const onTS = (e: React.TouchEvent) => {
    if (!cs.imageSrc || e.touches.length !== 1) return;
    onSel(idx); drag.current = true;
    ts.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: cs.offX, oy: cs.offY };
  };
  const onTM = (e: React.TouchEvent) => {
    if (!drag.current || e.touches.length !== 1 || !ref.current) return;
    e.preventDefault();
    const r = ref.current.getBoundingClientRect(), s = cs.scale;
    const { mx, my } = maxOff(cs.imgW, cs.imgH, r.width, r.height, s);
    onUpd(idx, {
      offX: Math.max(-mx, Math.min(mx, ts.current.ox + (e.touches[0].clientX - ts.current.x) / (r.width  * s))),
      offY: Math.max(-my, Math.min(my, ts.current.oy + (e.touches[0].clientY - ts.current.y) / (r.height * s))),
    });
  };
  const onTE = () => { drag.current = false; };

  return (
    <div className="relative w-full h-full" onDragOver={e => onDgO(e, idx)} onDragLeave={onDgL} onDrop={e => onDrop(e, idx)}>
      <div ref={ref}
        className={`relative w-full h-full overflow-hidden group ${cs.imageSrc ? 'cursor-grab active:cursor-grabbing' : ''} ${isSel && cs.imageSrc ? 'ring-2 ring-inset ring-indigo-400' : ''} ${isDrop ? 'ring-2 ring-inset ring-indigo-300' : ''}`}
        style={{ background: 'rgba(15,23,42,0.9)' }}
        onMouseDown={onMD} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        onClick={() => cs.imageSrc && onSel(idx)}
      >
        {cs.imageSrc ? (
          <>
            <img src={cs.imageSrc} alt="" draggable={false} style={{
              display:'block', width:'100%', height:'100%',
              objectFit:'contain', objectPosition:'center',
              transformOrigin:'center center',
              transform:`scale(${cs.scale}) translate(${cs.offX * 100}%, ${cs.offY * 100}%)`,
              userSelect:'none', pointerEvents:'none', willChange:'transform',
            }} />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-1 pointer-events-none group-hover:pointer-events-auto">
              <span className="text-[9px] font-bold bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center">{idx+1}</span>
              <button type="button" onClick={e => { e.stopPropagation(); onRm(idx); }} className="w-5 h-5 bg-red-600/90 hover:bg-red-500 text-white rounded text-xs flex items-center justify-center">✕</button>
            </div>
            <span className="absolute bottom-1 left-1 text-[8px] text-white/70 bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100">{(cs.scale*100).toFixed(0)}%</span>
            {isSel && <span className="absolute bottom-1 right-1 text-[8px] text-white/60 bg-black/50 px-1 rounded">✋</span>}
          </>
        ) : isDrop ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] text-indigo-300 font-bold">Lepaskan!</span>
          </div>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30">
            <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) { onUp(idx, e.target.files[0]); onSel(idx); } e.target.value=''; }} />
            <svg className="w-4 h-4 text-slate-500 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
            <span className="text-[9px] text-slate-500">Foto {idx+1}</span>
          </label>
        )}
      </div>
    </div>
  );
};

// =============================================
// MAIN
// =============================================
const CollageEditor: React.FC = () => {
  const [layout,  setLayout]  = useState<CollageLayout>(LAYOUTS[0]);
  const [ar,      setAr]      = useState('1:1');
  const [gap,     setGap]     = useState(4);
  const [bg,      setBg]      = useState('#000000');
  const [cells,   setCells]   = useState<CellState[]>([EMPTY()]);
  const [cntF,    setCntF]    = useState<number|null>(null);
  const [catF,    setCatF]    = useState<string|null>(null);
  const [exporting,setEx]     = useState(false);
  const [dropOn,  setDropOn]  = useState<number|null>(null);
  const [selCell, setSelCell] = useState<number|null>(null);

  useEffect(() => {
    setCells(prev => layout.cells.map((_,i) => prev[i] ?? EMPTY()));
    setSelCell(null);
  }, [layout]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-ca]')) setSelCell(null); };
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, []);

  const upd = useCallback((i: number, p: Partial<CellState>) =>
    setCells(prev => prev.map((c,ci) => ci!==i ? c : {...c,...p})), []);

  const upload = useCallback((i: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = e => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => upd(i, { imageSrc:src, imgW:img.naturalWidth, imgH:img.naturalHeight, scale:1, offX:0, offY:0 });
      img.src = src;
    };
    r.readAsDataURL(file);
  }, [upd]);

  const rm    = useCallback((i: number) => { upd(i, EMPTY()); setSelCell(null); }, [upd]);
  const dgO   = useCallback((e: React.DragEvent, i: number) => { e.preventDefault(); setDropOn(i); }, []);
  const dgL   = useCallback(() => setDropOn(null), []);
  const drop  = useCallback((e: React.DragEvent, i: number) => {
    e.preventDefault(); setDropOn(null);
    const f = e.dataTransfer.files[0];
    if (f) { upload(i, f); setSelCell(i); }
  }, [upload]);

  const zoom = useCallback((i: number, s: number) => {
    setCells(prev => prev.map((c,ci) => {
      if (ci !== i) return c;
      const { mx, my } = maxOff(c.imgW, c.imgH, c.imgW||1, c.imgH||1, s);
      return { ...c, scale:s, offX: Math.max(-mx, Math.min(mx, c.offX)), offY: Math.max(-my, Math.min(my, c.offY)) };
    }));
  }, []);

  const cellStyle = useCallback((cell: CollageCell): React.CSSProperties => {
    if (cell.clip) return { position:'absolute', left:0, top:0, width:'100%', height:'100%', clipPath: toClipPath(cell.clip) };
    const g = gap/2, e = 0.05;
    return {
      position:'absolute', left:`${cell.x}%`, top:`${cell.y}%`, width:`${cell.w}%`, height:`${cell.h}%`,
      paddingTop:    cell.y < e ? 0 : g,
      paddingBottom: cell.y+cell.h > 100-e ? 0 : g,
      paddingLeft:   cell.x < e ? 0 : g,
      paddingRight:  cell.x+cell.w > 100-e ? 0 : g,
    };
  }, [gap]);

  const doExport = async () => {
    setEx(true);
    try {
      const [aw, ah] = ar.split(':').map(Number);
      const W = 1080, H = Math.round(W * ah / aw);
      const cvs = document.createElement('canvas');
      cvs.width = W; cvs.height = H;
      const ctx = cvs.getContext('2d')!;
      ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
      const eps = 0.05, gp = gap;

      for (let i = 0; i < layout.cells.length; i++) {
        const cell = layout.cells[i], cs = cells[i];
        if (!cs?.imageSrc) continue;
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = cs.imageSrc!;
          if (im.complete && im.naturalWidth > 0) res(im);
        });

        let cX: number, cY: number, cW: number, cH: number;
        if (cell.clip) {
          cX=0; cY=0; cW=W; cH=H;
        } else {
          const pT = cell.y < eps ? 0 : gp/2, pB = cell.y+cell.h > 100-eps ? 0 : gp/2;
          const pL = cell.x < eps ? 0 : gp/2, pR = cell.x+cell.w > 100-eps ? 0 : gp/2;
          cX=(cell.x/100)*W+pL; cY=(cell.y/100)*H+pT;
          cW=(cell.w/100)*W-pL-pR; cH=(cell.h/100)*H-pT-pB;
        }

        const cs2 = Math.min(cW/img.naturalWidth, cH/img.naturalHeight);
        const fW = img.naturalWidth*cs2*cs.scale, fH = img.naturalHeight*cs2*cs.scale;
        const dX = (cX+cW/2) + cs.offX*cW*cs.scale - fW/2;
        const dY = (cY+cH/2) + cs.offY*cH*cs.scale - fH/2;

        ctx.save();
        ctx.beginPath();
        if (cell.clip) {
          const pts = cell.clip.split(',').map(p => { const [x,y]=p.trim().split(' '); return { x:parseFloat(x)/100*W, y:parseFloat(y)/100*H }; });
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let j=1; j<pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.closePath();
        } else {
          ctx.rect(cX, cY, cW, cH);
        }
        ctx.clip();
        ctx.drawImage(img, dX, dY, fW, fH);
        ctx.restore();
      }

      cvs.toBlob(blob => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href=url; a.download=`kolase_${Date.now()}.png`;
        document.body.appendChild(a); a.click();
        requestAnimationFrame(() => { document.body.removeChild(a); URL.revokeObjectURL(url); });
      }, 'image/png');
    } catch(e) { console.error(e); }
    finally { setEx(false); }
  };

  const [arW, arH]  = ar.split(':').map(Number);
  const counts      = [...new Set(LAYOUTS.map(l=>l.photoCount))].sort((a,b)=>a-b);
  const cats        = ['kotak','diagonal','chevron','gelombang'];
  const filtered    = LAYOUTS.filter(l => (!cntF || l.photoCount===cntF) && (!catF || l.category===catF));
  const filled      = cells.filter(c=>c?.imageSrc).length;
  const sc          = selCell !== null ? cells[selCell] : null;

  return (
    <div className="space-y-6" data-ca>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ══ KIRI ══ */}
        <div className="space-y-5">

          {/* Aspek Rasio */}
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Aspek Rasio</p>
            <div className="grid grid-cols-3 gap-2">
              {AR.map(o => (
                <button key={o.v} type="button" onClick={() => setAr(o.v)}
                  className={`py-2 rounded-lg text-center border transition-all ${ar===o.v ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:border-indigo-500/50'}`}>
                  <div className="text-sm font-bold">{o.l}</div>
                  <div className="text-[10px] opacity-70">{o.s}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Kontrol foto terpilih */}
          <div className={`rounded-xl border overflow-hidden ${sc?.imageSrc ? 'border-indigo-500/60 bg-indigo-950/40' : 'border-slate-700 bg-slate-800/40'}`}>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${sc?.imageSrc ? 'bg-indigo-400 animate-pulse' : 'bg-slate-600'}`}/>
                <span className="text-sm font-semibold text-slate-300">
                  {selCell !== null && sc?.imageSrc ? `Foto ${selCell+1} Dipilih` : 'Klik foto untuk edit'}
                </span>
              </div>
              {sc?.imageSrc && (
                <button type="button" onClick={() => upd(selCell!, {scale:1,offX:0,offY:0})}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700">↺ Reset</button>
              )}
            </div>
            <div className="px-4 py-3">
              {sc?.imageSrc ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400">Zoom</span>
                      <span className="text-sm font-bold text-indigo-400 font-mono bg-slate-700 px-2 py-0.5 rounded">{(sc.scale*100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => zoom(selCell!, Math.max(0.3, sc.scale-0.1))}
                        className="w-8 h-8 flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center text-lg font-bold select-none">−</button>
                      <input type="range" min={30} max={300} step={1} value={Math.round(sc.scale*100)}
                        onChange={e => zoom(selCell!, Number(e.target.value)/100)}
                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
                      <button type="button" onClick={() => zoom(selCell!, Math.min(3, sc.scale+0.1))}
                        className="w-8 h-8 flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center text-lg font-bold select-none">+</button>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-10"><span>30%</span><span>300%</span></div>
                  </div>
                  <div className="flex items-center gap-2 bg-indigo-900/20 border border-indigo-700/30 rounded-lg px-3 py-2">
                    <span>✋</span>
                    <p className="text-[11px] text-indigo-300">Drag foto di preview untuk geser posisi</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-3">Upload foto, lalu klik untuk edit posisi</p>
              )}
            </div>
          </div>

          {/* Gap */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Jarak Antar Foto</span>
              <span className="text-sm font-bold text-indigo-400 bg-slate-700 px-2 py-0.5 rounded">{gap}px</span>
            </div>
            <input type="range" min={0} max={24} value={gap} onChange={e => setGap(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
            {layout.cells.some(c=>c.clip) && (
              <p className="text-[10px] text-amber-400/60 mt-1">⚡ Jarak tidak berlaku untuk layout berbentuk — background terlihat sebagai pemisah</p>
            )}
          </div>

          {/* Background */}
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Warna Background</p>
            <div className="flex items-center gap-3 mb-2">
              <label className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600 hover:border-indigo-500 overflow-hidden flex-shrink-0" style={{background:bg}}>
                <input type="color" value={bg} onChange={e => setBg(e.target.value)} className="opacity-0 w-0 h-0"/>
              </label>
              <input type="text" value={bg} onChange={e => setBg(e.target.value)}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500"/>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {BG.map(c => (
                <button key={c} type="button" onClick={() => setBg(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${bg===c ? 'border-white scale-110' : 'border-slate-600'}`}
                  style={{background:c}}/>
              ))}
            </div>
          </div>

          {/* Layout picker */}
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Layout Kolase</p>
            {/* filter jumlah */}
            <div className="flex gap-1.5 mb-2 flex-wrap">
              <button type="button" onClick={() => setCntF(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cntF===null ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Semua</button>
              {counts.map(n => (
                <button key={n} type="button" onClick={() => setCntF(n===cntF ? null : n)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cntF===n ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{n} Foto</button>
              ))}
            </div>
            {/* filter bentuk */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              <button type="button" onClick={() => setCatF(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${catF===null ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>Semua Bentuk</button>
              {cats.map(c => (
                <button key={c} type="button" onClick={() => setCatF(c===catF ? null : c)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${catF===c ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>{CAT[c]}</button>
              ))}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto pr-1">
              {filtered.map(l => {
                const active = layout.id === l.id;
                return (
                  <button key={l.id} type="button" onClick={() => setLayout(l)} title={l.name}
                    className={`group rounded-lg overflow-hidden transition-all ${active ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-800 scale-105' : 'ring-1 ring-slate-600 hover:ring-indigo-400'}`}>
                    <div className="aspect-square bg-slate-900 relative overflow-hidden">
                      {l.cells.map((cell,ci) => (
                        <div key={ci}
                          className={`absolute ${active ? 'bg-indigo-500/70' : 'bg-slate-500/60 group-hover:bg-indigo-400/50'}`}
                          style={cell.clip
                            ? { left:0, top:0, width:'100%', height:'100%', clipPath: toClipPath(cell.clip), border:'1px solid #0f172a' }
                            : { left:`${cell.x}%`, top:`${cell.y}%`, width:`${cell.w}%`, height:`${cell.h}%`, border:'1px solid #0f172a' }
                          }/>
                      ))}
                    </div>
                    <div className="bg-slate-800 px-1 py-0.5">
                      <p className="text-[8px] text-slate-400 truncate text-center">{l.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Export */}
          <div className="pt-2">
            <button type="button" onClick={doExport} disabled={exporting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {exporting
                ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Mengekspor...</>
                : <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Download Kolase (PNG)</>
              }
            </button>
            <p className="text-center text-xs text-slate-500 mt-1.5">Output 1080px × aspek rasio terpilih</p>
          </div>
        </div>

        {/* ══ KANAN: Preview ══ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Preview</span>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${layout.category==='diagonal'?'bg-amber-600/30 text-amber-300':layout.category==='chevron'?'bg-green-600/30 text-green-300':layout.category==='gelombang'?'bg-blue-600/30 text-blue-300':'bg-slate-600/30 text-slate-400'}`}>
                {CAT[layout.category]}
              </span>
              <span className="text-xs text-slate-500 italic">{layout.name} · {ar}</span>
            </div>
          </div>
          <div className="w-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-700 relative"
            style={{ aspectRatio:`${arW} / ${arH}`, background:bg }}>
            {layout.cells.map((cell,i) => (
              <div key={`${layout.id}-${i}`} style={cellStyle(cell)}>
                <Cell
                  cs={cells[i] ?? EMPTY()} idx={i}
                  isDrop={dropOn===i} isSel={selCell===i}
                  onSel={setSelCell} onUpd={upd}
                  onUp={upload} onRm={rm}
                  onDgO={dgO} onDgL={dgL} onDrop={drop}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              {layout.cells.map((_,i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${cells[i]?.imageSrc ? (selCell===i ? 'bg-indigo-400 w-5':'bg-indigo-600 w-4'):'bg-slate-600 w-2'}`}/>
              ))}
            </div>
            <span className="text-xs text-slate-500">{filled} / {layout.cells.length} foto</span>
          </div>
          <div className="mt-3 bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-2 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400">💡 Tips:</p>
            <p className="text-[10px] text-slate-500">1. Klik foto → border biru muncul</p>
            <p className="text-[10px] text-slate-500">2. Drag foto untuk geser posisi</p>
            <p className="text-[10px] text-slate-500">3. Slider +/− untuk zoom in/out</p>
            <p className="text-[10px] text-slate-500">4. Background berfungsi sebagai pemisah di layout berbentuk</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CollageEditor;
