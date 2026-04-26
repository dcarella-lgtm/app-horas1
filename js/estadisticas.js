import { obtenerRegistros, obtenerConfigRRHH } from "./api.js";
import { inicializarConfiguracion, analizarTipoEvento, getConfigRRHH } from "./config.js";

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

    // Cargar estadísticas iniciales
    renderStats();
}

async function renderStats() {
    const mes = parseInt(document.getElementById("select-mes").value);
    const anio = parseInt(document.getElementById("select-anio").value);

    const loading = document.getElementById("stats-loading");
    const table = document.getElementById("stats-table");
    const empty = document.getElementById("stats-empty");
    const tbody = document.getElementById("stats-tbody");

    loading.style.display = "block";
    table.style.display = "none";
    empty.style.display = "none";
    tbody.innerHTML = "";

    // Calcular rango de fechas
    const fechaDesde = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
    const ultimoDia = new Date(anio, mes + 1, 0).getDate();
    const fechaHasta = `${anio}-${String(mes + 1).padStart(2, '0')}-${ultimoDia}`;

    const res = await obtenerRegistros({ fechaDesde, fechaHasta });
    const config = getConfigRRHH();

    loading.style.display = "none";

    if (res.ok && res.data.length > 0) {
        const stats = procesarDatos(res.data);
        renderMetrics(stats);
        
        const empleadosList = Object.values(stats.empleados);
        
        // Contador
        const countEl = document.getElementById("empleados-count");
        if (countEl) {
            countEl.classList.remove("hidden");
            countEl.querySelector("span").textContent = `${empleadosList.length} empleado${empleadosList.length !== 1 ? 's' : ''}`;
        }

        table.style.display = "table";
        empleadosList.forEach(emp => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 transition-colors cursor-pointer";
            tr.onclick = () => window.location.href = `empleado.html?legajo=${emp.legajo}`;

            const excedeH50 = emp.h50 > config.limite_mensual_50;
            const excedeH100 = emp.h100 > config.limite_mensual_100;
            const totalHoras = (emp.h50 + emp.h100).toFixed(1);

            const badgeHTML = (excedeH50 || excedeH100) 
                ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700">Excedido</span>'
                : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-50 text-green-700">OK</span>';

            tr.innerHTML = `
                <td class="px-6 py-4"><span class="font-semibold text-slate-800">${emp.nombre}</span></td>
                <td class="px-6 py-4"><span class="text-xs text-slate-400 font-medium">${emp.legajo}</span></td>
                <td class="px-6 py-4 text-center">${badgeHTML}</td>
                <td class="px-6 py-4 text-center font-semibold text-slate-700">${totalHoras} hs</td>
                <td class="px-6 py-4 text-right">
                    <span class="text-blue-600 text-xs font-semibold hover:text-blue-800">Ver detalle →</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        empty.style.display = "block";
        resetMetrics();
    }
}

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
