import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
interface CollageCell {
  x: number; y: number; w: number; h: number;
  clip?: string;
}
interface CollageLayout {
  id: string; name: string; photoCount: number;
  category: 'kotak' | 'diagonal' | 'chevron' | 'gelombang';
  cells: CollageCell[];
}
interface CellState {
  imageSrc: string | null;
  imgNaturalW: number; imgNaturalH: number;
  scale: number; offsetX: number; offsetY: number;
}
interface StagedPhoto {
  imageSrc: string; imgNaturalW: number; imgNaturalH: number;
}
interface BaseLayer { id: string; x: number; y: number; size: number; rotation: number; }
interface TextLayer  extends BaseLayer { kind: 'text';    text: string; font: string; color: string; bold: boolean; italic: boolean; shadow: boolean; }
interface StickerLayer extends BaseLayer { kind: 'sticker'; symbol: string; }
type Layer = TextLayer | StickerLayer;

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const FONTS = [
  { id:'sans',    label:'Sans',    css:'Arial, sans-serif' },
  { id:'serif',   label:'Serif',   css:'Georgia, serif' },
  { id:'mono',    label:'Mono',    css:'"Courier New", monospace' },
  { id:'display', label:'Display', css:'Impact, fantasy' },
  { id:'rounded', label:'Rounded', css:'"Trebuchet MS", sans-serif' },
  { id:'script',  label:'Script',  css:'"Palatino Linotype", cursive' },
];
const STICKERS = [
  { group:'Panah',   items:['→','←','↑','↓','↗','↙','↔','↕','➡','⬅','⬆','⬇','➜','➤','⇒'] },
  { group:'Hati',    items:['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💕','💞','💓','💗','💖','💘','💝'] },
  { group:'Bintang', items:['⭐','🌟','✨','💫','⚡','🔥','💥','❄️','🌈','☀️','🌙','⚽','🎯','🏆','🎁'] },
  { group:'Tanda',   items:['✅','❌','⚠️','❗','❓','💯','🔴','🟡','🟢','🔵','📍','📌','🎀','🏅','🎊'] },
  { group:'Wajah',   items:['😊','😂','🥰','😎','😍','🤩','👍','👎','👏','🙌','💪','🤞','✌️','🫶','🎉'] },
];
const TEXT_COLORS = ['#ffffff','#000000','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#a855f7','#ec4899','#06b6d4'];
const BG_PRESETS  = ['#000000','#ffffff','#1e293b','#0f0f0f','#4f46e5','#be185d','#b45309','#166534'];
const ASPECT_OPTIONS = [
  {v:'1:1',l:'1:1',s:'Square'},{v:'9:16',l:'9:16',s:'Portrait'},{v:'16:9',l:'16:9',s:'Landscape'},
  {v:'4:5',l:'4:5',s:'Instagram'},{v:'3:4',l:'3:4',s:'Portrait'},{v:'4:3',l:'4:3',s:'Landscape'},
];
const CAT_LABELS: Record<string,string> = { kotak:'⬜ Kotak', diagonal:'↗ Diagonal', chevron:'❯ Chevron', gelombang:'〜 Gelombang' };
const EMPTY_CELL = (): CellState => ({ imageSrc:null, imgNaturalW:0, imgNaturalH:0, scale:1, offsetX:0, offsetY:0 });
const toClip = (s: string) => `polygon(${s.split(',').map(p=>p.trim().split(' ').join('% ')+'%').join(', ')})`;
const calcMax = (iW:number,iH:number,cW:number,cH:number,s:number) => {
  if(!iW||!iH) return {mx:1,my:1};
  const cs=Math.min(cW/iW,cH/iH), vW=iW*cs*s, vH=iH*cs*s;
  return { mx:((cW+vW)/2-vW*0.2)/(cW*s), my:((cH+vH)/2-vH*0.2)/(cH*s) };
};

