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
        
        table.style.display = "table";
        Object.values(stats.empleados).forEach(emp => {
            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #eee";

            const excedeH50 = emp.h50 > config.limite_mensual_50;
            const excedeH100 = emp.h100 > config.limite_mensual_100;

            const badgeStatus = (excedeH50 || excedeH100) 
                ? '<span style="color:white; background:#d32f2f; padding:2px 8px; border-radius:10px; font-size:0.8em;">Excedido</span>'
                : '<span style="color:white; background:#388e3c; padding:2px 8px; border-radius:10px; font-size:0.8em;">OK</span>';

            tr.innerHTML = `
                <td style="padding: 12px;"><strong>${emp.nombre}</strong> <br><small style="color:#666">Leg: ${emp.legajo}</small></td>
                <td style="padding: 12px; text-align: center;">${emp.ausencias}</td>
                <td style="padding: 12px; text-align: center;">${emp.demoras}</td>
                <td style="padding: 12px; text-align: center; color: ${excedeH50 ? '#d32f2f' : '#333'}; font-weight: ${excedeH50 ? 'bold' : 'normal'}">${emp.h50.toFixed(1)} hs</td>
                <td style="padding: 12px; text-align: center; color: ${excedeH100 ? '#d32f2f' : '#333'}; font-weight: ${excedeH100 ? 'bold' : 'normal'}">${emp.h100.toFixed(1)} hs</td>
                <td style="padding: 12px; text-align: center;">${badgeStatus}</td>
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
