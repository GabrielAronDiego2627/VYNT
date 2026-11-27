// VYNT · app conectada a Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { FORMAS } from './formas.js?v=5';

const SUPABASE_URL = 'https://hwcttyychoedsvvuktqb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_T49Ep-BBFfrHg4FgT_dA4w_8SjQNG24'; // clave pública: los datos los protegen las políticas RLS
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

/* utilidades */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const kg = v => (Math.round(v * 10) / 10).toLocaleString('es-ES') + ' kg';
const fmt = n => Math.round(n).toLocaleString('es-ES');
const DAY = 864e5;
const now0 = () => { const d = new Date(); d.setHours(23, 59, 59, 0); return d.getTime(); };
const fdate = t => new Date(t).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const e1 = (w, r) => r <= 1 ? w : w * (1 + r / 30);
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hms = d => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const ij = v => v.split(':').map(Number);
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
function ok(res) { if (res.error) throw res.error; return res.data; }
async function all(make) { // lee todas las filas aunque pasen de 1000
  let out = [], i = 0;
  for (;;) { const data = ok(await make().range(i, i + 999)); out = out.concat(data); if (data.length < 1000) break; i += 1000; }
  return out;
}
const lsGet = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch { } };

/* datos */
let EX = {}, EXID = {}, R = [], GR = {}, M2G = {}, MUS = [], LOGROS = [], VYNT_PL = [];
let YO = null, ME = null, U = [], UID = {}, S = [], MINE = [], LOGRA = {}, OBT = new Set(), AM = [], LIKES_DADOS = 0;
const COLORES = ['#5AA9E6', '#FF8A3D', '#9B7BFF', '#6FBF8A', '#F2C230', '#FF9E9E', '#8A9490'];
let catalogoListo = false;

async function cargarCatalogo() {
  const [grupos, musculos, rangos, ejs, trab, exige, logros, plants, incl] = await Promise.all([
    all(() => sb.from('grupo_muscular').select('id_grupo,nombre').order('id_grupo')),
    all(() => sb.from('musculo').select('id_musculo,nombre,id_grupo').order('id_musculo')),
    all(() => sb.from('rango').select('*').order('orden')),
    all(() => sb.from('ejercicio').select('*').order('nombre')),
    all(() => sb.from('trabaja').select('*')),
    all(() => sb.from('exige').select('*').order('id_ejercicio').order('id_rango')),
    all(() => sb.from('logro').select('*').order('id_logro')),
    all(() => sb.from('plantilla').select('id_plantilla,nombre,id_usuario,fecha_creacion').order('id_plantilla')),
    all(() => sb.from('incluye').select('*').order('id_plantilla').order('orden')),
  ]);
  const gn = {}; grupos.forEach(g => { gn[g.id_grupo] = g.nombre; GR[g.nombre] = []; });
  const mn = {}; musculos.forEach(m => { mn[m.id_musculo] = m.nombre; GR[gn[m.id_grupo]].push(m.nombre); M2G[m.nombre] = gn[m.id_grupo]; });
  MUS = Object.keys(M2G);
  R = rangos.map(r => ({ id: r.id_rango, o: r.orden - 1, n: r.nombre, c: r.color, i: r.representacion }));
  const rix = {}; R.forEach((r, i) => rix[r.id] = i);
  ejs.forEach(e => {
    const x = { id: e.id_ejercicio, n: e.nombre, eq: e.equipamiento || '—', t: e.tipo || 'Compuesto', d: e.descripcion || '', f: e.foto, p: null, s: [], uh: R.map(() => 0), um: R.map(() => 0) };
    EX[x.n] = x; EXID[x.id] = x;
  });
  trab.forEach(t => { const x = EXID[t.id_ejercicio]; if (!x) return; t.principal ? x.p = mn[t.id_musculo] : x.s.push(mn[t.id_musculo]); });
  Object.values(EX).forEach(x => { if (!x.p) x.p = x.s.shift() || MUS[0]; });
  exige.forEach(r => { const x = EXID[r.id_ejercicio]; if (!x) return; const i = rix[r.id_rango]; x.uh[i] = +r.peso_minimo_hombre_kg; x.um[i] = +r.peso_minimo_mujer_kg; });
  LOGROS = logros.map(l => ({ id: l.id_logro, n: l.nombre, d: l.descripcion, i: l.icono }));
  plantillas(plants, incl);
  catalogoListo = true;
}
function plantillas(plants, incl) {
  const by = {}; incl.forEach(i => (by[i.id_plantilla] ||= []).push(i));
  const mk = p => ({ id: p.id_plantilla, n: p.nombre, u: p.id_usuario, t: Date.parse(p.fecha_creacion), e: (by[p.id_plantilla] || []).filter(i => EXID[i.id_ejercicio]).map(i => ({ n: EXID[i.id_ejercicio].n, s: i.series_objetivo || 3, r: i.repeticiones_objetivo || 10, d: i.descanso_seg ?? 90 })) });
  const ps = plants.map(mk);
  VYNT_PL = ps.filter(p => p.u !== YO && p.e.length);
  MINE = ps.filter(p => p.u === YO).sort((a, b) => b.t - a.t);
}
async function recargarPlantillas() {
  const [plants, incl] = await Promise.all([
    all(() => sb.from('plantilla').select('id_plantilla,nombre,id_usuario,fecha_creacion').order('id_plantilla')),
    all(() => sb.from('incluye').select('*').order('id_plantilla').order('orden'))]);
  plantillas(plants, incl);
}

async function cargarUsuario() {
  let me = ok(await sb.from('usuario').select('*').eq('id_usuario', YO).maybeSingle());
  if (!me) { // por si la cuenta se creó antes del disparador
    me = ok(await sb.from('usuario').insert({ id_usuario: YO, nombre: 'Atleta' }).select().single());
  }
  ME = me;
  AM = ok(await sb.from('es_amigo_de').select('*'));
  const relIds = [...new Set(AM.flatMap(a => [a.id_usuario, a.id_amigo]))].filter(id => id !== YO);
  const users = relIds.length ? ok(await sb.from('usuario').select('id_usuario,nombre,genero,mapa_muscular').in('id_usuario', relIds)) : [];
  const amigos = new Set(AM.filter(a => a.estado === 'aceptada').map(a => a.id_usuario === YO ? a.id_amigo : a.id_usuario));
  const nombres = {}; users.forEach(u => nombres[u.id_usuario] = u);
  U = [{ id: YO, n: ME.nombre, g: ME.genero, mapa: ME.mapa_muscular, c: '#3DBB2E' }];
  [...amigos].filter(id => nombres[id]).sort((a, b) => nombres[a].nombre.localeCompare(nombres[b].nombre)).forEach((id, i) => U.push({ id, n: nombres[id].nombre, g: nombres[id].genero, mapa: nombres[id].mapa_muscular, c: COLORES[i % COLORES.length] }));
  UID = {}; U.forEach(u => UID[u.id] = u);
  st.nombres = nombres;
  // sesiones: todas las mías y las de los amigos de las últimas 6 semanas
  const desde = ymd(new Date(Date.now() - 42 * DAY));
  const amIds = U.slice(1).map(u => u.id);
  const [mias, suyas] = await Promise.all([
    all(() => sb.from('sesion').select('*').eq('id_usuario', YO).order('id_sesion')),
    amIds.length ? all(() => sb.from('sesion').select('*').in('id_usuario', amIds).gte('fecha', desde).order('id_sesion')) : []]);
  const ses = [...mias, ...suyas];
  const ids = ses.map(s => s.id_sesion);
  const series = [], likes = [];
  await Promise.all(chunk(ids, 150).map(async c => {
    const [a, b] = await Promise.all([
      all(() => sb.from('serie').select('id_sesion,numero_serie,peso_kg,repeticiones,id_ejercicio,tipo,rpe,id_serie').in('id_sesion', c).order('id_serie')),
      all(() => sb.from('le_gusta').select('id_usuario,id_sesion').in('id_sesion', c))]);
    series.push(...a); likes.push(...b);
  }));
  const bySes = {}; series.sort((a, b) => a.id_serie - b.id_serie).forEach(x => (bySes[x.id_sesion] ||= []).push(x));
  const lk = {}; likes.forEach(l => (lk[l.id_sesion] ||= new Set()).add(l.id_usuario));
  S = ses.map(s => ({
    id: s.id_sesion, u: s.id_usuario, n: s.nombre, pl: s.id_plantilla,
    t: new Date(`${s.fecha}T${s.hora_inicio || '12:00:00'}`).getTime(), dur: s.duracion_min || 0,
    series: (bySes[s.id_sesion] || []).filter(x => EXID[x.id_ejercicio]).map(x => ({ ex: EXID[x.id_ejercicio].n, w: +x.peso_kg, r: x.repeticiones, tipo: x.tipo === 'Calentamiento' ? 'C' : 'E', rpe: x.rpe })),
    likes: lk[s.id_sesion] || new Set()
  })).sort((a, b) => a.t - b.t);
  // marcas de los amigos (LOGRA) y mis logros (OBTIENE)
  LOGRA = {};
  if (amIds.length) ok(await sb.from('logra').select('*').in('id_usuario', amIds)).forEach(l => {
    const x = EXID[l.id_ejercicio]; if (!x) return; (LOGRA[l.id_usuario] ||= {})[x.n] = { v: +l.mejor_peso_kg, t: Date.parse(l.fecha_marca) };
  });
  const obt = ok(await sb.from('obtiene').select('id_logro').eq('id_usuario', YO));
  OBT = new Set(obt.map(o => (LOGROS.find(l => l.id === o.id_logro) || {}).n).filter(Boolean));
  const { count } = await sb.from('le_gusta').select('id_sesion', { count: 'exact', head: true }).eq('id_usuario', YO);
  LIKES_DADOS = count || 0;
}