// ─────────────────────────────────────────────
// LAYOUTS
// ─────────────────────────────────────────────
const LAYOUTS: CollageLayout[] = [
  {id:'k2a',name:'50/50 Kiri-Kanan',category:'kotak',photoCount:2,cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:100}]},
  {id:'k2b',name:'50/50 Atas-Bawah',category:'kotak',photoCount:2,cells:[{x:0,y:0,w:100,h:50},{x:0,y:50,w:100,h:50}]},
  {id:'k2c',name:'60/40 Kiri-Kanan',category:'kotak',photoCount:2,cells:[{x:0,y:0,w:60,h:100},{x:60,y:0,w:40,h:100}]},
  {id:'k2d',name:'70/30 Kiri-Kanan',category:'kotak',photoCount:2,cells:[{x:0,y:0,w:70,h:100},{x:70,y:0,w:30,h:100}]},
  {id:'k3a',name:'1 Besar + 2 Kanan',category:'kotak',photoCount:3,cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:50},{x:55,y:50,w:45,h:50}]},
  {id:'k3b',name:'2 Kiri + 1 Besar',category:'kotak',photoCount:3,cells:[{x:0,y:0,w:45,h:50},{x:0,y:50,w:45,h:50},{x:45,y:0,w:55,h:100}]},
  {id:'k3c',name:'1 Atas + 2 Bawah',category:'kotak',photoCount:3,cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:50,h:45},{x:50,y:55,w:50,h:45}]},
  {id:'k3d',name:'2 Atas + 1 Bawah',category:'kotak',photoCount:3,cells:[{x:0,y:0,w:50,h:45},{x:50,y:0,w:50,h:45},{x:0,y:45,w:100,h:55}]},
  {id:'k4a',name:'2×2 Grid',category:'kotak',photoCount:4,cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:50,h:50},{x:50,y:50,w:50,h:50}]},
  {id:'k4b',name:'1 Besar + 3 Kanan',category:'kotak',photoCount:4,cells:[{x:0,y:0,w:55,h:100},{x:55,y:0,w:45,h:33.34},{x:55,y:33.34,w:45,h:33.33},{x:55,y:66.67,w:45,h:33.33}]},
  {id:'k4c',name:'1 Besar + 3 Bawah',category:'kotak',photoCount:4,cells:[{x:0,y:0,w:100,h:55},{x:0,y:55,w:33.34,h:45},{x:33.34,y:55,w:33.33,h:45},{x:66.67,y:55,w:33.33,h:45}]},
  {id:'k5a',name:'2 Atas + 3 Bawah',category:'kotak',photoCount:5,cells:[{x:0,y:0,w:50,h:50},{x:50,y:0,w:50,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}]},
  {id:'k5b',name:'1 Besar + 4 Kanan',category:'kotak',photoCount:5,cells:[{x:0,y:0,w:50,h:100},{x:50,y:0,w:50,h:25},{x:50,y:25,w:50,h:25},{x:50,y:50,w:50,h:25},{x:50,y:75,w:50,h:25}]},
  {id:'k5c',name:'Pola Plus',category:'kotak',photoCount:5,cells:[{x:33.33,y:0,w:33.34,h:33.33},{x:0,y:33.33,w:33.33,h:33.34},{x:33.33,y:33.33,w:33.34,h:33.34},{x:66.67,y:33.33,w:33.33,h:33.34},{x:33.33,y:66.67,w:33.34,h:33.33}]},
  {id:'k6a',name:'Grid 2×3',category:'kotak',photoCount:6,cells:[{x:0,y:0,w:33.34,h:50},{x:33.34,y:0,w:33.33,h:50},{x:66.67,y:0,w:33.33,h:50},{x:0,y:50,w:33.34,h:50},{x:33.34,y:50,w:33.33,h:50},{x:66.67,y:50,w:33.33,h:50}]},
  {id:'k6b',name:'Grid 3×2',category:'kotak',photoCount:6,cells:[{x:0,y:0,w:50,h:33.34},{x:50,y:0,w:50,h:33.34},{x:0,y:33.34,w:50,h:33.33},{x:50,y:33.34,w:50,h:33.33},{x:0,y:66.67,w:50,h:33.33},{x:50,y:66.67,w:50,h:33.33}]},
  {id:'d2a',name:'2 Miring /',category:'diagonal',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,60 0,40 100,0 100'},{x:0,y:0,w:100,h:100,clip:'60 0,100 0,100 100,40 100'}]},
  {id:'d2b',name:'2 Miring \\',category:'diagonal',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,40 0,60 100,0 100'},{x:0,y:0,w:100,h:100,clip:'40 0,100 0,100 100,60 100'}]},
  {id:'d2c',name:'2 Miring —',category:'diagonal',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,100 0,100 40,0 60'},{x:0,y:0,w:100,h:100,clip:'0 60,100 40,100 100,0 100'}]},
  {id:'d3a',name:'3 Strip Diagonal',category:'diagonal',photoCount:3,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,36 0,22 100,0 100'},{x:0,y:0,w:100,h:100,clip:'36 0,70 0,56 100,22 100'},{x:0,y:0,w:100,h:100,clip:'70 0,100 0,100 100,56 100'}]},
  {id:'d4a',name:'4 Strip Diagonal',category:'diagonal',photoCount:4,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,28 0,16 100,0 100'},{x:0,y:0,w:100,h:100,clip:'28 0,53 0,41 100,16 100'},{x:0,y:0,w:100,h:100,clip:'53 0,78 0,66 100,41 100'},{x:0,y:0,w:100,h:100,clip:'78 0,100 0,100 100,66 100'}]},
  {id:'d4b',name:'4 Segitiga X',category:'diagonal',photoCount:4,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,100 0,50 50'},{x:0,y:0,w:100,h:100,clip:'100 0,100 100,50 50'},{x:0,y:0,w:100,h:100,clip:'0 100,100 100,50 50'},{x:0,y:0,w:100,h:100,clip:'0 0,50 50,0 100'}]},
  {id:'c2a',name:'2 Panah →',category:'chevron',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,55 0,78 50,55 100,0 100'},{x:0,y:0,w:100,h:100,clip:'55 0,100 0,100 100,55 100,78 50'}]},
  {id:'c2b',name:'2 Panah ←',category:'chevron',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,45 0,22 50,45 100,0 100'},{x:0,y:0,w:100,h:100,clip:'45 0,100 0,100 100,45 100,22 50'}]},
  {id:'c2c',name:'2 Bentuk V',category:'chevron',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,100 0,50 60,0 100'},{x:0,y:0,w:100,h:100,clip:'0 100,50 60,100 0,100 100'}]},
  {id:'c3a',name:'3 Chevron →',category:'chevron',photoCount:3,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,28 0,50 50,28 100,0 100'},{x:0,y:0,w:100,h:100,clip:'28 0,62 0,84 50,62 100,28 100,50 50'},{x:0,y:0,w:100,h:100,clip:'62 0,100 0,100 100,62 100,84 50'}]},
  {id:'c4a',name:'4 Rantai →',category:'chevron',photoCount:4,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,30 0,42 50,30 100,0 100'},{x:0,y:0,w:100,h:100,clip:'30 0,55 0,67 50,55 100,30 100,42 50'},{x:0,y:0,w:100,h:100,clip:'55 0,78 0,90 50,78 100,55 100,67 50'},{x:0,y:0,w:100,h:100,clip:'78 0,100 0,100 100,78 100,90 50'}]},
  {id:'g2a',name:'2 Gelombang |',category:'gelombang',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,46 0,50 8,55 17,57 25,55 33,50 42,45 50,43 58,46 67,52 75,54 83,52 92,48 100,0 100'},{x:0,y:0,w:100,h:100,clip:'46 0,100 0,100 100,48 100,52 92,54 83,52 75,46 67,43 58,45 50,50 42,55 33,57 25,55 17,50 8'}]},
  {id:'g2b',name:'2 Gelombang —',category:'gelombang',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,100 0,100 46,92 50,83 55,75 57,67 55,58 50,50 45,42 43,33 46,25 52,17 54,8 52,0 48'},{x:0,y:0,w:100,h:100,clip:'0 48,8 52,17 54,25 52,33 46,42 43,50 45,58 50,67 55,75 57,83 55,92 50,100 46,100 100,0 100'}]},
  {id:'g3a',name:'3 Zigzag',category:'gelombang',photoCount:3,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,33 0,36 17,30 33,36 50,30 67,36 83,33 100,0 100'},{x:0,y:0,w:100,h:100,clip:'33 0,67 0,70 17,64 33,70 50,64 67,70 83,67 100,33 100,36 83,30 67,36 50,30 33,36 17'},{x:0,y:0,w:100,h:100,clip:'67 0,100 0,100 100,67 100,70 83,64 67,70 50,64 33,70 17'}]},
  {id:'g2c',name:'2 Riak',category:'gelombang',photoCount:2,cells:[{x:0,y:0,w:100,h:100,clip:'0 0,100 0,100 35,88 38,75 46,63 54,50 58,38 54,25 46,13 38,0 35'},{x:0,y:0,w:100,h:100,clip:'0 35,13 38,25 46,38 54,50 58,63 54,75 46,88 38,100 35,100 100,0 100'}]},
];

// ─────────────────────────────────────────────
// CELL EDITOR  
// ─────────────────────────────────────────────
const CellEditor: React.FC<{
  cs: CellState; idx: number; isDragOver: boolean; isSelected: boolean;
  onSelect(i:number):void; onUpdate(i:number,p:Partial<CellState>):void;
  onUpload(i:number,f:File):void; onRemove(i:number):void;
  onDragOver(e:React.DragEvent,i:number):void; onDragLeave():void; onDrop(e:React.DragEvent,i:number):void;
}> = ({ cs,idx,isDragOver,isSelected,onSelect,onUpdate,onUpload,onRemove,onDragOver,onDragLeave,onDrop }) => {
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pinching = useRef(false);
  const pinchStart = useRef({dist:0,scale:1,ox:0,oy:0});
  const touchRef = useRef({x:0,y:0,ox:0,oy:0});

  const dist = (t:React.TouchList) => Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);

  const onMD = (e:React.MouseEvent) => {
    if(!cs.imageSrc) return; e.preventDefault(); onSelect(idx); dragging.current=true;
    const sx=e.clientX,sy=e.clientY,ox=cs.offsetX,oy=cs.offsetY;
    const mv=(ev:MouseEvent)=>{
      if(!dragging.current||!ref.current) return;
      const r=ref.current.getBoundingClientRect(),s=cs.scale;
      const {mx,my}=calcMax(cs.imgNaturalW,cs.imgNaturalH,r.width,r.height,s);
      onUpdate(idx,{offsetX:Math.max(-mx,Math.min(mx,ox+(ev.clientX-sx)/(r.width*s))),offsetY:Math.max(-my,Math.min(my,oy+(ev.clientY-sy)/(r.height*s)))});
    };
    const up=()=>{dragging.current=false;window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);};
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
  };

  const onTS = (e:React.TouchEvent) => {
    if(!cs.imageSrc) return;
    e.preventDefault(); onSelect(idx);
    if(e.touches.length===2){
      pinching.current=true; dragging.current=false;
      pinchStart.current={dist:dist(e.touches),scale:cs.scale,ox:cs.offsetX,oy:cs.offsetY};
    } else if(e.touches.length===1&&!pinching.current){
      dragging.current=true;
      touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,ox:cs.offsetX,oy:cs.offsetY};
    }
  };
  const onTM = (e:React.TouchEvent) => {
    if(!cs.imageSrc||!ref.current) return; e.preventDefault();
    const r=ref.current.getBoundingClientRect();
    if(e.touches.length===2&&pinching.current){
      const ratio=dist(e.touches)/pinchStart.current.dist;
      const ns=Math.max(0.3,Math.min(3,pinchStart.current.scale*ratio));
      const {mx,my}=calcMax(cs.imgNaturalW,cs.imgNaturalH,r.width,r.height,ns);
      onUpdate(idx,{scale:ns,offsetX:Math.max(-mx,Math.min(mx,pinchStart.current.ox)),offsetY:Math.max(-my,Math.min(my,pinchStart.current.oy))});
    } else if(e.touches.length===1&&dragging.current&&!pinching.current){
      const s=cs.scale,{mx,my}=calcMax(cs.imgNaturalW,cs.imgNaturalH,r.width,r.height,s);
      onUpdate(idx,{offsetX:Math.max(-mx,Math.min(mx,touchRef.current.ox+(e.touches[0].clientX-touchRef.current.x)/(r.width*s))),offsetY:Math.max(-my,Math.min(my,touchRef.current.oy+(e.touches[0].clientY-touchRef.current.y)/(r.height*s)))});
    }
  };
  const onTE = (e:React.TouchEvent) => {
    if(e.touches.length<2) pinching.current=false;
    if(e.touches.length===0) dragging.current=false;
    if(e.touches.length===1&&!pinching.current){
      dragging.current=true;
      touchRef.current={x:e.touches[0].clientX,y:e.touches[0].clientY,ox:cs.offsetX,oy:cs.offsetY};
    }
  };

  return (
    <div className="relative w-full h-full" onDragOver={e=>onDragOver(e,idx)} onDragLeave={onDragLeave} onDrop={e=>onDrop(e,idx)}>
      <div ref={ref}
        className={`relative w-full h-full overflow-hidden group ${cs.imageSrc?'cursor-grab active:cursor-grabbing':''} ${isSelected&&cs.imageSrc?'ring-2 ring-inset ring-indigo-400':''} ${isDragOver?'ring-2 ring-inset ring-indigo-300':''}`}
        style={{background:'rgba(15,23,42,0.9)',touchAction:'none'}}
        onMouseDown={onMD} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
        onClick={()=>cs.imageSrc&&onSelect(idx)}>
        {cs.imageSrc ? (
          <>
            <img src={cs.imageSrc} alt="" draggable={false} style={{display:'block',width:'100%',height:'100%',objectFit:'contain',objectPosition:'center',transformOrigin:'center',transform:`scale(${cs.scale}) translate(${cs.offsetX*100}%,${cs.offsetY*100}%)`,userSelect:'none',pointerEvents:'none',willChange:'transform'}}/>
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-between p-1 pointer-events-none group-hover:pointer-events-auto">
              <span className="text-[9px] font-bold bg-indigo-600 text-white w-4 h-4 rounded-full flex items-center justify-center">{idx+1}</span>
              <button type="button" onClick={e=>{e.stopPropagation();onRemove(idx);}} className="w-5 h-5 bg-red-600/90 hover:bg-red-500 text-white rounded text-xs flex items-center justify-center">✕</button>
            </div>
            <span className="absolute bottom-1 left-1 text-[8px] text-white/70 bg-black/50 px-1 rounded opacity-0 group-hover:opacity-100">{(cs.scale*100).toFixed(0)}%</span>
          </>
        ) : isDragOver ? (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-indigo-300 font-bold">Lepaskan!</div>
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/30">
            <input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0]){onUpload(idx,e.target.files[0]);onSelect(idx);}e.target.value='';}}/>
            <svg className="w-4 h-4 text-slate-500 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
            <span className="text-[9px] text-slate-500">Foto {idx+1}</span>
          </label>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TEXT FORM — state lokal, tidak terpengaruh re-render parent
// ─────────────────────────────────────────────
const TextForm: React.FC<{ onAdd:(l:TextLayer)=>void }> = ({ onAdd }) => {
  const [text,   setText  ] = useState('');
  const [font,   setFont  ] = useState('sans');
  const [color,  setColor ] = useState('#ffffff');
  const [size,   setSize  ] = useState(40);
  const [bold,   setBold  ] = useState(false);
  const [italic, setItalic] = useState(false);
  const [shadow, setShadow] = useState(true);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd({ kind:'text', id:`t_${Date.now()}`, text:t, font, color, size, bold, italic, shadow, x:50, y:50, rotation:0 });
    setText('');
  };

  return (
    <div className="p-3 space-y-3" onMouseDown={e => e.stopPropagation()}>
      <div>
        <label className="block text-[10px] text-slate-400 mb-1">Teks</label>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Ketik teks di sini..."
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="block text-[10px] text-slate-400 mb-1">Font</label>
        <div className="grid grid-cols-3 gap-1">
          {FONTS.map(f=>(
            <button key={f.id} type="button" onClick={()=>setFont(f.id)}
              className={`py-1.5 px-2 rounded-lg text-xs border truncate ${font===f.id?'bg-indigo-600 border-indigo-500 text-white':'bg-slate-700/60 border-slate-600 text-slate-300'}`}
              style={{fontFamily:f.css}}>{f.label}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-[10px] text-slate-400 mb-1">Warna</label>
        <div className="flex gap-1.5 flex-wrap">
          {TEXT_COLORS.map(c=>(
            <button key={c} type="button" onClick={()=>setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color===c?'border-white scale-125':'border-slate-600'}`}
              style={{background:c}}/>
          ))}
          <label className="w-6 h-6 rounded-full border-2 border-slate-500 overflow-hidden cursor-pointer" style={{background:color}}>
            <input type="color" value={color} onChange={e=>setColor(e.target.value)} className="opacity-0 w-0 h-0"/>
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="block text-[10px] text-slate-400 mb-1">Ukuran: {size}px</label>
          <input type="range" min={12} max={120} value={size} onChange={e=>setSize(+e.target.value)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
        </div>
        <div className="flex gap-1 pt-4">
          <button type="button" onClick={()=>setBold(v=>!v)} className={`w-8 h-8 rounded-lg text-sm font-bold ${bold?'bg-indigo-600 text-white':'bg-slate-700 text-slate-400'}`}>B</button>
          <button type="button" onClick={()=>setItalic(v=>!v)} className={`w-8 h-8 rounded-lg text-sm italic ${italic?'bg-indigo-600 text-white':'bg-slate-700 text-slate-400'}`}>I</button>
          <button type="button" onClick={()=>setShadow(v=>!v)} className={`w-8 h-8 rounded-lg text-sm ${shadow?'bg-indigo-600 text-white':'bg-slate-700 text-slate-400'}`}>S</button>
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-2 min-h-[44px] flex items-center justify-center overflow-hidden">
        <span style={{fontFamily:FONTS.find(f=>f.id===font)?.css,color,fontSize:`${Math.min(size,36)}px`,fontWeight:bold?'bold':'normal',fontStyle:italic?'italic':'normal',textShadow:shadow?'1px 1px 3px rgba(0,0,0,0.8)':'none'}}>
          {text||'Preview Teks'}
        </span>
      </div>
      <button type="button" onClick={submit} disabled={!text.trim()}
        className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-semibold">
        + Tambah ke Kolase
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const CollageEditor: React.FC = () => {
  const [staged,   setStaged  ] = useState<(StagedPhoto|null)[]>([null,null]);
  const [layout,   setLayout  ] = useState<CollageLayout|null>(null);
  const [cells,    setCells   ] = useState<CellState[]>([]);
  const [layers,   setLayers  ] = useState<Layer[]>([]);
  const [selLayer, setSelLayer] = useState<string|null>(null);
  const [activeTab,setActiveTab] = useState<'teks'|'stiker'>('teks');
  const [stickerGrp,setStickerGrp] = useState('Panah');

  const [ar,     setAr    ] = useState('1:1');
  const [gap,    setGap   ] = useState(4);
  const [bg,     setBg    ] = useState('#000000');
  const [catF,   setCatF  ] = useState<string|null>(null);
  const [exporting,setExporting] = useState(false);
  const [dropOver, setDropOver ] = useState<number|null>(null);
  const [selCell,  setSelCell  ] = useState<number|null>(null);
  const [dropStaged,setDropStaged] = useState<number|null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const layerDragRef = useRef<{id:string;sx:number;sy:number;ox:number;oy:number}|null>(null);

  const filledCount = staged.filter(Boolean).length;

  // Sync cells saat layout/staged berubah
  useEffect(() => {
    if (!layout) return;
    if (filledCount !== layout.photoCount) { setLayout(null); setCells([]); return; }
    setCells(prev => layout.cells.map((_,i) => {
      const s = staged[i];
      if (!s) return EMPTY_CELL();
      const ex = prev[i];
      if (ex?.imageSrc === s.imageSrc) return ex;
      return { imageSrc:s.imageSrc, imgNaturalW:s.imgNaturalW, imgNaturalH:s.imgNaturalH, scale:1, offsetX:0, offsetY:0 };
    }));
  }, [staged, layout, filledCount]);

  const uploadFile = useCallback((i: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = e => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => setStaged(prev => {
        const n = [...prev];
        n[i] = { imageSrc:src, imgNaturalW:img.naturalWidth, imgNaturalH:img.naturalHeight };
        return n;
      });
      img.src = src;
    };
    r.readAsDataURL(file);
  }, []);

  const uploadMultiple = useCallback((files: FileList) => {
    Array.from(files).filter(f=>f.type.startsWith('image/')).slice(0,6).forEach(file => {
      const r = new FileReader();
      r.onload = e => {
        const src = e.target?.result as string;
        const img = new Image();
        img.onload = () => setStaged(prev => {
          const n = [...prev];
          const slot = n.findIndex(x => !x);
          if (slot === -1 && n.length < 6) { n.push({ imageSrc:src, imgNaturalW:img.naturalWidth, imgNaturalH:img.naturalHeight }); }
          else if (slot !== -1) { n[slot] = { imageSrc:src, imgNaturalW:img.naturalWidth, imgNaturalH:img.naturalHeight }; }
          return n;
        });
        img.src = src;
      };
      r.readAsDataURL(file);
    });
  }, []);

  const updateCell = useCallback((i:number,p:Partial<CellState>) => setCells(prev=>prev.map((c,ci)=>ci!==i?c:{...c,...p})),[]);
  const zoomCell = useCallback((i:number,ns:number) => setCells(prev=>prev.map((c,ci)=>{
    if(ci!==i) return c;
    const {mx,my}=calcMax(c.imgNaturalW||1,c.imgNaturalH||1,c.imgNaturalW||1,c.imgNaturalH||1,ns);
    return {...c,scale:ns,offsetX:Math.max(-mx,Math.min(mx,c.offsetX)),offsetY:Math.max(-my,Math.min(my,c.offsetY))};
  })),[]);

  const addLayer   = useCallback((l:Layer)=>{setLayers(p=>[...p,l]);setSelLayer(l.id);},[]);
  const removeLayer= useCallback((id:string)=>{setLayers(p=>p.filter(l=>l.id!==id));setSelLayer(null);},[]);
  const updateLayer= useCallback((id:string,p:Partial<Layer>)=>setLayers(prev=>prev.map(l=>l.id!==id?l:{...l,...p}as Layer)),[]);

  // Layer drag — mouse
  const onLayerMD = useCallback((e:React.MouseEvent,id:string,lx:number,ly:number) => {
    e.stopPropagation(); e.preventDefault();
    setSelLayer(id);
    layerDragRef.current = {id,sx:e.clientX,sy:e.clientY,ox:lx,oy:ly};
    const mv = (ev:MouseEvent) => {
      if(!layerDragRef.current||!previewRef.current) return;
      const r=previewRef.current.getBoundingClientRect();
      updateLayer(layerDragRef.current.id,{
        x:Math.max(5,Math.min(95,layerDragRef.current.ox+(ev.clientX-layerDragRef.current.sx)/r.width*100)),
        y:Math.max(5,Math.min(95,layerDragRef.current.oy+(ev.clientY-layerDragRef.current.sy)/r.height*100)),
      });
    };
    const up = ()=>{layerDragRef.current=null;window.removeEventListener('mousemove',mv);window.removeEventListener('mouseup',up);};
    window.addEventListener('mousemove',mv); window.addEventListener('mouseup',up);
  },[updateLayer]);

  // Layer drag — touch
  const onLayerTS = useCallback((e:React.TouchEvent,id:string,lx:number,ly:number) => {
    e.stopPropagation();
    if(e.touches.length!==1) return;
    setSelLayer(id);
    layerDragRef.current={id,sx:e.touches[0].clientX,sy:e.touches[0].clientY,ox:lx,oy:ly};
    const mv=(ev:TouchEvent)=>{
      if(!layerDragRef.current||ev.touches.length!==1||!previewRef.current) return;
      ev.preventDefault();
      const r=previewRef.current.getBoundingClientRect();
      updateLayer(layerDragRef.current.id,{
        x:Math.max(5,Math.min(95,layerDragRef.current.ox+(ev.touches[0].clientX-layerDragRef.current.sx)/r.width*100)),
        y:Math.max(5,Math.min(95,layerDragRef.current.oy+(ev.touches[0].clientY-layerDragRef.current.sy)/r.height*100)),
      });
    };
    const up=()=>{layerDragRef.current=null;window.removeEventListener('touchmove',mv);window.removeEventListener('touchend',up);};
    window.addEventListener('touchmove',mv,{passive:false}); window.addEventListener('touchend',up);
  },[updateLayer]);

  const getCellStyle = useCallback((cell:CollageCell):React.CSSProperties => {
    if(cell.clip) return {position:'absolute',left:0,top:0,width:'100%',height:'100%',clipPath:toClip(cell.clip)};
    const g=gap/2,e=0.05;
    return {position:'absolute',left:`${cell.x}%`,top:`${cell.y}%`,width:`${cell.w}%`,height:`${cell.h}%`,
      paddingTop:cell.y<e?0:g,paddingBottom:cell.y+cell.h>100-e?0:g,
      paddingLeft:cell.x<e?0:g,paddingRight:cell.x+cell.w>100-e?0:g};
  },[gap]);

  const handleExport = async () => {
    if (!layout) return;
    setExporting(true);
    try {
      const [aw,ah]=ar.split(':').map(Number);
      const W=1080,H=Math.round(W*ah/aw),eps=0.05,gp=gap;
      const canvas=document.createElement('canvas'); canvas.width=W; canvas.height=H;
      const ctx=canvas.getContext('2d')!;
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

      for(let i=0;i<layout.cells.length;i++){
        const cell=layout.cells[i],cs=cells[i];
        if(!cs?.imageSrc) continue;
        const img=await new Promise<HTMLImageElement>((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=cs.imageSrc!;if(im.complete&&im.naturalWidth>0)res(im);});
        let cX:number,cY:number,cW:number,cH:number;
        if(cell.clip){cX=0;cY=0;cW=W;cH=H;}
        else{
          const pT=cell.y<eps?0:gp/2,pB=cell.y+cell.h>100-eps?0:gp/2,pL=cell.x<eps?0:gp/2,pR=cell.x+cell.w>100-eps?0:gp/2;
          cX=(cell.x/100)*W+pL;cY=(cell.y/100)*H+pT;cW=(cell.w/100)*W-pL-pR;cH=(cell.h/100)*H-pT-pB;
        }
        const cs2=Math.min(cW/img.naturalWidth,cH/img.naturalHeight);
        const fW=img.naturalWidth*cs2*cs.scale,fH=img.naturalHeight*cs2*cs.scale;
        const dX=(cX+cW/2)+cs.offsetX*cW*cs.scale-fW/2,dY=(cY+cH/2)+cs.offsetY*cH*cs.scale-fH/2;
        ctx.save(); ctx.beginPath();
        if(cell.clip){const pts=cell.clip.split(',').map(p=>{const[x,y]=p.trim().split(' ');return{x:+x/100*W,y:+y/100*H};});ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));ctx.closePath();}
        else ctx.rect(cX,cY,cW,cH);
        ctx.clip(); ctx.drawImage(img,dX,dY,fW,fH); ctx.restore();
      }

      // Render layers
      for(const layer of layers){
        const lx=layer.x/100*W,ly=layer.y/100*H;
        ctx.save(); ctx.translate(lx,ly); ctx.rotate(layer.rotation*Math.PI/180);
        if(layer.kind==='text'){
          const tl=layer as TextLayer;
          const fscale=W/500;
          ctx.font=`${tl.italic?'italic ':''}${tl.bold?'bold ':''}${tl.size*fscale}px ${FONTS.find(f=>f.id===tl.font)?.css||'Arial'}`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          if(tl.shadow){ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=tl.size*0.2*fscale;ctx.shadowOffsetX=2;ctx.shadowOffsetY=2;}
          ctx.fillStyle=tl.color; ctx.fillText(tl.text,0,0);
        } else {
          const sl=layer as StickerLayer;
          ctx.font=`${sl.size*(W/500)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(sl.symbol,0,0);
        }
        ctx.restore();
      }

      canvas.toBlob(blob=>{
        if(!blob) return;
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=`kolase_${Date.now()}.png`;document.body.appendChild(a);a.click();
        requestAnimationFrame(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);});
      },'image/png');
    } catch(e){console.error(e);}
    finally{setExporting(false);}
  };

  const [arW,arH]=ar.split(':').map(Number);
  const matchLayouts=filledCount>0?LAYOUTS.filter(l=>l.photoCount===filledCount&&(!catF||l.category===catF)):[];
  const selCs=selCell!==null?cells[selCell]:null;
  const step=filledCount===0?1:!layout?2:3;

  return (
    <div className="space-y-5">

      {/* Step indicator */}
      <div className="flex items-center gap-1.5">
        {(['Upload Foto','Pilih Layout','Atur & Download'] as const).map((lbl,i)=>(
          <React.Fragment key={i}>
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold ${step===i+1?'bg-indigo-600 text-white':step>i+1?'bg-indigo-900/50 text-indigo-400':'bg-slate-700/50 text-slate-500'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${step>i+1?'bg-indigo-500 text-white':step===i+1?'bg-white text-indigo-600':'bg-slate-600 text-slate-400'}`}>{step>i+1?'✓':i+1}</span>
              {lbl}
            </div>
            {i<2&&<div className={`flex-1 h-0.5 rounded ${step>i+1?'bg-indigo-600':'bg-slate-700'}`}/>}
          </React.Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── KIRI ── */}
        <div className="space-y-4">

          {/* Step 1: Upload */}
          <div className={`rounded-xl border overflow-hidden ${step===1?'border-indigo-500/60 bg-indigo-950/20':'border-slate-700 bg-slate-800/30'}`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step>1?'bg-indigo-500 text-white':'bg-indigo-600 text-white'}`}>{step>1?'✓':'1'}</span>
                <span className="text-sm font-semibold text-white">Upload Foto</span>
                <span className="text-xs text-slate-500">({filledCount}/{staged.length} · maks 6)</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  ↑ Semua
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e=>{if(e.target.files?.length)uploadMultiple(e.target.files);e.target.value='';}}/>
                </label>
                {staged.length<6&&<button type="button" onClick={()=>setStaged(p=>[...p,null])} className="text-xs text-indigo-400 hover:text-indigo-300">+ Slot</button>}
              </div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2">
                {staged.map((photo,i)=>(
                  <div key={i} className="relative aspect-square">
                    <div className={`w-full h-full rounded-lg overflow-hidden border-2 border-dashed ${photo?'border-transparent':dropStaged===i?'border-indigo-400 bg-slate-700':'border-slate-600 bg-slate-800/50'}`}
                      onDragOver={e=>{e.preventDefault();setDropStaged(i);}}
                      onDragLeave={()=>setDropStaged(null)}
                      onDrop={e=>{e.preventDefault();setDropStaged(null);const f=e.dataTransfer.files[0];if(f)uploadFile(i,f);}}>
                      {photo?(
                        <>
                          <img src={photo.imageSrc} className="w-full h-full object-cover" alt=""/>
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <label className="cursor-pointer p-1 bg-slate-700 rounded text-[10px] text-white">Ganti<input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0])uploadFile(i,e.target.files[0]);e.target.value='';}}/>
                            </label>
                            <button type="button" onClick={()=>{setStaged(p=>p.filter((_,j)=>j!==i).length?p.filter((_,j)=>j!==i):[null]);setLayout(null);setCells([]);}} className="p-1 bg-red-600/80 rounded text-[10px] text-white">✕</button>
                          </div>
                        </>
                      ):(
                        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                          <input type="file" accept="image/*" className="hidden" onChange={e=>{if(e.target.files?.[0])uploadFile(i,e.target.files[0]);e.target.value='';}}/>
                          <svg className="w-5 h-5 text-slate-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4"/></svg>
                          <span className="text-[9px] text-slate-500">Foto {i+1}</span>
                        </label>
                      )}
                    </div>
                    <span className="absolute top-1 left-1 w-4 h-4 bg-black/60 text-white text-[8px] font-bold rounded-full flex items-center justify-center pointer-events-none">{i+1}</span>
                  </div>
                ))}
              </div>
              {filledCount>0&&!layout&&<p className="text-[10px] text-indigo-400 text-center mt-2 animate-pulse">✓ {filledCount} foto — pilih layout di bawah</p>}
            </div>
          </div>

          {/* Step 2: Layout */}
          {filledCount>0&&(
            <div className={`rounded-xl border overflow-hidden ${!layout?'border-indigo-500/60 bg-indigo-950/20':'border-slate-700 bg-slate-800/30'}`}>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${layout?'bg-indigo-500 text-white':'bg-indigo-600 text-white'}`}>{layout?'✓':'2'}</span>
                <span className="text-sm font-semibold text-white">Pilih Layout</span>
                <span className="text-xs text-slate-400 bg-indigo-600/20 px-2 py-0.5 rounded-full">{matchLayouts.length} layout untuk {filledCount} foto</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex gap-1.5 flex-wrap">
                  {['kotak','diagonal','chevron','gelombang'].map(cat=>{
                    const has=LAYOUTS.some(l=>l.photoCount===filledCount&&l.category===cat);
                    return has&&<button key={cat} type="button" onClick={()=>setCatF(cat===catF?null:cat)}
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${catF===cat?'bg-purple-600 text-white':'bg-slate-700 text-slate-400'}`}>{CAT_LABELS[cat]}</button>;
                  })}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-56 overflow-y-auto">
                  {matchLayouts.map(l=>{
                    const active=layout?.id===l.id;
                    const isShaped=l.cells.some(c=>c.clip);
                    const CA=['#4338ca','#4f46e5','#6366f1','#818cf8','#3730a3','#c7d2fe'];
                    const CI=['#334155','#475569','#64748b','#1e293b','#374151','#52525b'];
                    return (
                      <button key={l.id} type="button" onClick={()=>{
                        setLayout(l); setSelCell(null);
                        setCells(l.cells.map((_,i)=>{const s=staged[i];return s?{imageSrc:s.imageSrc,imgNaturalW:s.imgNaturalW,imgNaturalH:s.imgNaturalH,scale:1,offsetX:0,offsetY:0}:EMPTY_CELL();}));
                      }} title={l.name}
                        className={`rounded-lg overflow-hidden ${active?'ring-2 ring-indigo-500 ring-offset-1 ring-offset-slate-800 scale-105':'ring-1 ring-slate-600 hover:ring-indigo-400'}`}>
                        <div className="aspect-square bg-black relative overflow-hidden">
                          {isShaped?(
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              {l.cells.map((cell,ci)=>{
                                const fill=active?CA[ci%CA.length]:CI[ci%CI.length];
                                const pts=cell.clip!.split(',').map(p=>p.trim().split(' ').join(',')).join(' ');
                                return <polygon key={ci} points={pts} fill={fill} stroke="#000" strokeWidth="2"/>;
                              })}
                            </svg>
                          ):(
                            l.cells.map((cell,ci)=>(
                              <div key={ci} className="absolute" style={{left:`${cell.x}%`,top:`${cell.y}%`,width:`${cell.w}%`,height:`${cell.h}%`,background:active?CA[ci%CA.length]:CI[ci%CI.length],border:'1px solid #000'}}/>
                            ))
                          )}
                        </div>
                        <div className="bg-slate-800 px-1 py-0.5"><p className="text-[8px] text-slate-400 truncate text-center">{l.name}</p></div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pengaturan */}
          {layout&&(
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-indigo-600 text-white">3</span>
                <span className="text-sm font-semibold text-white">Pengaturan</span>
              </div>
              <div className="p-4 space-y-4">
                {/* AR */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Aspek Rasio</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ASPECT_OPTIONS.map(o=>(
                      <button key={o.v} type="button" onClick={()=>setAr(o.v)}
                        className={`py-1.5 rounded-lg text-center border ${ar===o.v?'bg-indigo-600 border-indigo-500 text-white':'bg-slate-700/60 border-slate-600 text-slate-300'}`}>
                        <div className="text-xs font-bold">{o.l}</div><div className="text-[9px] opacity-70">{o.s}</div>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Gap */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Jarak</label>
                    <span className="text-xs font-bold text-indigo-400 bg-slate-700 px-2 py-0.5 rounded">{gap}px</span>
                  </div>
                  <input type="range" min={0} max={24} value={gap} onChange={e=>setGap(+e.target.value)} className="w-full h-2 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
                </div>
                {/* Background */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Background</label>
                  <div className="flex items-center gap-2 mb-1.5">
                    <label className="w-8 h-8 rounded-lg cursor-pointer border-2 border-slate-600 overflow-hidden flex-shrink-0" style={{background:bg}}>
                      <input type="color" value={bg} onChange={e=>setBg(e.target.value)} className="opacity-0 w-0 h-0"/>
                    </label>
                    <input type="text" value={bg} onChange={e=>setBg(e.target.value)} className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"/>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {BG_PRESETS.map(c=><button key={c} type="button" onClick={()=>setBg(c)} className={`w-6 h-6 rounded-full border-2 ${bg===c?'border-white scale-110':'border-slate-600'}`} style={{background:c}}/>)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Teks & Stiker — hanya tampil setelah pilih layout */}
          {layout&&(
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
              <div className="flex border-b border-slate-700">
                {(['teks','stiker'] as const).map(tab=>(
                  <button key={tab} type="button" onClick={()=>setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${activeTab===tab?'bg-indigo-600/30 text-white border-b-2 border-indigo-500':'text-slate-400 hover:text-slate-300'}`}>
                    {tab==='teks'?'✏️ Teks':'🎨 Stiker'}
                  </button>
                ))}
              </div>
              {activeTab==='teks'&&<TextForm onAdd={addLayer}/>}
              {activeTab==='stiker'&&(
                <div className="p-3 space-y-2">
                  <div className="flex gap-1.5 flex-wrap">
                    {STICKERS.map(g=>(
                      <button key={g.group} type="button" onClick={()=>setStickerGrp(g.group)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${stickerGrp===g.group?'bg-purple-600 text-white':'bg-slate-700 text-slate-400'}`}>{g.group}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {STICKERS.find(g=>g.group===stickerGrp)?.items.map(sym=>(
                      <button key={sym} type="button"
                        onClick={()=>addLayer({kind:'sticker',id:`s_${Date.now()}`,symbol:sym,size:48,x:50,y:50,rotation:0})}
                        className="aspect-square rounded-lg bg-slate-700 hover:bg-slate-600 text-xl flex items-center justify-center">
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Layer list */}
          {layout&&layers.length>0&&(
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                <span className="text-xs font-semibold text-slate-300">Layer ({layers.length})</span>
                <button type="button" onClick={()=>setLayers([])} className="text-[10px] text-red-400/60 hover:text-red-400">Hapus Semua</button>
              </div>
              <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
                {[...layers].reverse().map(layer=>{
                  const isSel=selLayer===layer.id;
                  return (
                    <div key={layer.id} onClick={()=>setSelLayer(isSel?null:layer.id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ${isSel?'bg-indigo-600/30 border border-indigo-500/40':'bg-slate-700/40 hover:bg-slate-700/60'}`}>
                      <span className="text-sm">{layer.kind==='sticker'?layer.symbol:'✏️'}</span>
                      <span className="text-xs text-slate-300 truncate flex-1">{layer.kind==='text'?layer.text:`Stiker ${layer.symbol}`}</span>
                      {isSel&&<input type="range" min={12} max={150} value={layer.size} onClick={e=>e.stopPropagation()}
                        onChange={e=>{e.stopPropagation();updateLayer(layer.id,{size:+e.target.value});}}
                        className="w-16 h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-600"/>}
                      <button type="button" onClick={e=>{e.stopPropagation();removeLayer(layer.id);}}
                        className="w-5 h-5 bg-red-600/60 hover:bg-red-500 rounded text-[10px] text-white flex items-center justify-center">✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export */}
          {layout&&(
            <button type="button" onClick={handleExport} disabled={exporting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 flex items-center justify-center gap-2">
              {exporting?<><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Mengekspor...</>
              :<><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Download Kolase (PNG)</>}
            </button>
          )}
        </div>

        {/* ── KANAN: Preview ── */}
        <div>
          {!layout?(
            <div className="w-full rounded-xl ring-1 ring-slate-700 bg-slate-800/50 flex flex-col items-center justify-center py-16 gap-3 text-center px-6 min-h-64">
              <div className="text-5xl">{filledCount>0?'🖼️':'📷'}</div>
              <p className="text-slate-400 font-semibold">{filledCount>0?`${filledCount} foto siap`:'Upload foto dulu'}</p>
              <p className="text-xs text-slate-600">{filledCount>0?'Pilih layout dari panel kiri':'Layout muncul otomatis sesuai jumlah foto'}</p>
            </div>
          ):(
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Preview</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${layout.category==='diagonal'?'bg-amber-600/30 text-amber-300':layout.category==='chevron'?'bg-green-600/30 text-green-300':layout.category==='gelombang'?'bg-blue-600/30 text-blue-300':'bg-slate-600/30 text-slate-400'}`}>{CAT_LABELS[layout.category]}</span>
                  <button type="button" onClick={()=>{setLayout(null);setCells([]);setSelCell(null);}} className="text-[10px] text-slate-500 hover:text-red-400">✕ ganti</button>
                </div>
              </div>

              {/* Preview canvas — outer: relative, NO overflow-hidden */}
              <div ref={previewRef}
                className="w-full rounded-xl shadow-2xl ring-1 ring-slate-700"
                style={{position:'relative',paddingBottom:`${(arH/arW)*100}%`}}
                onClick={()=>{setSelLayer(null);setSelCell(null);}}>

                {/* Foto — overflow:hidden untuk clip */}
                <div className="absolute inset-0 rounded-xl overflow-hidden" style={{background:bg}}>
                  {layout.cells.map((cell,i)=>(
                    <div key={`${layout.id}-${i}`} style={getCellStyle(cell)}>
                      <CellEditor cs={cells[i]??EMPTY_CELL()} idx={i}
                        isDragOver={dropOver===i} isSelected={selCell===i}
                        onSelect={setSelCell} onUpdate={updateCell}
                        onUpload={uploadFile} onRemove={i=>{updateCell(i,EMPTY_CELL());setSelCell(null);}}
                        onDragOver={(e,i)=>{e.preventDefault();setDropOver(i);}} onDragLeave={()=>setDropOver(null)}
                        onDrop={(e,i)=>{e.preventDefault();setDropOver(null);const f=e.dataTransfer.files[0];if(f)uploadFile(i,f);}}/>
                    </div>
                  ))}
                </div>

                {/* Layer overlay — NO overflow:hidden, events live */}
                {layers.map(layer=>{
                  const isSel=selLayer===layer.id;
                  const isText=layer.kind==='text';
                  const tl=layer as TextLayer;
                  const sl=layer as StickerLayer;
                  return (
                    <div key={layer.id}
                      style={{position:'absolute',left:`${layer.x}%`,top:`${layer.y}%`,transform:`translate(-50%,-50%) rotate(${layer.rotation}deg)`,cursor:'grab',userSelect:'none',touchAction:'none',zIndex:10,padding:'4px 8px',outline:isSel?'2px dashed #818cf8':'none',outlineOffset:'3px'}}
                      onMouseDown={e=>onLayerMD(e,layer.id,layer.x,layer.y)}
                      onTouchStart={e=>onLayerTS(e,layer.id,layer.x,layer.y)}>
                      {isText?(
                        <span style={{display:'block',fontFamily:FONTS.find(f=>f.id===tl.font)?.css||'Arial',fontSize:`${tl.size}px`,fontWeight:tl.bold?'bold':'normal',fontStyle:tl.italic?'italic':'normal',color:tl.color,textShadow:tl.shadow?'2px 2px 6px rgba(0,0,0,1),-1px -1px 3px rgba(0,0,0,1)':'none',whiteSpace:'nowrap',lineHeight:1.2,pointerEvents:'none'}}>{tl.text}</span>
                      ):(
                        <span style={{display:'block',fontSize:`${sl.size}px`,lineHeight:1,pointerEvents:'none'}}>{sl.symbol}</span>
                      )}
                      {isSel&&<button type="button" onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();removeLayer(layer.id);}}
                        style={{position:'absolute',top:-10,right:-10,width:20,height:20,background:'#ef4444',borderRadius:'50%',border:'2px solid white',color:'white',fontSize:10,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',zIndex:20}}>✕</button>}
                    </div>
                  );
                })}
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1">{layout.cells.map((_,i)=><div key={i} className={`h-1.5 rounded-full transition-all ${cells[i]?.imageSrc?(selCell===i?'bg-indigo-400 w-5':'bg-indigo-600 w-4'):'bg-slate-600 w-2'}`}/>)}</div>
                <span className="text-xs text-slate-500">{cells.filter(c=>c?.imageSrc).length}/{layout.cells.length}</span>
              </div>

              {/* Zoom control */}
              {selCs?.imageSrc&&(
                <div className="mt-3 rounded-xl border border-indigo-500/50 bg-indigo-950/30 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"/>
                      <span className="text-xs font-semibold text-slate-300">Zoom Foto {(selCell??0)+1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-400 font-mono bg-slate-700 px-2 py-0.5 rounded">{(selCs.scale*100).toFixed(0)}%</span>
                      <button type="button" onClick={()=>updateCell(selCell!,{scale:1,offsetX:0,offsetY:0})} className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-700/50">↺</button>
                    </div>
                  </div>
                  <div className="px-3 py-3 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={()=>zoomCell(selCell!,Math.max(0.3,selCs.scale-0.1))} className="w-10 h-10 flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xl font-bold touch-manipulation">−</button>
                      <input type="range" min={30} max={300} step={1} value={Math.round(selCs.scale*100)} onChange={e=>zoomCell(selCell!,+e.target.value/100)} className="flex-1 h-3 rounded-full appearance-none cursor-pointer accent-indigo-500 bg-slate-700"/>
                      <button type="button" onClick={()=>zoomCell(selCell!,Math.min(3,selCs.scale+0.1))} className="w-10 h-10 flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xl font-bold touch-manipulation">+</button>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 px-12"><span>Kecil</span><span>✋ Drag untuk geser</span><span>Zoom</span></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default CollageEditor;
