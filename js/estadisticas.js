import { obtenerRegistros, obtenerConfigRRHH } from "./api.js";
import { inicializarConfiguracion, analizarTipoEvento, getConfigRRHH } from "./config.js";
import { cargarAsignaciones, actualizarAsignacion, SUPERVISORES, EQUIPOS } from "./asignaciones.js";

// Cache de datos para filtrar sin re-fetch
let _empleadosCache = [];
let _configCache = null;
let _asignacionesCache = {};

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
    await inicializarConfiguracion();
    init();
});

async function init() {
    const btn = document.getElementById("btn-refresh-stats");
    const selectMes = document.getElementById("select-mes");
    const selectAnio = document.getElementById("select-anio");

    // Set mes actual por defecto
    const hoy = new Date();
    selectMes.value = hoy.getMonth();
    selectAnio.value = hoy.getFullYear();

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
}

// ── Fetch + procesamiento ──────────────────────────────────
async function renderStats() {
    const mes = parseInt(document.getElementById("select-mes").value);
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
    const fechaDesde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    const fechaHasta = `${anio}-${String(mes + 1).padStart(2, '0')}-${ultimoDia}`;

    const res = await obtenerRegistros({ fechaDesde, fechaHasta });
    _configCache = getConfigRRHH();
    _asignacionesCache = cargarAsignaciones();

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

    const supervisores = new Set();
    const equipos = new Set();

    Object.values(_asignacionesCache).forEach(a => {
        if (a.supervisor) supervisores.add(a.supervisor);
        if (a.equipo) equipos.add(a.equipo);
    });

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
}

// ── Poblar selector de modo supervisor ─────────────────────
function poblarSelectorSupervisor() {
    const selector = document.getElementById("selector-supervisor-activo");
    if (!selector) return;

    const supervisores = new Set();
    Object.values(_asignacionesCache).forEach(a => {
        if (a.supervisor) supervisores.add(a.supervisor);
    });

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
        tr.onclick = () => window.location.href = `empleado.html?legajo=${emp.legajo}`;

        const excedeH50 = emp.h50 > _configCache.limite_mensual_50;
        const excedeH100 = emp.h100 > _configCache.limite_mensual_100;
        const totalHoras = (emp.h50 + emp.h100).toFixed(1);

        const badgeHTML = (excedeH50 || excedeH100)
            ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700">Excedido</span>'
            : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-700">OK</span>';

        const asig = _asignacionesCache[String(emp.legajo)];
        const supActual = asig ? asig.supervisor : '';
        const eqActual = asig ? asig.equipo : '';

        // Generar options para supervisor
        const supOptions = ['<option value="">-</option>']
            .concat(SUPERVISORES.map(s => `<option value="${s}"${s === supActual ? ' selected' : ''}>${s}</option>`))
            .join('');

        // Generar options para equipo
        const eqOptions = ['<option value="">-</option>']
            .concat(EQUIPOS.map(e => `<option value="${e}"${e === eqActual ? ' selected' : ''}>${e}</option>`))
            .join('');

        tr.innerHTML = `
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
                h100: 0
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

    tbody.addEventListener("change", (e) => {
        e.stopPropagation();
        const el = e.target;
        const legajo = el.dataset.legajo;
        if (!legajo) return;

        if (el.classList.contains("select-supervisor")) {
            _asignacionesCache = actualizarAsignacion(legajo, "supervisor", el.value);
            poblarFiltros();
            poblarSelectorSupervisor();
        } else if (el.classList.contains("select-equipo")) {
            _asignacionesCache = actualizarAsignacion(legajo, "equipo", el.value);
            poblarFiltros();
        }
    });
}
