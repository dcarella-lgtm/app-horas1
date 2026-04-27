// Módulo para manipulación del DOM y eventos de la interfaz
import { getDetalleFeriado, analizarTipoEvento } from "./config.js";

// Función unificada para ocultar todo y mostrar el estado deseado
function toggleStates(prefix, state) {
    const ids = ['loading-state', 'empty-state', 'error-state', 'registros-grid', 'registros-table', 'emp-semanas-container', 'actions', 'action-ver-empleados'];
    ids.forEach(id => {
        const elId = prefix ? `${prefix}-${id}` : id;
        const el = document.getElementById(elId);
        if (el) el.style.display = 'none';
    });

    const activeId = prefix ? `${prefix}-${state}-state` : `${state}-state`;
    if (state === 'table') {
        const gridId = prefix ? `${prefix}-registros-grid` : 'registros-grid';
        const tblId = prefix ? `${prefix}-registros-table` : 'registros-table';
        const semId = prefix ? `${prefix}-semanas-container` : 'emp-semanas-container';
        const actionBtnId = prefix ? `${prefix}-action-ver-empleados` : 'action-ver-empleados';
        
        const grid = document.getElementById(gridId);
        if (grid) grid.style.display = 'grid';
        
        const tbl = document.getElementById(tblId);
        if (tbl) tbl.style.display = 'table';
        
        const sem = document.getElementById(semId);
        if (sem) sem.style.display = 'flex';
        
        const actsId = prefix ? `${prefix}-actions` : 'actions';
        const acts = document.getElementById(actsId);
        if (acts) acts.style.display = 'block';

        const actionBtn = document.getElementById(actionBtnId);
        if (actionBtn) actionBtn.style.display = 'block';
    } else {
        const el = document.getElementById(activeId);
        if (el) el.style.display = 'block';
    }
}

// Convertidor de decimal de Excel (0-1) a formato HH:mm (solo propósitos visuales)
export function convertirHoraDecimal(valor) {
    if (valor === null || valor === undefined || valor === "" || valor === 0) return "-";
    
    let num = Number(valor);
    if (isNaN(num)) return valor; 

    // Si el número es mayor a 1, asumimos que se guardó como horas decimales (ej 8.5)
    // Lo normalizamos a fracción Excel (0-1) para el cálculo visual
    if (num > 1) {
        num = num / 24;
    }

    // Excel guarda horas como fracción de un día (0 a 1)
    const hoursFloat = num * 24;
    const hours = Math.floor(hoursFloat);
    const minsFloat = (hoursFloat - hours) * 60;
    const mins = Math.round(minsFloat);
    
    // Si da exactamente 24h y no es acumulativo de días, usualmente redondeamos a 00
    const calcH = hours >= 24 ? 0 : hours;

    const hh = String(calcH).padStart(2, '0');
    const mm = String(mins).padStart(2, '0');

    return `${hh}:${mm}`;
}

export function showLoading(isEmpleado = false) { toggleStates(isEmpleado ? 'emp' : '', 'loading'); }
export function showEmpty(isEmpleado = false) { toggleStates(isEmpleado ? 'emp' : '', 'empty'); }
export function showError(isEmpleado = false) { toggleStates(isEmpleado ? 'emp' : '', 'error'); }

// Helper para agrupar registros por semana ISO (comienza lunes)
export function agruparPorSemana(registros) {
    const semanas = {};
    
    registros.forEach(r => {
        const date = new Date(r.fecha + 'T12:00:00'); // Usar mediodía para evitar problemas de TZ
        if (isNaN(date.getTime())) return;

        // Cálculo de Semana ISO
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        
        const year = d.getUTCFullYear();
        const key = `${year}-W${weekNo}`;

        if (!semanas[key]) {
            semanas[key] = {
                weekNo,
                year,
                registros: []
            };
        }
        semanas[key].registros.push(r);
    });

    // Ordenar semanas cronológicamente
    return Object.keys(semanas)
        .sort()
        .reduce((obj, key) => {
            obj[key] = semanas[key];
            return obj;
        }, {});
}

