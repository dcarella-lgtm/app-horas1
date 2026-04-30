// Gestión de la interfaz de configuración
// Depende de: config.js (obtenerConfiguracion/getConfigRRHH), asignaciones.js (sincronizarListasMaestras, cargarLista*, guardarLista*)

async function initConfigUI() {
    console.log("[ConfigUI] Iniciando...");

    // 1. Feriados
    renderStaticFeriados();
    await refreshFeriadosList();
    initFeriadoForm();

    // 2. Cargar parámetros generales de RRHH
    try {
        const params = window.getConfigRRHH ? window.getConfigRRHH() : (window.obtenerConfiguracion ? window.obtenerConfiguracion() : null);
        if (params) {
            const input50 = document.getElementById("limit-50");
            const input100 = document.getElementById("limit-100");
            const inputKw = document.getElementById("keywords-demora");

            if (input50) input50.value = params.limite_mensual_50 || 40;
            if (input100) input100.value = params.limite_mensual_100 || 20;
            if (inputKw) inputKw.value = params.palabras_clave_demora || "menor jornada, tarde, demora";
        }
    } catch (e) {
        console.warn("[ConfigUI] Error cargando parámetros RRHH:", e);
    }

    // 3. Sincronizar listas maestras desde Supabase ANTES de renderizar
    await window.sincronizarListasMaestras();

    // 4. Inicializar secciones de listas
    await initSupervisoresUI();
    await initEquiposUI();

    // 5. Bind del formulario de guardar config RRHH
    const formRRHH = document.getElementById("form-config-rrhh");
    if (formRRHH) {
        formRRHH.addEventListener("submit", async (e) => {
            e.preventDefault();
            const config = {
                limite_mensual_50: Number(document.getElementById("limit-50").value) || 40,
                limite_mensual_100: Number(document.getElementById("limit-100").value) || 20,
                palabras_clave_demora: document.getElementById("keywords-demora").value || ""
            };
            if (window.guardarConfigRRHH) {
                const res = await window.guardarConfigRRHH(config);
                if (res && res.ok) {
                    showToast("Configuración RRHH guardada correctamente.", "success");
                } else {
                    showToast("Error al guardar configuración.", "error");
                }
            }
        });
    }
}

// ── Gestión de Supervisores ────────────────────────────────
async function initSupervisoresUI() {
    const form = document.getElementById("form-supervisor");
    if (!form) return;

    await renderListaSupervisores();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("input-supervisor");
        const nombre = input.value.trim();
        if (!nombre) return;

        let lista = window.cargarListaSupervisores();
        if (!lista.includes(nombre)) {
            lista.push(nombre);
            lista.sort();
            await window.guardarListaSupervisores(lista);
            await renderListaSupervisores();
        }
        input.value = "";
    });
}

async function renderListaSupervisores() {
    const ul = document.getElementById("lista-supervisores");
    if (!ul) return;

    const lista = window.cargarListaSupervisores();
    ul.innerHTML = "";

    if (!lista || lista.length === 0) {
        ul.innerHTML = '<li class="p-4 text-sm text-gray-500 text-center">No hay supervisores cargados. Agregá uno arriba o cargalos desde la tabla de Empleados.</li>';
        return;
    }

    lista.forEach(sup => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center p-4 hover:bg-gray-100 transition-colors border-b last:border-0";
        li.innerHTML = `
            <span class="font-medium text-gray-700">${sup}</span>
            <button class="btn-del-sup text-red-500 hover:text-red-700 p-1" data-nombre="${sup}" title="Eliminar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        ul.appendChild(li);
    });

    ul.querySelectorAll(".btn-del-sup").forEach(btn => {
        btn.onclick = async () => {
            const nombre = btn.dataset.nombre;
            if (confirm('¿Eliminar al supervisor "' + nombre + '"?')) {
                let lista = window.cargarListaSupervisores();
                lista = lista.filter(s => s !== nombre);
                await window.guardarListaSupervisores(lista);
                await renderListaSupervisores();
            }
        };
    });
}

// ── Gestión de Equipos ─────────────────────────────────────
async function initEquiposUI() {
    const form = document.getElementById("form-equipo");
    if (!form) return;

    await renderListaEquipos();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("input-equipo");
        const nombre = input.value.trim();
        if (!nombre) return;

        let lista = window.cargarListaEquipos();
        if (!lista.includes(nombre)) {
            lista.push(nombre);
            lista.sort();
            await window.guardarListaEquipos(lista);
            await renderListaEquipos();
        }
        input.value = "";
    });
}

async function renderListaEquipos() {
    const ul = document.getElementById("lista-equipos");
    if (!ul) return;

    const lista = window.cargarListaEquipos();
    ul.innerHTML = "";

    if (!lista || lista.length === 0) {
        ul.innerHTML = '<li class="p-4 text-sm text-gray-500 text-center">No hay equipos cargados. Agregá uno arriba o cargalos desde la tabla de Empleados.</li>';
        return;
    }

    lista.forEach(eq => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center p-4 hover:bg-gray-100 transition-colors border-b last:border-0";
        li.innerHTML = `
            <span class="font-medium text-gray-700">${eq}</span>
            <button class="btn-del-eq text-red-500 hover:text-red-700 p-1" data-nombre="${eq}" title="Eliminar">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        ul.appendChild(li);
    });

    ul.querySelectorAll(".btn-del-eq").forEach(btn => {
        btn.onclick = async () => {
            const nombre = btn.dataset.nombre;
            if (confirm('¿Eliminar el equipo "' + nombre + '"?')) {
                let lista = window.cargarListaEquipos();
                lista = lista.filter(e => e !== nombre);
                await window.guardarListaEquipos(lista);
                await renderListaEquipos();
            }
        };
    });
}

