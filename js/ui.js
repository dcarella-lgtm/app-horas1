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

    toggleStates('', 'table');
    tbody.innerHTML = '';

    registros.forEach(r => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.title = 'Click para editar horas de este empleado';
        tr.onmouseover = () => tr.style.backgroundColor = '#f1f8ff';
        tr.onmouseout = () => tr.style.backgroundColor = 'transparent';
        
        // Redirección con param legajo al hacer clic en fila
        tr.onclick = () => { window.location.href = `empleado.html?legajo=${r.legajo}`; };
        
        let estadoColor = '#757575'; 
        if (r.estado === 'aprobado') estadoColor = '#388e3c'; 
        if (r.estado === 'rechazado') estadoColor = '#d32f2f'; 
        if (r.estado === 'revision') estadoColor = '#f57c00'; 

        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${r.legajo || '-'}</td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${r.nombre || '-'}</strong></td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">${r.fecha || '-'}</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${r.horas_trabajadas || 0}</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color:#0e4eb5; font-weight:bold;">${r.horas_50_manager || 0}</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color:#0e4eb5; font-weight:bold;">${r.horas_100_manager || 0}</td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                <span style="background: ${estadoColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; text-transform: uppercase;">
                    ${r.estado || 'pendiente'}
                </span>
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

    const disableStr = todosAprobados ? 'disabled style="background-color:#f9f9f9;' : 'style="background-color:#fff;';

    registros.forEach(r => {
        const tr = document.createElement('tr');
        
        const formatInput = (val, id) => {
            return `<input type="number" step="0.5" class="edit-input" data-id="${r.id}" data-field="${id}" value="${val || 0}" ${disableStr} width: 70px; padding: 5px; text-align:right; border: 1px solid #ccc; border-radius:3px;">`;
        };
        const formatText = (val, id) => {
            return `<input type="text" class="edit-input" data-id="${r.id}" data-field="${id}" value="${val || ''}" ${disableStr} width: 100%; padding: 5px; border: 1px solid #ccc; border-radius:3px;">`;
        };

        tr.innerHTML = `
            <td style="padding: 12px; border-bottom: 1px solid #eee;"><strong>${r.fecha || '-'}</strong></td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color: #555;">${r.hora_ingreso || 0}</td>
            <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee; color: #555;">${r.hora_salida || 0}</td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                ${formatInput(r.horas_50_manager, 'horas_50_manager')}
            </td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                ${formatInput(r.horas_100_manager, 'horas_100_manager')}
            </td>
            <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">
                ${formatInput(r.horas_feriado_manager, 'horas_feriado_manager')}
            </td>
            <td style="padding: 12px; text-align: left; border-bottom: 1px solid #eee;">
                ${formatText(r.comentarios, 'comentarios')}
            </td>
        `;
        tbody.appendChild(tr);
    });
}