/* rangos */
function umbrales(ex, g) { return g === 'Mujer' ? ex.um : ex.uh; }
function rankOf(ex, g, v) { const u = umbrales(ex, g); let o = 0; u.forEach((t, i) => { if (v >= t) o = i; }); return o; }
const vol = s => s.series.filter(x => x.tipo === 'E').reduce((a, x) => a + x.w * x.r, 0);
function marks(uid, before) {
  if (uid !== YO) return LOGRA[uid] || {};
  const m = {};
  S.filter(s => s.u === uid && (!before || s.t < before)).forEach(s => s.series.forEach(x => {
    if (x.tipo !== 'E') return; const v = e1(x.w, x.r); if (!m[x.ex] || v > m[x.ex].v) m[x.ex] = { v, t: s.t };
  }));
  return m;
}
function ranks(uid) {
  const u = UID[uid], mk = marks(uid); const ex = {}, mus = {}, grp = {};
  Object.entries(mk).forEach(([n, o]) => { const e = EX[n]; if (!e) return; const ord = rankOf(e, u.g, o.v); const t = umbrales(e, u.g); ex[n] = { v: o.v, o: ord, next: ord < R.length - 1 ? t[ord + 1] - o.v : 0 }; });
  MUS.forEach(m => mus[m] = 0);
  Object.entries(ex).forEach(([n, o]) => { const p = EX[n].p; mus[p] = Math.max(mus[p], o.o); });
  Object.entries(GR).forEach(([g, ms]) => { grp[g] = Math.floor(ms.reduce((a, m) => a + mus[m], 0) / ms.length); });
  const gv = Object.values(grp);
  const glob = Math.floor(gv.reduce((a, b) => a + b, 0) / (gv.length || 1));
  return { ex, mus, grp, glob };
}
function weekVol(uid) {
  const v = {}; MUS.forEach(m => v[m] = 0);
  S.filter(s => s.u === uid && s.t > Date.now() - 7 * DAY).forEach(s => s.series.forEach(x => {
    if (x.tipo !== 'E') return; const e = EX[x.ex]; v[e.p] += x.w * x.r; e.s.forEach(m => v[m] += x.w * x.r * .5);
  }));
  return v;
}
function logrosDe(uid) {
  const ss = S.filter(s => s.u === uid), r = ranks(uid), tot = ss.reduce((a, s) => a + vol(s), 0), got = new Set();
  if (ss.length >= 1) got.add('Primer paso'); if (ss.length >= 10) got.add('Constancia'); if (ss.length >= 50) got.add('Disciplina'); if (ss.length >= 100) got.add('Centenario');
  if (ss.some(s => vol(s) >= 1000)) got.add('Primera tonelada'); if (tot >= 1e4) got.add('Diez toneladas'); if (tot >= 1e5) got.add('Cien toneladas');
  if (Object.keys(r.ex).length) got.add('Nuevo récord'); if (Object.values(r.mus).some(o => o >= 2)) got.add('Sube de rango');
  if (Object.values(r.grp).every(o => o >= 2)) got.add('Atleta completo'); if (Object.values(r.mus).some(o => o >= 5)) got.add('Nivel Pro'); if (Object.values(r.mus).some(o => o >= 6)) got.add('VYNT');
  if (U.length > 1) got.add('Equipo'); if (LIKES_DADOS >= 50) got.add('Animador');
  return got;
}
async function guardarLogros() { // guarda en OBTIENE los logros nuevos
  const nuevos = [...logrosDe(YO)].filter(n => !OBT.has(n));
  if (!nuevos.length) return [];
  const rows = nuevos.map(n => LOGROS.find(l => l.n === n)).filter(Boolean).map(l => ({ id_usuario: YO, id_logro: l.id }));
  const { error } = await sb.from('obtiene').upsert(rows, { onConflict: 'id_usuario,id_logro', ignoreDuplicates: true });
  if (!error) nuevos.forEach(n => OBT.add(n));
  return nuevos;
}

/* cuerpo */
function body(fill, o = {}) {
  const F = FORMAS[(o.mapa || (ME && ME.mapa_muscular)) === 'Mujer' ? 'mujer' : 'hombre'];
  const pts = L => L.map(p => p.join(',')).join(' ');
  const espejo = ['', 'transform="translate(200,0) scale(-1,1)"'];
  const pelo = L => L ? espejo.map(t => `<g ${t}><polygon class="pelo" points="${pts(L)}"/></g>`).join('') : '';
  const view = (parts, label, ox, back) => {
    let g = `<g transform="translate(${ox},0)">${back ? '' : pelo(F.pelo_frente)}<polygon class="sil" points="${pts(F.sil)}"/>`;
    espejo.forEach(t => {
      g += `<g ${t}>`;
      parts.forEach(([m, polys]) => polys.forEach(pl => { g += `<polygon class="m${o.sel === m ? ' on' : ''}" data-m="${esc(m)}" points="${pts(pl)}" fill="${fill(m)}"><title>${esc(m)}</title></polygon>`; }));
      g += '</g>';
    });
    if (back) g += pelo(F.pelo_espalda) + (F.coleta ? `<polygon class="pelo" points="${pts(F.coleta)}"/>` : ''); else g += pelo(F.flequillo);
    return g + `<text class="lbl" x="100" y="364">${label}</text></g>`;
  };
  return `<svg class="body-map${o.tap ? ' tap' : ''}" viewBox="34 0 262 372" role="img" aria-label="${esc(o.label || 'Mapa muscular')}">${view(F.front, 'FRENTE', 0, false)}${view(F.back, 'ESPALDA', 130, true)}</svg>`;
}
const rk = (o, txt) => `<span class="rank" style="background:${R[o].c}">${R[o].i} ${esc(txt || R[o].n)}</span>`;
const fotoSrc = (f, k) => `${f}/${k}.jpg`;

/* estado y navegación */
const st = { tab: 'inicio', who: null, mus: null, seg: 'vynt', feed: 'act', rankBy: 'vol', prog: null, sheet: null, live: null, rest: null, celeb: null, busy: false, auth: 'in', nombres: {} };
const ICON = {
  inicio: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v10h-6v-6H9v6H3z"/></svg>',
  entrenar: '<svg viewBox="0 0 24 24"><path d="M2 9v6M5 6v12M19 6v12M22 9v6M5 12h14"/></svg>',
  rangos: '<svg viewBox="0 0 24 24"><path d="M4 20 12 4l8 16-8-5z"/></svg>',
  registro: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  amigos: '<svg viewBox="0 0 24 24"><path d="M3 20l2-6h6l2 6M8 11 5 8l3-5 3 5zM13 20l2-6h6l2 6M18 11l-3-3 3-5 3 5z"/></svg>'
};
const TABS = [['inicio', 'Inicio'], ['entrenar', 'Entrenar'], ['rangos', 'Rangos'], ['registro', 'Registro'], ['amigos', 'Amigos']];
const entrantes = () => AM.filter(a => a.estado === 'pendiente' && a.id_amigo === YO);
function nav() {
  const n = entrantes().length;
  $('tabs').innerHTML = TABS.map(([k, l]) => `<button type="button" data-tab="${k}" ${st.tab === k && !st.sheet && !st.live ? 'aria-current="page"' : ''}>${ICON[k]}<span>${l}${k === 'amigos' && n ? `<span class="badge">${n}</span>` : ''}</span></button>`).join('');
}
function go(t) { st.tab = t; st.sheet = null; render(); $('scr').scrollTop = 0; }

/* INICIO */
function vInicio() {
  const r = ranks(YO), wv = weekVol(YO); const max = Math.max(...Object.values(wv), 1);
  const shades = ['#1E2622', '#18501A', '#2F9E28', '#7CEB5C'];
  const lvl = v => v <= 0 ? 0 : v < max * .33 ? 1 : v < max * .66 ? 2 : 3;
  const ss = S.filter(s => s.u === YO && s.t > Date.now() - 7 * DAY);
  const olv = ss.length ? MUS.filter(m => wv[m] === 0) : [];
  const mk = marks(YO), prevMk = marks(YO, Date.now() - 14 * DAY);
  const recs = Object.entries(mk).filter(([n, o]) => o.t > Date.now() - 14 * DAY && (!prevMk[n] || o.v > prevMk[n].v)).sort((a, b) => b[1].t - a[1].t).slice(0, 3);
  const total = S.filter(s => s.u === YO).length;
  return `<div class="top"><div><div class="eyebrow">${esc(fdate(Date.now()))}</div><h1>Hola, ${esc(ME.nombre.split(' ')[0])}</h1></div>
   <div class="row">${rk(r.glob, 'Nivel ' + R[r.glob].n)}<button class="av" type="button" data-open="perfil" style="background:var(--lima);border:0" aria-label="Tu perfil">${esc(ME.nombre[0] || 'V')}</button></div></div>
  ${!total ? `<section class="card cut" style="border-color:var(--verde)"><h2>Bienvenido a VYNT</h2><p class="small mut" style="margin:0 0 10px">Elige una rutina en Entrenar, marca tus series y al terminar verás tu cuerpo pintado y tus primeros rangos.</p>${ME.genero ? '' : '<p class="small" style="margin:0 0 10px;color:var(--oro)">Completa tu perfil con tu género y tu peso: los pesos de cada rango dependen de ello.</p>'}</section>` : ''}
  <div class="grid3" style="margin-bottom:12px"><div class="stat"><b>${ss.length}</b><span>sesiones · 7 días</span></div><div class="stat"><b>${(ss.reduce((a, s) => a + vol(s), 0) / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}<small style="font-size:15px"> t</small></b><span>movidas · 7 días</span></div><div class="stat"><b>${recs.length}</b><span>récords · 14 días</span></div></div>
  <section class="card cut"><div class="row between"><h2>Tu semana</h2><span class="eyebrow">Volumen 7 días</span></div>
  ${body(m => shades[lvl(wv[m])], { label: 'Músculos entrenados esta semana' })}
  <div class="legend" style="margin-top:6px"><span><i class="sq" style="background:${shades[0]}"></i>Sin entrenar</span><span><i class="sq" style="background:${shades[1]}"></i>Poco</span><span><i class="sq" style="background:${shades[2]}"></i>Medio</span><span><i class="sq" style="background:${shades[3]}"></i>Mucho</span></div>
  ${olv.length ? `<p class="small" style="margin:10px 0 0"><b style="color:var(--oro)">Olvidados:</b> <span class="mut">${olv.map(esc).join(', ')}</span></p>` : ''}</section>
  <button class="btn pri full" type="button" data-go="entrenar" style="margin-bottom:12px">${st.live ? 'Volver a la sesión' : 'Empezar entrenamiento'}</button>
  <section class="card"><h2>Últimos récords</h2>${recs.length ? `<div class="list">${recs.map(([n, o]) => { const x = r.ex[n]; return `<button class="item" type="button" data-ex="${esc(n)}"><span class="grow"><h3>${esc(n)}</h3><span class="small mut">${esc(fdate(o.t))} · 1RM estimado ${kg(o.v)}</span></span>${rk(x.o)}</button>`; }).join('')}</div>` : '<div class="empty">Aún no hay récords recientes.</div>'}</section>
  <section class="card"><div class="row between"><h2>Logros</h2><span class="eyebrow">${OBT.size}/${LOGROS.length}</span></div><div class="grid3">${LOGROS.map(l => `<div class="logro${OBT.has(l.n) ? '' : ' off'}" title="${esc(l.d)}"><span class="ic" aria-hidden="true">${l.i}</span><b>${esc(l.n)}</b></div>`).join('')}</div></section>`;
}

