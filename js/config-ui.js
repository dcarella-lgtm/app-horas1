// Gestión de la interfaz de configuración

async function initConfigUI() {
    console.log("[ConfigUI] Iniciando...");
    
    // 1. Feriados estáticos (UI inicial)
    if (typeof renderStaticFeriados === "function") renderStaticFeriados();

    // 2. Cargar parámetros generales
    const params = window.obtenerConfiguracion ? window.obtenerConfiguracion() : (window.getConfigRRHH ? window.getConfigRRHH() : null);
    if (params) {
        const input50 = document.getElementById("limit-50");
        const input100 = document.getElementById("limit-100");
        const inputKw = document.getElementById("keywords-demora");
        
        if (input50) input50.value = params.limite_mensual_50 || 40;
        if (input100) input100.value = params.limite_mensual_100 || 20;
        if (inputKw) inputKw.value = params.palabras_clave_demora || "menor jornada, tarde, demora";
    }

    // 3. Inicializar secciones de listas
    await initSupervisoresUI();
    await initEquiposUI();
}

// ── Gestión de Supervisores ────────────────────────────────
async function initSupervisoresUI() {
    const form = document.getElementById("form-supervisor");
    if (!form) return;

    await sincronizarListasMaestras();
    renderListaSupervisores();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("input-supervisor");
        const nombre = input.value.trim();
        if (!nombre) return;

        let lista = await cargarListaSupervisores();
        if (!lista.includes(nombre)) {
            lista.push(nombre);
            lista.sort();
            await guardarListaSupervisores(lista);
            renderListaSupervisores();
        }
        input.value = "";
    });
}

async function renderListaSupervisores() {
    const ul = document.getElementById("lista-supervisores");
    if (!ul) return;

    const lista = await cargarListaSupervisores();
    ul.innerHTML = "";

    if (lista.length === 0) {
        ul.innerHTML = '<li class="p-4 text-sm text-gray-500 text-center">No hay supervisores cargados.</li>';
        return;
    }

    lista.forEach(sup => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center p-4 hover:bg-gray-100 transition-colors border-b last:border-0";
        li.innerHTML = `
            <span class="font-medium text-gray-700">${sup}</span>
            <button class="btn-del-sup text-red-500 hover:text-red-700 p-1" data-nombre="${sup}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        ul.appendChild(li);
    });

    ul.querySelectorAll(".btn-del-sup").forEach(btn => {
        btn.onclick = async () => {
            const nombre = btn.dataset.nombre;
            if (confirm(`¿Eliminar al supervisor "${nombre}"?`)) {
                let lista = await cargarListaSupervisores();
                lista = lista.filter(s => s !== nombre);
                await guardarListaSupervisores(lista);
                renderListaSupervisores();
            }
        };
    });
}

// ── Gestión de Equipos ─────────────────────────────────────
async function initEquiposUI() {
    const form = document.getElementById("form-equipo");
    if (!form) return;

    renderListaEquipos();

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("input-equipo");
        const nombre = input.value.trim();
        if (!nombre) return;

        let lista = await cargarListaEquipos();
        if (!lista.includes(nombre)) {
            lista.push(nombre);
            lista.sort();
            await guardarListaEquipos(lista);
            renderListaEquipos();
        }
        input.value = "";
    });
}

async function renderListaEquipos() {
    const ul = document.getElementById("lista-equipos");
    if (!ul) return;

    const lista = await cargarListaEquipos();
    ul.innerHTML = "";

    if (lista.length === 0) {
        ul.innerHTML = '<li class="p-4 text-sm text-gray-500 text-center">No hay equipos cargados.</li>';
        return;
    }

    lista.forEach(eq => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center p-4 hover:bg-gray-100 transition-colors border-b last:border-0";
        li.innerHTML = `
            <span class="font-medium text-gray-700">${eq}</span>
            <button class="btn-del-eq text-red-500 hover:text-red-700 p-1" data-nombre="${eq}">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;
        ul.appendChild(li);
    });

    ul.querySelectorAll(".btn-del-eq").forEach(btn => {
        btn.onclick = async () => {
            const nombre = btn.dataset.nombre;
            if (confirm(`¿Eliminar el equipo "${nombre}"?`)) {
                let lista = await cargarListaEquipos();
                lista = lista.filter(e => e !== nombre);
                await guardarListaEquipos(lista);
                renderListaEquipos();
            }
        };
    });
}

// Inicialización global
document.addEventListener("DOMContentLoaded", () => {
    if (window.location.pathname.includes("configuracion.html")) {
        initConfigUI();
    }
});
