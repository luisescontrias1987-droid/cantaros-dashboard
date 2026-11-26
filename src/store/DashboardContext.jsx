// Store central: estado y acciones de datos (Supabase). Portado de
// vercel-app/index.html. La UI solo consume este contexto.
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FALLBACK_INV_WEEK,
  FALLBACK_WEEK,
  loadConfig as loadCfg,
  sb,
  sbChunks,
  storageDelete,
  storageUpload,
} from '../lib/supabase.js';
import {
  findHeaderRow,
  headerIndex,
  invDerived,
  parseReportPeriod,
  pick,
  readSpreadsheetWithMeta,
  ensureXLSX,
} from '../lib/files.js';
import {
  AREAS,
  DIAS,
  MESES,
  fmtDateDMY,
  mondayOf,
  num,
  parseWeekRef,
  reservationsRangeTitle,
  toISODate,
  weekDays,
  weekLabel,
  weekNum,
  weekRangeTitle,
  weekStartFromPeriodStart,
} from '../lib/utils.js';
import { POS_MAP } from '../lib/posMap.js';
import { invSummary, periodRange, pickInvWeek } from '../lib/period.js';

const DashboardContext = createContext(null);

export function useDashboard() {
  return useContext(DashboardContext);
}

export function DashboardProvider({ children }) {
  const [live, setLive] = useState(false);
  const [liveError, setLiveError] = useState(null);
  const [configNeeded, setConfigNeeded] = useState(false);
  const [statusText, setStatusText] = useState('Conectando…');
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(FALLBACK_WEEK);
  const [period, setPeriod] = useState('semana');
  const [horariosWeek, setHorariosWeek] = useState(() => toISODate(mondayOf(new Date())));
  const [products, setProducts] = useState([]);
  const [productsByClave, setProductsByClave] = useState({});
  const [salesRows, setSalesRows] = useState([]);
  const [salesDesc, setSalesDesc] = useState({});
  const [invResumen, setInvResumen] = useState([]);
  const [invBarra, setInvBarra] = useState([]);
  const [invCocina, setInvCocina] = useState([]);
  const [invWeekBarra, setInvWeekBarra] = useState(FALLBACK_INV_WEEK);
  const [invWeekCocina, setInvWeekCocina] = useState(FALLBACK_INV_WEEK);
  const [docs, setDocs] = useState([]);
  const [staff, setStaff] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [reservacionesWeek, setReservacionesWeek] = useState(() => toISODate(mondayOf(new Date())));
  const [reservaciones, setReservaciones] = useState([]);
  const [horariosReady, setHorariosReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [ventasMeseroAll, setVentasMeseroAll] = useState([]);
  const [waiterWeeks, setWaiterWeeks] = useState([]);
  const [waiterWeek, setWaiterWeek] = useState(FALLBACK_WEEK);
  const [waiterSortDir, setWaiterSortDir] = useState(-1);
  const [undoStaff, setUndoStaff] = useState(null);
  const undoTimerRef = useRef(null);

  const stateRef = useRef({});
  stateRef.current = {
    weeks, selectedWeek, period, horariosWeek, products, productsByClave,
    salesRows, salesDesc, invResumen, invBarra, invCocina, invWeekBarra,
    invWeekCocina, docs, staff, horarios, eventos, reservacionesWeek,
    reservaciones, horariosReady, loaded,
    ventasMeseroAll, waiterWeeks, waiterWeek, waiterSortDir, undoStaff,
  };

  const setStatus = useCallback((ok, msg) => {
    setStatusText(msg);
    if (ok === true) setLiveError(null);
  }, []);

  const loadHorariosData = useCallback(async (weekOverride) => {
    const s = stateRef.current;
    const week = weekOverride || s.horariosWeek;
    try {
      const results = await Promise.all([
        sb('staff', { select: '*', query: { activo: 'eq.true' }, order: 'nombre.asc', limit: 500 }),
        sb('horarios', { select: '*', query: { week_start: 'eq.' + week }, limit: 1000 }),
        sb('eventos', { select: '*', query: { week_start: 'eq.' + week }, order: 'dia.asc', limit: 200 }),
      ]);
      setStaff(results[0] || []);
      setHorarios(results[1] || []);
      setEventos(results[2] || []);
      setHorariosReady(true);
    } catch (e) {
      setStaff([]);
      setHorarios([]);
      setEventos([]);
      setHorariosReady(false);
    }
  }, []);

  // Reservaciones: su propia semana (independiente de Horarios y del Panel)
  // y su propia lista de eventos de esa semana.
  const loadReservacionesData = useCallback(async (weekOverride) => {
    const s = stateRef.current;
    const week = weekOverride || s.reservacionesWeek;
    try {
      setReservaciones(
        (await sb('eventos', { select: '*', query: { week_start: 'eq.' + week }, order: 'dia.asc', limit: 200 })) || [],
      );
    } catch (e) {
      setReservaciones([]);
    }
  }, []);

  const changeReservacionesWeek = useCallback(
    async (iso) => {
      const p = iso.split('-').map(Number);
      const monday = toISODate(mondayOf(new Date(p[0], p[1] - 1, p[2])));
      setReservacionesWeek(monday);
      await loadReservacionesData(monday);
      return monday;
    },
    [loadReservacionesData],
  );

  const loadWeekData = useCallback(async (overrides = {}) => {
    const s = stateRef.current;
    const w = overrides.week || s.selectedWeek;
    const per = overrides.period || s.period;
    const range = periodRange(w, per);
    const q =
      range.mode === 'eq'
        ? { week_start: 'eq.' + w }
        : { week_start: ['gte.' + range.gte, 'lte.' + range.lte] };
    try {
      setSalesRows((await sb('weekly_sales', { select: '*', query: q, order: 'total.desc', limit: 5000 })) || []);
    } catch (e) {
      setSalesRows([]);
    }
    try {
      const imp = (await sb('ventas_pos_import', { select: 'clave,descripcion', query: q, limit: 5000 })) || [];
      const desc = {};
      imp.forEach((r) => {
        desc[String(r.clave)] = r.descripcion;
      });
      setSalesDesc(desc);
    } catch (e) {
      setSalesDesc({});
    }
    const invW = pickInvWeek(s.invResumen, 'barra', w, FALLBACK_INV_WEEK);
    setInvWeekBarra(invW);
    try {
      setInvBarra((await sb('inventory_weekly', { select: '*', query: { week_start: 'eq.' + invW }, order: 'producto.asc', limit: 1000 })) || []);
    } catch (e) {
      setInvBarra([]);
    }
    const invWC = pickInvWeek(s.invResumen, 'cocina', w, FALLBACK_INV_WEEK);
    setInvWeekCocina(invWC);
    try {
      setInvCocina((await sb('inventory_cocina', { select: '*', query: { week_start: 'eq.' + invWC }, order: 'producto.asc', limit: 1000 })) || []);
    } catch (e) {
      setInvCocina([]);
    }
    await loadHorariosData();
    await loadReservacionesData();
  }, [loadHorariosData, loadReservacionesData]);

  const buildWeekList = useCallback((weeksArr, invArr, current) => {
    const all = {};
    weeksArr.forEach((w) => {
      all[w.week_start] = true;
    });
    invArr.forEach((r) => {
      all[r.week_start] = true;
    });
    const list = Object.keys(all).sort().reverse();
    if (!list.length) list.push(FALLBACK_WEEK);
    return { list, selected: list.indexOf(current) !== -1 ? current : list[0] };
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const results = await Promise.all([
        sb('ventas_semanales', { select: '*', order: 'week_start.desc' }),
        sb('inventario_semanal_resumen', { select: '*', order: 'week_start.desc' }),
        sb('products', { select: 'clave,nombre,grupo,precio_pos,costo_unitario', order: 'nombre.asc' }),
        sb('documents', { select: '*', order: 'title.asc' }),
      ]);
      const w = results[0] || [];
      const inv = results[1] || [];
      const prods = results[2] || [];
      setWeeks(w);
      setInvResumen(inv);
      setProducts(prods);
      // Solo documentos con archivo real: las filas sin file_url (ejemplos
      // viejos) no se muestran aunque sigan en la tabla.
      setDocs((results[3] || []).filter((x) => x.file_url));
      const byClave = {};
      prods.forEach((p) => {
        byClave[p.clave] = p;
      });
      setProductsByClave(byClave);
      setLoaded(true);
      setLiveError(null);
      setLive(true);
      setStatusText('En vivo · Supabase');
      const { selected } = buildWeekList(w, inv, stateRef.current.selectedWeek);
      setSelectedWeek(selected);
      await loadWeekData({ week: selected });
    } catch (e) {
      setLiveError(e);
      setLive(false);
      setStatusText('Error al leer Supabase');
      throw e;
    }
  }, [buildWeekList, loadWeekData]);

  const boot = useCallback(async () => {
    const ok = await loadCfg();
    if (!ok) {
      setConfigNeeded(true);
      setStatusText('Sin conexión a Supabase');
      return false;
    }
    setConfigNeeded(false);
    setStatusText('Conectando a Supabase…');
    try {
      await loadAll();
      return true;
    } catch (e) {
      return false;
    }
  }, [loadAll]);

  const changeWeek = useCallback(
    async (w) => {
      setSelectedWeek(w);
      setStatusText('Cargando periodo…');
      await loadWeekData({ week: w });
      setStatusText('En vivo · Supabase');
    },
    [loadWeekData],
  );

  const changePeriod = useCallback(
    async (p) => {
      setPeriod(p);
      setStatusText('Cargando periodo…');
      await loadWeekData({ period: p });
      setStatusText('En vivo · Supabase');
    },
    [loadWeekData],
  );

  const changeHorariosWeek = useCallback(
    async (iso) => {
      const p = iso.split('-').map(Number);
      const monday = toISODate(mondayOf(new Date(p[0], p[1] - 1, p[2])));
      setHorariosWeek(monday);
      await loadHorariosData(monday);
      return monday;
    },
    [loadHorariosData],
  );

  /* ---------------- ventas por mesero ---------------- */
  const refreshWaiterSales = useCallback(async (weekOverride) => {
    const s = stateRef.current;
    if (!s.horariosReady) {
      try {
        await loadHorariosData();
      } catch (e) {}
    }
    const all = (await sb('ventas_mesero', { select: '*', order: 'week_start.asc', limit: 1000 })) || [];
    setVentasMeseroAll(all);
    const weeksMap = {};
    all.forEach((r) => {
      weeksMap[r.week_start] = true;
    });
    stateRef.current.weeks.forEach((w) => {
      weeksMap[w.week_start] = true;
    });
    const list = Object.keys(weeksMap).sort().reverse();
    if (!list.length) list.push(FALLBACK_WEEK);
    setWaiterWeeks(list);
    const current = weekOverride || stateRef.current.waiterWeek;
    if (list.indexOf(current) === -1) setWaiterWeek(list[0]);
    return all;
  }, [loadHorariosData]);

  const submitWaiterSale = useCallback(
    async ({ staffId, name, week, total }) => {
      await sb('ventas_mesero', {
        method: 'POST',
        body: { week_start: week, staff_id: staffId, waiter: name, total },
        prefer: 'resolution=merge-duplicates,return=representation',
        query: { on_conflict: 'week_start,staff_id' },
      });
      setWaiterWeek(week);
      await refreshWaiterSales(week);
    },
    [refreshWaiterSales],
  );

  // Borra solo la captura de ese mesero en esa semana (no la semana entera).
  const deleteWaiterSale = useCallback(
    async ({ week, staffId }) => {
      await sb('ventas_mesero', {
        method: 'DELETE',
        query: { week_start: 'eq.' + week, staff_id: 'eq.' + staffId },
      });
      await refreshWaiterSales(week);
    },
    [refreshWaiterSales],
  );

  /* ---------------- subidas ---------------- */
  const uploadPOS = useCallback(
    async ({ file, week }) => {
      const meta = await readSpreadsheetWithMeta(file);
      const rows = meta.rows;
      // Semana, en orden: (1) periodo del propio reporte
      // ("PRODUCTOS VENDIDOS DEL 01/11/2026 AL 09/11/2026"), (2) nombre de
      // la hoja o del archivo ("Semana 48"), (3) la semana elegida.
      let detectedFrom = null;
      let periodText = null;
      const periodInfo = parseReportPeriod(rows);
      if (periodInfo) {
        week = weekStartFromPeriodStart(periodInfo.start);
        detectedFrom = 'periodo';
        periodText = fmtDateDMY(periodInfo.start) + ' – ' + fmtDateDMY(periodInfo.end);
      } else {
        const det =
          parseWeekRef(meta.sheetName, stateRef.current.selectedWeek) ||
          parseWeekRef(file.name, stateRef.current.selectedWeek);
        if (det) {
          week = det;
          detectedFrom = 'hoja';
        }
      }
      const headerAt = findHeaderRow(rows, 'clave');
      if (headerAt === -1) throw new Error('El archivo no trae la columna CLAVE del reporte.');
      const idx = headerIndex(rows[headerAt]);
      if (idx.clave == null || idx.cantidad == null || idx.venta_total == null) {
        throw new Error('El archivo no trae las columnas del reporte (CLAVE, CANTIDAD, VENTA_TOTAL).');
      }
      const staging = [];
      const sales = [];
      const noCost = [];
      for (let i = headerAt + 1; i < rows.length; i++) {
        const r = rows[i];
        const clave = String(pick(r, idx, ['clave']) || '').trim();
        if (!clave) continue;
        staging.push({
          week_start: week,
          clave,
          descripcion: pick(r, idx, ['descripcion']) || null,
          grupo: pick(r, idx, ['grupo']) || null,
          precio: num(pick(r, idx, ['precio'])),
          cantidad: num(pick(r, idx, ['cantidad'])),
          venta_total: num(pick(r, idx, ['venta_total'])),
          costo: num(pick(r, idx, ['costo'])),
          costo_total: num(pick(r, idx, ['costo_total'])),
          venta_costo: num(pick(r, idx, ['venta_costo'])),
          precio_de_venta: num(pick(r, idx, ['precio_de_venta'])),
          precio_de_catalogo: num(pick(r, idx, ['precio_de_catalogo'])),
          venta_total_precio_catalogo: num(pick(r, idx, ['venta_total_precio_catalogo'])),
          tasa_iva: num(pick(r, idx, ['tasa_iva'])),
        });
        const map = POS_MAP[clave];
        const qty = num(pick(r, idx, ['cantidad']));
        const price = num(pick(r, idx, ['precio']));
        const total = num(pick(r, idx, ['venta_total']));
        if (map) {
          sales.push({
            week_start: week,
            product_clave: map[0],
            pos_clave: clave,
            qty,
            unit_price: price,
            unit_cost: map[1],
            total,
            source: 'soft_restaurant',
          });
          if (map[1] == null) noCost.push(pick(r, idx, ['descripcion']) || clave);
        } else {
          sales.push({
            week_start: week,
            product_clave: null,
            pos_clave: clave,
            qty,
            unit_price: price,
            unit_cost: null,
            total,
            source: 'soft_restaurant',
          });
          noCost.push(pick(r, idx, ['descripcion']) || clave);
        }
      }
      await sbChunks('ventas_pos_import', staging);
      await sbChunks('weekly_sales', sales);
      await loadAll();
      return { week, detected: !!detectedFrom, detectedFrom, periodText, total: staging.length, noCost };
    },
    [loadAll],
  );

  const uploadInventory = useCallback(
    async ({ file, area, week }) => {
      const meta = await readSpreadsheetWithMeta(file);
      const rows = meta.rows;
      const detected = parseWeekRef(meta.sheetName, stateRef.current.selectedWeek);
      if (detected) week = detected;
      const headerAt = findHeaderRow(rows, 'producto');
      if (headerAt === -1) throw new Error('El archivo no trae la columna PRODUCTO.');
      const idx = headerIndex(rows[headerAt]);
      const out = [];
      for (let i = headerAt + 1; i < rows.length; i++) {
        const r = rows[i];
        const producto = String(pick(r, idx, ['producto']) || '').trim();
        if (!producto) continue;
        const others = r.filter((c, j) => j !== idx.producto && String(c == null ? '' : c).trim() !== '');
        if (!others.length) continue;
        if (/^resumen/i.test(producto)) continue;
        const v = {
          inicial: num(pick(r, idx, ['inicial', 'inventario_inicial'])),
          compras: num(pick(r, idx, ['compras'])),
          almacen: num(pick(r, idx, ['almacen', 'almacén'])),
          display: num(pick(r, idx, ['display'])),
          barra: num(pick(r, idx, ['barra'])),
          venta: num(pick(r, idx, ['venta'])),
          costo: num(pick(r, idx, ['costo', 'costo_unitario'])),
          minimo: num(pick(r, idx, ['minimo', 'mínimo'])),
        };
        const d = invDerived(v);
        out.push({
          week_start: week,
          seccion: pick(r, idx, ['seccion', 'sección']) || null,
          producto,
          unidad: pick(r, idx, ['unidad']) || null,
          inicial: v.inicial,
          compras: v.compras,
          almacen: v.almacen,
          display: v.display,
          barra: v.barra,
          venta: v.venta,
          total: d.total,
          diferencia: d.diferencia,
          minimo: v.minimo,
          perdido: d.perdido,
          pedido: d.pedido,
          sobrante: d.sobrante,
          costo: v.costo,
          valor_total: d.valor_total,
          perdido_pesos: d.perdido_pesos,
          pct_perdido: d.pct_perdido,
          sobrante_pesos: d.sobrante_pesos,
          pct_sobrante: d.pct_sobrante,
        });
      }
      const table = area === 'barra' ? 'inventory_weekly' : 'inventory_cocina';
      for (let i = 0; i < out.length; i += 40) {
        await sb(table, {
          method: 'POST',
          body: out.slice(i, i + 40),
          prefer: 'resolution=merge-duplicates,return=representation',
          query: { on_conflict: 'week_start,producto' },
        });
      }
      await loadAll();
      const perdido = out.reduce((a, r) => a + r.perdido_pesos, 0);
      const sobrante = out.reduce((a, r) => a + r.sobrante_pesos, 0);
      return { week, detected, total: out.length, perdido, sobrante };
    },
    [loadAll],
  );

  /* ---------------- eliminar semana de ventas (PIN en la UI) ---------------- */
  const refreshUploadedWeeks = useCallback(async () => {
    const rows =
      (await sb('weekly_sales', {
        select: 'week_start',
        query: { source: 'eq.soft_restaurant' },
        order: 'week_start.desc',
        limit: 5000,
      })) || [];
    const counts = {};
    rows.forEach((r) => {
      counts[r.week_start] = (counts[r.week_start] || 0) + 1;
    });
    return Object.keys(counts)
      .sort()
      .reverse()
      .map((w) => ({ week: w, count: counts[w] }));
  }, []);

  const deleteWeek = useCallback(
    async (week) => {
      await sb('weekly_sales', {
        method: 'DELETE',
        query: { week_start: 'eq.' + week, source: 'eq.soft_restaurant' },
      });
      await sb('ventas_pos_import', { method: 'DELETE', query: { week_start: 'eq.' + week } });
      await loadAll();
    },
    [loadAll],
  );

  /* ---------------- documentos ---------------- */
  const reloadDocs = useCallback(async () => {
    setDocs(((await sb('documents', { select: '*', order: 'title.asc' })) || []).filter((x) => x.file_url));
  }, []);

  const uploadDoc = useCallback(
    async ({ file, title, category, note }) => {
      const safe = String(file.name).replace(/[^A-Za-z0-9._-]/g, '_');
      const path = Date.now() + '-' + safe;
      const fileUrl = await storageUpload('documentos', path, file);
      await sb('documents', {
        method: 'POST',
        body: { title, category, note: note || null, file_url: fileUrl, file_path: path },
        prefer: 'return=representation',
      });
      await reloadDocs();
      return fileUrl;
    },
    [reloadDocs],
  );

  const deleteDoc = useCallback(
    async ({ id, filePath }) => {
      if (filePath) await storageDelete('documentos', filePath);
      await sb('documents', { method: 'DELETE', query: { id: 'eq.' + id } });
      await reloadDocs();
    },
    [reloadDocs],
  );

  /* ---------------- horarios: turnos y personal ---------------- */
  const saveShift = useCallback(
    async (staffId, dia, v) => {
      const s = stateRef.current;
      if (!v) {
        await sb('horarios', {
          method: 'DELETE',
          query: { week_start: 'eq.' + s.horariosWeek, staff_id: 'eq.' + staffId, dia: 'eq.' + dia },
        });
      } else {
        await sb('horarios', {
          method: 'POST',
          body: { week_start: s.horariosWeek, staff_id: staffId, dia, turno: v },
          prefer: 'resolution=merge-duplicates,return=representation',
          query: { on_conflict: 'week_start,staff_id,dia' },
        });
      }
      setHorarios((prev) => {
        const i = prev.findIndex((h) => h.staff_id === staffId && h.dia === dia);
        if (!v) {
          if (i !== -1) {
            const next = prev.slice();
            next.splice(i, 1);
            return next;
          }
          return prev;
        }
        if (i !== -1) {
          const next = prev.slice();
          next[i] = { ...next[i], turno: v };
          return next;
        }
        return [...prev, { week_start: s.horariosWeek, staff_id: staffId, dia, turno: v }];
      });
    },
    [],
  );

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const setUndoStaffTimed = useCallback(
    (undo) => {
      setUndoStaff(undo);
      clearUndoTimer();
      undoTimerRef.current = setTimeout(() => {
        setUndoStaff(null);
        loadHorariosData();
      }, 10000);
    },
    [clearUndoTimer, loadHorariosData],
  );

  const undoStaffChange = useCallback(async () => {
    const u = stateRef.current.undoStaff;
    if (!u) return;
    clearUndoTimer();
    await sb('staff', {
      method: 'PATCH',
      query: { id: 'eq.' + u.id },
      body: { nombre: u.prev.nombre, area: u.prev.area, activo: u.prev.activo },
    });
    setUndoStaff(null);
    await loadHorariosData();
  }, [clearUndoTimer, loadHorariosData]);

  const saveStaffEdit = useCallback(
    async (id, prev, nombre, area) => {
      await sb('staff', {
        method: 'PATCH',
        query: { id: 'eq.' + id },
        body: { nombre, area },
      });
      setUndoStaffTimed({ id, prev, kind: 'edit', until: Date.now() + 10000 });
      await loadHorariosData();
    },
    [loadHorariosData, setUndoStaffTimed],
  );

  const deleteStaff = useCallback(
    async (id, prev) => {
      await sb('staff', {
        method: 'PATCH',
        query: { id: 'eq.' + id },
        body: { activo: false },
      });
      setUndoStaffTimed({ id, prev, kind: 'delete', until: Date.now() + 10000 });
      await loadHorariosData();
    },
    [loadHorariosData, setUndoStaffTimed],
  );

  const submitStaff = useCallback(
    async (nombre, area) => {
      await sb('staff', {
        method: 'POST',
        body: { nombre, area, activo: true },
        prefer: 'return=representation',
      });
      await loadHorariosData();
    },
    [loadHorariosData],
  );

  const submitEvent = useCallback(
    async (body) => {
      await sb('eventos', { method: 'POST', body, prefer: 'return=representation' });
      await loadReservacionesData(body.week_start);
      await loadHorariosData();
    },
    [loadHorariosData, loadReservacionesData],
  );

  const deleteEvent = useCallback(
    async (id, week) => {
      await sb('eventos', { method: 'DELETE', query: { id: 'eq.' + id } });
      await loadReservacionesData(week);
      await loadHorariosData();
    },
    [loadHorariosData, loadReservacionesData],
  );

  const exportScheduleXLSX = useCallback(async () => {
    const XLSX = await ensureXLSX();
    const s = stateRef.current;
    const days = weekDays(s.horariosWeek);
    const aoa = [
      ['Semana ' + weekNum(s.horariosWeek) + ' · ' + weekRangeTitle(s.horariosWeek)],
      ['Cántaros, Cazos y Cantares · Calle Sol #840 Oriente, Ciudad Juárez'],
      [],
      ['#', 'Nombre'].concat(days.map((d, i) => DIAS[i])),
    ];
    const shiftMap = {};
    s.horarios.forEach((h) => {
      shiftMap[h.staff_id + '|' + h.dia] = h.turno || '';
    });
    let n = 0;
    AREAS.forEach((area) => {
      const members = s.staff.filter((x) => x.area === area);
      if (!members.length) return;
      aoa.push([area]);
      members.forEach((m) => {
        n++;
        aoa.push([n, m.nombre].concat(days.map((d) => shiftMap[m.id + '|' + toISODate(d)] || '')));
      });
    });
    if (s.eventos.length) {
      aoa.push([]);
      aoa.push(['Reservaciones de la semana']);
      aoa.push(['Día', 'Hora', 'Reservación', 'Tipo', 'Personas', 'Anticipo', 'Notas']);
      s.eventos.forEach((e) => {
        const d = days.find((x) => toISODate(x) === e.dia);
        const label = d ? DIAS[days.indexOf(d)] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()] : e.dia;
        aoa.push([label, e.hora || '', e.titulo, e.tipo_evento || '', e.personas || '', e.anticipo != null ? num(e.anticipo) : '', e.nota || '']);
      });
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horarios');
    const fname = 'horarios-semana' + weekNum(s.horariosWeek) + '-' + s.horariosWeek + '.xlsx';
    XLSX.writeFile(wb, fname);
    return fname;
  }, []);

  const exportReservationsXLSX = useCallback(async () => {
    const XLSX = await ensureXLSX();
    const s = stateRef.current;
    const days = weekDays(s.reservacionesWeek);
    const aoa = [
      ['Semana ' + weekNum(s.reservacionesWeek) + ' · ' + reservationsRangeTitle(s.reservacionesWeek)],
      ['Cántaros, Cazos y Cantares · Calle Sol #840 Oriente, Ciudad Juárez'],
      [],
      ['Día', 'Hora', 'Reservación', 'Tipo', 'Personas', 'Anticipo', 'Notas'],
    ];
    s.reservaciones.forEach((e) => {
      const d = days.find((x) => toISODate(x) === e.dia);
      const label = d ? DIAS[days.indexOf(d)] + ' ' + d.getDate() + ' ' + MESES[d.getMonth()] : e.dia;
      aoa.push([label, e.hora || '', e.titulo, e.tipo_evento || '', e.personas || '', e.anticipo != null ? num(e.anticipo) : '', e.nota || '']);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 34 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 36 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservaciones');
    const fname = 'reservaciones-semana' + weekNum(s.reservacionesWeek) + '-' + s.reservacionesWeek + '.xlsx';
    XLSX.writeFile(wb, fname);
    return fname;
  }, []);

  const value = useMemo(
    () => ({
      live, liveError, configNeeded, statusText,
      weeks, selectedWeek, period, horariosWeek,
      products, productsByClave, salesRows, salesDesc,
      invResumen, invBarra, invCocina, invWeekBarra, invWeekCocina,
      docs, staff, horarios, eventos, horariosReady, loaded,
      reservacionesWeek, reservaciones,
      ventasMeseroAll, waiterWeeks, waiterWeek, waiterSortDir,
      undoStaff,
      setLive, setStatusText, setSelectedWeek, setPeriod, setHorariosWeek,
      setWaiterWeek, setWaiterSortDir,
      boot, loadAll, loadWeekData, loadHorariosData, loadReservacionesData,
      changeWeek, changePeriod, changeHorariosWeek, changeReservacionesWeek,
      refreshWaiterSales, submitWaiterSale, deleteWaiterSale,
      uploadPOS, uploadInventory,
      refreshUploadedWeeks, deleteWeek,
      reloadDocs, uploadDoc, deleteDoc,
      saveShift, saveStaffEdit, deleteStaff, undoStaffChange, submitStaff,
      submitEvent, deleteEvent, exportScheduleXLSX, exportReservationsXLSX,
      invSummaryFor: (area) =>
        invSummary(
          stateRef.current.invResumen,
          area,
          area === 'barra' ? stateRef.current.invWeekBarra : stateRef.current.invWeekCocina,
          area === 'barra' ? stateRef.current.invBarra : stateRef.current.invCocina,
        ),
    }),
    [
      live, liveError, configNeeded, statusText, weeks, selectedWeek, period,
      horariosWeek, products, productsByClave, salesRows, salesDesc, invResumen,
      invBarra, invCocina, invWeekBarra, invWeekCocina, docs, staff, horarios,
      eventos, horariosReady, loaded, reservacionesWeek, reservaciones,
      ventasMeseroAll, waiterWeeks, waiterWeek,
      waiterSortDir, undoStaff, boot, loadAll, loadWeekData, loadHorariosData,
      loadReservacionesData, changeWeek, changePeriod, changeHorariosWeek,
      changeReservacionesWeek, refreshWaiterSales, submitWaiterSale,
      deleteWaiterSale, uploadPOS, uploadInventory, refreshUploadedWeeks,
      deleteWeek, reloadDocs, uploadDoc, deleteDoc, saveShift, saveStaffEdit,
      deleteStaff, undoStaffChange, submitStaff, submitEvent, deleteEvent,
      exportScheduleXLSX, exportReservationsXLSX,
    ],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
