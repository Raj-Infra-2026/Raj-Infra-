import { matchesSearch } from './searchUtils.js';
import { downloadDocumentPdf, createDocumentPdfFile, previewDocumentPdf } from './pdfDownload.js';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LayoutDashboard, Users, FileText, Receipt, Truck, ClipboardList, MessageCircle, ShoppingCart, Building2, LogOut, Plus, Package, Search, ArrowUpRight, ArrowRight, RefreshCw, Menu, X, ShieldCheck, CheckCircle2, AlertCircle, Sun, Moon, ChevronLeft, ChevronRight, Bell, Command, Activity, ChartNoAxesCombined, KanbanSquare, Settings2, HelpCircle, History, Layers3, CalendarDays, TrendingUp, Wallet, PanelLeftClose, PanelLeftOpen, Sparkles, Filter, Download, Trash2, Check, LockKeyhole, ExternalLink, PlayCircle } from 'lucide-react';
import { DocumentModal, CompanySettingsPage, printBusinessDocument, invoiceQrMarkup } from './BusinessModules.jsx';
import './style.css';
const MODULES = [{ name: 'Overview', icon: LayoutDashboard }, { name: 'Clients', icon: Users, table: 'Clients' }, { name: 'Quotations', icon: FileText, table: 'Quotations', client: true }, { name: 'Proforma Invoices', icon: FileText, table: 'ProformaInvoices', client: true }, { name: 'Invoices', icon: Receipt, table: 'Invoices', client: true }, { name: 'Delivery Notes', icon: Truck, table: 'DeliveryNotes', client: true }, { name: 'Client Purchase Orders', icon: ClipboardList, table: 'ClientPOs', client: true }, { name: 'Vendors', icon: Building2, table: 'Vendors' }, { name: 'My Purchase Orders', icon: ShoppingCart, table: 'PurchaseOrders' }];
const WORKSPACE_NAMES = new Set(['Delivery Notes','Quotations','Client Purchase Orders','Vendors','My Purchase Orders','VAT Summary']);
const EXTRA = [{ name: 'Workflow', icon: KanbanSquare }, { name: 'Analytics', icon: ChartNoAxesCombined }, { name: 'VAT Summary', icon: Receipt }, { name: 'Activity History', icon: History, admin: true }, { name: 'Company Settings', icon: Building2, admin: true }, { name: 'Preferences', icon: Settings2 }, { name: 'Help & Onboarding', icon: HelpCircle }];
const ALL = [...MODULES, ...EXTRA];
// All display dates are DD/MM/YYYY. Never alter ISO values used by form inputs or sorting.
const displayDate = value => {
  if (!value) return '—';
  const raw = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const existing = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (existing) return `${existing[1]}/${existing[2]}/${existing[3]}`;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Riyadh',day:'2-digit',month:'2-digit',year:'numeric'}).format(parsed);
};
const displayDateTime = value => {
  if (!value) return '—';
  const formatted = displayDate(value);
  const tm = /T(\d{2}):(\d{2})/.exec(String(value));
  return tm ? `${formatted} ${tm[1]}:${tm[2]}` : formatted;
};
const capitalizeStart = value => typeof value==='string' ? value.replace(/^(\s*)([a-z])/i,(_,space,letter)=>space+letter.toUpperCase()) : value;
const readableTextColor = (hex, background) => {
  const rgb = h => { const x=String(h||'').replace('#',''); return /^[0-9a-f]{6}$/i.test(x)?[0,2,4].map(i=>parseInt(x.slice(i,i+2),16)/255):null; };
  const lum = a => a && a.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  const fg=lum(rgb(hex)), bg=lum(rgb(background));
  if(fg===null||bg===null)return background==='#242528'?'#f5f5f5':'#202329';
  return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)>=4.5 ? hex : (bg>.5?'#202329':'#f5f5f5');
};
const money = v => 'SAR ' + Number(v || 0).toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const contrastText = hex => {const h=String(hex||'#bf3046').replace('#','');if(!/^[0-9a-f]{6}$/i.test(h))return '#fff';const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]>.42?'#172027':'#fff'};
const initialTheme = () => { try {
    return localStorage.getItem('alif-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
catch {
    return 'dark';
} };
const getSession = () => { try {
    return JSON.parse(sessionStorage.getItem('alifSession') || 'null');
}
catch {
    return null;
} };
async function api(path, token, opts = {}) { const r = await fetch('/api' + path, { ...opts, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}), ...opts.headers } }); let d; try {
    d = await r.json();
}
catch {
    throw Error('Unexpected server response. Check Worker connection.');
} if (!r.ok)
    throw Error(d.error || 'Request failed'); return d; }
function Carousel({ children, title, subtitle, compact = false }) { const track = useRef(null); const move = dir => track.current?.scrollBy({ left: dir * (track.current.clientWidth * .8), behavior: 'smooth' }); return <section className={'carousel-block ' + (compact ? 'compact' : '')}><div className="section-title"><div><h3>{title}</h3></div><div className="carousel-controls"><button aria-label={'Previous ' + title} onClick={() => move(-1)}><ChevronLeft size={17}/></button><button aria-label={'Next ' + title} onClick={() => move(1)}><ChevronRight size={17}/></button></div></div><div className="carousel-track" ref={track}>{children}</div></section>; }
function Flame({ small = false }) { return <div className={'flame-scene ' + (small ? 'small' : '')} aria-label="ALIF SYNC signature"><div className="flame-halo"/><svg className="flame-svg" viewBox="0 0 160 185" role="img" aria-label="Abstract ascending flame"><defs><linearGradient id="flameGradient" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stopColor="var(--flame-low)"/><stop offset="52%" stopColor="var(--accent)"/><stop offset="100%" stopColor="var(--flame-high)"/></linearGradient></defs><path d="M84 7 C111 45 70 66 115 88 C154 116 135 161 95 175 C52 188 18 157 31 119 C39 98 67 82 58 47 C75 60 79 68 84 7Z" fill="url(#flameGradient)"/><path d="M85 75 C98 99 64 112 79 138 C87 148 106 150 102 165 C69 174 51 150 61 129 C69 108 82 102 85 75Z" fill="var(--hero-bg)" opacity=".76"/><path d="M85 18L93 50 79 72" fill="none" stroke="var(--flame-high)" strokeWidth="2" opacity=".8"/></svg><div className="flame-base"/></div>; }
function AlifMonogram({ small = false }) { return <span className={'alif-monogram' + (small ? ' compact' : '')} aria-hidden="true"><span>A</span><i/></span>; }

