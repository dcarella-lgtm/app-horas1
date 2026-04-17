// Archivo principal de la aplicación
import { initUI } from './ui.js';
import { fetchData } from './api.js';
import { processExcel } from './excel.js';
import { calculateHours } from './calculos.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('App inicializada');
    initUI();
});
