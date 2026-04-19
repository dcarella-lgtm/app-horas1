// Módulo para manipulación del DOM y eventos de la interfaz
import { getDetalleFeriado } from "./config.js";

// Función unificada para ocultar todo y mostrar el estado deseado
function toggleStates(prefix, state) {
    const ids = ['loading-state', 'empty-state', 'error-state', 'registros-grid', 'registros-table', 'emp-semanas-container', 'actions'];
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
        
        const grid = document.getElementById(gridId);
        if (grid) grid.style.display = 'grid';
        
        const tbl = document.getElementById(tblId);
        if (tbl) tbl.style.display = 'table';
        
        const sem = document.getElementById(semId);
        if (sem) sem.style.display = 'flex';
        
        const actsId = prefix ? `${prefix}-actions` : 'actions';
        const acts = document.getElementById(actsId);
        if (acts) acts.style.display = 'block';
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
    const grid = document.getElementById('registros-grid');
    if (!grid) return; 
    
    if (!registros || registros.length === 0) {
        showEmpty(false);
        return;
    }

    // Lógica Fase 2: Cálculo de KPIs basados en empleados agrupados
    const kpiContainer = document.getElementById('kpi-container');
    if (kpiContainer) {
        const totalErrores = registros.filter(r => r.estado === 'rechazado').length;
        const totalRevision = registros.filter(r => r.estado === 'revision' || r.estado === 'pendiente').length;
        const totalAprobados = registros.filter(r => r.estado === 'aprobado').length;
        const totalHoras = registros.reduce((acc, r) => acc + (Number(r.total_50||0) + Number(r.total_100||0) + Number(r.total_feriado||0)), 0);

        kpiContainer.innerHTML = `
            <!-- Card: Errores -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-red-500">
                <div class="flex justify-between items-start">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Con errores</p>
                    <span class="bg-red-50 text-red-500 p-1.5 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </span>
                </div>
                <h3 class="text-3xl font-black text-slate-800 mt-2">${totalErrores}</h3>
                <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Requieren atención inmediata</p>
            </div>

            <!-- Card: Revisión -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-amber-500">
                <div class="flex justify-between items-start">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">En revisión / Pend.</p>
                    <span class="bg-amber-50 text-amber-500 p-1.5 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </span>
                </div>
                <h3 class="text-3xl font-black text-slate-800 mt-2">${totalRevision}</h3>
                <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Pendientes de aprobación</p>
            </div>

            <!-- Card: Aprobados -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
                <div class="flex justify-between items-start">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Aprobados</p>
                    <span class="bg-emerald-50 text-emerald-500 p-1.5 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    </span>
                </div>
                <h3 class="text-3xl font-black text-slate-800 mt-2">${totalAprobados}</h3>
                <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Listos para liquidación</p>
            </div>

            <!-- Card: Horas Totales -->
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-blue-600">
                <div class="flex justify-between items-start">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Horas Totales</p>
                    <span class="bg-blue-50 text-blue-600 p-1.5 rounded-lg">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </span>
                </div>
                <h3 class="text-3xl font-black text-slate-800 mt-2">${totalHoras.toFixed(1)} <span class="text-lg font-bold text-slate-400">hs</span></h3>
                <p class="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-tight">Acumulado del periodo</p>
            </div>
        `;
    }

    toggleStates('', 'table');
    grid.innerHTML = '';

    // Fragmento para performance
    const fragment = document.createDocumentFragment();

    registros.forEach(r => {
        const totalExtras = Number(r.total_50||0) + Number(r.total_100||0) + Number(r.total_feriado||0);
        const estadoLimpio = r.estado ? r.estado.toLowerCase() : 'pendiente';
        
        // Determinar si hay errores/warnings (simulado o basado en lógica)
        // Nota: En el dashboard agrupado, necesitaríamos saber si algún día del empleado tiene error.
        // Por ahora usamos una lógica visual si el estado es 'revision' o si hay extras sin aprobar.
        const hasWarning = estadoLimpio === 'revision';
        const hasError = estadoLimpio === 'rechazado';
        
        const card = document.createElement('div');
        card.className = `group bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer flex flex-col justify-between gap-4 ${hasError ? 'ring-2 ring-red-500 ring-offset-2' : ''}`;
        
        card.onclick = () => { window.location.href = `empleado.html?legajo=${r.legajo}`; };

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">${r.nombre || '-'}</h3>
                    <p class="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-0.5">Legajo: ${r.legajo || '-'}</p>
                </div>
                <span class="badge ${estadoLimpio}">${estadoLimpio}</span>
            </div>

            <div class="grid grid-cols-2 gap-4 my-2">
                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p class="text-[10px] uppercase font-bold text-slate-400 mb-1">Días Reportados</p>
                    <p class="text-xl font-bold text-slate-700">${r.dias || 0} <span class="text-sm font-normal text-slate-400">días</span></p>
                </div>
                <div class="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <p class="text-[10px] uppercase font-bold text-blue-400 mb-1">Total Extras</p>
                    <p class="text-xl font-bold text-blue-700">${totalExtras > 0 ? (totalExtras + ' hs') : '-'}</p>
                </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-slate-50">
                <div class="flex items-center gap-1.5">
                    ${hasError ? '<span class="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span><span class="text-xs font-bold text-red-600">Requiere Acción Urgente</span>' : 
                      hasWarning ? '<span class="flex h-2 w-2 rounded-full bg-amber-500"></span><span class="text-xs font-bold text-amber-600">Revisión pendiente</span>' :
                      '<span class="flex h-2 w-2 rounded-full bg-emerald-500"></span><span class="text-xs font-bold text-emerald-600">Todo en orden</span>'}
                </div>
                <button class="text-blue-600 group-hover:translate-x-1 transition-transform">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                </button>
            </div>
        `;
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
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
            
            let rowLevel = 'ok';
            if (hasDiff || (diaInt === 0 && Number(r.horas_50_manager || 0) > 0)) {
                rowLevel = 'error';
                __empRowErrors++;
            } else if ((isNoActivity && !r.ausencias && !isWeekend) || (isFeriado && Number(r.horas_feriado_manager || 0) === 0 && !isNoActivity)) {
                rowLevel = 'warning';
                __empRowWarnings++;
            }

            const rowClass = rowLevel === 'error' ? 'bg-red-50/50' : rowLevel === 'warning' ? 'bg-amber-50/50' : 'hover:bg-slate-50/50 transition-colors';

            const notionInput = (val, fieldId, type = 'number') => {
                const disabled = isDisabled ? 'disabled' : '';
                return `<input type="${type}" step="0.5" class="edit-input w-full bg-slate-100/50 border-none rounded px-2 py-1 text-center font-bold text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all ${disabled}" 
                        data-id="${r.id}" data-field="${fieldId}" value="${val || 0}">`;
            };

            const systemBadge = (val) => `<span class="text-[10px] font-bold text-slate-400 block mb-1">${val || 0}</span>`;

            tr.className = rowClass;
            tr.innerHTML = `
                <td class="px-4 py-3 align-top">
                    <div class="flex flex-col">
                        <span class="font-bold text-slate-700">${dias[diaInt]}</span>
                        <span class="text-[10px] text-slate-400 font-medium">${r.fecha.split('-').reverse().join('/')}</span>
                        ${isFeriado ? `<span class="mt-1 text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase w-fit">🎉 ${nombreFeriado}</span>` : ''}
                    </div>
                </td>
                <td class="px-4 py-3 text-center text-slate-500 align-middle">${actIngreso || '-'}</td>
                <td class="px-4 py-3 text-center text-slate-500 align-middle border-r border-slate-50">${actSalida || '-'}</td>
                <td class="px-4 py-3 text-center bg-blue-50/20 align-middle">
                    ${systemBadge(r.horas_50_auto)} ${notionInput(r.horas_50_manager, 'horas_50_manager')}
                </td>
                <td class="px-4 py-3 text-center bg-blue-50/20 align-middle">
                    ${systemBadge(r.horas_100_auto)} ${notionInput(r.horas_100_manager, 'horas_100_manager')}
                </td>
                <td class="px-4 py-3 text-center bg-blue-50/20 align-middle border-r border-slate-50">
                    ${systemBadge(r.horas_feriado_auto)} ${notionInput(r.horas_feriado_manager, 'horas_feriado_manager')}
                </td>
                <td class="px-4 py-3 align-top">
                    <input type="text" class="edit-input w-full bg-transparent border-none text-xs text-slate-600 focus:bg-white focus:ring-1 focus:ring-slate-200 p-1 rounded ${isDisabled ? 'disabled' : ''}" 
                           data-id="${r.id}" data-field="comentarios" placeholder="Agregar comentario..." value="${r.comentarios || ''}">
                    ${rowLevel === 'error' ? '<p class="text-[10px] text-red-500 font-bold mt-1 uppercase">⚠ Error de cálculo</p>' : 
                      rowLevel === 'warning' ? '<p class="text-[10px] text-amber-600 font-bold mt-1 uppercase">⚠ Requiere revisión</p>' : ''}
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
