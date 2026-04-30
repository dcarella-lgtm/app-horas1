// import { obtenerRegistros, obtenerConfigRRHH } from "./api.js";
// import { inicializarConfiguracion, analizarTipoEvento, getConfigRRHH } from "./config.js";
// import { cargarAsignaciones, actualizarAsignacion, cargarListaSupervisores, cargarListaEquipos, sincronizarAsignaciones } from "./asignaciones.js";

// Cache de datos para filtrar sin re-fetch
let _empleadosCache = [];
let _configCache = null;
let _asignacionesCache = {};
let _filtroEstado = ""; // Filtro de estado activo (de URL o interacción)

// ── Supervisor mode ────────────────────────────────────────
const SUPERVISOR_KEY = "supervisorActivo";

function getSupervisorActivo() {
    return localStorage.getItem(SUPERVISOR_KEY) || "";
}

function setSupervisorActivo(valor) {
    if (valor) {
        localStorage.setItem(SUPERVISOR_KEY, valor);
    } else {
        localStorage.removeItem(SUPERVISOR_KEY);
    }
}

// ── Init ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    _filtroEstado = params.get("estado") || "";
    
    await inicializarConfiguracion();
    init();
});

async function init() {
    const btn = document.getElementById("btn-refresh-stats");
    const selectMes = document.getElementById("select-mes");
    const selectAnio = document.getElementById("select-anio");

    // Set Todo el año por defecto
    const hoy = new Date();
    selectMes.value = "all";
    selectAnio.value = hoy.getFullYear();

    // Lógica para mostrar/ocultar inputs de fechas custom
    const customDatesContainer = document.getElementById("custom-dates-container");
    selectMes.addEventListener("change", (e) => {
        if (e.target.value === "custom") {
            customDatesContainer.style.display = "flex";
            selectAnio.style.display = "none";
        } else {
            customDatesContainer.style.display = "none";
            selectAnio.style.display = "block";
        }
    });

    btn.addEventListener("click", () => renderStats());

    // Filtros de supervisor/equipo — re-render sin re-fetch
    const filtroSup = document.getElementById("filtro-supervisor");
    const filtroEq = document.getElementById("filtro-equipo");
    if (filtroSup) filtroSup.addEventListener("change", () => renderTabla());
    if (filtroEq) filtroEq.addEventListener("change", () => renderTabla());

    // Selector de modo supervisor
    const selectorSup = document.getElementById("selector-supervisor-activo");
    if (selectorSup) {
        selectorSup.addEventListener("change", (e) => {
            setSupervisorActivo(e.target.value);
            aplicarModoSupervisor();
            renderTabla();
        });
    }

    // Botón salir de vista supervisor
    const btnSalir = document.getElementById("btn-salir-supervisor");
    if (btnSalir) {
        btnSalir.addEventListener("click", () => {
            setSupervisorActivo("");
            const sel = document.getElementById("selector-supervisor-activo");
            if (sel) sel.value = "";
            aplicarModoSupervisor();
            renderTabla();
        });
    }

    // Cargar estadísticas iniciales
    renderStats();

    // Init Bulk UI
    initBulkUI();
}

function initBulkUI() {
    const checkAll = document.getElementById("check-all-employees");
    if (checkAll) {
        checkAll.addEventListener("change", (e) => {
            const checks = document.querySelectorAll(".check-emp");
            checks.forEach(c => c.checked = e.target.checked);
            updateBulkBar();
        });
    }

    const btnAssign = document.getElementById("btn-bulk-assign");
    if (btnAssign) {
        btnAssign.addEventListener("click", () => aplicarAsignacionMasiva());
    }

    const btnCancel = document.getElementById("btn-cancel-bulk");
    if (btnCancel) {
        btnCancel.addEventListener("click", () => {
            document.getElementById("check-all-employees").checked = false;
            document.querySelectorAll(".check-emp").forEach(c => c.checked = false);
            updateBulkBar();
        });
    }
}

