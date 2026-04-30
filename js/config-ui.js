// import { obtenerFeriadosDB, agregarFeriadoDB, eliminarFeriadoDB, obtenerConfigRRHH, guardarConfigRRHH } from "./api.js";
// import { FERIADOS, cargarFeriados, getConfigRRHH, inicializarConfiguracion, getDetalleFeriado } from "./config.js";
// import { cargarListaSupervisores, guardarListaSupervisores, cargarListaEquipos, guardarListaEquipos } from "./asignaciones.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("[Config-UI] DOM cargado, inicializando...");
    init();
});

async function init() {
    try {
        // 1. Mostrar feriados estáticos de inmediato
        renderStaticFeriados();

        // 2. Cargar datos dinámicos
        await refreshFeriadosList();

        // 3. Inicializar UI de Supervisores y Equipos
        await initSupervisoresUI();
        await initEquiposUI();
        
        console.log("[Config-UI] Inicialización completada.");
    } catch (err) {
        console.error("[Config-UI] Error en init:", err);
    }

    // Evento para agregar feriado
    const form = document.getElementById("form-feriado");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fecha = document.getElementById("feriado-fecha").value;
        const nombre = document.getElementById("feriado-nombre").value;

        if (!fecha || !nombre) return;

        const btn = document.getElementById("btn-add-feriado");
        btn.disabled = true;
        btn.innerText = "Agregando...";

        const res = await agregarFeriadoDB(fecha, nombre);
        if (res.ok) {
            document.getElementById("form-feriado").reset();
            alert("Feriado agregado correctamente.");
            await refreshFeriadosList();
            await cargarFeriados(); // Actualizar cache global
        } else {
            alert("Error al agregar feriado: " + res.error);
        }

        btn.disabled = false;
        btn.innerText = "Agregar";
    });
}

async function refreshFeriadosList() {
    const loading = document.getElementById("config-loading");
    const table = document.getElementById("feriados-table");
    const noMsg = document.getElementById("no-feriados-msg");
    const tbody = document.getElementById("feriados-tbody");

    if (loading) loading.style.display = "block";
    if (table) table.style.display = "none";
    if (noMsg) noMsg.style.display = "none";
    if (tbody) tbody.innerHTML = "";

    console.log("[Config-UI] Obteniendo feriados de la DB...");
    const res = await obtenerFeriadosDB();
    
    if (loading) loading.style.display = "none";

    if (res.ok && res.data && res.data.length > 0) {
        console.log(`[Config-UI] ${res.data.length} feriados obtenidos de la DB.`);
        if (table) table.style.display = "table";
        res.data.forEach(f => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid #eee;">${f.fecha.split("-").reverse().join("/")}</td>
                <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${f.nombre}</strong></td>
                <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
                    <button class="btn-delete" data-id="${f.id}" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll(".btn-delete").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (confirm("¿Estás seguro de eliminar este feriado?")) {
                    const id = btn.getAttribute("data-id");
                    const ok = await eliminarFeriadoDB(id);
                    if (ok.ok) {
                        await refreshFeriadosList();
                        await cargarFeriados();
                    }
                }
            });
        });
    } else {
        console.log("[Config-UI] No hay feriados en la DB.");
        if (noMsg) noMsg.style.display = "block";
    }

    // --- CARGAR CONFIG RRHH ---
    await loadRRHHConfigUI();
}

async function loadRRHHConfigUI() {
    // Sincronizar configuración actual antes de mostrar
    await inicializarConfiguracion();
    
    const config = getConfigRRHH();
    console.log("[Config-UI] Cargando configuración RRHH en formulario:", config);
    
    const input50 = document.getElementById("limit-50");
    const input100 = document.getElementById("limit-100");
    const inputKeywords = document.getElementById("keywords-demora");

    if (input50) input50.value = config.limite_mensual_50 || 40;
    if (input100) input100.value = config.limite_mensual_100 || 20;
    if (inputKeywords) inputKeywords.value = config.palabras_clave_demora || "";

    const formRRHH = document.getElementById("form-config-rrhh");
    if (!formRRHH) return;

    formRRHH.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btn-save-rrhh");
        btn.disabled = true;
        btn.innerText = "Guardando...";

        const newConfig = {
            id: config.id || undefined,
            limite_mensual_50: parseInt(input50.value),
            limite_mensual_100: parseInt(input100.value),
            palabras_clave_demora: inputKeywords.value,
            updated_at: new Date().toISOString()
        };

        const res = await guardarConfigRRHH(newConfig);
        if (res.ok) {
            alert("Configuración de RRHH guardada con éxito.");
            await inicializarConfiguracion();
        } else {
            alert("Error al guardar: " + res.error);
        }
        btn.disabled = false;
        btn.innerText = "Guardar Configuración RRHH";
    };
}

