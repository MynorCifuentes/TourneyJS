import { readFile } from 'fs/promises';
import { resolve } from 'path';

// Función asíncrona para leer el archivo
async function leerArchivoTxt() {
  try {
    // Construye la ruta al archivo de forma segura, partiendo del directorio actual
    const rutaArchivo = resolve('entradas', 'entrada1.txt');

    // Lee el contenido del archivo. 'await' pausa la ejecución hasta que la promesa se resuelva.
    const contenido = await readFile(rutaArchivo, { encoding: 'utf-8' });

    // Muestra el contenido en la consola
    console.log('--- Contenido del archivo ---');
    console.log(contenido);
    console.log('---------------------------');

  } catch (error) {
    // Si algo sale mal (ej: el archivo no existe), se captura el error
    console.error('Error al leer el archivo:', error.message);
  }
}

// Llama a la función para que se ejecute
leerArchivoTxt();