// ── Fetch + procesamiento ──────────────────────────────────
async function renderStats() {
    const mes = document.getElementById("select-mes").value;
    const anio = parseInt(document.getElementById("select-anio").value);

    const loading = document.getElementById("stats-loading");
    const table = document.getElementById("stats-table");
    const empty = document.getElementById("stats-empty");
    const filtrosBar = document.getElementById("filtros-equipo");

    loading.style.display = "block";
    table.style.display = "none";
    empty.style.display = "none";
    if (filtrosBar) filtrosBar.style.display = "none";

    // Calcular rango de fechas
    let fechaDesde, fechaHasta;

    if (mes === "custom") {
        fechaDesde = document.getElementById("date-desde").value;
        fechaHasta = document.getElementById("date-hasta").value;
        if (!fechaDesde || !fechaHasta) {
            alert("Por favor selecciona las fechas Desde y Hasta.");
            loading.style.display = "none";
            return;
        }
    } else if (mes === "all") {
        fechaDesde = `${anio}-01-01`;
        fechaHasta = `${anio}-12-31`;
    } else {
        const m = parseInt(mes);
        fechaDesde = `${anio}-${String(m + 1).padStart(2, '0')}-01`;
        const ultimoDia = new Date(anio, m + 1, 0).getDate();
        fechaHasta = `${anio}-${String(m + 1).padStart(2, '0')}-${ultimoDia}`;
    }

    const res = await obtenerRegistros({ fechaDesde, fechaHasta });
    await sincronizarListasMaestras(); // Sincronizar listas (Supervisores/Equipos)
    _configCache = getConfigRRHH();
    _asignacionesCache = await sincronizarAsignaciones();

    loading.style.display = "none";

    if (res.ok && res.data.length > 0) {
        const stats = procesarDatos(res.data);
        renderMetrics(stats);
        _empleadosCache = Object.values(stats.empleados);

        // Poblar filtros y selector de supervisor
        poblarFiltros();
        poblarSelectorSupervisor();

        // Restaurar modo supervisor desde localStorage
        aplicarModoSupervisor();

        // Mostrar barra de filtros
        if (filtrosBar) filtrosBar.style.display = "flex";

        // Render inicial de la tabla
        renderTabla();
    } else {
        _empleadosCache = [];
        empty.style.display = "block";
        resetMetrics();
    }
}

// ── Poblar dropdowns de filtro ─────────────────────────────
function poblarFiltros() {
    const selectSup = document.getElementById("filtro-supervisor");
    const selectEq = document.getElementById("filtro-equipo");
    if (!selectSup || !selectEq) return;

    // 1. Obtener de la configuración (todos los disponibles)
    const configSupervisores = cargarListaSupervisores();
    const configEquipos = cargarListaEquipos();

    // 2. Obtener de los datos (por si hay alguno viejo no en config)
    const supsDeDatos = new Set();
    const eqsDeDatos = new Set();
    Object.values(_asignacionesCache).forEach(a => {
        if (a.supervisor) supsDeDatos.add(a.supervisor);
        if (a.equipo) eqsDeDatos.add(a.equipo);
    });

    // Combinar
    const supervisores = new Set([...configSupervisores, ...supsDeDatos]);
    const equipos = new Set([...configEquipos, ...eqsDeDatos]);

    const prevSup = selectSup.value;
    const prevEq = selectEq.value;

    selectSup.innerHTML = '<option value="">Todos</option>';
    [...supervisores].sort().forEach(s => {
        selectSup.innerHTML += `<option value="${s}">${s}</option>`;
    });

    selectEq.innerHTML = '<option value="">Todos</option>';
    [...equipos].sort().forEach(e => {
        selectEq.innerHTML += `<option value="${e}">${e}</option>`;
    });

    selectSup.value = prevSup || "";
    selectEq.value = prevEq || "";

    // También poblar los selects del bulk bar
    const bulkSup = document.getElementById("bulk-supervisor");
    const bulkEq = document.getElementById("bulk-equipo");
    if (bulkSup) {
        bulkSup.innerHTML = '<option value="">Sin cambios</option>';
        [...supervisores].sort().forEach(s => {
            bulkSup.innerHTML += `<option value="${s}">${s}</option>`;
        });
    }
    if (bulkEq) {
        bulkEq.innerHTML = '<option value="">Sin cambios</option>';
        [...equipos].sort().forEach(e => {
            bulkEq.innerHTML += `<option value="${e}">${e}</option>`;
        });
    }
}

