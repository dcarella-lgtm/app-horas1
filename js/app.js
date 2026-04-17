import { leerExcelProcesado } from "./excel.js";
import { upsertRegistros } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("App inicializada");

  const fileInput = document.getElementById("fileInput");

  if (!fileInput) {
    console.error("No se encontró el input fileInput");
    return;
  }

  fileInput.addEventListener("change", async (e) => {
    try {
      const file = e.target.files[0];

      if (!file) {
        console.warn("No se seleccionó archivo");
        return;
      }

      console.log("📂 Archivo cargado:", file.name);

      // 1. Procesar Excel
      const data = await leerExcelProcesado(file);

      console.log("📊 Datos procesados:", data);

      if (!data || data.length === 0) {
        console.warn("No hay datos para guardar");
        return;
      }

      // 2. Enviar a Supabase (UPSERT)
      const resultado = await upsertRegistros(data);

      if (resultado.ok) {
        console.log(`✅ Registros guardados: ${resultado.procesados || data.length}`);
      } else {
        console.error("❌ Error al guardar:", resultado.error);
      }

    } catch (error) {
      console.error("🔥 Error general:", error);
    }
  });
});