/** A real-time illustrated 3D city, drawn with projected building geometry, not letters or particle dots. */
function DigitalCity({ theme = 'dark' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    let frame = 0, raf = 0, running = true;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const light = theme === 'light';
    const rand = (n) => { const x = Math.sin(n * 127.1 + 13.77) * 43758.5453; return x - Math.floor(x); };
    const towers = [];
    for (let z = 0; z < 7; z++) {
      for (let x = -6; x <= 6; x++) {
        const seed = (z + 1) * 31 + (x + 7) * 17;
        if (rand(seed) < .18 || (x === 0 && z < 4)) continue;
        towers.push({ x: x * 1.12 + (rand(seed+4)-.5)*.26, z: z*1.12+.35, w:.53+rand(seed+1)*.45, d:.5+rand(seed+2)*.35, h:1.15+rand(seed+3)*3.2 + (z<2 ? .7:0), seed });
      }
    }
    towers.push({x:0,z:2.45,w:1.13,d:1.04,h:7.2,seed:300,hero:true});
    towers.sort((a,b)=>b.z-a.z);
    const size = () => {const r=canvas.getBoundingClientRect(); const d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*d));canvas.height=Math.max(1,Math.floor(r.height*d));ctx.setTransform(d,0,0,d,0,0);return {w:r.width,h:r.height};};
    let dims=size();
    const observer=new ResizeObserver(()=>{dims=size();if(reduce)draw(0);});observer.observe(canvas);
    const polygon=(pts,fill,stroke)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.8;ctx.stroke();}};
    const line=(a,b,color,width=1)=>{ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    function draw(time){
      const {w,h}=dims;if(!w||!h)return;ctx.clearRect(0,0,w,h);
      const scale=Math.min(w/15.4,h/11.7), cy=h*.73, cx=w*.5;
      const sway=reduce?0:Math.sin(time*.00018)*.12;
      const proj=(x,y,z)=>{const a=.67+sway;return [cx+(x-z*.55)*scale*.94 + Math.sin(a)*z*scale*.08,cy+(x*.23+z*.35-y)*scale*.95];};
      let halo=ctx.createRadialGradient(cx,cy-h*.26,2,cx,cy-h*.26,w*.55);
      halo.addColorStop(0,light?'rgba(66,130,220,.24)':'rgba(40,135,240,.30)');halo.addColorStop(1,'rgba(10,30,80,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
      // Illuminated holographic floor, rendered behind every tower.
      for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(cx,cy+10,scale*(4.8+i*.55),scale*(.94+i*.11),0,0,Math.PI*2);ctx.strokeStyle=light?'rgba(27,105,192,.13)':'rgba(75,176,255,.18)';ctx.lineWidth=i===0?2:1;ctx.stroke();}
      for(let k=-8;k<=8;k++){line(proj(k,0,0),proj(k,0,8),light?'rgba(60,125,205,.10)':'rgba(84,177,255,.14)');}
      for(let k=0;k<=8;k++){line(proj(-8,0,k),proj(8,0,k),light?'rgba(60,125,205,.10)':'rgba(84,177,255,.14)');}
      towers.forEach(t=>{
        const {x,z,w:tw,d,seed,hero}=t;let height=t.h;
        const a=proj(x-tw/2,0,z-d/2),b=proj(x+tw/2,0,z-d/2),c=proj(x+tw/2,0,z+d/2),e=proj(x-tw/2,0,z+d/2);
        const A=proj(x-tw/2,height,z-d/2),B=proj(x+tw/2,height,z-d/2),C=proj(x+tw/2,height,z+d/2),E=proj(x-tw/2,height,z+d/2);
        const base=hero?['#071f3e','#103d70','#1b5b9b']:light?['#53799e','#7698b9','#a9c9e4']:['#0a2546','#153c67','#235486'];
        polygon([a,b,B,A],base[0],hero?'#79caff70':'#8acbff26');
        polygon([b,c,C,B],base[1],hero?'#a9dfff99':'#8acbff38');
        polygon([e,a,A,E],base[0]);
        polygon([A,B,C,E],base[2],hero?'#b4f4ff':'#7dbcfb80');
        // Facade glass panes, horizontal floor seams and bright windows.
        const floors=Math.max(3,Math.floor(height*4));
        for(let j=1;j<floors;j++){
          const y=height*j/floors;
          line(proj(x+tw/2,y,z-d/2),proj(x+tw/2,y,z+d/2),hero?'rgba(137,218,255,.46)':'rgba(123,196,251,.21)',.7);
          line(proj(x-tw/2,y,z-d/2),proj(x+tw/2,y,z-d/2),'rgba(137,218,255,.12)',.6);
          for(let k=0;k<3;k++){
            const zz=z-d/2+d*(k+.5)/3;
            if(rand(seed*7+j*13+k*11)>.29){
              const left=proj(x+tw/2+.008,y-.035,zz-.065),right=proj(x+tw/2+.008,y+.065,zz+.065);
              polygon([left,proj(x+tw/2+.008,y+.065,zz-.065),right,proj(x+tw/2+.008,y-.035,zz+.065)],hero?'rgba(177,239,255,.84)':(j+k)%3===0?'rgba(255,193,111,.75)':'rgba(94,192,255,.63)');
            }
          }
        }
        for(let k=1;k<4;k++){const zz=z-d/2+d*k/4;line(proj(x+tw/2,0,zz),proj(x+tw/2,height,zz),'rgba(149,220,255,.20)',.7);}
        if(hero){
          const tip=proj(x,height+.82,z),roof=proj(x,height,z);
          line(roof,tip,'#b6f4ff',2);ctx.beginPath();ctx.arc(...tip,3,0,Math.PI*2);ctx.fillStyle='#e9ffff';ctx.fill();
          ctx.save();ctx.shadowColor='#53dfff';ctx.shadowBlur=22;line(proj(x+tw/2,0,z+d/2),proj(x+tw/2,height,z+d/2),'#81e7ff',2.4);ctx.restore();
        }
      });
      // Sweeping circular energy tracks and moving light pulses.
      ctx.save();ctx.translate(cx,cy+10);ctx.scale(1,.24);
      for(let r=0;r<3;r++){ctx.beginPath();ctx.ellipse(0,0,scale*(5.5+r*.5),scale*(3.4+r*.3),0,0,Math.PI*2);ctx.strokeStyle=light?'rgba(28,112,205,.35)':'rgba(56,173,255,.46)';ctx.lineWidth=r===0?4:2;ctx.stroke();}
      for(let r=0;r<4;r++){const angle=time*.0003+r*1.57;ctx.beginPath();ctx.arc(0,0,scale*5.5,angle,angle+.25);ctx.strokeStyle=r%2?'#ffbf77':'#90ecff';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=16;ctx.lineWidth=5;ctx.stroke();}ctx.restore();
      // Atmospheric aerial lights: a subtle moving skyline, never a static glyph.
      for(let i=0;i<5;i++){const xx=(.16+i*.18+Math.sin(time*.00015+i)*.03)*w,yy=(.18+rand(i+1)*.25)*h;ctx.beginPath();ctx.arc(xx,yy,i%2?1.6:2.4,0,Math.PI*2);ctx.fillStyle=i%2?'#ffcf93':'#b7efff';ctx.shadowBlur=12;ctx.shadowColor=ctx.fillStyle;ctx.fill();}ctx.shadowBlur=0;
    }
    function tick(t){if(!running)return;frame++;if(frame%2===0)draw(t);raf=requestAnimationFrame(tick);}
    draw(0);if(!reduce)raf=requestAnimationFrame(tick);
    return ()=>{running=false;cancelAnimationFrame(raf);observer.disconnect();};
  },[theme]);
  return <div className="digital-city-scene"><div className="digital-city-haze"/><canvas ref={canvasRef} className="digital-city-canvas" role="img" aria-label="Animated futuristic three-dimensional glass skyscraper city with glowing windows, illuminated roads, and a central landmark tower"/><div className="digital-city-reflection"/></div>;
}