// ── Poblar selector de modo supervisor ─────────────────────
function poblarSelectorSupervisor() {
    const selector = document.getElementById("selector-supervisor-activo");
    if (!selector) return;

    // 1. Obtener de la configuración
    const configSupervisores = cargarListaSupervisores();
    
    // 2. Obtener de los datos (por si acaso)
    const supsDeDatos = new Set();
    Object.values(_asignacionesCache).forEach(a => {
        if (a.supervisor) supsDeDatos.add(a.supervisor);
    });

    const supervisores = new Set([...configSupervisores, ...supsDeDatos]);
    const prev = getSupervisorActivo();

    selector.innerHTML = '<option value="">Modo general</option>';
    [...supervisores].sort().forEach(s => {
        selector.innerHTML += `<option value="${s}">${s}</option>`;
    });

    // Restaurar selección persistida
    if (prev && supervisores.has(prev)) {
        selector.value = prev;
    }
}

// ── Aplicar modo supervisor (UI adaptativa) ────────────────
function aplicarModoSupervisor() {
    const supActivo = getSupervisorActivo();
    const titulo = document.getElementById("page-title");
    const subtitulo = document.getElementById("page-subtitle");
    const btnSalir = document.getElementById("btn-salir-supervisor");
    const filtroSupSelect = document.getElementById("filtro-supervisor");
    const filtroSupContainer = filtroSupSelect ? filtroSupSelect.closest(".flex.flex-col") : null;

    if (supActivo) {
        // Modo supervisor activo
        if (titulo) titulo.textContent = `Equipo de ${supActivo}`;
        if (subtitulo) subtitulo.textContent = "Vista de supervisor — revisión operativa";
        if (btnSalir) btnSalir.style.display = "flex";

        // Ocultar filtro manual de supervisor (ya está forzado)
        if (filtroSupContainer) filtroSupContainer.style.display = "none";

        // Forzar el filtro de supervisor al valor activo
        if (filtroSupSelect) filtroSupSelect.value = supActivo;
    } else {
        // Modo general
        if (titulo) titulo.textContent = "Empleados";
        if (subtitulo) subtitulo.textContent = "Listado general del equipo";
        if (btnSalir) btnSalir.style.display = "none";

        // Mostrar filtro manual de supervisor
        if (filtroSupContainer) filtroSupContainer.style.display = "";

        // Reset filtro
        if (filtroSupSelect) filtroSupSelect.value = "";
    }
}

