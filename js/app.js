import { leerExcelProcesado, exportarExcelLiquidacion } from "./excel.js";
import { obtenerRegistros, upsertRegistros, obtenerUltimaFechaCarga } from "./api.js";
import { inicializarConfiguracion } from "./config.js";
import { showLoading, showError, renderRegistros, renderEmpleadoData, showToast } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("[App] DOM Cargado. Iniciando configuración...");
  
  // 0. Marcar link activo en nav
  const currentPath = window.location.pathname;
  document.querySelectorAll('nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (currentPath.endsWith(href) || (currentPath.endsWith('/') && href === 'index.html')) {
          a.classList.add('active');
      }
  });

  try {
    await inicializarConfiguracion(); 
    initHeaderInfo(); // Cargar info de última actualización
    console.log("[App] Configuración inicializada con éxito.");
  } catch (err) {
    console.error("[App] Fallo crítico al inicializar configuración:", err);
  }

  // ==========================================
  // LÓGICA DE CARGA DE EXCEL (HEADER)
  // ==========================================
  const headerFileInput = document.getElementById("headerFileInput");

  if (headerFileInput) {
    headerFileInput.addEventListener("change", async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        showToast("Procesando archivo Excel... ⏳", "info");

        const data = await leerExcelProcesado(file);
        if (!data || data.length === 0) {
          showToast("El Excel parece estar vacío o sin números de legajo.", "warning");
          return;
        }

        const resultado = await upsertRegistros(data);
        if (resultado.ok) {
          showToast(`¡Excel guardado! (${resultado.procesados} registros)`, "success");
          initHeaderInfo(); // Actualizar fecha en el header
          
          // Si estamos en dashboard (index.html), recargar para ver cambios
          if (document.getElementById("dashboard-container")) {
              setTimeout(() => window.location.reload(), 1500);
          }
        } else {
          showToast("Error guardando datos: " + resultado.error, "error");
        }
      } catch (error) {
          showToast("Error procesando Excel: " + error.message, "error");
      }
      headerFileInput.value = "";
    });
  }

  async function initHeaderInfo() {
      const display = document.getElementById('last-update-date');
      if (!display) return;

      const res = await obtenerUltimaFechaCarga();
      if (res.ok && res.fecha) {
          const date = new Date(res.fecha);
          const formatted = date.toLocaleString('es-AR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
          });
          display.innerText = formatted;
      } else {
          display.innerText = "Sin datos";
      }
  }

  // ==========================================
  // LÓGICA DEL DASHBOARD (INDEX.HTML)
  // ==========================================
  const dashboardContainer = document.getElementById("dashboard-container");

  if (dashboardContainer) {
    showLoading(false);
    
    let allRecords = []; // Cache local

    function agruparPorEmpleado(registros) {
        const mapa = {};
        registros.forEach(r => {
            if (!mapa[r.legajo]) {
                mapa[r.legajo] = {
                    legajo: r.legajo,
                    nombre: r.nombre,
                    dias: 0,
                    total_50: 0,
                    total_100: 0,
                    total_feriado: 0,
                    estados: new Set()
                };
            }
            const emp = mapa[r.legajo];
            emp.dias++;
            emp.total_50 += Number(r.horas_50_manager || 0);
            emp.total_100 += Number(r.horas_100_manager || 0);
            emp.total_feriado += Number(r.horas_feriado_manager || 0);
            emp.estados.add(r.estado);
        });

        return Object.values(mapa).map(emp => {
            let estadoGeneral = 'aprobado';
            if (emp.estados.has('rechazado')) estadoGeneral = 'rechazado';
            else if (emp.estados.has('revision')) estadoGeneral = 'revision';
            else if (emp.estados.has('pendiente')) estadoGeneral = 'pendiente';
            
            return {
                legajo: emp.legajo,
                nombre: emp.nombre,
                dias: emp.dias,
                total_50: emp.total_50,
                total_100: emp.total_100,
                total_feriado: emp.total_feriado,
                estado: estadoGeneral
            };
        });
    }
    
    const filtroEstado = document.getElementById("filter-estado");
    if (filtroEstado) {
        filtroEstado.addEventListener("change", (e) => {
            const val = e.target.value;
            if (!val) {
                renderRegistros(agruparPorEmpleado(allRecords));
            } else {
                const filtrados = allRecords.filter(r => r.estado === val);
                renderRegistros(agruparPorEmpleado(filtrados));
            }
        });
    }

    try {
      const response = await obtenerRegistros();
      if (response.ok) {
        allRecords = response.data;
        
        const dashboardFilters = document.getElementById("dashboard-filters");
        if (dashboardFilters) dashboardFilters.style.display = 'flex';

        const actualizarContador = () => {
             const contador = document.getElementById('contador-empleados');
             if (contador) {
                 const pendientes = allRecords.filter(r => r.estado === 'pendiente');
                 const legajosPendientes = new Set(pendientes.map(r => r.legajo));
                 if (legajosPendientes.size > 0) {
                     contador.innerText = `⚠️ ${legajosPendientes.size} empleado(s) por revisar`;
                     contador.style.color = '#d32f2f';
                     contador.style.display = 'inline-block';
                 } else {
                     contador.innerText = `✅ Al día`;
                     contador.style.color = '#388e3c';
                     contador.style.display = 'inline-block';
                 }
             }
        };
        actualizarContador();

        const btnExportar = document.getElementById("btn-exportar");
        if (btnExportar) {
            btnExportar.style.display = 'inline-block';
            btnExportar.addEventListener('click', () => {
                const aprobados = allRecords.filter(r => r.estado === 'aprobado');
                if (aprobados.length === 0) {
                    showToast("No hay registros Aprobados para exportar.", "warning");
                    return;
                }

                const confirmacion = confirm(`¿Estás seguro de exportar la liquidación de ${aprobados.length} horas aprobadas?`);
                if (!confirmacion) return;

                btnExportar.innerText = "Calculando... ⏳";
                setTimeout(() => {
                    try {
                        exportarExcelLiquidacion(aprobados);
                        btnExportar.innerText = "📊 Exportar Aprobados";
                        showToast("Exportación a Excel completada.", "success");
                    } catch (err) {
                        btnExportar.innerText = "📊 Exportar Aprobados";
                        showToast("Error exportando: " + err.message, "error");
                    }
                }, 500); 
            });
        }
        
        const filtroSelect = document.getElementById("filter-estado");
        const filtroInicial = filtroSelect ? filtroSelect.value : '';
        if (filtroInicial) {
            renderRegistros(agruparPorEmpleado(allRecords.filter(r => r.estado === filtroInicial)));
        } else {
            renderRegistros(agruparPorEmpleado(allRecords));
        }
      } else {
        showError(false);
      }
    } catch (err) {
      showError(false);
    }
  }

  // ==========================================
  // LÓGICA DEL EMPLEADO / EDICIÓN TIPO MANAGER
  // ==========================================
  const empleadoContainer = document.getElementById("empleado-container");

  if (empleadoContainer) {
      const urlParams = new URLSearchParams(window.location.search);
      const legajoParam = urlParams.get('legajo');

      if (!legajoParam) {
          showToast("Selecciona un empleado desde el Dashboard.", "warning");
          setTimeout(() => { window.location.href = 'index.html'; }, 1000);
          return;
      }

      showLoading(true);

      try {
          const response = await obtenerRegistros({ legajo: legajoParam });
          if (response.ok && response.data.length > 0) {
              renderEmpleadoData(response.data);
          } else {
              document.getElementById('emp-empty-state').style.display = 'block';
              document.getElementById('emp-loading-state').style.display = 'none';
          }
      } catch (err) {
          showError(true);
      }

      const btnGuardar = document.getElementById('btn-guardar-empleado');
      if (btnGuardar) {
          btnGuardar.addEventListener('click', async () => {
             btnGuardar.innerText = "Guardando... ⏳";
             btnGuardar.disabled = true;

             const originalRecords = window.__currentEmpleadoRecords || [];
             const inputs = document.querySelectorAll('.edit-input');
             let recordUpdatesMap = {};
             
             inputs.forEach(input => {
                 const id = input.getAttribute('data-id');
                 const field = input.getAttribute('data-field');
                 let value = input.value;
                 
                 if (field.includes('horas_')) {
                     value = Number(value);
                     if (isNaN(value)) value = 0;
                 }
                 
                 if (!recordUpdatesMap[id]) recordUpdatesMap[id] = {};
                 recordUpdatesMap[id][field] = value;
             });

             const recordsToUpdate = originalRecords.map(orig => {
                 const updatesForThisId = recordUpdatesMap[orig.id] || {};
                 return { ...orig, ...updatesForThisId };
             });
             
             try {
                const response = await upsertRegistros(recordsToUpdate);
                if (response.ok) {
                    showToast("¡Cambios guardados con éxito!", "success");
                    btnGuardar.innerText = "Guardado ✅";
                    setTimeout(() => window.location.reload(), 1000);
                } else {
                    showToast("Error al guardar: " + response.error, "error");
                    btnGuardar.innerText = "Reintentar";
                    btnGuardar.disabled = false;
                }
             } catch (err) {
                showToast("Error crítico ejecutando el Upsert.", "error");
                btnGuardar.innerText = "Reintentar";
                btnGuardar.disabled = false;
             }
          });
      }

      const btnAprobar = document.getElementById('btn-aprobar-empleado');
      if (btnAprobar) {
          btnAprobar.addEventListener('click', async () => {
              if (btnAprobar.disabled) return;

              let confirmText = "¿Aprobar todas las horas cargadas de este empleado?";
              if (btnAprobar.dataset.warnings === 'true') {
                  confirmText = "⚠️ ATENCIÓN: Al menos un día tiene advertencias.\n\n¿Deseas APROBAR de todas formas?";
              }

              const confirmacion = confirm(confirmText);
              if (!confirmacion) return;

              btnAprobar.innerText = "Aprobando... ⏳";
              btnAprobar.disabled = true;

              const originalRecords = window.__currentEmpleadoRecords || [];
              const recordsToUpdate = originalRecords.map(r => ({ ...r, estado: 'aprobado' }));

              try {
                  const response = await upsertRegistros(recordsToUpdate);
                  if (response.ok) {
                      showToast("¡Horas aprobadas!", "success");
                      setTimeout(() => window.location.reload(), 1000);
                  } else {
                      showToast("Error al intentar aprobar: " + response.error, "error");
                      btnAprobar.innerText = "✅ Aprobar Empleado";
                      btnAprobar.disabled = false;
                  }
              } catch (err) {
                  showToast("Error crítico al procesar petición.", "error");
                  btnAprobar.innerText = "✅ Aprobar Empleado";
                  btnAprobar.disabled = false;
              }
          });
      }
  }

});