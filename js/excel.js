// Módulo para procesamiento de archivos Excel

// Función para normalizar nombres de encabezados (remover espacios, tildes, a minúsculas)
function normalizeHeader(header) {
    if (!header) return '';
    return String(header).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remover tildes
        .replace(/[^a-z0-9]/g, '_') // Caracteres raros a guion bajo
        .replace(/_+/g, '_') // Eliminar guiones múltiples
        .replace(/^_|_$/g, ''); // Sin guiones en extremos
}

// Función para parsear fechas de Excel a YYYY-MM-DD
function formatExcelDate(d) {
    if (d === null || d === undefined || String(d).trim() === "") return "";
    
    // Manejo de seriales de fecha tipo Excel (ej. 46084)
    if (typeof d === 'number') {
        // Ajustar el offset a 1970 (Excel base es 1900, 25569 días de diff)
        const utc_days = Math.floor(d - 25569);
        const ms = utc_days * 86400 * 1000;
        const tempD = new Date(ms);
        
        if (isNaN(tempD.getTime())) return "";
        
        // Extraer partes en UTC para evitar desfases horarios
        const yyyy = tempD.getUTCFullYear();
        const mm = String(tempD.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(tempD.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }
    
    // Si la fecha ya viene formateada en texto
    if (typeof d === 'string') {
        const text = d.trim();
        // Intentar parsear DD/MM/YYYY o DD-MM-YYYY
        const matchDMY = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (matchDMY) return `${matchDMY[3]}-${matchDMY[2].padStart(2, '0')}-${matchDMY[1].padStart(2, '0')}`;
        
        // Intentar parsear YYYY-MM-DD
        const matchYMD = text.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
        if (matchYMD) return `${matchYMD[1]}-${matchYMD[2].padStart(2, '0')}-${matchYMD[3].padStart(2, '0')}`;
        
        // Fallback genérico JS Date
        const temp = new Date(text);
        if (!isNaN(temp.getTime())) {
             const yyyy = temp.getFullYear();
             const mm = String(temp.getMonth() + 1).padStart(2, '0');
             const dd = String(temp.getDate()).padStart(2, '0');
             return `${yyyy}-${mm}-${dd}`;
        }
    }
    
    return String(d).trim();
}

/**
 * Lee y procesa el archivo Excel especificado.
 * Retorna una promesa con el JSON mapeado y limpiado.
 * @param {File} file Archivo Excel subido por el usuario
 */
export function leerExcelProcesado(file) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error("No se proporcionó ningún archivo."));

        if (typeof XLSX === 'undefined') {
            return reject(new Error("La librería SheetJS (XLSX) no está cargada en el entorno."));
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // Leemos el workbook (no usamos cellDates para no transformar los campos de hora/numero involuntariamente)
                const workbook = XLSX.read(data, { type: 'array' });

                const sheetName = "Procesado";
                if (!workbook.SheetNames.includes(sheetName)) {
                    return reject(new Error(`No se encontró la hoja "${sheetName}" en el archivo.`));
                }

                // Generar el JSON inicial asegurando un objeto para cada fila con defval ""
                const sheetRawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

                // Grupos de sinónimos/partes permitidas en los títulos (Ordenados de match Específico -> Genérico).
                const fieldPatterns = {
                    legajo: ['legajo', 'leg', 'nro'],
                    nombre: ['nombre', 'empleado', 'colaborador'],
                    fecha: ['fecha', 'date', 'dia'],
                    hora_ingreso: ['ingreso', 'entrada'],
                    hora_salida: ['salida'],
                    horas_trabajadas: ['trabajadas', 'total'],
                    
                    // Orden CRÍTICO: Primero 'manager' para que no crucen con variables genéricas
                    horas_50_manager: ['50_manager', '50_mgr', '50manager'],
                    horas_100_manager: ['100_manager', '100_mgr', '100manager'],
                    horas_feriado_manager: ['feriado_manager', 'feriado_mgr'],
                    horas_nocturnas_manager: ['nocturnas_manager', 'nocturno_manager', 'nocturnas', 'nocturno'],
                    noches_manager: ['noches_manager', 'noches_mgr', 'noches'],
                    
                    // Por descarte luego agarramos las que son automáticas
                    horas_50_auto: ['50_auto', '50'],
                    horas_100_auto: ['100_auto', '100'],
                    horas_feriado_auto: ['feriado_auto', 'feriado'],
                    
                    ausencias: ['ausencia', 'falta'],
                    comentarios: ['comentario', 'observacion'],
                    estado: ['estado', 'status']
                };

                const processedData = sheetRawData.map(row => {
                    const normalizedRow = {};
                    for (const key in row) {
                        normalizedRow[normalizeHeader(key)] = row[key];
                    }

                    // Función consumidora ("greedy"). Al encontrar match, consume la key original del obj.
                    const getVal = (patterns, type = 'string') => {
                        let result = undefined;
                        const validKeys = Object.keys(normalizedRow);
                        
                        for (const pat of patterns) {
                            const matchedKey = validKeys.find(k => k.includes(pat));
                            if (matchedKey) {
                                result = normalizedRow[matchedKey];
                                delete normalizedRow[matchedKey]; // Consume la key para no solapar búsquedas
                                break;
                            }
                        }

                        // Cast de tipo final de dato y aseguramiento
                        if (type === 'number') {
                            if (result === null || result === undefined || result === "") return 0;
                            
                            // Si por casualidad trae comas en el decimal, intentar parsear
                            if (typeof result === 'string') result = result.replace(',', '.');
                            
                            const num = Number(result);
                            return isNaN(num) ? 0 : num;
                        } 
                        else if (type === 'date') {
                            return formatExcelDate(result);
                        } 
                        else { // type === 'string'
                            if (result === null || result === undefined) return "";
                            return String(result).trim();
                        }
                    };

                    // El orden de llamada aquí es importante para consumir primero las colmanager 
                    return {
                        legajo: getVal(fieldPatterns.legajo, 'string'),
                        nombre: getVal(fieldPatterns.nombre, 'string'),
                        fecha: getVal(fieldPatterns.fecha, 'date'),
                        hora_ingreso: getVal(fieldPatterns.hora_ingreso, 'number'),
                        hora_salida: getVal(fieldPatterns.hora_salida, 'number'),
                        horas_trabajadas: getVal(fieldPatterns.horas_trabajadas, 'number'),
                        
                        horas_50_manager: getVal(fieldPatterns.horas_50_manager, 'number'),
                        horas_100_manager: getVal(fieldPatterns.horas_100_manager, 'number'),
                        horas_feriado_manager: getVal(fieldPatterns.horas_feriado_manager, 'number'),
                        horas_nocturnas_manager: getVal(fieldPatterns.horas_nocturnas_manager, 'number'),
                        noches_manager: getVal(fieldPatterns.noches_manager, 'number'),

                        horas_50_auto: getVal(fieldPatterns.horas_50_auto, 'number'),
                        horas_100_auto: getVal(fieldPatterns.horas_100_auto, 'number'),
                        horas_feriado_auto: getVal(fieldPatterns.horas_feriado_auto, 'number'),

                        ausencias: getVal(fieldPatterns.ausencias, 'string'),
                        comentarios: getVal(fieldPatterns.comentarios, 'string'),
                        estado: getVal(fieldPatterns.estado, 'string')
                    };
                }).filter(row => row.legajo !== ""); // Filtro estricto: Ignorar filas sin legajo numérico o texto

                resolve(processedData);
            } catch (err) {
                reject(new Error(`Ocurrió un error inicializando los datos: ${err.message}`));
            }
        };

        reader.onerror = () => reject(new Error("Error físico al leer el archivo Excel."));
        reader.readAsArrayBuffer(file);
    });
}
