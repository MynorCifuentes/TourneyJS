import { readFile } from 'fs/promises';
import { resolve } from 'path';

// Función asíncrona para leer el archivo
async function leerArchivoTxt() {
  try {
    // Construye la ruta al archivo de forma segura
    const rutaArchivo = resolve('entradas', 'entrada1.txt');

    // Lee el contenido del archivo en formato utf-8
    const contenido = await readFile(rutaArchivo, 'utf-8');

    // Muestra el contenido en la consola
    console.log('Contenido del archivo:');
    console.log(contenido);
  } catch (error) {
    console.error('Error al leer el archivo:', error);
  }
}

// Llama a la función
leerArchivoTxt();