export function renderRegistros(registros) {
    console.log("[UI] Renderizando registros...", registros?.length);
    try {
        if (!registros || registros.length === 0) {
            showEmpty(false);
            return;
        }

        // 1. KPIs
        const kpiContainer = document.getElementById('kpi-container');
        if (kpiContainer) {
            const totalErrores = registros.filter(r => r.estado === 'rechazado').length;
            const totalRevision = registros.filter(r => r.estado === 'revision' || r.estado === 'pendiente').length;
            const totalAprobados = registros.filter(r => r.estado === 'aprobado').length;
            const totalHoras = registros.reduce((acc, r) => acc + (Number(r.total_50||0) + Number(r.total_100||0) + Number(r.total_feriado||0)), 0);

            kpiContainer.innerHTML = `
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
                    <div class="flex justify-between items-start"><p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Con errores</p><span class="bg-red-50 text-red-500 p-1.5 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></span></div>
                    <h3 class="text-3xl font-black text-slate-800 mt-2">${totalErrores}</h3>
                    <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Requieren atención inmediata</p>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
                    <div class="flex justify-between items-start"><p class="text-xs font-bold text-slate-400 uppercase tracking-widest">En revisión / Pend.</p><span class="bg-amber-50 text-amber-500 p-1.5 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span></div>
                    <h3 class="text-3xl font-black text-slate-800 mt-2">${totalRevision}</h3>
                    <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Pendientes de aprobación</p>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
                    <div class="flex justify-between items-start"><p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Aprobados</p><span class="bg-emerald-50 text-emerald-500 p-1.5 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></span></div>
                    <h3 class="text-3xl font-black text-slate-800 mt-2">${totalAprobados}</h3>
                    <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Listos para liquidación</p>
                </div>
                <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-600">
                    <div class="flex justify-between items-start"><p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Horas Totales</p><span class="bg-blue-50 text-blue-600 p-1.5 rounded-lg"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></span></div>
                    <h3 class="text-3xl font-black text-slate-800 mt-2">${(totalHoras || 0).toFixed(1)} <span class="text-lg font-bold text-slate-400">hs</span></h3>
                    <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Acumulado del periodo</p>
                </div>
            `;
        }

        // 2. Alertas
        const alertsContainer = document.getElementById('alerts-container');
        if (alertsContainer) {
            const cantErrores = registros.filter(r => r.estado === 'rechazado').length;
            const cantWarnings = registros.filter(r => r.estado === 'pendiente' || r.estado === 'revision').length;
            
            if (cantErrores === 0 && cantWarnings === 0) {
                alertsContainer.innerHTML = `<div class="flex items-center justify-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200"><span class="text-emerald-600 font-bold text-lg flex items-center gap-2"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>Sin alertas — todo listo para liquidar</span></div>`;
            } else {
                let html = '<div class="flex flex-col gap-2">';
                if (cantErrores > 0) html += `<div class="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 shadow-sm"><span class="text-lg">🔴</span><span class="font-semibold text-sm">${cantErrores} empleado(s) con inconsistencias críticas</span></div>`;
                if (cantWarnings > 0) html += `<div class="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 shadow-sm"><span class="text-lg">🟡</span><span class="font-semibold text-sm">${cantWarnings} empleado(s) pendientes de revisión</span></div>`;
                html += '</div>';
                alertsContainer.innerHTML = html;
            }
            alertsContainer.style.display = 'block';
        }

        toggleStates('', 'table');

        // 3. Analytics
        const analyticsContainer = document.getElementById('analytics-container');
        if (analyticsContainer) {
            let sum50 = 0, sum100 = 0, sumFer = 0;
            registros.forEach(r => {
                sum50 += Number(r.total_50 || 0);
                sum100 += Number(r.total_100 || 0);
                sumFer += Number(r.total_feriado || 0);
            });
            const totalH = sum50 + sum100 + sumFer;
            const pct50 = totalH > 0 ? (sum50 / totalH * 100).toFixed(1) : 0;
            const pct100 = totalH > 0 ? (sum100 / totalH * 100).toFixed(1) : 0;
            const pctFer = totalH > 0 ? (sumFer / totalH * 100).toFixed(1) : 0;
            
            const sortedByHours = [...registros].map(r => ({...r, th: Number(r.total_50||0)+Number(r.total_100||0)+Number(r.total_feriado||0)}))
                .sort((a,b) => b.th - a.th).slice(0, 5);
                
            let topHtml = '';
            sortedByHours.forEach((r, i) => {
                topHtml += `<div class="flex items-center justify-between p-2 border-b border-slate-50 last:border-0"><div class="flex items-center gap-3"><span class="font-bold text-slate-300 text-sm">${i+1}.</span><p class="text-sm font-bold text-slate-800">${r.nombre || '-'}</p></div><span class="text-sm font-black text-blue-600">${r.th.toFixed(1)} hs</span></div>`;
            });

            // Ranking problemas
            const problemRecords = registros.filter(r => r.estado === 'rechazado' || r.estado === 'revision' || r.estado === 'pendiente');
            const sortedProblems = problemRecords.sort((a,b) => {
                if (a.estado === 'rechazado' && b.estado !== 'rechazado') return -1;
                if (b.estado === 'rechazado' && a.estado !== 'rechazado') return 1;
                return 0;
            }).slice(0, 5);

            let problemsHtml = '';
            if (sortedProblems.length === 0) {
                problemsHtml = `<div class="p-6 text-center h-full flex flex-col justify-center items-center gap-2"><span class="text-3xl">🏆</span><span class="text-sm font-bold text-emerald-600">Todo el equipo al día, sin problemas.</span></div>`;
            } else {
                sortedProblems.forEach(r => {
                    problemsHtml += `
                        <div class="flex items-center justify-between p-3 mb-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100/50 transition-colors">
                            <div class="flex flex-col">
                                <span class="font-bold text-slate-800 text-sm">${r.nombre || '-'}</span>
                                <span class="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">${r.estado} en periodo</span>
                            </div>
                            <span class="text-lg">
                                ${r.estado === 'rechazado' ? '🔴' : '🟡'}
                            </span>
                        </div>
                    `;
                });
            }

            analyticsContainer.innerHTML = `
                <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-100 lg:col-span-2">
                    <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">Distribución de Horas Extras</h3>
                    <div class="w-full h-8 flex rounded-xl overflow-hidden bg-slate-100 mb-4">
                        <div style="width: ${pct50}%" class="bg-blue-500"></div><div style="width: ${pct100}%" class="bg-violet-500"></div><div style="width: ${pctFer}%" class="bg-emerald-500"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-4">
                        <div><p class="text-[10px] font-bold text-slate-400">AL 50%</p><p class="text-xl font-black">${sum50.toFixed(1)} hs</p></div>
                        <div><p class="text-[10px] font-bold text-slate-400">AL 100%</p><p class="text-xl font-black">${sum100.toFixed(1)} hs</p></div>
                        <div><p class="text-[10px] font-bold text-slate-400">FERIADO</p><p class="text-xl font-black">${sumFer.toFixed(1)} hs</p></div>
                    </div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-100 h-full">
                    <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">Top 5 Horas Extras</h3>
                    <div class="flex flex-col gap-1">${topHtml || 'No hay datos'}</div>
                </div>
                <div class="bg-white rounded-xl shadow-sm p-6 border border-slate-100 h-full">
                    <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2">Estado del equipo</h3>
                    <div class="flex-1 flex flex-col mt-2">${problemsHtml}</div>
                </div>
            `;
            analyticsContainer.style.display = 'grid';
        }
    } catch (err) {
        console.error("[UI] Error en render:", err);
    }
}

