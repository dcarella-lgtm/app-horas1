import { leerExcelProcesado, exportarExcelLiquidacion } from "./excel.js";
import { upsertRegistros, obtenerRegistros } from "./api.js";
import { showLoading, showError, renderRegistros, renderEmpleadoData, showToast } from "./ui.js";

document.addEventListener("DOMContentLoaded", async () => {
  console.log("App inicializada");

  // ==========================================
  // LÓGICA DE CARGA DE EXCEL (INDEX)
  // ==========================================
  const fileInput = document.getElementById("fileInput");

  if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;

        // Validar extensión del archivo
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'xlsm'].includes(ext)) {
            showToast("Archivo inválido. Solo se aceptan .xlsx, .xls o .xlsm", "error");
            fileInput.value = "";
            return;
        }

        showToast("Procesando archivo Excel... ⏳", "info");

        const data = await leerExcelProcesado(file);

        if (!data || data.length === 0) {
          showToast("El Excel parece estar vacío o sin números de legajo.", "warning");
          return;
        }

        const resultado = await upsertRegistros(data);
        if (resultado.ok) {
          showToast(`¡Excel guardado en Supabase! (${resultado.procesados || data.length} registros)`, "success");
        } else {
          showToast("Error guardando datos: " + resultado.error, "error");
        }
      } catch (error) {
        console.error("🔥 Error general:", error);
        showToast("Error procesando Excel: " + error.message, "error");
      }
      // Resetear input para permitir subir el mismo file de nuevo si se quiere
      fileInput.value = "";
    });
  }

  // ==========================================
  // LÓGICA DEL DASHBOARD (DASHBOARD.HTML)
  // ==========================================
  const dashboardContainer = document.getElementById("dashboard-container");

  if (dashboardContainer) {
    showLoading(false);
    
    let allRecords = []; // Cache local
    
    // Listener de filtros
    const filtroEstado = document.getElementById("filter-estado");
    if (filtroEstado) {
        filtroEstado.addEventListener("change", (e) => {
            const val = e.target.value;
            if (!val) {
                renderRegistros(allRecords);
            } else {
                const filtrados = allRecords.filter(r => r.estado === val);
                renderRegistros(filtrados);
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
            renderRegistros(allRecords.filter(r => r.estado === filtroInicial));
        } else {
            renderRegistros(allRecords);
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
      // 1. Obtener legajo desde la URL (?legajo=)
      const urlParams = new URLSearchParams(window.location.search);
      const legajoParam = urlParams.get('legajo');

      if (!legajoParam) {
          document.getElementById('emp-empty-state').style.display = 'block';
          document.getElementById('emp-empty-state').innerText = "Falta el legajo. Redirigiendo al Dashboard...";
          showToast("Selecciona un empleado desde la tabla del Dashboard.", "warning");
          setTimeout(() => { window.location.href = 'dashboard.html'; }, 2000);
          return;
      }

      showLoading(true);

      try {
          const response = await obtenerRegistros({ legajo: legajoParam });
          if (response.ok && response.data.length > 0) {
              renderEmpleadoData(response.data);
          } else {
              document.getElementById('emp-empty-state').style.display = 'block';
              document.getElementById('emp-empty-state').innerText = "El empleado no cuenta con registros cargados.";
              document.getElementById('emp-loading-state').style.display = 'none';
          }
      } catch (err) {
          showError(true);
      }

      // 2. Hook de acción interactiva: Guardar Cambios
      const btnGuardar = document.getElementById('btn-guardar-empleado');
      if (btnGuardar) {
          btnGuardar.addEventListener('click', async () => {
             btnGuardar.innerText = "Guardando... ⏳";
             btnGuardar.disabled = true;

             // Estructuras en DB
             const originalRecords = window.__currentEmpleadoRecords || [];
             const inputs = document.querySelectorAll('.edit-input');
             let recordUpdatesMap = {};
             
             // Indexar los values scrapeados agrupados por el ID único del record UUID
             inputs.forEach(input => {
                 const id = input.getAttribute('data-id');
                 const field = input.getAttribute('data-field');
                 let value = input.value;
                 
                 // Castear fields numéricos
                 if (field.includes('horas_')) {
                     value = Number(value);
                     if (isNaN(value)) value = 0;
                 }
                 
                 if (!recordUpdatesMap[id]) recordUpdatesMap[id] = {};
                 recordUpdatesMap[id][field] = value;
             });

             // Merge data modificada con data dura (fechas, legajo base, insert timestamps)
             const recordsToUpdate = originalRecords.map(orig => {
                 const updatesForThisId = recordUpdatesMap[orig.id] || {};
                 return { ...orig, ...updatesForThisId };
             });
             
             try {
                const response = await upsertRegistros(recordsToUpdate);
                if (response.ok) {
                    showToast("¡Cambios guardados con éxito!", "success");
                    btnGuardar.innerText = "Guardado ✅";
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
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

      // 3. Hook de acción interactiva: Aprobar Empleado
      const btnAprobar = document.getElementById('btn-aprobar-empleado');
      if (btnAprobar) {
          btnAprobar.addEventListener('click', async () => {
              const confirmacion = confirm("¿Aprobar todas las horas cargadas de este empleado? No podrá editarlas luego.");
              if (!confirmacion) return;

              btnAprobar.innerText = "Aprobando... ⏳";
              btnAprobar.disabled = true;

              const originalRecords = window.__currentEmpleadoRecords || [];
              const recordsToUpdate = originalRecords.map(r => ({
                  ...r,
                  estado: 'aprobado'
              }));

              try {
                  const response = await upsertRegistros(recordsToUpdate);
                  if (response.ok) {
                      showToast("¡Horas aprobadas exitosamente!", "success");
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