function renderStaticFeriados() {
    const container = document.getElementById("static-feriados-list");
    if (!container) return;

    console.log("[Config-UI] Renderizando feriados estáticos...");
    container.innerHTML = "";
    Object.entries(FERIADOS).sort().forEach(([fecha, nombre]) => {
        const item = document.createElement("div");
        item.style.background = "#fff";
        item.style.padding = "10px 15px";
        item.style.borderRadius = "6px";
        item.style.border = "1px solid #eee";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";
        item.style.fontSize = "0.9em";

        // Usar getDetalleFeriado para saber si está activo (no es nulo)
        const nombreActual = getDetalleFeriado(fecha);
        const estaActivo = nombreActual !== null;

        if (!estaActivo) {
            item.style.opacity = "0.6";
            item.style.background = "#f8f9fa";
        }

        item.innerHTML = `
            <div>
                <span style="color:#666; margin-right:8px;">${fecha.split("-").reverse().join("/")}</span>
                <strong style="${!estaActivo ? 'text-decoration: line-through;' : ''}">${estaActivo ? nombre : 'Desactivado'}</strong>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn-edit-static" data-fecha="${fecha}" data-nombre="${nombre}" style="background:none; border:none; color:#0081cf; cursor:pointer; font-size:0.85em; font-weight:bold; visibility: ${estaActivo ? 'visible' : 'hidden'}">Personalizar</button>
                <button class="btn-toggle-static" data-fecha="${fecha}" data-nombre="${nombre}" data-activo="${estaActivo}" style="background:none; border:none; color:${estaActivo ? '#dc3545' : '#28a745'}; cursor:pointer; font-size:0.85em; font-weight:bold;">
                    ${estaActivo ? 'Desactivar' : 'Activar'}
                </button>
            </div>
        `;
        container.appendChild(item);
    });

    container.querySelectorAll(".btn-edit-static").forEach(btn => {
        btn.onclick = () => {
            document.getElementById("feriado-fecha").value = btn.dataset.fecha;
            document.getElementById("feriado-nombre").value = btn.dataset.nombre;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.getElementById("feriado-nombre").focus();
        };
    });

    container.querySelectorAll(".btn-toggle-static").forEach(btn => {
        btn.onclick = async () => {
            const fecha = btn.dataset.fecha;
            const activo = btn.dataset.activo === "true";

            btn.disabled = true;
            btn.innerText = "⌛";

            if (activo) {
                // Desactivar: Guardamos marca __LABORABLE__ en DB
                await agregarFeriadoDB(fecha, "__LABORABLE__");
            } else {
                // Reactivar: Si existe en DB como __LABORABLE__, lo borramos
                const res = await obtenerFeriadosDB();
                if (res.ok) {
                    const exacto = res.data.find(f => f.fecha === fecha && f.nombre === "__LABORABLE__");
                    if (exacto) await eliminarFeriadoDB(exacto.id);
                }
            }

            await cargarFeriados(); // Recargar cache interna
            await refreshFeriadosList(); // Refrescar UI dinámica
            renderStaticFeriados(); // Refrescar UI estática local
        };
    });
}

// ── Gestión de Supervisores ────────────────────────────────
async function initSupervisoresUI() {
    const form = document.getElementById("form-supervisor");
    if (!form) return;

    await sincronizarListasMaestras(); // Asegurar datos frescos
    renderListaSupervisores();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("input-supervisor");
        const nombre = input.value.trim();
        if (!nombre) return;

        const lista = cargarListaSupervisores();
        if (!lista.includes(nombre)) {
            lista.push(nombre);
            lista.sort();
            await guardarListaSupervisores(lista);
            renderListaSupervisores();
        }
        input.value = "";
    });
}

function renderListaSupervisores() {
    const ul = document.getElementById("lista-supervisores");
    if (!ul) return;

    const lista = cargarListaSupervisores();
    ul.innerHTML = "";

    if (lista.length === 0) {
        ul.innerHTML = '<li class="p-4 text-sm text-gray-500 text-center">No hay supervisores cargados.</li>';
        return;
    }

    lista.forEach(sup => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center p-4 hover:bg-gray-100 transition-colors";
        li.innerHTML = `
            <span class="font-medium text-gray-700">${sup}</span>
            <button class="btn-del-sup text-red-500 hover:text-red-700 p-1" data-nombre="${sup}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        ul.appendChild(li);
    });

    ul.querySelectorAll(".btn-del-sup").forEach(btn => {
        btn.addEventListener("click", () => {
            const nombre = btn.dataset.nombre;
            if (confirm(`¿Eliminar al supervisor "${nombre}"?`)) {
                let lista = cargarListaSupervisores();
                lista = lista.filter(s => s !== nombre);
                await guardarListaSupervisores(lista);
                renderListaSupervisores();
            }
        });
    });
}

// ── Gestión de Equipos ─────────────────────────────────────
async function initEquiposUI() {
    const form = document.getElementById("form-equipo");
    if (!form) return;

    renderListaEquipos();

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("input-equipo");
        const nombre = input.value.trim();
        if (!nombre) return;

        const lista = cargarListaEquipos();
        if (!lista.includes(nombre)) {
            lista.push(nombre);
            lista.sort();
            await guardarListaEquipos(lista);
            renderListaEquipos();
        }
        input.value = "";
    });
}

function renderListaEquipos() {
    const ul = document.getElementById("lista-equipos");
    if (!ul) return;

    const lista = cargarListaEquipos();
    ul.innerHTML = "";

    if (lista.length === 0) {
        ul.innerHTML = '<li class="p-4 text-sm text-gray-500 text-center">No hay equipos cargados.</li>';
        return;
    }

    lista.forEach(eq => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center p-4 hover:bg-gray-100 transition-colors";
        li.innerHTML = `
            <span class="font-medium text-gray-700">${eq}</span>
            <button class="btn-del-eq text-red-500 hover:text-red-700 p-1" data-nombre="${eq}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        ul.appendChild(li);
    });

    ul.querySelectorAll(".btn-del-eq").forEach(btn => {
        btn.addEventListener("click", () => {
            const nombre = btn.dataset.nombre;
            if (confirm(`¿Eliminar el equipo "${nombre}"?`)) {
                let lista = cargarListaEquipos();
                lista = lista.filter(e => e !== nombre);
                await guardarListaEquipos(lista);
                renderListaEquipos();
            }
        });
    });
}