/* RANGOS */
function vRangos() {
  if (!UID[st.who]) st.who = YO;
  const u = UID[st.who], r = ranks(u.id);
  const sel = st.mus;
  const list = Object.entries(r.ex).filter(([n]) => !sel || EX[n].p === sel).sort((a, b) => b[1].o - a[1].o || b[1].v - a[1].v);
  const top = R.length - 1;
  return `<div class="top"><div><div class="eyebrow">Mapa de rangos</div><h1>${u.id === YO ? 'Tus rangos' : esc(u.n)}</h1></div>${rk(r.glob, 'Nivel ' + R[r.glob].n)}</div>
  ${U.length > 1 ? `<div class="chips" role="group" aria-label="Ver los rangos de">${U.map(x => `<button class="chip" type="button" data-who="${x.id}" aria-pressed="${st.who === x.id}">${x.id === YO ? 'Tú' : esc(x.n)}</button>`).join('')}</div>` : ''}
  <section class="card cut">${body(m => R[r.mus[m]].c, { tap: true, sel, mapa: u.mapa, label: 'Rangos por músculo' })}
  <div class="legend" style="margin-top:6px">${R.map(x => `<span><i class="sq" style="background:${x.c}"></i>${esc(x.n)}</span>`).join('')}</div></section>
  <div class="grid2" style="margin-bottom:12px">${Object.keys(GR).map(g => `<div class="stat" style="border-left-color:${R[r.grp[g]].c}"><span>${esc(g)}</span><b style="font-size:19px">${R[r.grp[g]].i} ${esc(R[r.grp[g]].n)}</b></div>`).join('')}</div>
  <section class="card">${sel ? `<div class="row between" style="margin-bottom:6px"><div><div class="eyebrow">${esc(M2G[sel])}</div><h2 style="margin:0">${esc(sel)}</h2></div>${rk(r.mus[sel])}</div><button class="btn sm ghost" type="button" data-mus="" style="margin-bottom:8px">Ver todos los ejercicios</button>` : `<h2>${u.id === YO ? 'Tus ejercicios' : 'Sus ejercicios'}</h2><p class="small mut" style="margin:-4px 0 8px">Toca un músculo del mapa para filtrar.</p>`}
  ${list.length ? `<div class="list">${list.map(([n, o]) => {
    const t = umbrales(EX[n], u.g); const pct = o.o >= top ? 100 : Math.round((o.v - t[o.o]) / ((t[o.o + 1] - t[o.o]) || 1) * 100);
    return `<button class="item" type="button" data-ex="${esc(n)}" style="flex-wrap:wrap"><span class="grow"><h3>${esc(n)}</h3><span class="small mut">1RM estimado ${kg(o.v)}</span></span>${rk(o.o)}
   <span style="flex-basis:100%"><span class="bar"><i style="width:${Math.max(4, pct)}%;background:${R[Math.min(top, o.o + 1)].c}"></i></span><span class="small mut">${o.o >= top ? 'Rango máximo alcanzado' : `${u.id === YO ? 'Te faltan' : 'Le faltan'} <b style="color:var(--ink)">${kg(o.next)}</b> para ${esc(R[o.o + 1].n)}`}</span></span></button>`;
  }).join('')}</div>` : `<div class="empty">${sel ? 'Sin marcas en este músculo todavía.' : 'Todavía no hay marcas. Termina una sesión para empezar a subir de rango.'}</div>`}</section>`;
}

/* ENTRENAR */
function vEntrenar() {
  const ps = st.seg === 'vynt' ? VYNT_PL : MINE;
  return `<div class="top"><div><div class="eyebrow">Entrenar</div><h1>Elige rutina</h1></div><button class="btn sm" type="button" data-open="buscar">Ejercicios</button></div>
  <div class="seg" role="group" aria-label="Rutinas"><button type="button" data-seg="vynt" aria-pressed="${st.seg === 'vynt'}">Rutinas VYNT</button><button type="button" data-seg="mias" aria-pressed="${st.seg === 'mias'}">Mis plantillas</button></div>
  ${st.seg === 'mias' ? `<div class="grid2" style="margin-bottom:12px"><button class="btn" type="button" data-open="crear">+ Crear plantilla</button><button class="btn" type="button" data-libre>Sesión libre</button></div>${ps.length ? '' : '<div class="empty" style="margin-bottom:12px">Aún no tienes plantillas. Crea una o haz una sesión libre: se guardará como plantilla al terminarla.</div>'}` : ''}
  ${ps.map((p, i) => {
    const ms = [...new Set(p.e.map(x => EX[x.n].p))].slice(0, 4); return `<section class="card cut"><div class="row between"><h2 style="margin:0">${esc(p.n)}</h2><span class="eyebrow">${p.e.length} ejercicios</span></div>
   <div style="margin:8px 0 10px">${ms.map(m => `<span class="tag">${esc(m)}</span>`).join('')}</div>
   <p class="small mut" style="margin:0 0 10px">${p.e.map(x => esc(x.n)).join(' · ')}</p>
   <div class="row"><button class="btn pri sm" type="button" data-start="${st.seg}:${i}">Empezar</button>${st.seg === 'mias' ? `<button class="btn sm" type="button" data-edit="${i}">Editar</button>` : ''}</div></section>`;
  }).join('')}`;
}

