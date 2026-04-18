import { obtenerFeriadosDB, agregarFeriadoDB, eliminarFeriadoDB } from "./api.js";
import { cargarFeriados } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
    init();
});

async function init() {
    await refreshFeriadosList();

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

    loading.style.display = "block";
    table.style.display = "none";
    noMsg.style.display = "none";
    tbody.innerHTML = "";

    const res = await obtenerFeriadosDB();
    loading.style.display = "none";

    if (res.ok && res.data.length > 0) {
        table.style.display = "table";
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

        // Eventos delegados para borrar
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
        noMsg.style.display = "block";
    }

    // --- CARGAR CONFIG RRHH ---
    await loadRRHHConfigUI();
}

async function loadRRHHConfigUI() {
    const { getConfigRRHH } = await import("./config.js");
    const { guardarConfigRRHH } = await import("./api.js");
    
    const config = getConfigRRHH();
    document.getElementById("limit-50").value = config.limite_mensual_50;
    document.getElementById("limit-100").value = config.limite_mensual_100;
    document.getElementById("keywords-demora").value = config.palabras_clave_demora;

    const formRRHH = document.getElementById("form-config-rrhh");
    formRRHH.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById("btn-save-rrhh");
        btn.disabled = true;
        btn.innerText = "Guardando...";

        const newConfig = {
            id: config.id || undefined, // Upsert necesita el ID si existe
            limite_mensual_50: parseInt(document.getElementById("limit-50").value),
            limite_mensual_100: parseInt(document.getElementById("limit-100").value),
            palabras_clave_demora: document.getElementById("keywords-demora").value,
            updated_at: new Date().toISOString()
        };

        const res = await guardarConfigRRHH(newConfig);
        if (res.ok) {
            alert("Configuración de RRHH guardada con éxito.");
            const { inicializarConfiguracion } = await import("./config.js");
            await inicializarConfiguracion(); // Recargar cache
        } else {
            alert("Error al guardar: " + res.error);
        }
        btn.disabled = false;
        btn.innerText = "Guardar Configuración RRHH";
    };
}