export function renderEmpleadoData(registros) {
    const container = document.getElementById('emp-semanas-container');
    if (!container) return; 
    
    if (!registros || registros.length === 0) {
        showEmpty(true);
        return;
    }

    const title = document.getElementById('empleado-legajo-title');
    if (title) title.innerText = `${registros[0].nombre} (${registros[0].legajo})`;

    toggleStates('emp', 'table');
    
    // Guardar copia global
    window.__currentEmpleadoRecords = registros;
    
    const todosAprobados = registros.every(r => r.estado === 'aprobado');
    let estadoGeneral = 'pendiente';
    if (todosAprobados) estadoGeneral = 'aprobado';
    else if (registros.some(r => r.estado === 'rechazado')) estadoGeneral = 'rechazado';
    else if (registros.some(r => r.estado === 'revision')) estadoGeneral = 'revision';

    const estadoBadge = document.getElementById('empleado-estado-badge');
    const btnAprobar = document.getElementById('btn-aprobar-empleado');
    const btnGuardar = document.getElementById('btn-guardar-empleado');

    if (estadoBadge) {
        let colorClass = 'bg-slate-100 text-slate-600';
        if (estadoGeneral === 'aprobado') colorClass = 'bg-emerald-100 text-emerald-700';
        else if (estadoGeneral === 'rechazado') colorClass = 'bg-red-100 text-red-700';
        else if (estadoGeneral === 'revision') colorClass = 'bg-amber-100 text-amber-700';

        estadoBadge.innerText = estadoGeneral.toUpperCase();
        estadoBadge.className = `text-xs font-bold rounded-full px-3 py-1 ${colorClass}`;
        estadoBadge.style = ''; // Limpiar inline anterior
    }

    if (btnAprobar) btnAprobar.style.display = todosAprobados ? 'none' : 'inline-flex';
    if (btnGuardar) btnGuardar.style.display = todosAprobados ? 'none' : 'inline-flex';

    const isDisabled = todosAprobados;
    let __empRowErrors = 0;
    let __empRowWarnings = 0;

    const semanas = agruparPorSemana(registros);
    const listContainer = container;
    listContainer.innerHTML = '';
    listContainer.className = 'flex flex-col gap-8 mt-2';

    Object.keys(semanas).forEach(weekKey => {
        const weekData = semanas[weekKey];
        const weekBlock = document.createElement('div');
        weekBlock.className = 'bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden';
        
        // Header de Semana
        const firstDay = weekData.registros[0].fecha.split('-').reverse().join('/');
        const lastDay = weekData.registros[weekData.registros.length - 1].fecha.split('-').reverse().join('/');
        
        weekBlock.innerHTML = `
            <div class="bg-slate-50/50 px-6 py-3 border-bottom border-slate-100 flex justify-between items-center sticky top-0 z-10 backdrop-blur-sm">
                <h3 class="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Semana ${weekData.weekNo} <span class="text-slate-400 font-normal ml-2">(${firstDay} — ${lastDay})</span>
                </h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm border-separate border-spacing-0">
                    <thead>
                        <tr class="bg-slate-50/30">
                            <th class="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Día / Fecha</th>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Entrada</th>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 border-r border-slate-100">Salida</th>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-blue-400 uppercase border-b border-slate-100 bg-blue-50/30">50%</th>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-blue-400 uppercase border-b border-slate-100 bg-blue-50/30">100%</th>
                            <th class="px-4 py-2 text-center text-[10px] font-bold text-blue-400 uppercase border-b border-slate-100 border-r border-slate-100 bg-blue-50/30">Feriado</th>
                            <th class="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">Feedback Manager</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50" id="tbody-${weekKey}"></tbody>
                </table>
            </div>
        `;
        
        const weekTbody = weekBlock.querySelector(`#tbody-${weekKey}`);
        
        weekData.registros.forEach(r => {
            const tr = document.createElement('tr');
            
            // Lógica de fecha y feriado
            const temp = new Date(r.fecha + 'T12:00:00');
            const diaInt = temp.getDay();
            const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            const isWeekend = diaInt === 0 || diaInt === 6;
            const nombreFeriado = getDetalleFeriado(r.fecha);
            const isFeriado = nombreFeriado !== null;

            const actIngreso = r.hora_ingreso && r.hora_ingreso !== 0 ? convertirHoraDecimal(r.hora_ingreso) : null;
            const actSalida = r.hora_salida && r.hora_salida !== 0 ? convertirHoraDecimal(r.hora_salida) : null;
            const isNoActivity = !actIngreso && !actSalida;

            // Validaciones
            const diff50 = Number(r.horas_50_auto || 0) !== Number(r.horas_50_manager || 0);
            const diff100 = Number(r.horas_100_auto || 0) !== Number(r.horas_100_manager || 0);
            const diffFer = Number(r.horas_feriado_auto || 0) !== Number(r.horas_feriado_manager || 0);
            const hasDiff = diff50 || diff100 || diffFer;
            
            const isMissingPunch = (actIngreso && !actSalida) || (!actIngreso && actSalida);

            let rowLevel = 'ok';
            let errorReason = '';
            let warningReason = '';

            const evento = analizarTipoEvento(r);
            const isDemora = evento.tipo === 'demora';

            const isAusenciaInvalida = !r.ausencias || r.ausencias.toUpperCase().includes('DETALLAR AUSENCIA');

            if (isMissingPunch) {
                rowLevel = 'error';
                errorReason = 'Fichada Incompleta';
                __empRowErrors++;
            } else if (diaInt === 0 && Number(r.horas_50_manager || 0) > 0) {
                rowLevel = 'error';
                errorReason = 'Horas al 50% en Domingo';
                __empRowErrors++;
            } else if (hasDiff) {
                rowLevel = 'warning';
                warningReason = 'Modificado por Mánager';
                __empRowWarnings++;
            } else if (isDemora) {
                rowLevel = 'warning';
                warningReason = 'Demora / Menor Jornada';
                __empRowWarnings++;
            } else if (isNoActivity && isAusenciaInvalida && !isWeekend && !isFeriado) {
                rowLevel = 'warning';
                warningReason = 'Ausencia sin justificar';
                __empRowWarnings++;
            } else if (isFeriado && Number(r.horas_feriado_manager || 0) === 0 && !isNoActivity) {
                rowLevel = 'warning';
                warningReason = 'Feriado sin horas';
                __empRowWarnings++;
            }

            const tdFirstClass = rowLevel === 'error' ? 'border-l-4 border-red-500' : rowLevel === 'warning' ? 'border-l-4 border-amber-500' : 'border-l-4 border-transparent';
            const rowClass = rowLevel === 'error' ? 'bg-red-50/80 text-slate-800' : rowLevel === 'warning' ? 'bg-amber-50/80 text-slate-800' : 'hover:bg-slate-50 transition-colors opacity-60 hover:opacity-100 grayscale hover:grayscale-0';

            const notionInput = (val, fieldId, isDiff = false) => {
                const disabled = isDisabled ? 'disabled' : '';
                let bgClass = 'bg-slate-100/50 border border-transparent text-slate-400 hover:bg-slate-200/50';
                
                if (rowLevel === 'error') {
                    bgClass = isDiff ? 'bg-white border-2 border-red-500 text-red-700 shadow-md ring-2 ring-red-100' : 'bg-white/60 border border-red-200 text-red-900/50 hover:bg-white';
                } else if (rowLevel === 'warning') {
                    bgClass = isDiff ? 'bg-white border-2 border-amber-500 text-amber-800 shadow-md ring-2 ring-amber-200' : 'bg-white border-2 border-amber-300 text-amber-900 shadow-sm placeholder-amber-300';
                }

                return `<input type="number" step="0.5" class="edit-input w-full rounded-lg px-2 py-1.5 text-center font-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${bgClass} ${disabled}" 
                        data-id="${r.id}" data-field="${fieldId}" value="${val || 0}">`;
            };

            const systemBadge = (val) => `<span class="text-[9px] font-bold uppercase tracking-widest ${rowLevel === 'ok' ? 'text-slate-300' : 'text-slate-500'} block mb-1.5">Sist: ${val || 0}</span>`;

            tr.className = rowClass;
            tr.innerHTML = `
                <td class="px-4 py-4 align-top ${tdFirstClass}">
                    <div class="flex flex-col">
                        <span class="font-black text-slate-700 text-base leading-none">${dias[diaInt]}</span>
                        <span class="text-[10px] text-slate-500 font-bold tracking-widest mt-1">${r.fecha.split('-').reverse().join('/')}</span>
                        ${isFeriado ? `<span class="mt-2 text-[9px] bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md font-bold uppercase w-fit shadow-sm">🎉 ${nombreFeriado}</span>` : ''}
                        ${r.ausencias ? `<span class="mt-2 text-[9px] bg-amber-100 text-amber-800 px-2 py-1 rounded-md font-bold uppercase w-fit shadow-sm border border-amber-200">📋 ${r.ausencias}</span>` : ''}
                    </div>
                </td>
                <td class="px-4 py-4 text-center font-semibold text-slate-600 align-middle">${actIngreso || '-'}</td>
                <td class="px-4 py-4 text-center font-semibold text-slate-600 align-middle border-r border-slate-200/50">${actSalida || '-'}</td>
                <td class="px-4 py-4 text-center ${rowLevel==='ok'?'bg-blue-50/20':'bg-blue-50/40'} align-middle">
                    ${systemBadge(r.horas_50_auto)} ${notionInput(r.horas_50_manager, 'horas_50_manager', diff50)}
                </td>
                <td class="px-4 py-4 text-center ${rowLevel==='ok'?'bg-blue-50/20':'bg-blue-50/40'} align-middle">
                    ${systemBadge(r.horas_100_auto)} ${notionInput(r.horas_100_manager, 'horas_100_manager', diff100)}
                </td>
                <td class="px-4 py-4 text-center ${rowLevel==='ok'?'bg-blue-50/20':'bg-blue-50/40'} align-middle border-r border-slate-200/50">
                    ${systemBadge(r.horas_feriado_auto)} ${notionInput(r.horas_feriado_manager, 'horas_feriado_manager', diffFer)}
                </td>

                <td class="px-4 py-3 align-top">
                    <input type="text" class="edit-input w-full bg-transparent border-none text-xs text-slate-600 focus:bg-white focus:ring-1 focus:ring-slate-200 p-1 rounded ${isDisabled ? 'disabled' : ''}" 
                           data-id="${r.id}" data-field="comentarios" placeholder="Agregar comentario..." value="${r.comentarios || ''}">
                    ${rowLevel === 'error' ? `<p class="text-[10px] text-red-500 font-bold mt-1 uppercase">⚠ ${errorReason}</p>` : 
                      rowLevel === 'warning' ? `<p class="text-[10px] text-amber-600 font-bold mt-1 uppercase">⚠ ${warningReason}</p>` : ''}
                </td>
            `;
            weekTbody.appendChild(tr);
        });

        listContainer.appendChild(weekBlock);
    });

    const oldSecciones = document.getElementById('emp-semanas-container-old'); // Cleanup si existiera 
    // container.insertBefore(listContainer, document.getElementById('emp-actions')); // Ya no es necesario

    // Actualizar contadores
    const counterBadge = document.getElementById('empleado-status-counters');
    if (counterBadge) {
        counterBadge.innerHTML = `
            <span class="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-red-100 ${__empRowErrors === 0 ? 'hidden' : ''}">
                <span class="h-1.5 w-1.5 rounded-full bg-red-500"></span> ${__empRowErrors} Error${__empRowErrors>1?'es':''}
            </span>
            <span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-amber-100 ${__empRowWarnings === 0 ? 'hidden' : ''}">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span> ${__empRowWarnings} Advertencia${__empRowWarnings>1?'s':''}
            </span>
        `;
    }

    if (btnAprobar && !isDisabled) {
        if (__empRowErrors > 0) {
            btnAprobar.disabled = true;
            btnAprobar.className = "bg-slate-200 text-slate-400 px-5 py-2.5 rounded-lg font-bold cursor-not-allowed flex items-center gap-2";
            btnAprobar.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> Resolver errores para aprobar`;
        } else {
            btnAprobar.disabled = false;
            btnAprobar.className = "bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all duration-150 ease-in-out flex items-center gap-2";
            btnAprobar.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Aprobar Reporte`;
        }
    }
}

// ============================================================
// GENERADOR DE FEEDBACK VISUAL (TOASTS) Módulo Exportable
// ============================================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Interfaz flotante arriba a la derecha
        container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.innerText = message;
    
    // Paleta de colores requerida
    let bg = '#757575'; // info, gris
    if (type === 'success') bg = '#4CAF50'; // éxito, verde
    else if (type === 'error') bg = '#F44336'; // error, rojo
    else if (type === 'warning') bg = '#FF9800'; // advertencia, naranja

    toast.style.cssText = `
        background-color: ${bg};
        color: white;
        padding: 15px 25px;
        border-radius: 6px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        font-family: inherit;
        font-weight: 500;
        font-size: 15px;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        max-width: 320px;
        word-wrap: break-word;
        pointer-events: auto;
    `;

    container.appendChild(toast);

    // Animacion Entrada
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Auto eliminar luego de 3-4 segundos (3.5s)
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        // Remover el elemento del DOM tras terminar la transicion
        setTimeout(() => toast.remove(), 300);
    }, 3500); 
}

// Exportación explícita al final del archivo para máxima compatibilidad ES
export { showToast };