/* FICHA DE EJERCICIO */
function vFicha(n) {
  const e = EX[n], r = ranks(YO).ex[n];
  const hist = []; S.filter(s => s.u === YO).forEach(s => { let b = 0; s.series.forEach(x => { if (x.ex === n && x.tipo === 'E') b = Math.max(b, e1(x.w, x.r)); }); if (b) hist.push([s.t, b]); });
  const txt = e.d, ix = txt.indexOf('Error típico:'); const pasos = (ix > 0 ? txt.slice(0, ix) : txt).split(/\s?\d\.\s/).filter(x => x.trim());
  const t = umbrales(e, ME.genero); const top = R.length - 1;
  return `<button class="back" type="button" data-close>← Volver</button>
  <h1 style="margin:6px 0 8px">${esc(n)}</h1><div style="margin-bottom:10px"><span class="tag">${esc(e.eq)}</span><span class="tag">${esc(e.t)}</span><span class="tag">${esc(M2G[e.p])}</span></div>
  ${e.f ? `<div class="foto"><img src="${esc(fotoSrc(e.f, 0))}" alt="${esc(n)}, posición inicial"><img src="${esc(fotoSrc(e.f, 1))}" alt="${esc(n)}, posición final" style="opacity:0"><span class="paso">Inicio</span></div>` : `<div class="nofoto">Sin foto para este ejercicio</div>`}
  <section class="card">${body(m => m === e.p ? 'var(--rojo)' : e.s.includes(m) ? 'var(--rojo2)' : '#26302B', { label: 'Músculos que trabaja' })}
  <div class="legend" style="margin-top:6px"><span><i class="sq" style="background:var(--rojo)"></i>${esc(e.p)}</span>${e.s.map(m => `<span><i class="sq" style="background:var(--rojo2)"></i>${esc(m)}</span>`).join('')}</div></section>
  <section class="card"><div class="row between"><h2 style="margin:0">Tu marca</h2>${r ? rk(r.o) : ''}</div>
  ${r ? `<p style="margin:6px 0"><b style="font:700 28px 'Barlow Condensed',sans-serif">${kg(r.v)}</b> <span class="mut small">1RM estimado</span></p><p class="small mut" style="margin:0 0 10px">${r.o >= top ? 'Rango máximo' : `Te faltan <b style="color:var(--ink)">${kg(r.next)}</b> para ${esc(R[r.o + 1].n)}`}</p>${chart(hist)}` : '<p class="small mut">Aún no has hecho este ejercicio.</p>'}
  <div class="row" style="flex-wrap:wrap;gap:4px;margin-top:8px">${t.slice(1).map((v, i) => `<span class="tag" style="border-left:3px solid ${R[i + 1].c}">${esc(R[i + 1].n)} ${kg(v)}</span>`).join('')}</div></section>
  <section class="card"><h2>Cómo se hace</h2><ol class="pasos">${pasos.map(p => `<li>${esc(p.trim())}</li>`).join('')}</ol>${ix > 0 ? `<p class="err">${esc(txt.slice(ix))}</p>` : ''}</section>`;
}
function chart(h) {
  if (h.length < 2) return '<div class="empty small">Haz más sesiones para ver tu progreso.</div>';
  const W = 340, H = 150, P = 28; const xs = h.map(p => p[0]), ys = h.map(p => p[1]); const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys) * .95, y1 = Math.max(...ys) * 1.03;
  const X = v => P + (v - x0) / (x1 - x0 || 1) * (W - P - 8), Y = v => H - 20 - (v - y0) / (y1 - y0 || 1) * (H - 34);
  const pts = h.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Progreso del 1RM estimado"><line x1="${P}" x2="${W - 8}" y1="${H - 20}" y2="${H - 20}" stroke="#25302A"/>
  <text x="0" y="${Y(y1) + 10}" fill="#5E6B63" font-size="10">${Math.round(y1)}</text><text x="0" y="${H - 22}" fill="#5E6B63" font-size="10">${Math.round(y0)}</text>
  <polyline points="${P},${H - 20} ${pts} ${X(x1)},${H - 20}" fill="rgba(61,187,46,.15)" stroke="none"/><polyline points="${pts}" fill="none" stroke="#3DBB2E" stroke-width="2.5" stroke-linejoin="miter"/>
  ${h.map(p => `<rect x="${X(p[0]) - 3}" y="${Y(p[1]) - 3}" width="6" height="6" fill="#3DBB2E"/>`).join('')}
  <text x="${P}" y="${H - 4}" fill="#5E6B63" font-size="10">${esc(fdate(x0))}</text><text x="${W - 8}" y="${H - 4}" fill="#5E6B63" font-size="10" text-anchor="end">${esc(fdate(x1))}</text></svg>`;
}

/* BUSCADOR DE EJERCICIOS */
const bq = { q: '', g: '', eq: '', t: '', pick: null };
function vBuscar() {
  const lista = Object.values(EX);
  const eqs = [...new Set(lista.map(e => e.eq))].sort();
  const q = bq.q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const res = lista.filter(e => (!q || e.n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q)) && (!bq.g || M2G[e.p] === bq.g) && (!bq.eq || e.eq === bq.eq) && (!bq.t || e.t === bq.t));
  return `<button class="back" type="button" data-close>← Volver</button><h1 style="margin:6px 0 12px">${bq.pick ? 'Añadir ejercicio' : 'Ejercicios'}</h1>
  <input class="txt" id="q" type="search" placeholder="Busca: press, remo, curl…" value="${esc(bq.q)}" aria-label="Buscar ejercicio" style="margin-bottom:10px">
  <div class="chips" role="group" aria-label="Grupo">${['', ...Object.keys(GR)].map(g => `<button class="chip" type="button" data-bg="${esc(g)}" aria-pressed="${bq.g === g}">${g ? esc(g) : 'Todos'}</button>`).join('')}</div>
  <div class="row" style="margin-bottom:12px"><select class="sel" id="feq" aria-label="Equipamiento" style="flex:1"><option value="">Todo el equipamiento</option>${eqs.map(x => `<option ${bq.eq === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
  <select class="sel" id="ft" aria-label="Tipo"><option value="">Cualquier tipo</option><option ${bq.t === 'Compuesto' ? 'selected' : ''}>Compuesto</option><option ${bq.t === 'Aislamiento' ? 'selected' : ''}>Aislamiento</option></select></div>
  <p class="eyebrow">${res.length} ejercicios</p><div class="list">${res.map(e => `<button class="item" type="button" data-${bq.pick ? 'add' : 'ex'}="${esc(e.n)}"><span class="grow"><h3>${esc(e.n)}</h3><span class="small mut">${esc(e.p)} · ${esc(e.eq)}</span></span><span class="mut" aria-hidden="true">${bq.pick ? '+' : '›'}</span></button>`).join('')}</div>`;
}

/* CREAR / EDITAR PLANTILLA */
let draft = null;
function vCrear() {
  return `<button class="back" type="button" data-close>← Cancelar</button><h1 style="margin:6px 0 12px">${draft.id == null ? 'Nueva plantilla' : 'Editar plantilla'}</h1>
  <label class="eyebrow" for="pn">Nombre</label><input class="txt" id="pn" value="${esc(draft.n)}" placeholder="Pecho y tríceps" maxlength="60" style="margin:4px 0 14px">
  ${draft.e.length ? draft.e.map((x, i) => `<section class="card"><div class="row between"><h3>${esc(x.n)}</h3><button class="btn sm ghost" type="button" data-rm="${i}" aria-label="Quitar ${esc(x.n)}">✕</button></div>
   <div class="grid3" style="margin-top:8px"><label class="small mut">Series<input class="num" type="number" min="1" max="10" data-f="s" data-i="${i}" value="${x.s}"></label><label class="small mut">Reps<input class="num" type="number" min="1" max="50" data-f="r" data-i="${i}" value="${x.r}"></label><label class="small mut">Descanso (s)<input class="num" type="number" min="0" max="600" step="15" data-f="d" data-i="${i}" value="${x.d}"></label></div></section>`).join('') : '<div class="empty" style="margin-bottom:12px">Añade al menos un ejercicio.</div>'}
  <button class="btn full" type="button" data-open="pick" style="margin-bottom:10px">+ Añadir ejercicio</button>
  <p class="small" id="perr" style="color:var(--rojo);min-height:1.2em;margin:0 0 6px"></p>
  <button class="btn pri full" type="button" data-save ${st.busy ? 'disabled' : ''}>${st.busy ? 'Guardando…' : 'Guardar plantilla'}</button>
  ${draft.id != null ? `<button class="btn ghost full" type="button" data-delpl style="margin-top:10px;color:var(--rojo)">Borrar plantilla</button>` : ''}`;
}
async function guardarPlantilla() {
  const n = draft.n, rows = id => draft.e.map((x, i) => ({ id_plantilla: id, id_ejercicio: EX[x.n].id, orden: i + 1, series_objetivo: Math.min(10, Math.max(1, x.s | 0)), repeticiones_objetivo: Math.min(50, Math.max(1, x.r | 0)), descanso_seg: Math.min(600, Math.max(0, x.d | 0)) }));
  let id = draft.id;
  if (id == null) {
    id = ok(await sb.from('plantilla').insert({ nombre: n, id_usuario: YO }).select('id_plantilla').single()).id_plantilla;
  } else {
    ok(await sb.from('plantilla').update({ nombre: n }).eq('id_plantilla', id));
    ok(await sb.from('incluye').delete().eq('id_plantilla', id));
  }
  ok(await sb.from('incluye').insert(rows(id)));
  await recargarPlantillas();
  return id;
}

/* SESIÓN EN DIRECTO */
const LIVE_KEY = () => 'vynt-sesion-' + YO;
function guardarLive() { lsSet(LIVE_KEY(), st.live); }
function itemDe(n, s, r, d) {
  const mk = marks(YO);
  const prev = [...S].reverse().find(x => x.u === YO && x.series.some(y => y.ex === n && y.tipo === 'E'));
  const ps = prev ? prev.series.filter(x => x.ex === n && x.tipo === 'E') : []; const last = ps[ps.length - 1];
  return { n, d, sets: Array.from({ length: s }, () => ({ w: last ? last.w : 0, r: last ? last.r : r, tipo: 'E', rpe: '', done: false })), prev: last ? `${kg(last.w)} × ${last.r}` : '—', best: mk[n] ? mk[n].v : 0 };
}
function startLive(p) {
  if (st.live) { st.pendingStart = p; if (!confirmarDescartar()) return; st.pendingStart = undefined; }
  st.live = { n: p ? p.n : 'Sesión libre', pl: p ? p.id : null, t0: Date.now(), items: p ? p.e.map(it => itemDe(it.n, it.s, it.r, it.d)) : [] };
  st.sheet = null; guardarLive(); render(); $('scr').scrollTop = 0;
}
function confirmarDescartar() {
  const algo = st.live.items.some(it => it.sets.some(s => s.done));
  if (!algo) return true;
  st.confirm = true; render(); return false;
}
function vLive() {
  const L = st.live; const el = Math.floor((Date.now() - L.t0) / 60000);
  return `<div class="top"><div><div class="eyebrow">En curso · ${el} min</div><h1>${esc(L.n)}</h1></div><button class="btn pri sm" type="button" data-finish ${st.busy ? 'disabled' : ''}>${st.busy ? 'Guardando…' : 'Terminar'}</button></div>
  ${L.items.length ? '' : '<div class="empty" style="margin-bottom:12px">Añade el primer ejercicio para empezar.</div>'}
  ${L.items.map((it, i) => `<section class="card cut"><div class="row between"><button class="back" type="button" data-ex="${esc(it.n)}" style="color:var(--ink);font-size:17px">${esc(it.n)} ›</button><button class="btn sm ghost" type="button" data-rmit="${i}" aria-label="Quitar ${esc(it.n)}">✕</button></div>
   <p class="small mut" style="margin:0 0 8px">Anterior: ${esc(it.prev)}${it.best ? ` · Récord ${kg(it.best)}` : ''} · Descanso ${it.d}s</p>
   <div class="setrow sethead"><span>#</span><span>Tipo</span><span>Kg</span><span>Reps</span><span>RPE</span><span></span><span></span></div>
   ${it.sets.map((s, j) => `<div class="setrow${s.done ? ' done' : ''}"><b>${j + 1}</b>
    <button class="tipo${s.tipo === 'C' ? ' c' : ''}" type="button" data-tipo="${i}:${j}" aria-label="Tipo de serie: ${s.tipo === 'C' ? 'calentamiento' : 'efectiva'}">${s.tipo === 'C' ? 'CAL' : 'EFE'}</button>
    <input class="num" type="number" inputmode="decimal" step="2.5" min="0" data-w="${i}:${j}" value="${s.w}" aria-label="Kilos serie ${j + 1}">
    <input class="num" type="number" inputmode="numeric" min="1" data-r="${i}:${j}" value="${s.r}" aria-label="Repeticiones serie ${j + 1}">
    <select class="sel" data-rpe="${i}:${j}" aria-label="RPE serie ${j + 1}"><option value="">–</option>${[6, 7, 8, 9, 10].map(v => `<option ${String(s.rpe) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <button class="chk" type="button" data-done="${i}:${j}" aria-pressed="${s.done}" aria-label="Serie ${j + 1} hecha">✓</button>
    <button class="delset" type="button" data-delset="${i}:${j}" aria-label="Quitar serie ${j + 1}">✕</button></div>`).join('')}
   <button class="btn sm ghost" type="button" data-addset="${i}">+ Serie</button></section>`).join('')}
  <button class="btn full" type="button" data-open="pickLive" style="margin-bottom:10px">+ Añadir ejercicio</button>
  <p class="small mut">CAL = calentamiento: no cuenta para récords ni rangos. Las series sin marcar con ✓ no se guardan.</p>
  <button class="btn ghost full" type="button" data-discard style="margin-top:6px;color:var(--rojo)">Descartar sesión</button>`;
}
async function finishLive() {
  const L = st.live;
  const hechas = L.items.map(it => ({ it, sets: it.sets.filter(s => s.done && s.w >= 0 && s.r > 0) })).filter(x => x.sets.length);
  if (!hechas.length) { toast('Marca al menos una serie como hecha.'); return; }
  st.busy = true; render();
  try {
    const before = ranks(YO), mkB = marks(YO);
    const t0 = new Date(L.t0), dur = Math.max(1, Math.round((Date.now() - L.t0) / 60000));
    const series = []; hechas.forEach(({ it, sets }) => sets.forEach(s => series.push({ ex: it.n, w: +s.w, r: +s.r, tipo: s.tipo, rpe: s.rpe ? +s.rpe : null })));
    const ses = { n: L.n, t: L.t0, dur, series, likes: new Set(), u: YO };
    let pl = L.pl;
    if (pl == null) { // sesión libre: al registrarla se registra también su plantilla
      const nombre = `${L.n} ${t0.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
      pl = ok(await sb.from('plantilla').insert({ nombre, id_usuario: YO }).select('id_plantilla').single()).id_plantilla;
      ok(await sb.from('incluye').insert(hechas.map(({ it, sets }, i) => ({ id_plantilla: pl, id_ejercicio: EX[it.n].id, orden: i + 1, series_objetivo: Math.min(10, sets.length), repeticiones_objetivo: Math.max(1, Math.min(50, sets[0].r | 0)), descanso_seg: it.d }))));
    }
    const row = ok(await sb.from('sesion').insert({ nombre: L.n, fecha: ymd(t0), hora_inicio: hms(t0), duracion_min: dur, volumen_total_kg: Math.round(vol(ses) * 10) / 10, id_usuario: YO, id_plantilla: pl }).select('id_sesion').single());
    const num = {};
    const rows = series.map(x => ({ id_sesion: row.id_sesion, id_ejercicio: EX[x.ex].id, numero_serie: (num[x.ex] = (num[x.ex] || 0) + 1), peso_kg: x.w, repeticiones: x.r, tipo: x.tipo === 'C' ? 'Calentamiento' : 'Efectiva', rpe: x.rpe }));
    const ins = await sb.from('serie').insert(rows);
    if (ins.error) { await sb.from('sesion').delete().eq('id_sesion', row.id_sesion); throw ins.error; }
    ses.id = row.id_sesion; ses.pl = pl; S.push(ses);
    if (L.pl == null) await recargarPlantillas();
    const after = ranks(YO), mkA = marks(YO);
    const recs = Object.entries(mkA).filter(([n, o]) => o.t === ses.t && (!mkB[n] || o.v > mkB[n].v));
    const ups = MUS.filter(m => after.mus[m] > before.mus[m]).map(m => [m, before.mus[m], after.mus[m]]);
    const nl = await guardarLogros();
    st.live = null; st.rest = null; guardarLive(); st.celeb = { s: ses, recs, ups, nl };
  } catch (e) {
    console.error(e); toast('No se pudo guardar la sesión. Revisa la conexión e inténtalo otra vez.');
  }
  st.busy = false; render();
}
function vCeleb() {
  const c = st.celeb; const top = c.ups.length ? c.ups.reduce((a, b) => b[2] > a[2] ? b : a) : null;
  return `<div class="celeb" role="dialog" aria-modal="true" aria-label="Resumen de la sesión">
  ${top ? `<div class="eyebrow" style="color:${R[top[2]].c}">Subida de rango</div><div class="bigrank" style="color:${R[top[2]].c}">${R[top[2]].i} ${esc(R[top[2]].n)}</div><p style="margin:0">${esc(top[0])}: de ${esc(R[top[1]].n)} a ${esc(R[top[2]].n)}</p>` : `<div class="eyebrow">Sesión guardada</div><div class="bigrank">${esc(c.s.n)}</div>`}
  <div class="grid3"><div class="stat"><b>${c.s.dur}</b><span>minutos</span></div><div class="stat"><b>${fmt(vol(c.s))}</b><span>kg movidos</span></div><div class="stat"><b>${c.recs.length}</b><span>récords</span></div></div>
  ${c.recs.length ? `<section class="card" style="margin:0"><h2>Nuevos récords</h2>${c.recs.map(([n, o]) => `<p style="margin:4px 0">📈 <b>${esc(n)}</b> · ${kg(o.v)}</p>`).join('')}</section>` : ''}
  ${c.ups.length > 1 ? `<section class="card" style="margin:0"><h2>Más subidas</h2>${c.ups.map(([m, a, b]) => `<p style="margin:4px 0">${esc(m)}: ${rk(b)}</p>`).join('')}</section>` : ''}
  ${c.nl.length ? `<section class="card" style="margin:0"><h2>Logros nuevos</h2>${c.nl.map(n => { const l = LOGROS.find(x => x.n === n); return l ? `<p style="margin:4px 0">${l.i} <b>${esc(n)}</b> · <span class="mut">${esc(l.d)}</span></p>` : ''; }).join('')}</section>` : ''}
  <button class="btn pri full" type="button" data-celeb>Continuar</button></div>`;
}
function vConfirm() {
  return `<div class="celeb" role="dialog" aria-modal="true" aria-label="Descartar sesión"><div class="eyebrow" style="color:var(--rojo)">Atención</div><div class="bigrank" style="font-size:40px">¿Descartar la sesión?</div>
  <p class="mut" style="margin:0">Las series que has marcado no se guardarán.</p>
  <button class="btn full" type="button" data-confirm="no">Seguir entrenando</button><button class="btn pri full" type="button" data-confirm="si" style="background:var(--rojo);border-color:var(--rojo)">Descartar</button></div>`;
}

/* REGISTRO */
function vRegistro() {
  const mias = S.filter(s => s.u === YO).sort((a, b) => b.t - a.t);
  if (!mias.length) return `<div class="top"><div><div class="eyebrow">Registro</div><h1>Tu progreso</h1></div></div><div class="empty">Cuando termines tu primera sesión, aquí verás tu volumen semanal, tu progreso y tu historial.</div>`;
  const hoy = now0();
  const wk = []; for (let i = 5; i >= 0; i--) { const a = hoy - (i + 1) * 7 * DAY, b = hoy - i * 7 * DAY; wk.push(mias.filter(s => s.t > a && s.t <= b).reduce((x, s) => x + vol(s), 0)); }
  const mx = Math.max(...wk, 1);
  const done = [...new Set(mias.flatMap(s => s.series.map(x => x.ex)))].sort();
  if (!st.prog || !done.includes(st.prog)) st.prog = done.includes('Press banca') ? 'Press banca' : done[0];
  const hist = []; [...mias].reverse().forEach(s => { let b = 0; s.series.forEach(x => { if (x.ex === st.prog && x.tipo === 'E') b = Math.max(b, e1(x.w, x.r)); }); if (b) hist.push([s.t, b]); });
  return `<div class="top"><div><div class="eyebrow">Registro</div><h1>Tu progreso</h1></div><span class="eyebrow">${mias.length} sesiones</span></div>
  <section class="card cut"><h2>Volumen por semana</h2><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;align-items:end;height:130px">
  ${wk.map((v, i) => `<div style="display:flex;flex-direction:column;justify-content:flex-end;height:100%;gap:4px"><span class="small" style="text-align:center">${(v / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })}t</span><div style="height:${Math.max(3, v / mx * 90)}%;background:${i === 5 ? 'var(--lima)' : 'var(--verde)'};clip-path:polygon(0 8px,100% 0,100% 100%,0 100%)"></div></div>`).join('')}</div>
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-top:4px">${wk.map((_, i) => `<span class="eyebrow" style="text-align:center">${i === 5 ? 'Esta' : '-' + (5 - i)}</span>`).join('')}</div></section>
  <section class="card"><h2>Progreso</h2><select class="sel" id="prog" aria-label="Ejercicio" style="width:100%;margin-bottom:8px">${done.map(n => `<option ${n === st.prog ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>${chart(hist)}<p class="small mut" style="margin:6px 0 0">1RM estimado con la fórmula de Epley.</p></section>
  <section class="card"><h2>Historial</h2><div class="list">${mias.slice(0, 30).map(s => `<div class="item"><span class="grow"><h3>${esc(s.n)}</h3><span class="small mut">${esc(fdate(s.t))} · ${s.dur} min · ${fmt(vol(s))} kg</span></span><span class="small mut">▲ ${s.likes.size}</span></div>`).join('')}</div></section>`;
}

/* AMIGOS */
const fa = { q: '', res: [], buscando: false };
function vAmigos() {
  const fr = U.slice(1);
  const n = entrantes().length;
  const head = `<div class="top"><div><div class="eyebrow">${fr.length} ${fr.length === 1 ? 'amigo' : 'amigos'}</div><h1>Amigos</h1></div></div>
  <div class="seg" role="group" aria-label="Vista"><button type="button" data-feed="act" aria-pressed="${st.feed === 'act'}">Actividad</button><button type="button" data-feed="rank" aria-pressed="${st.feed === 'rank'}">Ranking</button><button type="button" data-feed="gest" aria-pressed="${st.feed === 'gest'}">Gestionar${n ? `<span class="badge">${n}</span>` : ''}</button></div>`;
  if (st.feed === 'gest') return head + vGestion();
  if (st.feed === 'act') {
    const feed = S.filter(s => s.u !== YO && s.t > Date.now() - 14 * DAY).sort((a, b) => b.t - a.t).slice(0, 25);
    if (!feed.length) return head + `<div class="empty">${fr.length ? 'Tus amigos no han entrenado en los últimos 14 días.' : 'Aún no tienes amigos en VYNT.'}<br><button class="btn sm" type="button" data-feed="gest" style="margin-top:10px">Buscar amigos</button></div>`;
    return head + feed.map(s => {
      const u = UID[s.u]; const top = s.series.filter(x => x.tipo === 'E').reduce((a, x) => !a || e1(x.w, x.r) > e1(a.w, a.r) ? x : a, null);
      return `<section class="card cut"><div class="row"><span class="av" style="background:${u.c}">${esc(u.n[0])}</span><span class="grow" style="flex:1"><h3>${esc(u.n)}</h3><span class="small mut">${esc(fdate(s.t))} · ${esc(s.n)}</span></span></div>
     <div class="grid2" style="margin:10px 0"><div class="stat"><b>${fmt(vol(s))}</b><span>kg movidos</span></div><div class="stat"><b>${s.dur}</b><span>minutos</span></div></div>
     ${top ? `<p class="small" style="margin:0 0 10px">Mejor serie: <b>${esc(top.ex)}</b> · ${kg(top.w)} × ${top.r}</p>` : ''}
     <div class="row"><button class="like" type="button" data-like="${s.id}" aria-pressed="${s.likes.has(YO)}" aria-label="Me gusta">▲ ${s.likes.size}</button><button class="btn sm ghost" type="button" data-map="${u.id}">Ver su mapa</button></div></section>`;
    }).join('');
  }
  const allU = U.map(u => ({ u, v: S.filter(s => s.u === u.id && s.t > Date.now() - 7 * DAY).reduce((a, s) => a + vol(s), 0), r: ranks(u.id) }));
  const sorted = allU.sort((a, b) => st.rankBy === 'vol' ? b.v - a.v : (b.r.glob - a.r.glob) || (Object.values(b.r.mus).reduce((x, y) => x + y, 0) - Object.values(a.r.mus).reduce((x, y) => x + y, 0)));
  return head + `<div class="seg" role="group" aria-label="Ordenar ranking"><button type="button" data-rby="vol" aria-pressed="${st.rankBy === 'vol'}">Volumen semana</button><button type="button" data-rby="niv" aria-pressed="${st.rankBy === 'niv'}">Nivel</button></div>
  <section class="card"><div class="list">${sorted.map((x, i) => `<button class="item" type="button" data-map="${x.u.id}"><span class="pos">${i + 1}</span><span class="av" style="background:${x.u.c}">${esc(x.u.n[0])}</span><span class="grow"><h3>${x.u.id === YO ? 'Tú' : esc(x.u.n)}</h3><span class="small mut">${fmt(x.v)} kg esta semana</span></span>${rk(x.r.glob)}</button>`).join('')}</div></section>
  ${fr.length ? '' : '<div class="empty">Añade amigos para competir con ellos.<br><button class="btn sm" type="button" data-feed="gest" style="margin-top:10px">Buscar amigos</button></div>'}`;
}
function relacion(id) { return AM.find(a => (a.id_usuario === YO && a.id_amigo === id) || (a.id_amigo === YO && a.id_usuario === id)); }
function vGestion() {
  const inc = entrantes(), sal = AM.filter(a => a.estado === 'pendiente' && a.id_usuario === YO);
  const nom = id => esc((st.nombres[id] || {}).nombre || 'Usuario');
  return `<section class="card cut"><h2>Buscar personas</h2>
  <input class="txt" id="qa" type="search" placeholder="Escribe un nombre" value="${esc(fa.q)}" aria-label="Buscar personas por nombre" autocomplete="off">
  <div class="list" style="margin-top:6px">${fa.q.trim().length < 2 ? '<p class="small mut" style="margin:8px 0 0">Escribe al menos 2 letras.</p>' : fa.buscando ? '<p class="small mut" style="margin:8px 0 0">Buscando…</p>' : fa.res.length ? fa.res.map(u => {
    const rel = relacion(u.id_usuario);
    const acc = !rel ? `<button class="btn sm pri" type="button" data-pedir="${u.id_usuario}">Añadir</button>` : rel.estado === 'aceptada' ? '<span class="small mut">Amigos</span>' : rel.id_usuario === YO ? '<span class="small mut">Enviada</span>' : `<button class="btn sm pri" type="button" data-aceptar="${u.id_usuario}">Aceptar</button>`;
    return `<div class="item"><span class="av" style="background:var(--s3);color:var(--ink)">${esc(u.nombre[0])}</span><span class="grow"><h3>${esc(u.nombre)}</h3></span>${acc}</div>`;
  }).join('') : '<p class="small mut" style="margin:8px 0 0">No hay nadie con ese nombre.</p>'}</div></section>
  ${inc.length ? `<section class="card"><h2>Solicitudes recibidas</h2><div class="list">${inc.map(a => `<div class="item"><span class="grow"><h3>${nom(a.id_usuario)}</h3><span class="small mut">Quiere ser tu amigo</span></span><button class="btn sm pri" type="button" data-aceptar="${a.id_usuario}">Aceptar</button><button class="btn sm" type="button" data-quitar="${a.id_usuario}">Rechazar</button></div>`).join('')}</div></section>` : ''}
  ${sal.length ? `<section class="card"><h2>Solicitudes enviadas</h2><div class="list">${sal.map(a => `<div class="item"><span class="grow"><h3>${nom(a.id_amigo)}</h3><span class="small mut">Pendiente</span></span><button class="btn sm" type="button" data-quitar="${a.id_amigo}">Cancelar</button></div>`).join('')}</div></section>` : ''}
  <section class="card"><h2>Tus amigos</h2>${U.length > 1 ? `<div class="list">${U.slice(1).map(u => `<div class="item"><span class="av" style="background:${u.c}">${esc(u.n[0])}</span><span class="grow"><h3>${esc(u.n)}</h3></span><button class="btn sm ghost" type="button" data-map="${u.id}">Mapa</button><button class="btn sm ghost" type="button" data-quitar="${u.id}" aria-label="Quitar a ${esc(u.n)}">✕</button></div>`).join('')}</div>` : '<div class="empty">Busca a tus amigos por su nombre y envíales una solicitud.</div>'}</section>`;
}
let faTimer = null;
function buscarAmigos() {
  clearTimeout(faTimer);
  if (fa.q.trim().length < 2) { fa.res = []; fa.buscando = false; return; }
  fa.buscando = true;
  faTimer = setTimeout(async () => {
    const q = fa.q; const { data, error } = await sb.rpc('buscar_usuarios', { texto: q });
    if (q !== fa.q) return; fa.buscando = false; fa.res = error ? [] : data; if (error) toast('No se pudo buscar.');
    if (st.tab === 'amigos' && st.feed === 'gest' && !st.sheet && !st.live) renderKeep('qa');
  }, 300);
}
async function amistad(accion, id) {
  try {
    if (accion === 'pedir') ok(await sb.from('es_amigo_de').insert({ id_usuario: YO, id_amigo: id }));
    if (accion === 'aceptar') ok(await sb.from('es_amigo_de').update({ estado: 'aceptada', fecha_alta: ymd(new Date()) }).eq('id_usuario', id).eq('id_amigo', YO));
    if (accion === 'quitar') ok(await sb.from('es_amigo_de').delete().or(`and(id_usuario.eq.${YO},id_amigo.eq.${id}),and(id_usuario.eq.${id},id_amigo.eq.${YO})`));
    await cargarUsuario();
    if (accion === 'aceptar') { await guardarLogros(); toast('¡Ahora sois amigos!'); }
    if (accion === 'pedir') toast('Solicitud enviada');
  } catch (e) { console.error(e); toast('No se pudo completar. Inténtalo otra vez.'); }
  render();
}

/* PERFIL */
function vPerfil() {
  return `<button class="back" type="button" data-close>← Volver</button><h1 style="margin:6px 0 14px">Tu perfil</h1>
  <form id="fperfil" class="card cut" novalidate>
   <label class="fld"><span class="eyebrow">Nombre</span><input class="txt" name="nombre" required maxlength="40" value="${esc(ME.nombre)}"></label>
   <label class="fld"><span class="eyebrow">Género</span><select class="sel" name="genero" style="width:100%;min-height:44px">${['', 'Hombre', 'Mujer', 'Otro'].map(g => `<option value="${g}" ${ME.genero === g || (!ME.genero && !g) ? 'selected' : ''}>${g || 'Sin indicar'}</option>`).join('')}</select></label>
   <div class="fld"><span class="eyebrow">Mapa muscular</span><div class="seg" role="group" aria-label="Mapa muscular" style="margin:0">${['Hombre', 'Mujer'].map(v => `<button type="button" data-mapa="${v}" aria-pressed="${(st.mapaDraft || ME.mapa_muscular) === v}">${v}</button>`).join('')}</div></div>
   <div style="max-width:260px;margin:0 auto 12px">${body(() => '#18501A', { mapa: st.mapaDraft || ME.mapa_muscular, label: 'Vista previa del mapa' })}</div>
   <div class="grid2"><label class="fld"><span class="eyebrow">Peso corporal (kg)</span><input class="txt" name="peso" type="number" min="20" max="300" step="0.1" inputmode="decimal" value="${ME.peso_corporal_kg ?? ''}"></label>
   <label class="fld"><span class="eyebrow">Nacimiento</span><input class="txt" name="nac" type="date" value="${ME.fecha_nacimiento ?? ''}"></label></div>
   <p class="small mut" style="margin:0 0 10px">Los pesos mínimos de cada rango son distintos para hombre y mujer. "Otro" y "Sin indicar" usan la tabla de hombre.</p>
   <p class="msg" id="pmsg"></p>
   <button class="btn pri full" type="submit">Guardar</button></form>
  <button class="btn full" type="button" data-salir>Cerrar sesión</button>`;
}

/* ACCESO (registro / inicio de sesión) */
function vAuth() {
  const m = st.auth;
  const title = { in: 'Entra a tu cuenta', up: 'Crea tu cuenta', forgot: 'Recuperar contraseña', reset: 'Nueva contraseña', sent: 'Revisa tu correo' }[m];
  let f = '';
  if (m === 'sent') f = `<p>${esc(st.authMsg || '')}</p><button class="btn full" type="button" data-auth="in">Volver a entrar</button>`;
  else f = `<form id="fauth" novalidate>
   ${m === 'up' ? `<label class="fld"><span class="eyebrow">Nombre</span><input class="txt" name="nombre" required maxlength="40" autocomplete="name"></label>` : ''}
   ${m !== 'reset' ? `<label class="fld"><span class="eyebrow">Correo</span><input class="txt" name="email" type="email" required autocomplete="email"></label>` : ''}
   ${m !== 'forgot' ? `<label class="fld"><span class="eyebrow">Contraseña</span><input class="txt" name="pass" type="password" required minlength="6" autocomplete="${m === 'in' ? 'current-password' : 'new-password'}"></label>` : ''}
   ${m === 'up' ? `<div class="grid2"><label class="fld"><span class="eyebrow">Género</span><select class="sel" name="genero" style="width:100%;min-height:44px"><option>Hombre</option><option>Mujer</option><option>Otro</option></select></label>
   <label class="fld"><span class="eyebrow">Peso (kg)</span><input class="txt" name="peso" type="number" min="20" max="300" step="0.1" inputmode="decimal"></label></div>
   <label class="fld"><span class="eyebrow">Fecha de nacimiento</span><input class="txt" name="nac" type="date"></label>` : ''}
   <p class="msg e" id="amsg" role="alert"></p>
   <button class="btn pri full" type="submit">${{ in: 'Entrar', up: 'Crear cuenta', forgot: 'Enviar enlace', reset: 'Guardar contraseña' }[m]}</button></form>
   ${m === 'in' ? `<div class="row between" style="margin-top:8px"><button class="link" type="button" data-auth="up">Crear cuenta</button><button class="link" type="button" data-auth="forgot" style="color:var(--mut)">He olvidado la contraseña</button></div>` : ''}
   ${m === 'up' || m === 'forgot' ? `<button class="link" type="button" data-auth="in" style="margin-top:8px">Ya tengo cuenta</button>` : ''}`;
  return `<div style="min-height:100%;display:flex;flex-direction:column;justify-content:center;padding:24px 6px">
   <h1 class="logo">VYNT</h1><p>Entrena, sube de rango y compite con tus amigos.</p>
   <section class="card cut" style="padding:18px"><h2>${title}</h2>${f}</section></div>`;
}
const traducir = msg => {
  const m = String(msg || '');
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Tienes que confirmar tu correo antes de entrar. Busca el email de VYNT (mira también en spam).';
  if (/already registered|already been registered/i.test(m)) return 'Ya existe una cuenta con ese correo.';
  if (/Password should be at least/i.test(m)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/rate limit|too many/i.test(m)) return 'Demasiados intentos seguidos. Espera unos minutos.';
  if (/valid email|invalid format/i.test(m)) return 'Escribe un correo válido.';
  return 'Algo ha fallado: ' + m;
};
async function enviarAuth(form) {
  const fd = new FormData(form), g = k => String(fd.get(k) || '').trim();
  const msg = $('amsg'); msg.textContent = '';
  const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    const m = st.auth;
    if (m !== 'reset' && !/^\S+@\S+\.\S+$/.test(g('email'))) throw new Error('valid email');
    if (m !== 'forgot' && g('pass').length < 6) throw new Error('Password should be at least 6');
    if (m === 'in') ok(await sb.auth.signInWithPassword({ email: g('email'), password: g('pass') }));
    if (m === 'up') {
      if (!g('nombre')) { msg.textContent = 'Escribe tu nombre.'; btn.disabled = false; return; }
      const data = ok(await sb.auth.signUp({ email: g('email'), password: g('pass'), options: { emailRedirectTo: location.origin, data: { nombre: g('nombre'), genero: g('genero'), peso_corporal_kg: g('peso'), fecha_nacimiento: g('nac') } } }));
      if (!data.session) { st.auth = 'sent'; st.authMsg = `Te hemos enviado un correo a ${g('email')} para confirmar la cuenta. Ábrelo y pulsa el enlace; volverás aquí con la sesión iniciada.`; showAuth(); }
    }
    if (m === 'forgot') { ok(await sb.auth.resetPasswordForEmail(g('email'), { redirectTo: location.origin })); st.auth = 'sent'; st.authMsg = 'Si hay una cuenta con ese correo, te llegará un enlace para poner una contraseña nueva.'; showAuth(); }
    if (m === 'reset') { ok(await sb.auth.updateUser({ password: g('pass') })); st.auth = 'in'; toast('Contraseña cambiada'); const { data } = await sb.auth.getSession(); if (data.session) boot(data.session.user); }
  } catch (e) { msg.textContent = traducir(e.message); }
  btn.disabled = false;
}
function showAuth() {
  $('boot').hidden = true; $('tabs').hidden = true; const s = $('scr'); s.hidden = false; s.style.paddingBottom = '24px';
  s.innerHTML = vAuth();
}

/* render */
let fotoTimer = null, restTimer = null;
function render() {
  if (!YO || !ME) return;
  $('boot').hidden = true; $('scr').hidden = false; $('tabs').hidden = false; $('scr').style.paddingBottom = '';
  nav();
  let h;
  if (st.sheet) h = { ficha: () => vFicha(st.exn), buscar: vBuscar, crear: vCrear, perfil: vPerfil }[st.sheet]();
  else if (st.live && (st.tab === 'entrenar' || st.liveFocus)) h = vLive();
  else h = { inicio: vInicio, entrenar: vEntrenar, rangos: vRangos, registro: vRegistro, amigos: vAmigos }[st.tab]();
  $('scr').innerHTML = h;
  document.querySelectorAll('.rest,.celeb,.livebar').forEach(x => x.remove());
  if (st.live && !st.rest && st.tab !== 'entrenar' && !st.sheet) $('app').insertAdjacentHTML('beforeend', `<button class="rest livebar" type="button" data-go="entrenar" style="border:0;width:100%;text-align:left"><span style="flex:1">● Sesión en curso: ${esc(st.live.n)}</span><b style="font-size:16px;min-width:0">VOLVER ›</b></button>`);
  if (st.rest) $('app').insertAdjacentHTML('beforeend', `<div class="rest" role="status"><b id="rt">${fmtT(st.rest.left)}</b><span style="flex:1">Descanso · ${esc(st.rest.n)}</span><button class="btn sm" type="button" data-rest="15">+15 s</button><button class="btn sm" type="button" data-rest="0">Saltar</button></div>`);
  if (st.celeb) $('app').insertAdjacentHTML('beforeend', vCeleb());
  if (st.confirm) $('app').insertAdjacentHTML('beforeend', vConfirm());
  clearInterval(fotoTimer); const f = document.querySelector('.foto');
  if (f) { let k = 0; fotoTimer = setInterval(() => { k = 1 - k; const im = f.querySelectorAll('img'); im[1].style.opacity = k; f.querySelector('.paso').textContent = k ? 'Final' : 'Inicio'; }, 1200); }
  if (st.live) guardarLive();
}
function renderKeep(id) { const el = $(id); const pos = el ? el.selectionStart : null; render(); const n = $(id); if (n && pos != null) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { } } }
const fmtT = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function startRest(n, sec) {
  if (!sec) { render(); return; }
  st.rest = { n, left: sec, fin: Date.now() + sec * 1000 }; clearInterval(restTimer);
  restTimer = setInterval(() => {
    if (!st.rest) { clearInterval(restTimer); return; }
    st.rest.left = Math.max(0, Math.round((st.rest.fin - Date.now()) / 1000));
    if (st.rest.left <= 0) { st.rest = null; clearInterval(restTimer); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch { } toast('¡A por la siguiente serie!'); render(); }
    else { const el = $('rt'); if (el) el.textContent = fmtT(st.rest.left); }
  }, 500);
  render();
}
function toast(t) { document.querySelectorAll('.toast').forEach(x => x.remove()); $('app').insertAdjacentHTML('beforeend', `<div class="toast" role="status">${esc(t)}</div>`); setTimeout(() => document.querySelectorAll('.toast').forEach(x => x.remove()), 2800); }

/* eventos */
document.addEventListener('click', async ev => {
  const b = ev.target.closest('button,[data-m]'); if (!b) return; const d = b.dataset;
  if (d.auth) { st.auth = d.auth; showAuth(); return; }
  if (!YO) return;
  if (d.tab) { go(d.tab); return; }
  if (d.go) { go(d.go); return; }
  if (d.who) { st.who = d.who; st.mus = null; render(); return; }
  if (d.m && b.closest('.tap')) { st.mus = st.mus === d.m ? null : d.m; render(); return; }
  if (d.mus !== undefined) { st.mus = null; render(); return; }
  if (d.ex) { st.prevSheet = st.sheet; st.sheet = 'ficha'; st.exn = d.ex; render(); $('scr').scrollTop = 0; return; }
  if (d.close !== undefined) { if (st.sheet === 'ficha' && st.prevSheet) { st.sheet = st.prevSheet; st.prevSheet = null; } else if (st.sheet === 'buscar' && bq.pick === 'plant') { st.sheet = 'crear'; bq.pick = null; } else { st.sheet = null; bq.pick = null; } render(); return; }
  if (d.seg) { st.seg = d.seg; render(); return; }
  if (d.open === 'buscar') { bq.pick = null; st.prevSheet = null; st.sheet = 'buscar'; render(); return; }
  if (d.open === 'perfil') { st.mapaDraft = null; st.sheet = 'perfil'; render(); return; }
  if (d.mapa) { const f = $('fperfil'); const keep = f ? Object.fromEntries(new FormData(f)) : null; st.mapaDraft = d.mapa; render(); if (keep) { const n = $('fperfil'); Object.entries(keep).forEach(([k, v]) => { if (n.elements[k]) n.elements[k].value = v; }); } return; }
  if (d.open === 'crear') { draft = { n: '', e: [], id: null }; st.sheet = 'crear'; render(); return; }
  if (d.open === 'pick') { draft.n = $('pn').value; bq.pick = 'plant'; st.sheet = 'buscar'; render(); $('scr').scrollTop = 0; return; }
  if (d.open === 'pickLive') { bq.pick = 'live'; st.sheet = 'buscar'; render(); $('scr').scrollTop = 0; return; }
  if (d.add) { const e = EX[d.add]; if (bq.pick === 'plant') { draft.e.push({ n: e.n, s: 3, r: 10, d: e.t === 'Compuesto' ? 150 : 75 }); st.sheet = 'crear'; } else { st.live.items.push(itemDe(e.n, 3, 10, e.t === 'Compuesto' ? 150 : 75)); st.sheet = null; } bq.pick = null; render(); return; }
  if (d.bg !== undefined) { bq.g = d.bg; render(); return; }
  if (d.edit !== undefined) { const p = MINE[+d.edit]; draft = { n: p.n, e: p.e.map(x => ({ ...x })), id: p.id }; st.sheet = 'crear'; render(); return; }
  if (d.rm !== undefined) { draft.n = $('pn').value; draft.e.splice(+d.rm, 1); render(); return; }
  if (d.save !== undefined) {
    draft.n = $('pn').value.trim(); if (!draft.n) { $('perr').textContent = 'Ponle un nombre a la plantilla.'; return; } if (!draft.e.length) { $('perr').textContent = 'Añade al menos un ejercicio.'; return; }
    st.busy = true; render();
    try { await guardarPlantilla(); st.sheet = null; st.seg = 'mias'; toast('Plantilla guardada'); } catch (e) { console.error(e); toast('No se pudo guardar la plantilla.'); }
    st.busy = false; render(); return;
  }
  if (d.delpl !== undefined) {
    const { error } = await sb.from('plantilla').delete().eq('id_plantilla', draft.id);
    if (error) { toast(error.code === '23503' ? 'No se puede borrar: ya tiene sesiones registradas.' : 'No se pudo borrar.'); return; }
    await recargarPlantillas(); st.sheet = null; toast('Plantilla borrada'); render(); return;
  }
  if (d.start) { const [k, i] = d.start.split(':'); startLive(k === 'vynt' ? VYNT_PL[+i] : MINE[+i]); return; }
  if (d.libre !== undefined) { startLive(null); return; }
  if (d.tipo) { const [i, j] = ij(d.tipo); const s = st.live.items[i].sets[j]; s.tipo = s.tipo === 'C' ? 'E' : 'C'; render(); return; }
  if (d.addset !== undefined) { const it = st.live.items[+d.addset]; const l = it.sets[it.sets.length - 1] || { w: 0, r: 10 }; it.sets.push({ w: l.w, r: l.r, tipo: 'E', rpe: '', done: false }); render(); return; }
  if (d.delset) { const [i, j] = ij(d.delset); st.live.items[i].sets.splice(j, 1); render(); return; }
  if (d.rmit !== undefined) { st.live.items.splice(+d.rmit, 1); render(); return; }
  if (d.done) {
    const [i, j] = ij(d.done); const it = st.live.items[i], s = it.sets[j]; s.done = !s.done;
    if (s.done) { const v = e1(+s.w, +s.r); if (s.tipo === 'E' && s.w > 0 && v > it.best) { it.best = v; toast(`📈 Nuevo récord en ${it.n}: ${kg(v)}`); } startRest(it.n, it.d); return; }
    render(); return;
  }
  if (d.rest !== undefined) { if (+d.rest === 0) st.rest = null; else { st.rest.fin += 15000; st.rest.left += 15; } render(); return; }
  if (d.finish !== undefined) { if (!st.busy) finishLive(); return; }
  if (d.discard !== undefined) { st.pendingStart = undefined; if (confirmarDescartar()) { st.live = null; st.rest = null; guardarLive(); render(); } return; }
  if (d.confirm) { st.confirm = false; if (d.confirm === 'si') { st.live = null; st.rest = null; guardarLive(); if (st.pendingStart !== undefined) { const p = st.pendingStart; st.pendingStart = undefined; startLive(p); return; } } render(); return; }
  if (d.celeb !== undefined) { st.celeb = null; st.tab = 'inicio'; render(); $('scr').scrollTop = 0; return; }
  if (d.like) {
    const s = S.find(x => x.id === +d.like); if (!s) return; const had = s.likes.has(YO);
    had ? s.likes.delete(YO) : s.likes.add(YO); LIKES_DADOS += had ? -1 : 1; render();
    const res = had ? await sb.from('le_gusta').delete().eq('id_usuario', YO).eq('id_sesion', s.id) : await sb.from('le_gusta').insert({ id_usuario: YO, id_sesion: s.id });
    if (res.error) { had ? s.likes.add(YO) : s.likes.delete(YO); LIKES_DADOS += had ? 1 : -1; toast('No se pudo guardar el me gusta.'); render(); }
    else if (!had) { const nl = await guardarLogros(); if (nl.length) { toast(`🏅 Logro: ${nl.join(', ')}`); render(); } }
    return;
  }
  if (d.map) { st.who = d.map; st.mus = null; go('rangos'); return; }
  if (d.feed) { st.feed = d.feed; render(); return; }
  if (d.rby) { st.rankBy = d.rby; render(); return; }
  if (d.pedir) { amistad('pedir', d.pedir); return; }
  if (d.aceptar) { amistad('aceptar', d.aceptar); return; }
  if (d.quitar) { amistad('quitar', d.quitar); return; }
  if (d.salir !== undefined) { await sb.auth.signOut(); return; }
});
document.addEventListener('input', ev => {
  const t = ev.target, d = t.dataset;
  if (t.id === 'q') { bq.q = t.value; renderKeep('q'); return; }
  if (t.id === 'qa') { fa.q = t.value; buscarAmigos(); renderKeep('qa'); return; }
  if (d.w) { const [i, j] = ij(d.w); st.live.items[i].sets[j].w = Math.max(0, +String(t.value).replace(',', '.') || 0); guardarLive(); return; }
  if (d.r) { const [i, j] = ij(d.r); st.live.items[i].sets[j].r = Math.max(1, Math.round(+t.value) || 1); guardarLive(); return; }
  if (d.f) { draft.e[+d.i][d.f] = Math.max(d.f === 'd' ? 0 : 1, +t.value || 0); return; }
});
document.addEventListener('change', ev => {
  const t = ev.target, d = t.dataset;
  if (t.id === 'feq') { bq.eq = t.value; render(); return; }
  if (t.id === 'ft') { bq.t = t.value; render(); return; }
  if (t.id === 'prog') { st.prog = t.value; render(); return; }
  if (d.rpe) { const [i, j] = ij(d.rpe); st.live.items[i].sets[j].rpe = t.value; guardarLive(); return; }
});
document.addEventListener('submit', async ev => {
  ev.preventDefault();
  if (ev.target.id === 'fauth') { enviarAuth(ev.target); return; }
  if (ev.target.id === 'fperfil') {
    const fd = new FormData(ev.target), g = k => String(fd.get(k) || '').trim(), msg = $('pmsg');
    if (!g('nombre')) { msg.className = 'msg e'; msg.textContent = 'Escribe tu nombre.'; return; }
    const peso = g('peso') ? +g('peso') : null;
    if (peso != null && !(peso > 0)) { msg.className = 'msg e'; msg.textContent = 'El peso no es válido.'; return; }
    const upd = { nombre: g('nombre'), genero: g('genero') || null, peso_corporal_kg: peso, fecha_nacimiento: g('nac') || null, mapa_muscular: st.mapaDraft || ME.mapa_muscular };
    const { error } = await sb.from('usuario').update(upd).eq('id_usuario', YO);
    if (error) { msg.className = 'msg e'; msg.textContent = 'No se pudo guardar.'; return; }
    Object.assign(ME, upd); UID[YO].n = ME.nombre; UID[YO].g = ME.genero; UID[YO].mapa = ME.mapa_muscular; st.mapaDraft = null;
    st.sheet = null; toast('Perfil guardado'); render();
  }
});

/* arranque */
async function boot(user) {
  if (YO === user.id && ME) return;
  YO = user.id; st.who = YO;
  $('scr').hidden = true; $('tabs').hidden = true; $('boot').hidden = false;
  try {
    if (!catalogoListo) await cargarCatalogo(); else await recargarPlantillas();
    await cargarUsuario(); ultimaCarga = Date.now();
    const l = lsGet(LIVE_KEY()); if (l && l.items) st.live = l;
    render();
    guardarLogros().then(nl => { if (nl.length) render(); });
  } catch (e) {
    console.error(e);
    $('boot').innerHTML = `<i></i><span>No se pudo cargar VYNT. Revisa tu conexión.</span><button class="btn" type="button" onclick="location.reload()">Reintentar</button>`;
  }
}
// al volver a la app, recarga los datos de usuario y amigos (por si alguien ha cambiado algo)
let ultimaCarga = Date.now();
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !YO || !ME || st.busy || Date.now() - ultimaCarga < 30000) return;
  ultimaCarga = Date.now();
  try { await cargarUsuario(); if (!document.activeElement?.matches('input,select')) { const y = $('scr').scrollTop; render(); $('scr').scrollTop = y; } } catch (e) { console.error(e); }
});
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') { st.auth = 'reset'; YO = null; ME = null; setTimeout(showAuth); return; }
  if (session && session.user) { if (st.auth !== 'reset') setTimeout(() => boot(session.user)); }
  else { YO = null; ME = null; S = []; U = []; st.live = null; st.sheet = null; st.tab = 'inicio'; if (st.auth === 'sent') st.auth = 'in'; setTimeout(showAuth); }
});
setInterval(() => { if (st.live && !st.sheet && st.tab === 'entrenar' && !document.activeElement?.matches('input,select')) { const e = document.querySelector('.top .eyebrow'); if (e) e.textContent = `En curso · ${Math.floor((Date.now() - st.live.t0) / 60000)} min`; } }, 30000);