function PublicPortal({ onLogin, onRegister, busy, error }) {
    const pathToScreen = () => location.pathname === '/login' ? 'login' : location.pathname === '/register' ? 'register' : 'home';
    const [screen, setScreen] = useState(pathToScreen);
    const [publicTheme, setPublicTheme] = useState(() => { try { return localStorage.getItem('alif-public-theme') === 'light' ? 'light' : 'dark'; } catch { return 'dark'; } });
    useEffect(() => { try { localStorage.setItem('alif-public-theme', publicTheme); } catch {} }, [publicTheme]);
    const [pointer, setPointer] = useState({x:0,y:0});
    const moveSignature = e => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r=e.currentTarget.getBoundingClientRect(); setPointer({x:Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1)),y:Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))}); };
    const [email, setEmail] = useState(''), [password, setPassword] = useState('');
    const [registration, setRegistration] = useState({ company_name:'', owner_name:'', email:'', phone:'', password:'', confirm_password:'' });
    const [notice, setNotice] = useState('');
    const switchScreen = next => { history.pushState({}, '', next === 'home' ? '/' : '/' + next); setScreen(next); setNotice(''); window.scrollTo({ top: 0, behavior: 'auto' }); };
    useEffect(() => { const handler = () => setScreen(pathToScreen()); addEventListener('popstate',handler); return () => removeEventListener('popstate',handler); }, []);
    const update = (key, value) => setRegistration(v => ({ ...v, [key]:value }));
    async function submitRegistration(event) {
        event.preventDefault();
        if (registration.password !== registration.confirm_password) { setNotice('Passwords do not match.'); return; }
        if (registration.password.length < 12) { setNotice('Use at least 12 characters for your password.'); return; }
        const { confirm_password, ...payload } = registration;
        const done = await onRegister(payload);
        if (done) { setNotice('Registration received. Access will be available after ALIF SYNC approves your company.'); setScreen('success'); }
    }
    return <div className="alif-public cinematic-public" data-public-theme={publicTheme}><div className="cinematic-atmosphere" aria-hidden="true"><span/><span/><span/></div>
      <header className="alif-public-nav">
        <button type="button" className="alif-wordmark" onClick={()=>switchScreen('home')} aria-label="ALIF SYNC home"><AlifMonogram/><strong>ALIF <span>SYNC</span></strong></button>
        <div className="alif-nav-links"><a href="/#platform" onClick={()=>switchScreen('home')}>Platform</a><a href="/#why-alif" onClick={()=>switchScreen('home')}>Why ALIF SYNC</a></div>
        <div className="alif-nav-buttons"><button type="button" className="alif-theme-toggle" onClick={() => setPublicTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label={publicTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={publicTheme === 'dark' ? 'Light mode' : 'Dark mode'}>{publicTheme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}<span>{publicTheme === 'dark' ? 'Light' : 'Dark'}</span></button><button type="button" className="alif-outline" onClick={()=>switchScreen('login')}>Log in</button><button type="button" className="alif-gold" onClick={()=>switchScreen('register')}>Register <ArrowRight size={16}/></button></div>
      </header>
      {screen === 'home' ? <>
        <main className="alif-hero">
          <div className="alif-hero-copy">
            <h1>Build with clarity.<br/><em>Operate with confidence.</em></h1>
            
            <div className="alif-hero-actions"><button type="button" className="alif-gold large" onClick={()=>switchScreen('register')}>Create your workspace <ArrowRight size={19}/></button><button type="button" className="alif-outline large" onClick={()=>switchScreen('login')}>Already a client? Sign in</button></div>
            
          </div>
          <div className="alif-signature-art cinematic-signature city-stage" aria-label="Animated three-dimensional illuminated futuristic digital city"><DigitalCity theme={publicTheme}/><div className="alif-art-caption city-caption">ALIF <span>SYNC</span></div></div>
        </main>
        <section id="platform" className="alif-feature-band"><div className="alif-feature-card"><Receipt size={25}/><h3>Intelligent invoicing</h3></div><div className="alif-feature-card"><Users size={25}/><h3>Connected client records</h3></div><div className="alif-feature-card"><Building2 size={25}/><h3>Your own workspace</h3></div></section>
        
      </> : <main className="alif-access-area"><div className="alif-access-intro"><div className="cinematic-access-emblem"><AlifMonogram/><span className="cinematic-emblem-ring"/></div><h1>{screen === 'register' ? 'Start something exceptional.' : screen === 'success' ? 'Your request is in.' : 'Welcome back.'}</h1><p>{screen === 'register' ? 'Register your company. Once approved, your private business workspace is created automatically.' : screen === 'success' ? 'Your ALIF SYNC account is awaiting administrator approval. You can sign in once your workspace has been activated.' : ''}</p></div>
        <div className="alif-access-card">
          {screen === 'login' ? <form onSubmit={e=>{e.preventDefault();onLogin(email,password);}}><span className="alif-form-eyebrow">COMPANY LOGIN</span><h2>Sign in</h2><label>Email address<input required type="email" autoComplete="username" placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input required type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error && <p className="alif-error" role="alert">{error}</p>}<button className="alif-gold wide" disabled={busy} type="submit">{busy?'Signing in…':'Open my workspace'} <ArrowRight size={18}/></button><p className="alif-switch">New to ALIF SYNC? <button type="button" onClick={()=>switchScreen('register')}>Register your company</button></p></form>
          : screen === 'register' ? <form onSubmit={submitRegistration}><span className="alif-form-eyebrow">COMPANY REGISTRATION</span><h2>Get started</h2><label>Registered company name<input required minLength={2} maxLength={180} autoComplete="organization" value={registration.company_name} onChange={e=>update('company_name',e.target.value)} placeholder="Company name"/></label><label>Owner / contact name<input required minLength={2} maxLength={120} autoComplete="name" value={registration.owner_name} onChange={e=>update('owner_name',e.target.value)} placeholder="Full name"/></label><label>Business email<input required type="email" autoComplete="email" value={registration.email} onChange={e=>update('email',e.target.value)} placeholder="owner@company.com"/></label><label>Phone number<input required type="tel" autoComplete="tel" value={registration.phone} onChange={e=>update('phone',e.target.value)} placeholder="+966 50 000 0000"/></label><div className="alif-form-two"><label>Create password<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={registration.password} onChange={e=>update('password',e.target.value)} placeholder="12+ characters"/></label><label>Confirm password<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={registration.confirm_password} onChange={e=>update('confirm_password',e.target.value)} placeholder="Repeat password"/></label></div>{(notice||error) && <p className="alif-error" role="alert">{notice || error}</p>}<button className="alif-gold wide" disabled={busy} type="submit">{busy?'Submitting…':'Request access'} <ArrowRight size={18}/></button><p className="alif-switch">Have an account? <button type="button" onClick={()=>switchScreen('login')}>Log in</button></p></form>
          : <div className="alif-success"><CheckCircle2 size={44}/><h2>Registration received</h2><p>{notice}</p><button type="button" className="alif-gold wide" onClick={()=>switchScreen('login')}>Go to login <ArrowRight size={16}/></button></div>}
        </div></main>}
      <footer className="alif-public-footer"><span>© ALIF SYNC</span></footer>
    </div>;
}
function App() {
    const [selectedClient,setSelectedClient]=useState(null); const [companyBrand,setCompanyBrand]=useState({}); const [session, setSession] = useState(getSession), [toolsOpen, setToolsOpen] = useState(false), [workspaceOpen, setWorkspaceOpen] = useState(true), [theme, setTheme] = useState(initialTheme), [page, setPage] = useState('Overview'), [overview, setOverview] = useState(null), [rows, setRows] = useState([]), [clients, setClients] = useState([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [sidebar, setSidebar] = useState(false), [collapsed, setCollapsed] = useState(false), [modal, setModal] = useState(false), [editing, setEditing] = useState(null), [searchOpen, setSearchOpen] = useState(false), [noticeOpen, setNoticeOpen] = useState(false), [query, setQuery] = useState(''), [audit, setAudit] = useState([]), [helpStep, setHelpStep] = useState(() => Number(localStorage.getItem('alif-help-step') || 0));
    useEffect(()=>{if(!session?.token)return;let cancelled=false;api('/company-settings',session.token).then(d=>{if(!cancelled)setCompanyBrand(d.company||{});}).catch(()=>{});return()=>{cancelled=true}},[session?.token]);
    const token = session?.token, role = session?.user?.role || 'admin', active = ALL.find(x => x.name === page) || ALL[0];
    const selectPage = useCallback(name => { if(name !== 'Clients') setSelectedClient(null); setPage(name); setSidebar(false); setNoticeOpen(false); setQuery(''); setError(''); }, []);
    useEffect(() => { localStorage.setItem('alif-theme', theme); }, [theme]);
    const refresh = useCallback(async () => { if (!token)
        return; setBusy(true); try {
        const calls = [api('/overview', token), api('/records/Clients', token)];
        if (active.table && active.table !== 'Clients')
            calls.push(api('/records/' + active.table, token));
        if (page === 'Workflow')
            calls.push(api('/records/Invoices', token));
        if (page === 'Activity History' && role === 'admin')
            calls.push(api('/audit', token));
        const results = await Promise.all(calls);
        setOverview(results[0]);
        setClients(results[1].records || []);
        setRows(active.table === 'Clients' ? results[1].records || [] : results[2]?.records || []);
        if (page === 'Activity History')
            setAudit(results.at(-1)?.events || []);
        setError('');
    }
    catch (e) {
        setError(e.message);
        if (/expired|unauthorized/i.test(e.message)) {
            sessionStorage.removeItem('alifSession');
            setSession(null);
        }
    }
    finally {
        setBusy(false);
    } }, [token, active.table, page, role]);
    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => { const handle = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
    } if (e.key === 'Escape') {
        setSearchOpen(false);
        setNoticeOpen(false);
        setModal(false);
    } }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle); }, []);
    async function login(username, password) { setBusy(true); setError(''); try {
        const d = await api('/login', null, { method: 'POST', body: JSON.stringify({ email: username, password }) });
        sessionStorage.setItem('alifSession', JSON.stringify(d));
        setSession(d);
        setPage('Overview');
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    async function register(data) { setBusy(true); setError(''); try { await api('/register', null, { method:'POST', body:JSON.stringify(data) }); return true; } catch(e) { setError(e.message); return false; } finally { setBusy(false); } }
    function logout() { sessionStorage.removeItem('alifSession'); setSession(null); setOverview(null); setRows([]); }
    async function save(data, submit = false) { setBusy(true); try {
        const payload = { ...data };
        const path = '/records/' + active.table + (editing ? '/' + encodeURIComponent(editing.id) : '');
        const result = await api(path, token, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
        if (submit && ['Quotations','ClientPOs','PurchaseOrders'].includes(active.table)) {
            try { await downloadDocumentPdf(result.record,active.table); }
            catch (pdfError) { setError('Record saved, but PDF download failed: '+pdfError.message); }
        }
        setModal(false);
        setEditing(null);
        await refresh();
        if (result.audit_warning)
            setError('Saved, but the audit entry could not be written. Check the AuditLogs tab.');
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    async function archive(rec) { if (!confirm('Archive ' + (rec.reference || rec.name) + '? This hides the record but preserves it in Sheets.'))
        return; setBusy(true); try {
        await api('/records/' + active.table + '/' + encodeURIComponent(rec.id), token, { method: 'DELETE' });
        await refresh();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    async function setStatus(rec, status, table = 'Invoices') { setBusy(true); try {
        await api('/records/' + table + '/' + encodeURIComponent(rec.id), token, { method: 'PATCH', body: JSON.stringify({ status }) });
        await refresh();
    }
    catch (e) {
        setError(e.message);
    }
    finally {
        setBusy(false);
    } }
    if (!session)
        return <PublicPortal onLogin={login} onRegister={register} busy={busy} error={error}/>;
    const themeName = session.user.company_name || overview?.company_name || 'Your Workspace';
    const adminEmail = session.user.email || session.user.username || '';
    const branchName = session.user.branch_name || session.user.branch || session.user.company_name || 'Your Workspace';
    return <div className={'app-shell role-' + role + (collapsed ? ' collapsed' : '')} data-theme={theme} style={{'--company-primary':companyBrand.primary_color||'#bf3046','--company-ink':contrastText(companyBrand.primary_color),'--company-secondary':theme==='light'?'#f5f5f5':'#242528','--company-text':readableTextColor(companyBrand.secondary_color|| (theme==='light'?'#202329':'#f5f5f5'),theme==='light'?'#f5f5f5':'#242528')}}>
  <aside className={'sidebar ' + (sidebar ? 'mobile-open' : '')}><div className="brand-logo">{companyBrand.logo_data ? <img className="company-sidebar-logo" src={companyBrand.logo_data} alt="Company logo"/> : <AlifMonogram small/>}<span className="brand-text"><strong>{themeName}</strong></span><button className="icon-btn close-mobile" onClick={() => setSidebar(false)} aria-label="Close navigation"><X size={19}/></button></div><nav className="nav-items">{MODULES.filter(m=>!WORKSPACE_NAMES.has(m.name)).map(m => <button key={m.name} title={m.name} className={'nav-link ' + (page === m.name ? 'active' : '')} onClick={() => selectPage(m.name)}><m.icon size={19}/><span>{m.name}</span>{page === m.name && <i />}</button>)}
<button type="button" className="nav-link nav-group-trigger" aria-expanded={workspaceOpen} onClick={()=>setWorkspaceOpen(v=>!v)}><Layers3 size={19}/><span>Workspace</span><ChevronRight className={'group-chevron'+(workspaceOpen?' open':'')} size={16}/></button>
{workspaceOpen && <div className="nav-submenu">{[...MODULES,...EXTRA].filter(m=>WORKSPACE_NAMES.has(m.name)).map(m=><button key={m.name} className={'nav-link ' + (page === m.name ? 'active' : '')} onClick={()=>selectPage(m.name)}><m.icon size={18}/><span>{m.name}</span></button>)}</div>}
{EXTRA.filter(m=>['Company Settings','Preferences'].includes(m.name)&&(!m.admin||role==='admin')).map(m=><button key={m.name} className={'nav-link ' + (page === m.name ? 'active' : '')} onClick={()=>selectPage(m.name)}><m.icon size={19}/><span>{m.name}</span></button>)}
<button type="button" className="nav-link nav-group-trigger" aria-expanded={toolsOpen} onClick={()=>setToolsOpen(v=>!v)}><ChartNoAxesCombined size={19}/><span>Tools &amp; Insights</span><ChevronRight className={'group-chevron'+(toolsOpen?' open':'')} size={16}/></button>{toolsOpen && <div className="nav-submenu">{EXTRA.filter(m=>!['Company Settings','Preferences','VAT Summary'].includes(m.name) && (!m.admin || role === 'admin')).map(m=><button key={m.name} className={'nav-link ' + (page === m.name ? 'active' : '')} onClick={()=>selectPage(m.name)}><m.icon size={18}/><span>{m.name}</span></button>)}</div>}</nav><div className="sidebar-bottom"><div className="side-profile"><span className="avatar">{(adminEmail || 'U')[0]?.toUpperCase()}</span><div className="brand-text"><b title={adminEmail}>{adminEmail}</b><small title={branchName}>{branchName}</small></div></div><button className="nav-link" onClick={logout}><LogOut size={18}/><span>Sign out</span></button></div></aside>
  {sidebar && <button className="mobile-backdrop" aria-label="Close menu" onClick={() => setSidebar(false)}/>}
  <div className="workspace"><header className="topbar"><div className="topbar-start"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setSidebar(true)}><Menu size={21}/></button><button className="icon-btn desktop-collapse" aria-label="Toggle sidebar" onClick={() => setCollapsed(v => !v)}>{collapsed ? <PanelLeftOpen size={19}/> : <PanelLeftClose size={19}/>}</button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{page}</strong></div></div><div className="topbar-actions"><button className="search-trigger" onClick={() => setSearchOpen(true)}><Search size={17}/><span>Search</span></button><button className="icon-btn" aria-label="Toggle light and dark mode" title="Toggle theme" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button><button className="icon-btn notification-trigger" title="Notifications" aria-label="Notifications" onClick={() => setNoticeOpen(v => !v)}><Bell size={19}/>{overview?.notifications?.length > 0 && <span className="notification-count">{overview.notifications.length > 99 ? '99+' : overview.notifications.length}</span>}</button><span className="topbar-identity"><strong>{adminEmail}</strong><small>{branchName}</small></span><span className="avatar top-avatar">{(adminEmail || 'U')[0]?.toUpperCase()}</span></div></header>
  <main className="page-content"><div className="page-top"><div><h1>{page === 'Overview' ? 'Dashboard' : page}</h1></div><div className="page-actions"><button className="secondary" onClick={refresh} disabled={busy}><RefreshCw size={16} className={busy ? 'spin' : ''}/> Refresh</button>{active.table && <button className="primary" onClick={() => { setEditing(null); setModal(true); }}><Plus size={17}/> {active.table === 'DeliveryNotes' ? 'New Delivery Note' : active.table === 'Invoices' ? 'New Invoice' : 'New record'}</button>}</div></div>
  {page === 'Overview' && <Dashboard role={role} companyName={themeName} overview={overview} clients={clients} navigate={selectPage} busy={busy}/>}

  
  {active.table && <Records selectedClient={page==='Clients'?selectedClient:null} token={token} openModule={selectPage} role={role} active={active} rows={rows} clients={clients} query={query} setQuery={setQuery} edit={r => { setEditing(r); setModal(true); }} viewClient={setSelectedClient} busy={busy}/>}
  {page === 'Workflow' && <Workflow token={token} role={role} onStatus={setStatus} refreshKey={overview?.recent?.[0]?.updated_at}/>}
  {page === 'Analytics' && <Analytics overview={overview} role={role}/>}
  {page === 'VAT Summary' && <VatSummary token={token}/>}
  {page === 'Activity History' && role === 'admin' && <Audit events={audit}/>}
  {page === 'Company Settings' && role === 'admin' && <CompanySettingsPage request={(path, opts) => api(path, token, opts)} onChanged={setCompanyBrand}/>}
  {page === 'Preferences' && <Preferences theme={theme} setTheme={setTheme} role={role} collapsed={collapsed} setCollapsed={setCollapsed} request={(path,opts)=>api(path,token,opts)} profile={companyBrand} onChanged={setCompanyBrand}/>}
  {page === 'Help & Onboarding' && <Help step={helpStep} setStep={v => { setHelpStep(v); localStorage.setItem('alif-help-step', String(v)); }}/>}
  {error && <div className="notice error" role="alert"><AlertCircle size={18}/><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}
  <footer className="footer"><span>ALIF SYNC · V4.4 · DOCUMENT WORKSPACE</span></footer></main></div>
  {noticeOpen && <div className="panel-shade" onMouseDown={e => { if (e.target === e.currentTarget)
        setNoticeOpen(false); }}><div className="notification-panel"><div className="panel-header"><div><span className="overline">YOUR WORKSPACE</span><h2>Notifications</h2></div><button className="icon-btn" onClick={() => setNoticeOpen(false)}><X size={19}/></button></div>{(overview?.notifications || []).length ? overview.notifications.map(n => <button key={n.id} className="notification" onClick={() => { const m = MODULES.find(x => x.table === n.table); selectPage(m?.name || 'Invoices'); }}><Bell size={17}/><span><b>{n.title}</b><small>{n.message}</small></span><ArrowUpRight size={15}/></button>) : <div className="empty">No pending alerts.</div>}</div></div>}
  {searchOpen && <SearchOverlay token={token} close={() => setSearchOpen(false)} navigate={selectPage}/>}
  {modal && active.table && (['Invoices', 'DeliveryNotes','ProformaInvoices'].includes(active.table) ? <DocumentModal key={editing?.id || 'new'} kind={active.table} role={role} editing={editing} clients={clients} request={(path, opts) => api(path, token, opts)} ClientForm={ClientModal} onSaved={async () => { setModal(false); setEditing(null); await refresh(); }} close={() => { setModal(false); setEditing(null); }}/> : <RecordModal key={editing?.id || 'new'} active={active} role={role} clients={clients} editing={editing} busy={busy} close={() => { setModal(false); setEditing(null); }} save={save}/>)}
  <div className="floating-actions"><button title="Create new client" aria-label="Create new client" onClick={() => selectPage('Clients')}><Users size={17}/></button><button title="Create new invoice" aria-label="Go to invoices" onClick={() => selectPage('Invoices')}><Plus size={20}/></button></div>
  </div>;
}
function Dashboard({ role, companyName, overview, clients, navigate, busy }) { const counts = overview?.counts || {}, recent = overview?.recent || []; const primary = 'Overview'; const subtitle = role === 'admin' ? 'A panoramic view of your business performance.' : role === 'manager' ? 'A focused view of what needs your attention.' : 'Everything you need for a productive day.'; const tiles = role === 'admin' ? [['Total records', Object.values(counts).reduce((a, b) => a + b, 0), Layers3], ['Unpaid / overdue', overview?.totals?.unpaid || 0, Wallet], ['Pending actions', overview?.totals?.pending || 0, Bell], ['Active clients', clients.length, Users]] : role === 'manager' ? [['Pending actions', overview?.totals?.pending || 0, Bell], ['Invoices', counts.Invoices || 0, Receipt], ['Delivery notes', counts.DeliveryNotes || 0, Truck], ['Clients', clients.length, Users]] : [['My workspace clients', clients.length, Users], ['Quotations', counts.Quotations || 0, FileText], ['Delivery notes', counts.DeliveryNotes || 0, Truck], ['Purchase orders', counts.PurchaseOrders || 0, ShoppingCart]]; return <><section className="hero"><div className="hero-content"><h2>{primary}</h2><button className="hero-button" onClick={() => navigate('Analytics')}>{'Explore insights'} <ArrowRight size={18}/></button></div><div className="hero-art"><Flame /></div></section><section className="kpi-grid">{tiles.map(([label, value, Icon], i) => <div className="kpi-card" key={label} style={{ animationDelay: (i * .07) + 's' }}><div className="kpi-top"><span>{label}</span><span className="kpi-icon"><Icon size={19}/></span></div><strong>{busy && !overview ? '…' : value}</strong></div>)}</section><Carousel title={role === 'staff' ? 'Start your work' : 'Workflow shortcuts'} subtitle="Swipe or use the arrows to explore actions"><div className="carousel-card action-card" onClick={() => navigate('Clients')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && navigate('Clients')}><Users /><strong>Client directory</strong><p>Manage customer details</p><ArrowUpRight className="card-arrow"/></div>{[{ name: 'Quotations', icon: FileText }, { name: 'Invoices', icon: Receipt }, { name: 'Delivery Notes', icon: Truck }, { name: 'My Purchase Orders', icon: ShoppingCart }, { name: 'Analytics', icon: ChartNoAxesCombined }].map(({ name, icon: Icon }) => <button className="carousel-card action-card" key={name} onClick={() => navigate(name)}><Icon /><strong>{name}</strong><p>Open {name.toLowerCase()}</p><ArrowUpRight className="card-arrow"/></button>)}</Carousel><div className="dashboard-lower"><section className="surface-panel"><div className="section-title"><div><h3>Recent documents & activity</h3><p>Latest updates across your permitted records</p></div><Activity size={20}/></div>{recent.length ? recent.slice(0, 5).map(r => <div className="activity-row" key={r.id}><span className="activity-dot"/><div><strong>{r.reference || r.name}</strong><small>{r.name}</small></div><span className="status-pill">{r.status || 'Active'}</span></div>) : <div className="empty">No records yet. Start with your first client or document.</div>}</section><section className="surface-panel signature-panel"><div className="section-title"><div><h3>{companyName}</h3><p>Signature concept · lightweight animated vector</p></div><Sparkles size={19}/></div><div className="signature-compact"><Flame small/><div><strong>Designed to rise.</strong><p>Motion that supports the interface without distracting from your work.</p></div></div></section></div></>; }
function Records({ selectedClient, token, openModule, role, active, rows, clients, query, setQuery, edit, viewClient, busy }) { const [sortBy,setSortBy] = useState('modified-desc'); const [statusFilter,setStatusFilter] = useState('all'); const [from,setFrom]=useState(''),[to,setTo]=useState(''),[filtersOpen,setFiltersOpen]=useState(false); const filtered = rows.filter(r => matchesSearch([r.name, r.reference, r.status, r.po_number, r.vat_number, r.cr_number, r.phone, r.email, r.address, r.project_location, r.description, r.notes, clients.find(c => c.id === r.client_id)?.name].join(' '), query) && (statusFilter === 'all' || (r.status || 'Active') === statusFilter) && (!from || String(r.date||'') >= from) && (!to || String(r.date||'') <= to)).sort((a,b)=>{const key=sortBy.startsWith('name')?'name':sortBy.startsWith('amount')?'amount':sortBy.startsWith('date')?'date':'updated_at';const va=key==='amount'?Number(a[key]||0):String(a[key]||'').toLowerCase();const vb=key==='amount'?Number(b[key]||0):String(b[key]||'').toLowerCase();const cmp=va<vb?-1:va>vb?1:0;return sortBy.endsWith('desc')?-cmp:cmp;}); return <><section className="kpi-grid mini"><div className="kpi-card"><span>Records</span><strong>{rows.length}</strong></div><div className="kpi-card"><span>Unpaid / overdue</span><strong>{rows.filter(r => /unpaid|overdue|partially paid/i.test(r.status)).length}</strong></div><div className="kpi-card"><span>Pending</span><strong>{rows.filter(r => /pending|unpaid|overdue|awaiting|partially paid/i.test(r.status)).length}</strong></div></section><section className="surface-panel records-panel"><div className="table-toolbar v4-toolbar"><div><h3>All {active.name.toLowerCase()}</h3></div><label className="inline-search"><Search size={17}/><input placeholder="Search in any language / البحث بأي لغة" value={query} onChange={e => setQuery(e.target.value)}/></label><select className="v4-sort" aria-label="Sort records" value={sortBy} onChange={e=>setSortBy(e.target.value)}><option value="modified-desc">Recently modified</option><option value="modified-asc">Least recently modified</option><option value="date-desc">Date newest first</option><option value="date-asc">Date oldest first</option><option value="name-asc">Name A–Z</option><option value="name-desc">Name Z–A</option><option value="amount-desc">Amount high to low</option><option value="amount-asc">Amount low to high</option></select><select className="v4-filter" aria-label="Filter status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{[...new Set(rows.map(r=>r.status||'Active'))].map(x=><option key={x} value={x}>{x}</option>)}</select><button type="button" className="secondary" onClick={()=>setFiltersOpen(v=>!v)}>Advanced filters {filtersOpen?"−":"+"}</button></div>{filtersOpen&&<div className="v4-filter-dates"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="secondary" onClick={()=>{setFrom('');setTo('');setStatusFilter('all');setQuery('');}}>Clear filters</button></div>}{active.table==='Clients'&&selectedClient&&<ClientHistory client={selectedClient} token={token} openModule={openModule}/>}<div className="table-scroll"><table><thead><tr><th>Date</th><th>Name / Client</th><th>Status</th>{active.table !== 'Clients' && <th>Amount</th>}{active.table !== 'Clients' && <th>Reference</th>}<th>Actions</th></tr></thead><tbody>{filtered.map(r => <tr key={r.id}><td>{displayDate(r.date)}</td><td>{r.name || clients.find(c => c.id === r.client_id)?.name || '—'}</td><td><span className="status-pill">{r.status || 'Active'}</span></td>{active.table !== 'Clients' && <td>{money(r.amount)}</td>}{active.table !== 'Clients' && <td className="ref">{r.reference || r.id.slice(0, 8)}</td>}<td><div className="row-actions">{['Invoices', 'DeliveryNotes'].includes(active.table) && <button onClick={async () => { try { const profile=await api('/company-settings',token); await previewDocumentPdf({...r, company_logo:r.company_logo||profile.company?.logo_data||''},active.table,active.table==='Invoices'?invoiceQrMarkup(r):''); } catch(e){window.alert('Unable to open document: '+e.message)} }}>View / Print <Download size={14}/></button>}{true && <button onClick={() => edit(r)}>Edit <ArrowUpRight size={14}/></button>}{active.table === 'Clients' && <button onClick={() => viewClient(r)}>Client 360°</button>}{['Invoices','Quotations','DeliveryNotes','ProformaInvoices'].includes(active.table) && <button type="button" className="whatsapp-icon-button" aria-label="Share document PDF using WhatsApp" title="Share PDF using WhatsApp" onClick={() => documentShare(r, active.table, clients.find(c=>c.id===r.client_id), token)}><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="currentColor"><path d="M12.05 2a9.95 9.95 0 0 0-8.57 15.02L2 22l5.13-1.35A9.95 9.95 0 1 0 12.05 2Zm0 18.05a8.04 8.04 0 0 1-4.1-1.12l-.3-.18-3.05.8.82-2.97-.2-.31a8.05 8.05 0 1 1 6.83 3.78Zm4.45-6.03c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.19-1.42-1.33-1.66-.14-.24-.01-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.57.18 1.1.16 1.51.1.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/></svg></button>}{active.table === 'Clients' && <button onClick={() => printClientProfile(r, active.name)}>Print <Download size={14}/></button>}</div></td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty">{busy ? 'Loading records…' : 'No matching records found.'}</div>}</section></>; }
function Workflow({ token, role, onStatus, refreshKey }) { const [rows, setRows] = useState([]), [err, setErr] = useState(''); useEffect(() => { let stop = false; api('/records/Invoices', token).then(d => { if (!stop)
    setRows(d.records || []); }).catch(e => setErr(e.message)); return () => { stop = true; }; }, [token, refreshKey]); const columns = ['Active', 'Pending', 'Unpaid', 'Paid']; return <><div className="notice subtle"><KanbanSquare size={18}/>Invoice workflow preview. Status updates are permission-checked by the backend. Drag-and-drop and cross-document automation are planned for Part 2.</div>{err && <div className="notice error">{err}</div>}<div className="workflow-board">{columns.map(status => <div className="workflow-column" key={status}><div className="workflow-header"><strong>{status}</strong><span>{rows.filter(r => (r.status || 'Active') === status).length}</span></div>{rows.filter(r => (r.status || 'Active') === status).map(r => <div className="workflow-card" key={r.id}><strong>{r.reference || r.name}</strong><p>{r.name}</p><b>{money(r.amount)}</b>{true && <select aria-label="Change invoice status" value={r.status || 'Active'} onChange={async (e) => { await onStatus(r, e.target.value); setRows(v => v.map(x => x.id === r.id ? { ...x, status: e.target.value } : x)); }}>{columns.map(c => <option key={c}>{c}</option>)}</select>}</div>)}</div>)}</div></>; }
function Analytics({ overview, role }) { const entries = Object.entries(overview?.counts || {}); const max = Math.max(1, ...entries.map(x => x[1])); return <div className="analytics-grid"><section className="surface-panel"><div className="section-title"><div><h3>Records by module</h3><p>Unified workspace · current data</p></div><ChartNoAxesCombined /></div><div className="bar-chart">{entries.map(([name, count]) => <div className="bar-row" key={name}><span>{name}</span><div className="bar-track"><i style={{ width: Math.max(2, 100 * count / max) + '%' }}/></div><b>{count}</b></div>)}</div></section><section className="surface-panel"><div className="section-title"><div><h3>Operational snapshot</h3><p>Counts and gross recorded values</p></div><TrendingUp /></div><div className="metric-line"><span>Total recorded document value</span><strong>{money(overview?.totals?.amount)}</strong></div><div className="metric-line"><span>Pending / unpaid records</span><strong>{overview?.totals?.pending || 0}</strong></div><div className="metric-line"><span>Role</span><strong className="capitalize">{role}</strong></div><p className="footnote">Recorded document totals are not net revenue or audited accounting figures. Full financial analytics and period comparisons are scheduled for Part 2.</p></section></div>; }
function Audit({ events }) { return <section className="surface-panel"><div className="section-title"><div><h3>Recent audit activity</h3><p>Last 150 entries from the AuditLogs sheet</p></div><History /></div><div className="table-scroll"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th><th>Reference</th></tr></thead><tbody>{events.map(e => <tr key={e.id}><td>{e.date ? displayDateTime(e.date) : '—'}</td><td>{e.actor}</td><td><span className="status-pill">{e.action}</span></td><td>{e.table}</td><td>{e.reference}</td></tr>)}</tbody></table></div>{!events.length && <div className="empty">No audit events found. Run the updated Sheets setup script before editing records.</div>}</section>; }
function Preferences({theme,setTheme,role,collapsed,setCollapsed,request,profile,onChanged}) {
  const [primary,setPrimary]=useState(profile.primary_color||'#bf3046');
  const [secondary,setSecondary]=useState(profile.secondary_color||'#f5f5f5');
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  useEffect(()=>{setPrimary(profile.primary_color||'#bf3046');setSecondary(profile.secondary_color||'#f5f5f5')},[profile.primary_color,profile.secondary_color]);
  async function saveColors(){setBusy(true);setNotice('');try{const result=await request('/company-settings',{method:'PUT',body:JSON.stringify({...profile,primary_color:primary,secondary_color:secondary})});onChanged(result.company);setNotice('Company theme saved for this workspace.');}catch(e){setNotice(e.message)}finally{setBusy(false)}}
  return <div className="settings-grid v44-preferences"><section className="surface-panel"><h3>Appearance</h3><div className="theme-options"><button className={theme==='dark'?'selected':''} onClick={()=>setTheme('dark')}><Moon/> Dark mode</button><button className={theme==='light'?'selected':''} onClick={()=>setTheme('light')}><Sun/> Light mode</button></div></section>
  <section className="surface-panel company-theme-studio"><h3>Company Theme Studio</h3><div className="company-palette-fields"><label>Primary accent<input type="color" value={primary} onChange={e=>setPrimary(e.target.value)}/><code>{primary}</code></label><label>Text color<input type="color" value={secondary} onChange={e=>setSecondary(e.target.value)}/><code>{secondary}</code></label></div><div className="company-theme-preview" style={{background:theme==='light'?'#f5f5f5':'#242528'}}><span style={{background:primary,color:'#fff',padding:12,borderRadius:9}}>Workspace accent</span><span style={{color:readableTextColor(secondary,theme==='light'?'#f5f5f5':'#242528')}}>Live text preview</span></div><button className="primary" disabled={busy||role!=='admin'} onClick={saveColors}>{busy?'Saving…':'Save company colors'}</button>{notice&&<p role="status">{notice}</p>}</section>
  <section className="surface-panel"><h3>Navigation density</h3><div className="theme-options"><button className={!collapsed?'selected':''} onClick={()=>setCollapsed(false)}><PanelLeftOpen/> Expanded</button><button className={collapsed?'selected':''} onClick={()=>setCollapsed(true)}><PanelLeftClose/> Compact</button></div></section></div>;
}
const STEPS = [['Explore your workspace', 'Use the sidebar to open the modules available to your role.'], ['Find a client', 'Open Clients from the navigation or press Ctrl / ⌘ + K to search.'], ['Create a document', 'Choose New Invoice or New Delivery Note, then enter descriptions and quantities manually. Review before saving.'], ['Review your work', 'Use Workflow for invoice status updates, or Analytics for a summary of current records.']];
function Help({ step, setStep }) { return <section className="surface-panel help-card"><div className="section-title"><div><h3>Getting started</h3><p>A short guided introduction to ALIF SYNC</p></div><PlayCircle /></div><div className="help-progress">{STEPS.map((_, i) => <span className={i <= step ? 'done' : ''} key={i}/>)}</div><span className="overline">STEP {step + 1} OF {STEPS.length}</span><h2>{STEPS[step][0]}</h2><p>{STEPS[step][1]}</p><div className="help-actions"><button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</button><button className="primary" onClick={() => setStep(step === STEPS.length - 1 ? 0 : step + 1)}>{step === STEPS.length - 1 ? 'Restart guide' : 'Next step'} <ArrowRight size={17}/></button></div></section>; }
function SearchOverlay({ token, close, navigate }) { const [q, setQ] = useState(''), [results, setResults] = useState([]), [loading, setLoading] = useState(false); const input = useRef(null); useEffect(() => input.current?.focus(), []); useEffect(() => { if (!q.trim()) {
    setResults([]);
    return;
} let cancelled = false; const timer = setTimeout(() => { setLoading(true); api('/search?q=' + encodeURIComponent(q), token).then(d => { if (!cancelled)
    setResults(d.results || []); }).catch(() => { if (!cancelled)
    setResults([]); }).finally(() => { if (!cancelled)
    setLoading(false); }); }, 300); return () => { cancelled = true; clearTimeout(timer); }; }, [q, token]); return <div className="search-shade" onMouseDown={e => { if (e.target === e.currentTarget)
    close(); }}><div className="command-dialog" role="dialog" aria-modal="true" aria-label="Search workspace"><div className="command-input"><Search size={21}/><input ref={input} placeholder="Search in any language / البحث بأي لغة" value={q} onChange={e => setQ(e.target.value)}/><button onClick={close}><kbd>ESC</kbd></button></div><div className="command-results">{!q.trim() ? <div className="command-hint"><Command size={21}/> Type to search your workspace in any language.</div> : loading ? <div className="command-hint">Searching records…</div> : results.length ? results.map(r => <button key={r.table + r.id} onClick={() => { navigate(MODULES.find(m => m.table === r.table)?.name || 'Overview'); close(); }}><FileText size={18}/><span><strong>{r.reference || r.name}</strong><small>{r.table} · {r.name}</small></span><ArrowUpRight size={17}/></button>) : <div className="command-hint">No matching records.</div>}</div><div className="command-footer">Search respects your role permissions.</div></div></div>; }
async function documentShare(record, kind, client, token) {
    const phone = String(client?.phone || '').replace(/\D/g, '');
    if (!phone) { window.alert('No client phone number is saved. Add a phone number to the client profile first.'); return; }
    const label = kind === 'Invoices' ? 'invoice' : kind === 'ProformaInvoices' ? 'proforma invoice' : kind === 'DeliveryNotes' ? 'delivery note' : 'quotation';
    const message = `Dear ${client?.name || record.name || 'Customer'},\nPlease find the attached ${label} ${record.reference || ''}.\nThank you.`;
    try {
        const profile = await api('/company-settings', token);
        const document = { ...record, company_logo: record.company_logo || profile.company?.logo_data || '' };
        const qr = kind === 'Invoices' ? invoiceQrMarkup(document) : '';
        const template = ''; // The PDF shown in Preview is also the file shared with customers.
        const file = await createDocumentPdfFile(document, kind, qr, template);
        // Browser/native sharing lets the user choose WhatsApp and confirm the recipient.
        // The public WhatsApp deep-link API cannot verify a number or attach a local file.
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: `${label.toUpperCase()} ${record.reference || ''}`, text: message });
            return;
        }
        await downloadDocumentPdf(document, kind, qr, template);
        window.alert('The PDF has been downloaded. Your browser cannot attach files directly to WhatsApp. Please attach the downloaded PDF in WhatsApp and confirm the recipient. WhatsApp account availability cannot be verified here.');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    } catch(error) { if (error.name !== 'AbortError') window.alert('PDF sharing failed: ' + error.message); }
}

function VatSummary({token}) {
    const [invoices,setInvoices]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
    useEffect(()=>{let cancelled=false;api('/records/Invoices',token).then(d=>{if(!cancelled)setInvoices((d.records||[]).filter(r=>r.status!=='Deleted' && r.status!=='Cancelled'))}).catch(e=>{if(!cancelled)setError(e.message)}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true}},[token]);
    const vatOf = r => {if(Number.isFinite(Number(r.vat_amount)) && r.vat_amount!==undefined && r.vat_amount!==null)return Number(r.vat_amount);const rate=Number(r.tax_rate||0),amount=Number(r.amount||0);return rate>0&&rate<=100?amount*rate/(100+rate):0};
    const total = invoices.reduce((sum,r)=>sum+vatOf(r),0);
    const paid = invoices.filter(r=>/^paid$/i.test(r.status)).reduce((sum,r)=>sum+vatOf(r),0);
    return <section className="surface-panel"><div className="section-title"><div><h3>Invoice VAT Summary</h3><p>Recorded VAT estimates by invoice · not a VAT return or tax remittance statement</p></div><Receipt/></div>{loading?<p>Loading invoices…</p>:error?<p className="notice error">{error}</p>:<><div className="client-history-kpis"><div><strong>{money(total)}</strong><small>VAT charged in recorded invoices</small></div><div><strong>{money(paid)}</strong><small>VAT associated with paid invoices</small></div><div><strong>{money(total-paid)}</strong><small>VAT on other invoices</small></div></div><div className="table-scroll"><table><thead><tr><th>Invoice</th><th>Client</th><th>Status</th><th>VAT amount</th></tr></thead><tbody>{invoices.map(r=><tr key={r.id}><td>{r.reference}</td><td>{r.name}</td><td>{r.status}</td><td>{money(vatOf(r))}</td></tr>)}</tbody></table></div><p className="footnote">VAT derived from saved values or the recorded tax rate and tax-inclusive total. Confirm tax treatment, discounts and payments before official reporting.</p></>}</section>;
}
function ClientHistory({ client, token, openModule }) {
    const [records,setRecords]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState('');
    useEffect(()=>{let cancelled=false; setLoading(true);
        Promise.all(['Quotations','ProformaInvoices','Invoices','DeliveryNotes','ClientPOs'].map(t=>api('/records/'+t,token).then(d=>(d.records||[]).filter(x=>x.client_id===client.id).map(x=>({...x,table:t}))))).then(groups=>{if(!cancelled)setRecords(groups.flat().sort((a,b)=>String(b.updated_at||'').localeCompare(String(a.updated_at||''))));}).catch(e=>{if(!cancelled)setError(e.message)}).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true};},[client.id,token]);
    return <section className="surface-panel client-history"><div className="section-title"><div><h3>{client.name} · Connected records</h3><p>Client 360° · history from your company workspace</p></div><button className="secondary" onClick={()=>openModule('Clients')}>Directory</button></div><div className="client-identity-line">{[client.email,client.phone,client.vat_number&&'VAT '+client.vat_number,client.cr_number&&'CR '+client.cr_number,client.address,client.project_location].filter(Boolean).map((v,i)=><span key={i}>{v}</span>)}</div>{loading?<p>Loading client documents…</p>:error?<p className="notice error">{error}</p>:<><div className="client-history-kpis">{['Quotations','ProformaInvoices','Invoices','DeliveryNotes','ClientPOs'].map(t=><div key={t}><strong>{records.filter(r=>r.table===t).length}</strong><small>{t.replace(/([a-z])([A-Z])/g,'$1 $2')}</small></div>)}</div><div className="table-scroll"><table><thead><tr><th>Document</th><th>Reference</th><th>Status</th><th>Modified</th><th></th></tr></thead><tbody>{records.map(r=><tr key={r.table+r.id}><td>{r.table}</td><td>{r.reference}</td><td>{r.status}</td><td>{displayDate(r.updated_at)}</td><td><button className="secondary" onClick={()=>openModule(MODULES.find(m=>m.table===r.table)?.name||'Clients')}>Open</button></td></tr>)}</tbody></table></div>{!records.length&&<p>No linked documents yet.</p>}</>}</section>;
}
function RecordModal({ active, role, clients, editing, busy, close, save }) {
    if (active.table === 'Clients')
        return <ClientModal role={role} editing={editing} busy={busy} close={close} save={save}/>;
    const [clientPopup, setClientPopup] = useState(false);
    const lockedFinancial = !!editing;
    const [localClients, setLocalClients] = useState(clients);
    const [f, setF] = useState(() => editing ? { ...editing } : { name: '', reference: '', status: 'Active', amount: 0, date: new Date().toISOString().slice(0, 10), client_id: '', email: '', phone: '', address: '', vat_number: '', items: [], discount: 0, tax_rate: 0, notes: '' });
    const [poHistory,setPoHistory]=useState([]);
    useEffect(()=>{let cancelled=false;if(!f.client_id){setPoHistory([]);return;}Promise.all(['Invoices','Quotations','ProformaInvoices','ClientPOs'].map(t=>api('/records/'+t,getSession()?.token).then(d=>d.records||[]))).then(groups=>{if(!cancelled)setPoHistory([...new Set(groups.flat().filter(r=>r.client_id===f.client_id).map(r=>r.po_number||r.reference_number).filter(Boolean))].sort());}).catch(()=>{if(!cancelled)setPoHistory([])});return()=>{cancelled=true}},[f.client_id]);
    const isDoc = ['Quotations', 'Invoices', 'DeliveryNotes', 'ClientPOs', 'PurchaseOrders', 'ProformaInvoices'].includes(active.table);
    const change = (k, v) => setF(s => ({ ...s, [k]: ['notes','description','address','project_location','name'].includes(k) ? capitalizeStart(v) : v }));
    const items = Array.isArray(f.items) ? f.items : [];
    const subtotal = items.reduce((a, x) => a + Number(x.quantity || 0) * Number(x.unit_price || 0), 0);
    const computed = items.length ? (subtotal - Number(f.discount || 0)) * (1 + Number(f.tax_rate || 0) / 100) : Number(f.amount || 0);
    const changeItem = (i, k, v) => change('items', items.map((x, n) => n === i ? { ...x, [k]: k === 'description' ? capitalizeStart(v) : v } : x));
    function printDoc() { const w = window.open('', '_blank'); if (!w) {
        alert('Allow pop-ups to print the document.');
        return;
    } const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); w.document.write('<!doctype html><html><head><title>Document preview</title><style>body{font:14px Arial;padding:40px;color:#222}h1{font-size:26px}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:12px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-size:22px;margin-top:24px}</style></head><body><h1>ALIF SYNC — ' + esc(active.name) + '</h1>' + (active.table === 'ProformaInvoices' ? '<p><strong>PROFORMA ONLY — NOT A TAX INVOICE</strong></p>' : '') + '<p>' + esc('ALIF SYNC') + ' · Document No: ' + esc(f.reference || 'Assigned on save') + '</p>' + (f.po_number ? '<p>PO Number: '+esc(f.po_number)+'</p>' : '') + '<p>Client: ' + esc(f.name) + '</p><table><tr><th>Description</th><th>Qty</th><th>Unit price</th></tr>' + items.map(x => '<tr><td>' + esc(x.description) + '</td><td>' + esc(x.quantity) + '</td><td>' + esc(x.unit_price) + '</td></tr>').join('') + '</table><div class="total">Total: ' + esc(money(computed)) + '</div><script>window.onload=()=>window.print()<\/script></body></html>'); w.document.close(); }
    return <><div className="modal-shade" onMouseDown={e => { if (e.target === e.currentTarget)
        close(); }}><form className="record-modal" onSubmit={e => { e.preventDefault(); save(f,true); }}><div className="modal-header"><div><span className="overline">{editing ? 'EDIT RECORD' : 'CREATE RECORD'} · ALIF SYNC</span><h2>{active.name}</h2></div><button type="button" className="icon-btn" onClick={close}><X /></button></div><div className="modal-body"><div className="form-grid">{active.client && <label className="wide">Client<select required disabled={!!editing && role !== 'admin'} value={f.client_id || ''} onChange={e => { const c = localClients.find(x => x.id === e.target.value); setF(s => ({ ...s, client_id: e.target.value, name: c?.name || '' })); }}><option value="">Select a client</option>{localClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{active.table === 'Quotations' && <button type="button" className="secondary create-client-inline" onClick={() => setClientPopup(true)}>+ Create Client</button>}</label>}<label className="wide">{active.client ? 'Client / document name' : 'Name'}<input required readOnly={!!editing && role !== 'admin' && (active.client || active.table === 'Clients')} value={f.name || ''} onChange={e => change('name', clientTitleCase(e.target.value))} placeholder="Name"/></label><label>Document Reference<input value={f.reference || ''} onChange={e => change('reference', e.target.value)} placeholder="Auto-generated if empty"/></label>{active.table !== 'Clients' && active.table !== 'Vendors' && <label>PO Number (optional)<input list="client-po-options" value={f.po_number || ''} onChange={e=>change('po_number',e.target.value)} placeholder="Enter or select client PO"/><datalist id="client-po-options">{poHistory.map(po=><option key={po} value={po}/>)}</datalist></label>}<label>Status<select value={f.status || 'Active'} onChange={e => change('status', e.target.value)}>{['Active', 'Draft', 'Pending', 'Approved', 'Unpaid', 'Partially Paid', 'Paid', 'Delivered', 'Cancelled'].map(x => <option key={x}>{x}</option>)}</select></label><label>Date<input type="date" value={f.date || ''} onChange={e => change('date', e.target.value)}/></label>{!isDoc && <label>Amount (SAR)<input disabled={lockedFinancial} type="number" min="0" step="0.01" value={f.amount ?? 0} onChange={e => change('amount', e.target.value)}/></label>}{['Clients', 'Vendors'].includes(active.table) && <><label>Email<input type="email" value={f.email || ''} onChange={e => change('email', e.target.value)}/></label><label>Phone<input type="tel" inputMode="tel" pattern="[+0-9 ()-]{7,22}" title="Enter a valid phone number" value={f.phone || ''} onChange={e => change('phone', e.target.value)}/></label><label className="wide">Address<input value={f.address || ''} onChange={e => change('address', e.target.value)}/></label><label>VAT number<input value={f.vat_number || ''} onChange={e => change('vat_number', e.target.value)}/></label></>}</div>{isDoc && <div className="items-builder"><div className="section-title"><div><h3>Document line items</h3><p>Totals calculated automatically before saving</p></div><button type="button" className="secondary" disabled={lockedFinancial} onClick={() => change('items', [...items, { description: '', quantity: 1, unit_price: 0 }])}><Plus size={15}/> Add item</button></div>{items.map((item, i) => <div className="item-line" key={i}><input aria-label="Item description" required placeholder="Description" title="Item description" value={item.description || ''} onChange={e => changeItem(i, 'description', e.target.value)}/><input aria-label="Quantity" disabled={lockedFinancial} placeholder="Quantity" type="number" min="0" step="0.01" value={item.quantity ?? 1} onChange={e => changeItem(i, 'quantity', e.target.value)}/><input aria-label="Unit price" disabled={lockedFinancial} placeholder="Rate (SAR)" type="number" min="0" step="0.01" value={item.unit_price ?? 0} onChange={e => changeItem(i, 'unit_price', e.target.value)}/><button type="button" disabled={lockedFinancial} aria-label="Remove item" className="icon-btn" onClick={() => change('items', items.filter((_, n) => n !== i))}><X size={16}/></button></div>)}<div className="form-grid"><label>Discount (SAR)<input disabled={lockedFinancial} type="number" min="0" step="0.01" value={f.discount ?? 0} onChange={e => change('discount', e.target.value)}/></label><label>Tax rate (%)<input disabled={lockedFinancial} type="number" min="0" max="100" step="0.01" value={f.tax_rate ?? 0} onChange={e => change('tax_rate', e.target.value)}/></label>{!items.length && <label className="wide">Amount without line items (SAR)<input disabled={lockedFinancial} type="number" min="0" step="0.01" value={f.amount ?? 0} onChange={e => change('amount', e.target.value)}/></label>}</div><div className="document-total"><span>Calculated total</span><strong>{money(computed)}</strong></div><button type="button" className="secondary" onClick={printDoc}><Download size={16}/> Print / Save as PDF (browser)</button></div>}<label className="notes-label">Notes<textarea rows="2" value={f.notes || ''} onChange={e => change('notes', e.target.value)}/></label></div><div className="modal-footer"><button type="button" className="secondary" onClick={close}>Cancel</button><button type="button" className="secondary" disabled={busy} onClick={()=>save(f,false)}>Save</button><button type="submit" className="primary" disabled={busy}>{busy ? 'Submitting…' : 'Submit & Download PDF'} <ArrowRight size={17}/></button></div></form></div>{clientPopup && <ClientModal role={role} editing={null} busy={busy} close={() => setClientPopup(false)} save={async (data) => { try {
        const d = await fetch('/api/records/Clients', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + getSession()?.token }, body: JSON.stringify(data) });
        const result = await d.json();
        if (!d.ok)
            throw Error(result.error || 'Client could not be saved');
        setLocalClients(old => [...old, result.record]);
        setF(old => ({ ...old, client_id: result.record.id, name: result.record.name }));
        setClientPopup(false);
    }
    catch (err) {
        alert(err.message);
    } }}/>}</>;
}
const CLIENT_COUNTRIES = [
    { iso: 'SA', label: 'Saudi Arabia', code: '+966', digits: 9, pattern: /^5\d{8}$/ },
    { iso: 'IN', label: 'India', code: '+91', digits: 10, pattern: /^[6-9]\d{9}$/ },
    { iso: 'AE', label: 'United Arab Emirates', code: '+971', digits: 9, pattern: /^5\d{8}$/ },
    { iso: 'US', label: 'United States', code: '+1', digits: 10, pattern: /^[2-9]\d{9}$/ },
    { iso: 'GB', label: 'United Kingdom', code: '+44', digits: 10, pattern: /^\d{10}$/ },
    { iso: 'PK', label: 'Pakistan', code: '+92', digits: 10, pattern: /^3\d{9}$/ },
    { iso: 'BD', label: 'Bangladesh', code: '+880', digits: 10, pattern: /^1\d{9}$/ },
    { iso: 'EG', label: 'Egypt', code: '+20', digits: 10, pattern: /^1\d{9}$/ },
    { iso: 'OTHER', label: 'Other country', code: '+', digits: 15, pattern: /^\d{6,15}$/ }
];
const clientTitleCase = s => String(s || '').replace(/(^|[\s\-'])\p{L}/gu, m => m.toLocaleUpperCase());
const validClientEmail = s => /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(s) && s.length <= 254 && !s.includes('..');
const safePrint = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function printClientProfile(data) {
    const w = window.open('', '_blank');
    if (!w) {
        alert('Please allow pop-ups to print the client profile.');
        return;
    }
    const fields = [['Client name', data.name], ['CR Number', data.cr_number], ['Project Location', data.project_location], ['Status', data.status], ['Email', data.email], ['Phone', data.phone], ['Address', data.address], ['VAT number', data.vat_number], ['CR number', data.cr_number], ['Project location', data.project_location], ['Notes', data.notes]];
    const mapUrl = typeof data.maps_url === 'string' && /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl\/)/i.test(data.maps_url) ? data.maps_url : '';
    const link = mapUrl ? '<p><a href="' + safePrint(mapUrl) + '" target="_blank" rel="noopener">View saved location in Google Maps</a></p>' : '';
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>ALIF SYNC — Client Profile</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:14px Arial,sans-serif;color:#282528;margin:0}header{background:#262528;color:#fff;padding:26px;border-bottom:6px solid #ae4939}header small{color:#ffb477;letter-spacing:3px}h1{font-size:28px;margin:10px 0 4px}.sub{color:#d8b7a6}.body{padding:28px 6px}.pill{display:inline-block;background:#f8e7dd;color:#9d4936;padding:8px 14px;border-radius:22px;font-weight:bold}.row{display:grid;grid-template-columns:155px 1fr;gap:18px;padding:14px 6px;border-bottom:1px solid #e9e2dd}.row b{color:#76675f;font-size:12px;text-transform:uppercase;letter-spacing:1px}.row span{overflow-wrap:anywhere}footer{margin-top:40px;border-top:1px solid #ddd;padding-top:14px;color:#8e8077;font-size:11px}@media print{button{display:none}}</style></head><body><header><small>ALIF SYNC / CLIENT DIRECTORY</small><h1>Client Profile</h1><div class="sub">' + 'ALIF SYNC' + '</div></header><div class="body"><p class="pill">' + safePrint(data.status || 'Active') + '</p>' + fields.filter(x => x[1]).map(x => '<div class="row"><b>' + safePrint(x[0]) + '</b><span>' + safePrint(x[1]) + '</span></div>').join('') + link + '</div><footer>ALIF SYNC · CLIENT INFORMATION · ' + safePrint(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Riyadh'}).format(new Date())) + '</footer><script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
}
function ClientModal({ role, editing, busy, close, save }) {
    const initialPhone = String(editing?.phone || '').replace(/[\s()-]/g, '');
    const detected = CLIENT_COUNTRIES.find(c => c.iso !== 'OTHER' && initialPhone.startsWith(c.code)) || CLIENT_COUNTRIES[0];
    const [country, setCountry] = useState(detected.iso);
    const [phone, setPhone] = useState(initialPhone.startsWith(detected.code) ? initialPhone.slice(detected.code.length) : initialPhone.replace(/^\+/, ''));
    const [form, setForm] = useState(() => ({ name: editing?.name || '', status: editing?.status === 'Inactive' ? 'Inactive' : 'Active', email: editing?.email || '', address: editing?.address || '', maps_url: editing?.maps_url || '', vat_number: editing?.vat_number || '', cr_number: editing?.cr_number || '', project_location: editing?.project_location || '', same_as_office: editing?.same_as_office || false, notes: editing?.notes || '' }));
    const [addressBusy, setAddressBusy] = useState(false), [addressMsg, setAddressMsg] = useState('');
    const c = CLIENT_COUNTRIES.find(x => x.iso === country) || CLIENT_COUNTRIES[0];
    const fullPhone = c.code + phone;
    const email = form.email.trim();
    const emailError = email && !validClientEmail(email) ? 'Enter a valid email address, e.g. accounts@company.com.' : '';
    const phoneError = phone && !c.pattern.test(phone) ? 'Enter a valid ' + c.label + ' phone number (' + (c.iso === 'OTHER' ? '6–15' : c.digits) + ' digits).' : '';
    const update = (key, val) => setForm(old => ({ ...old, [key]: ['address','project_location','notes'].includes(key) ? capitalizeStart(val) : val }));
    const readonlyName = !!editing && role !== 'admin';
    function mapOpen() { window.open('https://www.google.com/maps', '_blank', 'noopener,noreferrer'); }
    async function resolveMap() {
        setAddressMsg('');
        const raw = form.maps_url.trim();
        if (!raw) {
            setAddressMsg('Paste a Google Maps location link first.');
            return;
        }
        if (!/^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl\/)/i.test(raw)) {
            setAddressMsg('Enter a valid HTTPS Google Maps link.');
            return;
        }
        const coords = raw.match(/@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/) || raw.match(/[?&](?:q|query|ll)=(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/) || raw.match(/!3d(-?\d{1,2}(?:\.\d+))!4d(-?\d{1,3}(?:\.\d+))/);
        if (!coords) {
            setAddressMsg('Saved Maps link. This link does not expose coordinates; please enter the address manually.');
            return;
        }
        const lat = Number(coords[1]), lon = Number(coords[2]);
        if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
            setAddressMsg('Invalid coordinates in link.');
            return;
        }
        setAddressBusy(true);
        try {
            const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lon), { headers: { Accept: 'application/json' } });
            if (!r.ok)
                throw Error('Address lookup unavailable');
            const d = await r.json();
            if (!d.display_name)
                throw Error('No address found');
            update('address', d.display_name);
            setAddressMsg('Address filled from map coordinates. Verify it matches the client location.');
        }
        catch {
            setAddressMsg('Could not resolve this location automatically. Enter the address manually; the Maps link will still be saved.');
        }
        finally {
            setAddressBusy(false);
        }
    }
    function submit(e) {
        e.preventDefault();
        if (email && !validClientEmail(email)) {
            setAddressMsg('Please enter a valid email address.');
            return;
        }
        if (phone && !c.pattern.test(phone)) {
            setAddressMsg('Please correct the phone number.');
            return;
        }
        save({ ...editing, ...form, name: clientTitleCase(form.name.trim()), email, phone: phone ? fullPhone : '', project_location: form.same_as_office ? form.address : form.project_location, status: form.status === 'Inactive' ? 'Inactive' : 'Active', reference: editing?.reference || '', amount: 0, maps_url: form.maps_url.trim() });
    }
    const preview = { ...editing, ...form, name: clientTitleCase(form.name.trim()), email, phone: fullPhone };
    return <div className="modal-shade" onMouseDown={e => { if (e.target === e.currentTarget)
        close(); }}><form className="record-modal client-modal" onSubmit={submit}><div className="modal-header client-modal-header"><div><span className="overline">ALIF SYNC / CLIENT DIRECTORY</span><h2>{editing ? 'Edit client profile' : 'Create new client'}</h2><p>Accurate details. Professional records. One streamlined workspace.</p></div><button type="button" className="icon-btn" onClick={close} aria-label="Close"><X /></button></div><div className="modal-body client-modal-body"><div className="client-section-heading"><span>01</span><div><h3>Client identity</h3><p>Enter the official client information</p></div></div><div className="form-grid"><label className="wide">Client name *<input required maxLength="250" readOnly={readonlyName} autoComplete="organization" placeholder="e.g. ALIF SYNC Construction" value={form.name} onChange={e => update('name', clientTitleCase(e.target.value))}/>{readonlyName && <small>Client name is locked for this role after creation.</small>}</label><label>Status<select value={form.status} onChange={e => update('status', e.target.value)}><option>Active</option><option>Inactive</option></select></label><label>VAT number (optional)<input value={form.vat_number} onChange={e => update('vat_number', e.target.value)} placeholder="Tax registration number"/></label><label>CR Number (optional)<input value={form.cr_number} onChange={e => update('cr_number', e.target.value)} placeholder="Commercial registration"/></label></div><div className="client-section-heading"><span>02</span><div><h3>Contact details</h3><p>Validated email and international telephone</p></div></div><div className="form-grid"><label className="wide">Business email (optional)<input type="email" autoComplete="email" placeholder="accounts@company.com" value={form.email} onChange={e => update('email', e.target.value)} onBlur={() => update('email', form.email.trim())}/>{emailError && <small className="client-field-error">{emailError}</small>}<small>All correctly formatted email domains are accepted. Mailbox ownership is not verified.</small></label><label>Country code<select value={country} onChange={e => { setCountry(e.target.value); setPhone(''); }}>{CLIENT_COUNTRIES.map(x => <option key={x.iso} value={x.iso}>{x.label} ({x.code})</option>)}</select></label><label>Phone number (optional)<div className="client-phone"><span>{c.code}</span><input inputMode="numeric" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, c.digits))} placeholder="Phone digits only"/></div>{phoneError && <small className="client-field-error">{phoneError}</small>}</label></div><div className="client-section-heading"><span>03</span><div><h3>Business location</h3><p>Use Google Maps without a Google Maps API key</p></div></div><div className="form-grid"><label className="wide">Office address (optional)<textarea rows="2" placeholder="Street, district, city, postal code, country" value={form.address} onChange={e => update('address', e.target.value)}/></label><label className="wide address-copy-checkbox"><input type="checkbox" checked={!!form.same_as_office} onChange={e=>update("same_as_office",e.target.checked)}/> Same as office address</label><label className="wide">Project Location (optional)<textarea rows="2" disabled={!!form.same_as_office} value={form.same_as_office ? form.address : form.project_location} onChange={e=>update("project_location",e.target.value)}/></label><label className="wide">Google Maps location link (optional)<input type="url" placeholder="https://www.google.com/maps/..." value={form.maps_url} onChange={e => update('maps_url', e.target.value)}/></label></div><div className="client-map-actions"><button type="button" className="secondary" onClick={mapOpen}><ExternalLink size={16}/> Open Google Maps</button><button type="button" className="secondary" disabled={addressBusy} onClick={resolveMap}>{addressBusy ? 'Looking up address…' : 'Fill address from Maps link'}</button>{form.maps_url && <a href={form.maps_url} target="_blank" rel="noopener noreferrer">View saved location ↗</a>}</div>{addressMsg && <div className="client-map-message" role="status">{addressMsg}</div>}<label className="notes-label">Internal notes (optional)<textarea rows="2" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Additional client information"/></label></div><div className="modal-footer client-modal-footer"><button type="button" className="secondary" onClick={close}>Cancel</button><button type="button" className="secondary" onClick={() => printClientProfile(preview)}><Download size={16}/> Print client profile</button><button className="primary" disabled={busy || !!emailError || !!phoneError}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save client'} <ArrowRight size={17}/></button></div></form></div>;
}
createRoot(document.getElementById('root')).render(<App />);
