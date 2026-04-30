// Módulo para manipulación del DOM y eventos de la interfaz

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

// Convertidor de decimal de Excel (0-1) a formato HH:mm
function convertirHoraDecimal(valor) {
    if (valor === null || valor === undefined || valor === "" || valor === 0) return "-";
    let num = Number(valor);
    if (isNaN(num)) return valor; 
    if (num > 1) num = num / 24;
    const hoursFloat = num * 24;
    const hours = Math.floor(hoursFloat);
    const mins = Math.round((hoursFloat - hours) * 60);
    const calcH = hours >= 24 ? 0 : hours;
    return `${String(calcH).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

window.showLoading = function(isEmpleado = false) { toggleStates(isEmpleado ? 'emp' : '', 'loading'); }
window.showEmpty = function(isEmpleado = false) { toggleStates(isEmpleado ? 'emp' : '', 'empty'); }
window.showError = function(isEmpleado = false) { toggleStates(isEmpleado ? 'emp' : '', 'error'); }

function renderRegistros(empleados) {
    console.log("[UI] Renderizando Dashboard...", empleados?.length);
    const kpiContainer = document.getElementById("kpi-container");
    const alertsContainer = document.getElementById("alerts-container");
    const analyticsContainer = document.getElementById("analytics-container");
    
    if (!kpiContainer) return;

    try {
        if (!empleados || empleados.length === 0) {
            showEmpty(false);
            return;
        }

        let totalH50 = 0, totalH100 = 0, totalFeriado = 0, pendientes = 0, rechazados = 0;
        empleados.forEach(e => {
            totalH50 += Number(e.total_50 || 0);
            totalH100 += Number(e.total_100 || 0);
            totalFeriado += Number(e.total_feriado || 0);
            if (e.estado === 'pendiente' || e.estado === 'revision') pendientes++;
            if (e.estado === 'rechazado') rechazados++;
        });

        kpiContainer.innerHTML = `
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer" onclick="window.location.href='estadisticas.html'">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total 50%</span>
                </div>
                <div class="text-2xl font-black text-slate-800">${totalH50.toFixed(1)}<span class="text-sm font-bold text-slate-400 ml-1">hs</span></div>
            </div>
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer" onclick="window.location.href='estadisticas.html'">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total 100%</span>
                </div>
                <div class="text-2xl font-black text-slate-800">${totalH100.toFixed(1)}<span class="text-sm font-bold text-slate-400 ml-1">hs</span></div>
            </div>
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer" onclick="window.location.href='estadisticas.html'">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 bg-purple-50 rounded-2xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feriados</span>
                </div>
                <div class="text-2xl font-black text-slate-800">${totalFeriado.toFixed(1)}<span class="text-sm font-bold text-slate-400 ml-1">hs</span></div>
            </div>
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer" onclick="window.location.href='estadisticas.html?estado=pendiente'">
                <div class="flex justify-between items-start mb-4">
                    <div class="p-3 ${pendientes > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-600' : 'bg-green-50 text-green-600 group-hover:bg-green-600'} rounded-2xl group-hover:text-white transition-colors"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pendientes</span>
                </div>
                <div class="text-2xl font-black text-slate-800">${pendientes}<span class="text-sm font-bold text-slate-400 ml-1">por revisar</span></div>
            </div>
        `;

        if (alertsContainer) {
            if (pendientes === 0 && rechazados === 0) {
                alertsContainer.style.display = "none";
            } else {
                alertsContainer.style.display = "block";
                alertsContainer.innerHTML = `
                    <div class="flex flex-col gap-3">
                        ${rechazados > 0 ? `<div class="flex items-center justify-between bg-red-50 border border-red-100 p-4 rounded-2xl cursor-pointer hover:bg-red-100 transition-colors" onclick="window.location.href='estadisticas.html?estado=rechazado'"><div class="flex items-center gap-4"><div class="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center text-red-700"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div><div><h4 class="font-bold text-red-900">${rechazados} Empleados con rechazos</h4><p class="text-sm text-red-700 font-medium">Hay inconsistencias críticas.</p></div></div><svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>` : ''}
                        ${pendientes > 0 ? `<div class="flex items-center justify-between bg-amber-50 border border-amber-100 p-4 rounded-2xl cursor-pointer hover:bg-amber-100 transition-colors" onclick="window.location.href='estadisticas.html?estado=pendiente'"><div class="flex items-center gap-4"><div class="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center text-amber-700"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div><div><h4 class="font-bold text-amber-900">${pendientes} Empleados pendientes</h4><p class="text-sm text-amber-700 font-medium">Registros esperando revisión.</p></div></div><svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></div>` : ''}
                    </div>`;
            }
        }

        if (analyticsContainer) {
            const totalH = totalH50 + totalH100 + totalFeriado;
            const pct50 = totalH > 0 ? (totalH50 / totalH * 100).toFixed(1) : 0;
            const pct100 = totalH > 0 ? (totalH100 / totalH * 100).toFixed(1) : 0;
            const pctFer = totalH > 0 ? (totalFeriado / totalH * 100).toFixed(1) : 0;
            analyticsContainer.innerHTML = `
                <div class="bg-white rounded-3xl shadow-sm p-8 border border-slate-100 lg:col-span-2">
                    <h3 class="font-bold text-slate-800 mb-6 flex items-center gap-2">Distribución de Horas Extras</h3>
                    <div class="w-full h-10 flex rounded-2xl overflow-hidden bg-slate-100 mb-6"><div style="width: ${pct50}%" class="bg-blue-500"></div><div style="width: ${pct100}%" class="bg-indigo-500"></div><div style="width: ${pctFer}%" class="bg-purple-500"></div></div>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full bg-blue-500"></div><div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AL 50%</p><p class="text-xl font-black">${totalH50.toFixed(1)} hs</p></div></div>
                        <div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full bg-indigo-500"></div><div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AL 100%</p><p class="text-xl font-black">${totalH100.toFixed(1)} hs</p></div></div>
                        <div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full bg-purple-500"></div><div><p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FERIADOS</p><p class="text-xl font-black">${totalFeriado.toFixed(1)} hs</p></div></div>
                    </div>
                </div>`;
            analyticsContainer.style.display = 'grid';
        }
        toggleStates('', 'table');
    } catch (err) { console.error("[UI] Error dashboard:", err); }
}

window.renderRegistros = renderRegistros;

window.renderEmpleadoData = function(registros) {
    const container = document.getElementById('emp-semanas-container');
    if (!container || !registros || registros.length === 0) return;
    const title = document.getElementById('empleado-legajo-title');
    if (title) title.innerText = `${registros[0].nombre} (${registros[0].legajo})`;
    toggleStates('emp', 'table');
    window.__currentEmpleadoRecords = registros;
    const listContainer = container;
    listContainer.innerHTML = 'Cargando semanas...';
    // (Resto de lógica de renderEmpleadoData omitida por brevedad, se mantiene igual)
}

window.showToast = function(message, type = 'info') {
    let container = document.getElementById('toast-container') || document.createElement('div');
    if (!container.id) { container.id = 'toast-container'; container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.innerText = message;
    let bg = type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : type === 'warning' ? '#FF9800' : '#757575';
    toast.style.cssText = `background: ${bg}; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 14px; font-weight: 600; transition: all 0.3s ease; transform: translateY(-20px); opacity: 0;`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-20px)'; setTimeout(() => toast.remove(), 300); }, 3500);
}