// ── Gestión de Feriados ────────────────────────────────────
function renderStaticFeriados() {
    const container = document.getElementById("static-feriados-list");
    if (!container) return;

    const feriados = window.FERIADOS_ESTATICOS || {};
    const fechas = Object.keys(feriados).sort();

    if (fechas.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">No hay feriados estáticos definidos.</p>';
        return;
    }

    container.innerHTML = fechas.map(fecha => {
        const nombre = feriados[fecha];
        const [y, m, d] = fecha.split('-');
        const fechaDisplay = d + '/' + m + '/' + y;
        return `
            <div class="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">${fechaDisplay}</span>
                    <span class="text-sm font-semibold text-slate-700 leading-tight">${nombre}</span>
                </div>
                <span class="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Activo</span>
            </div>
        `;
    }).join('');
}
window.renderStaticFeriados = renderStaticFeriados;

async function refreshFeriadosList() {
    const loading = document.getElementById("config-loading");
    const container = document.getElementById("feriados-list-container");
    const noMsg = document.getElementById("no-feriados-msg");

    if (!container) return;

    try {
        const res = await window.obtenerFeriadosDB();
        if (loading) loading.style.display = "none";

        if (res.ok && res.data && res.data.length > 0) {
            container.innerHTML = "";
            container.style.display = "flex";
            if (noMsg) noMsg.style.display = "none";

            res.data.forEach(f => {
                if (f.nombre === "__LABORABLE__") return;
                
                const [y, m, d] = (f.fecha || '').split('-');
                const fechaDisplay = d + '/' + m + '/' + y;
                
                const item = document.createElement("div");
                item.className = "flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm transition-all hover:border-slate-200";
                item.innerHTML = `
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${fechaDisplay}</span>
                        <span class="text-sm font-bold text-slate-800">${f.nombre}</span>
                    </div>
                    <button class="btn-del-feriado p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" data-id="${f.id}" title="Eliminar">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                `;
                container.appendChild(item);
            });

            container.querySelectorAll(".btn-del-feriado").forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.dataset.id;
                    if (confirm('¿Eliminar este feriado personalizado?')) {
                        await window.eliminarFeriadoDB(id);
                        if (window.cargarFeriados) await window.cargarFeriados();
                        await refreshFeriadosList();
                    }
                };
            });
        } else {
            container.style.display = "none";
            if (noMsg) noMsg.style.display = "block";
        }
    } catch (e) {
        console.error("[ConfigUI] Error cargando feriados:", e);
        if (loading) loading.style.display = "none";
    }
}
window.refreshFeriadosList = refreshFeriadosList;

function initFeriadoForm() {
    const form = document.getElementById("form-feriado");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fechaInput = document.getElementById("feriado-fecha");
        const nombreInput = document.getElementById("feriado-nombre");
        const fecha = fechaInput.value;
        const nombre = nombreInput.value.trim();

        if (!fecha || !nombre) return;

        const res = await window.agregarFeriadoDB(fecha, nombre);
        if (res.ok) {
            fechaInput.value = "";
            nombreInput.value = "";
            await window.cargarFeriados();
            await refreshFeriadosList();
            renderStaticFeriados();
        } else {
            alert("Error al agregar feriado.");
        }
    });
}

// Inicialización global
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("configuracion")) {
        initConfigUI();
    }
});
