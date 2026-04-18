// Módulo para manipulación del DOM y eventos de la interfaz

// Función unificada para ocultar todo y mostrar el estado deseado
function toggleStates(prefix, state) {
    const ids = ['loading-state', 'empty-state', 'error-state', 'registros-table', 'actions'];
    ids.forEach(id => {
        const elId = prefix ? `${prefix}-${id}` : id;
        const el = document.getElementById(elId);
        if (el) el.style.display = 'none';
    });

    const activeId = prefix ? `${prefix}-${state}-state` : `${state}-state`;
    if (state === 'table') {
        const tblId = prefix ? `${prefix}-registros-table` : 'registros-table';
        const tbl = document.getElementById(tblId);
        if (tbl) tbl.style.display = 'table';
        
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

export function renderRegistros(registros) {
    const tbody = document.getElementById('registros-tbody');
    if (!tbody) return; 
    
    if (!registros || registros.length === 0) {
        showEmpty(false);
        return;
    }

    // Actualizamos las Cards Superiores si existen
    const mTotal = document.getElementById('metric-total');
    if (mTotal) {
        mTotal.innerText = registros.length;
        document.getElementById('metric-aprobados').innerText = registros.filter(r => r.estado === 'aprobado').length;
        document.getElementById('metric-revision').innerText = registros.filter(r => r.estado === 'revision').length;
        document.getElementById('metric-pendientes').innerText = registros.filter(r => r.estado === 'pendiente').length;
    }

    toggleStates('', 'table');
    tbody.innerHTML = '';

    registros.forEach(r => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => { window.location.href = `empleado.html?legajo=${r.legajo}`; };
        
        // Sumar horas extras usando el objeto agrupado de app.js (50 + 100 + feriado)
        const totalExtras = Number(r.total_50||0) + Number(r.total_100||0) + Number(r.total_feriado||0);
        
        // Mapeo del estado a las clases Badge limpias
        const estadoLimpio = r.estado ? r.estado.toLowerCase() : 'pendiente';

        tr.innerHTML = `
            <td>
                <div style="font-weight: 700; color: #2b2d42;">${r.nombre || '-'}</div>
                <div style="font-size: 0.8em; color: #8d99ae; margin-top:2px;">Legajo: ${r.legajo || '-'}</div>
            </td>
            <td class="text-center">
                <span style="font-weight: 600;">${r.dias || 0}</span> d.
            </td>
            <td class="text-center" style="font-weight: bold; color: #0056b3;">
                ${totalExtras > 0 ? (totalExtras + ' hs') : '<span style="color:#adb5bd">-</span>'}
            </td>
            <td class="text-center">
                <span class="badge ${estadoLimpio}">${estadoLimpio}</span>
            </td>
            <td class="text-center">
                <button class="btn-action">Revisar 👉</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

export function renderEmpleadoData(registros) {
    const tbody = document.getElementById('emp-registros-tbody');
    if (!tbody) return; 
    
    if (!registros || registros.length === 0) {
        showEmpty(true);
        return;
    }

    // Setear título
    const title = document.getElementById('empleado-legajo-title');
    if (title) title.innerText = `${registros[0].nombre} (${registros[0].legajo})`;

    toggleStates('emp', 'table');
    tbody.innerHTML = '';

    // Guardar copia global en navegador
    window.__currentEmpleadoRecords = registros;
    
    // Calcular estado general del empleado 
    const todosAprobados = registros.every(r => r.estado === 'aprobado');
    let estadoGeneral = 'pendiente';
    if (todosAprobados) estadoGeneral = 'aprobado';
    else if (registros.some(r => r.estado === 'rechazado')) estadoGeneral = 'rechazado';
    else if (registros.some(r => r.estado === 'revision')) estadoGeneral = 'revision';

    const estadoBadge = document.getElementById('empleado-estado-badge');
    const btnAprobar = document.getElementById('btn-aprobar-empleado');
    const btnGuardar = document.getElementById('btn-guardar-empleado');

    if (estadoBadge) {
        let color = '#757575';
        if (estadoGeneral === 'aprobado') color = '#388e3c';
        else if (estadoGeneral === 'rechazado') color = '#d32f2f';
        else if (estadoGeneral === 'revision') color = '#f57c00';

        estadoBadge.innerText = estadoGeneral.toUpperCase();
        estadoBadge.style.background = color;
        estadoBadge.style.color = 'white';
        estadoBadge.style.padding = '4px 8px';
        estadoBadge.style.borderRadius = '12px';
    }

    if (btnAprobar) {
        btnAprobar.style.display = todosAprobados ? 'none' : 'inline-block';
    }
    
    if (btnGuardar) {
        btnGuardar.style.display = todosAprobados ? 'none' : 'inline-block';
    }

    const isDisabled = todosAprobados;

    let __empRowErrors = 0;
    let __empRowWarnings = 0;

    registros.forEach(r => {
        const tr = document.createElement('tr');
        
        // 1. Días de la semana desde r.fecha
        let fechaLimpia = r.fecha || '-';
        let isSunday = false;
        let isSaturday = false;
        let isWorkday = true;
        
        if (r.fecha) {
            const temp = new Date(r.fecha + 'T00:00:00');
            if (!isNaN(temp.getTime())) {
                const diaInt = temp.getDay();
                isSunday = diaInt === 0;
                isSaturday = diaInt === 6;
                isWorkday = diaInt >= 1 && diaInt <= 5;
                const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                fechaLimpia = `<strong>${dias[diaInt]}</strong> <span style="color:#777; font-size:0.9em; margin-left: 4px;">${r.fecha.split('-').reverse().join('/')}</span>`;
            }
        }

        const actIngreso = r.hora_ingreso === 0 || r.hora_ingreso === null || r.hora_ingreso === "" ? null : convertirHoraDecimal(r.hora_ingreso);
        const actSalida = r.hora_salida === 0 || r.hora_salida === null || r.hora_salida === "" ? null : convertirHoraDecimal(r.hora_salida);
        
        const isNoActivity = !actIngreso && !actSalida;
        let isJustified = false;
        let actMsg = '⚠️ Sin actividad / Revisar';
        let actColor = '#856404';
        let actBg = '#fff3cd';

        // Evaluar justificaciones
        const isWeekend = isSunday || isSaturday;
        if (r.ausencias && String(r.ausencias).trim() !== '') {
            isJustified = true;
            actMsg = `ℹ️ ${String(r.ausencias).trim()}`;
            actColor = '#0056b3';
            actBg = '#e8f4fd';
        } else if (isWeekend && isNoActivity) {
            isJustified = true;
            actMsg = `⏸️ Fin de Semana`;
            actColor = '#555555';
            actBg = '#f0f0f0';
        }

        let actHTML = '';
        if (isNoActivity) {
            actHTML = `<td colspan="2" style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; border-right: 1px solid #ddd; background-color: ${actBg}; color: ${actColor}; font-size: 0.85em; font-weight: bold;">${actMsg}</td>`;
        } else {
            actHTML = `
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color: #555;">${actIngreso || '-'}</td>
                <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color: #555; border-right: 1px solid #ddd;">${actSalida || '-'}</td>
            `;
        }

        // 3. Comparador Dual (Sistema Automático vs Carga del Manager)
        const formatComparedInput = (autoStr, mgrStr, fieldId) => {
            const autoVal = Number(autoStr) || 0;
            const mgrVal = Number(mgrStr) || 0;
            const diff = autoVal !== mgrVal;
            
            const disabledAttr = isDisabled ? 'disabled' : '';
            
            // Resaltes visuales
            const inBg = isDisabled ? '#f9f9f9' : (diff ? '#fffbf0' : '#fff');
            const inBorder = diff ? 'border: 1px solid #ff9800;' : 'border: 1px solid #ccc;';
            const highlightClass = diff && !isDisabled ? 'background-color: #fff9e6;' : ''; 
            const valColor = diff && !isDisabled ? '#d84315' : '#0056b3';

            return `
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 4px; border-radius: 4px; ${highlightClass}">
                    <span style="color: #6c757d; font-size: 0.9em; min-width: 25px;" title="Cálculo del Sistema">${autoVal}</span>
                    <span style="color: #ddd;">|</span>
                    <input type="number" step="0.5" class="edit-input" data-id="${r.id}" data-field="${fieldId}" value="${mgrVal}" ${disabledAttr} style="background-color:${inBg}; width: 60px; padding: 4px 6px; text-align:right; border-radius:3px; font-weight: bold; color: ${valColor}; ${inBorder} transition: all 0.2s;">
                </div>
            `;
        };

        const formatText = (val, id) => {
            const disabledAttr = isDisabled ? 'disabled' : '';
            const bgColor = isDisabled ? '#f9f9f9' : '#fff';
            return `<input type="text" class="edit-input" data-id="${r.id}" data-field="${id}" value="${val || ''}" ${disabledAttr} style="background-color:${bgColor}; width: 100%; padding: 5px; border: 1px solid #ccc; border-radius:3px;">`;
        };

        // 4. Lógica de Priorización Visual (Error, Warning, Ok)
        let rowStatus = 'ok';
        
        const diff50 = Number(r.horas_50_auto || 0) !== Number(r.horas_50_manager || 0);
        const diff100 = Number(r.horas_100_auto || 0) !== Number(r.horas_100_manager || 0);
        const diffFer = Number(r.horas_feriado_auto || 0) !== Number(r.horas_feriado_manager || 0);
        const hasDiff = diff50 || diff100 || diffFer;
        
        const sumAuto = Number(r.horas_50_auto || 0) + Number(r.horas_100_auto || 0) + Number(r.horas_feriado_auto || 0);
        const sumMgr = Number(r.horas_50_manager || 0) + Number(r.horas_100_manager || 0) + Number(r.horas_feriado_manager || 0);
        const isTodoCero = sumAuto === 0 && sumMgr === 0 && isNoActivity;

        // Evaluar reglas de negocio para UX
        if (hasDiff || (isSunday && Number(r.horas_50_manager || 0) > 0)) {
            rowStatus = 'error';
            __empRowErrors++;
        } else if ((isNoActivity && !isJustified) || (isTodoCero && isWorkday && !isJustified)) {
            rowStatus = 'warning';
            __empRowWarnings++;
        }

        // Aplicar estilos según clasificación
        let msgFilas = '';
        if (rowStatus === 'error') {
            tr.style.backgroundColor = '#ffe5e5';
            msgFilas = '<div style="color: #c62828; font-size: 0.8em; margin-top: 6px;"><strong>⚠ Diferencia detectada → revisar</strong></div>';
        } else if (rowStatus === 'warning') {
            tr.style.backgroundColor = '#fff8e1';
            msgFilas = '<div style="color: #856404; font-size: 0.8em; margin-top: 6px;"><strong>⚠ Revisar ausencia o inconsistencia</strong></div>';
            if (isTodoCero) tr.style.opacity = '0.7'; 
        } else {
            msgFilas = '<div style="color: #388e3c; font-size: 0.8em; margin-top: 6px;">✔ Correcto</div>';
        }

        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee; border-right: 1px solid #ddd; white-space: nowrap;">${fechaLimpia}</td>
            ${actHTML}
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                ${formatComparedInput(r.horas_50_auto, r.horas_50_manager, 'horas_50_manager')}
            </td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                ${formatComparedInput(r.horas_100_auto, r.horas_100_manager, 'horas_100_manager')}
            </td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee; border-right: 1px solid #ddd;">
                ${formatComparedInput(r.horas_feriado_auto, r.horas_feriado_manager, 'horas_feriado_manager')}
            </td>
            <td style="padding: 12px; text-align: left; border-bottom: 1px solid #eee;">
                ${formatText(r.comentarios, 'comentarios')}
                ${msgFilas}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // 5. Actualizar los contadores superiores y lógica del botón Aprobar
    const counterBadge = document.getElementById('empleado-status-counters');
    if (counterBadge) {
        if (__empRowErrors === 0 && __empRowWarnings === 0) {
            counterBadge.style.display = 'none';
        } else {
            counterBadge.style.display = 'inline-block';
            let str = [];
            
            if (__empRowErrors > 0) {
                str.push(`🔴 ${__empRowErrors} error${__empRowErrors>1?'es':''}`);
                str.push(`❌ Existen errores que deben resolverse antes de aprobar`);
            } else if (__empRowWarnings > 0) {
                str.push(`🟡 ${__empRowWarnings} para revisar`);
                str.push(`⚠️ Hay días que requieren revisión`);
            }
            
            counterBadge.innerHTML = str.join(' | ');
        }
    }

    if (btnAprobar && !isDisabled) {
        if (__empRowErrors > 0) {
            btnAprobar.disabled = true;
            btnAprobar.innerText = "❌ Resolver errores para aprobar";
            btnAprobar.style.opacity = '0.6';
            btnAprobar.style.cursor = 'not-allowed';
            btnAprobar.dataset.warnings = 'false';
        } else {
            btnAprobar.disabled = false;
            btnAprobar.innerText = "✅ Aprobar Empleado";
            btnAprobar.style.opacity = '1';
            btnAprobar.style.cursor = 'pointer';
            btnAprobar.dataset.warnings = __empRowWarnings > 0 ? 'true' : 'false';
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