// ── Render de tabla con filtros aplicados ───────────────────
function renderTabla() {
    const table = document.getElementById("stats-table");
    const empty = document.getElementById("stats-empty");
    const tbody = document.getElementById("stats-tbody");
    const countEl = document.getElementById("empleados-count");

    tbody.innerHTML = "";
    
    // Forzar carga desde window
    const listaSup = (window.cargarListaSupervisores) ? window.cargarListaSupervisores() : ["Error"];
    const listaEq = (window.cargarListaEquipos) ? window.cargarListaEquipos() : ["Error"];
    
    console.log("[DEBUG_LISTA] Supervisores:", listaSup);
    console.log("[DEBUG_LISTA] Equipos:", listaEq);

    // En modo supervisor, forzar el filtro de supervisor
    const supActivo = getSupervisorActivo();
    const filtroSup = supActivo || ((document.getElementById("filtro-supervisor") || {}).value || "");
    const filtroEq = (document.getElementById("filtro-equipo") || {}).value || "";

    // Filtrar
    const filtrados = _empleadosCache.filter(emp => {
        const asig = _asignacionesCache[String(emp.legajo)];
        const supervisor = asig ? asig.supervisor : "";
        const equipo = asig ? asig.equipo : "";

        if (filtroSup && supervisor !== filtroSup) return false;
        if (filtroEq && equipo !== filtroEq) return false;
        
        // Filtro de estado (Consolidado)
        if (_filtroEstado === "rechazado" && emp.estado !== "rechazado") return false;
        if (_filtroEstado === "pendiente" && emp.estado !== "pendiente") return false;
        
        return true;
    });

    // Actualizar contador
    if (countEl) {
        countEl.textContent = `${filtrados.length} de ${_empleadosCache.length} empleados`;
    }

    if (filtrados.length === 0) {
        table.style.display = "none";
        empty.style.display = "block";
        const emptyTitle = empty.querySelector("h3");
        const emptyDesc = empty.querySelector("p");
        if (filtroSup || filtroEq) {
            if (emptyTitle) emptyTitle.textContent = "Sin empleados para este filtro";
            if (emptyDesc) emptyDesc.textContent = "Probá cambiando el supervisor o equipo seleccionado.";
        } else {
            if (emptyTitle) emptyTitle.textContent = "Sin empleados cargados";
            if (emptyDesc) emptyDesc.textContent = "Subí un archivo Excel para ver el listado del equipo.";
        }
        return;
    }

    table.style.display = "table";
    empty.style.display = "none";

    filtrados.forEach(emp => {
        const tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 transition-colors cursor-pointer";
        tr.onclick = (e) => {
            if (e.target.closest("select, input, button")) return;
            window.location.href = `empleado.html?legajo=${emp.legajo}`;
        };

        const excedeH50 = emp.h50 > _configCache.limite_mensual_50;
        const excedeH100 = emp.h100 > _configCache.limite_mensual_100;
        const totalHoras = (emp.h50 + emp.h100).toFixed(1);

        const badgeHTML = (excedeH50 || excedeH100)
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700">Excedido</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-700">OK</span>';

        const cleanLegajo = String(emp.legajo).trim();
        const asig = _asignacionesCache[cleanLegajo];
        if (cleanLegajo === "38630085") console.log("[DEBUG_ROW] Legajo 38630085:", asig);
        
        const supActual = asig ? asig.supervisor : '';
        const eqActual = asig ? asig.equipo : '';

        // Generar options para supervisor
        const supOptions = ['<option value="">-</option>']
            .concat(listaSup.map(s => `<option value="${s}"${s === supActual ? ' selected' : ''}>${s}</option>`))
            .join('');

        // Generar options para equipo
        const eqOptions = ['<option value="">-</option>']
            .concat(listaEq.map(e => `<option value="${e}"${e === eqActual ? ' selected' : ''}>${e}</option>`))
            .join('');

        tr.innerHTML = `
            <td class="px-6 py-4">
                <input type="checkbox" class="check-emp w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" data-legajo="${emp.legajo}">
            </td>
            <td class="px-6 py-4"><span class="font-semibold text-slate-800">${emp.nombre}</span></td>
            <td class="px-6 py-4"><span class="text-xs text-slate-400 font-medium">${emp.legajo}</span></td>
            <td class="px-6 py-3">
                <select class="select-supervisor px-2 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer" data-legajo="${emp.legajo}">
                    ${supOptions}
                </select>
            </td>
            <td class="px-6 py-3">
                <select class="select-equipo px-2 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer" data-legajo="${emp.legajo}">
                    ${eqOptions}
                </select>
            </td>
            <td class="px-6 py-4 text-center">${badgeHTML}</td>
            <td class="px-6 py-4 text-center font-semibold text-slate-700">${totalHoras} hs</td>
            <td class="px-6 py-4 text-right">
                <span class="text-blue-600 text-xs font-semibold hover:text-blue-800">Ver detalle \u2192</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Escuchar cambios en checkboxes individuales
    tbody.querySelectorAll(".check-emp").forEach(cb => {
        cb.addEventListener("change", () => updateBulkBar());
    });

    // Resetear check-all al renderizar
    const checkAll = document.getElementById("check-all-employees");
    if (checkAll) checkAll.checked = false;
    updateBulkBar();

    // Bind change events en selects (delegación evita duplicación)
    bindSelectEvents(tbody);
}

// ── Procesamiento de datos ─────────────────────────────────
function procesarDatos(data) {
    const result = {
        totalAusencias: 0,
        totalDemoras: 0,
        totalH50: 0,
        totalH100: 0,
        empleados: {}
    };

    data.forEach(r => {
        if (!result.empleados[r.legajo]) {
            result.empleados[r.legajo] = {
                legajo: r.legajo,
                nombre: r.nombre,
                ausencias: 0,
                demoras: 0,
                h50: 0,
                h100: 0,
                estado: 'aprobado' // Estado base
            };
        }

        const emp = result.empleados[r.legajo];
        const analisis = analizarTipoEvento(r);

        if (analisis.tipo === 'ausencia') {
            result.totalAusencias++;
            emp.ausencias++;
        } else if (analisis.tipo === 'demora') {
            result.totalDemoras++;
            emp.demoras++;
        }

        const h50 = Number(r.horas_50_manager || 0);
        const h100 = Number(r.horas_100_manager || 0);

        result.totalH50 += h50;
        result.totalH100 += h100;
        emp.h50 += h50;
        emp.h100 += h100;

        // Consolidar estado del empleado (Jerarquía: rechazado > pendiente > aprobado)
        if (r.estado === 'rechazado') {
            emp.estado = 'rechazado';
        } else if ((r.estado === 'pendiente' || r.estado === 'revision') && emp.estado !== 'rechazado') {
            emp.estado = 'pendiente';
        }
    });

    return result;
}

function renderMetrics(stats) {
    document.getElementById("total-ausencias").innerText = stats.totalAusencias;
    document.getElementById("total-demoras").innerText = stats.totalDemoras;
    document.getElementById("total-h50").innerText = stats.totalH50.toFixed(1) + " hs";
    document.getElementById("total-h100").innerText = stats.totalH100.toFixed(1) + " hs";
}

function resetMetrics() {
    document.getElementById("total-ausencias").innerText = "0";
    document.getElementById("total-demoras").innerText = "0";
    document.getElementById("total-h50").innerText = "0 hs";
    document.getElementById("total-h100").innerText = "0 hs";
}

// ── Event delegation para selects inline ───────────────────
function bindSelectEvents(tbody) {
    tbody.addEventListener("click", (e) => {
        // Prevenir navegación al hacer click en un select
        if (e.target.tagName === "SELECT" || e.target.tagName === "OPTION") {
            e.stopPropagation();
        }
    });

    tbody.addEventListener("change", async (e) => {
        e.stopPropagation();
        const el = e.target;
        const legajo = el.dataset.legajo;
        if (!legajo) return;

        if (el.classList.contains("select-supervisor")) {
            _asignacionesCache = await actualizarAsignacion(legajo, "supervisor", el.value);
            poblarFiltros();
            poblarSelectorSupervisor();
        } else if (el.classList.contains("select-equipo")) {
            _asignacionesCache = await actualizarAsignacion(legajo, "equipo", el.value);
            poblarFiltros();
        }
    });
}

// ── Bulk Actions ───────────────────────────────────────────
function updateBulkBar() {
    const bar = document.getElementById("bulk-action-bar");
    const countEl = document.getElementById("selected-count");
    const checks = document.querySelectorAll(".check-emp:checked");
    const total = checks.length;

    if (total > 0) {
        countEl.textContent = total;
        bar.classList.remove("opacity-0", "pointer-events-none", "translate-y-10");
        bar.classList.add("opacity-100", "pointer-events-auto", "translate-y-0");
    } else {
        bar.classList.add("opacity-0", "pointer-events-none", "translate-y-10");
        bar.classList.remove("opacity-100", "pointer-events-auto", "translate-y-0");
    }
}

function aplicarAsignacionMasiva() {
    const supervisor = document.getElementById("bulk-supervisor").value;
    const equipo = document.getElementById("bulk-equipo").value;

    if (!supervisor && !equipo) {
        alert("Por favor seleccioná un supervisor o equipo para asignar.");
        return;
    }

    const checks = document.querySelectorAll(".check-emp:checked");
    const legajos = Array.from(checks).map(cb => cb.dataset.legajo);

    let msg = `¿Asignar cambios a ${legajos.length} empleados?`;
    if (supervisor) msg += `\n- Supervisor: ${supervisor}`;
    if (equipo) msg += `\n- Equipo: ${equipo}`;

    if (confirm(msg)) {
        const promesas = [];
        legajos.forEach(legajo => {
            if (supervisor) promesas.push(actualizarAsignacion(legajo, "supervisor", supervisor));
            if (equipo) promesas.push(actualizarAsignacion(legajo, "equipo", equipo));
        });

        Promise.all(promesas).then(() => {
            // Refrescar datos locales y UI
            _asignacionesCache = cargarAsignaciones();
            renderTabla();
            poblarFiltros();
            poblarSelectorSupervisor();
            
            alert("Asignación masiva completada.");
        });
    }
}
