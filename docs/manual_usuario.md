# Manual de Usuario - TourneyJS

Este manual explica cómo utilizar TourneyJS, una herramienta web para analizar archivos de torneos deportivos mediante un analizador léxico. Podrás cargar archivos, visualizar tokens y errores, generar reportes HTML y mostrar brackets de eliminación.

---

## 1. Ingreso y Vista Principal

Abre la aplicación web TourneyJS. Encontrarás un editor de código para cargar el archivo y botones de navegación principales:
- **Cargar Archivo**
- **Analizar Torneo**
- **Generar Reporte**
- **Mostrar Bracket**

**Screenshot sugerido:**  
![Pantalla principal de TourneyJS](/imagenes/pantalla_principal.png)

---

## 2. Cargar Archivo de Torneo

Haz clic en **Cargar Archivo** para seleccionar el archivo de entrada (formato .txt) que describe el torneo.

**Screenshot sugerido:**  
![Selección de archivo de torneo](/imagenes/pantalla_abrir.png)

---

## 3. Analizar Torneo

Presiona **Analizar Torneo** una vez cargado el archivo. El sistema realiza un análisis léxico y muestra una tabla con los tokens reconocidos y posibles errores léxicos detectados.

**Screenshot sugerido:**  

![Resultados del análisis léxico (tokens y errores)](/imagenes/pantalla_analisis.png)
---

## 4. Generar Reporte HTML

Haz clic en **Generar Reporte** para obtener reportes HTML con:
- Estadísticas por equipo
- Tabla de goleadores
- Información general del torneo

El reporte se muestra en pantalla y puede contener tablas y listados.

**Screenshot sugerido:**  
![Visualización del reporte HTML](/imagenes/pantalla_reportes.png)
---

## 5. Visualizar Bracket de Eliminación

Selecciona **Mostrar Bracket** para ver el diagrama gráfico (SVG) del bracket de eliminación, generado dinámicamente con Graphviz.

**Screenshot sugerido:**  
![Bracket de eliminación](/imagenes/pantalla_eliminacion.png)


---

## 6. Solución a Errores Comunes

- **Error en lectura de archivo:** Verifica el formato y contenido del archivo.
- **Errores léxicos:** Consulta la tabla de errores para corregir la sintaxis.
- **Error al mostrar bracket:** Asegúrate que la sección ELIMINACION esté bien estructurada en el archivo.

**Screenshot sugerido:**  
![Ejemplo de mensaje de error](/imagenes/pantalla_error.png)
---

## Contacto

Para reportar errores o sugerencias puedes hacerlos a través de los issues del repositorio:  
[Issues - MynorCifuentes / LFP_Proyecto1_201318644 ](https://github.com/MynorCifuentes/LFP_Proyecto1_201318644/issues)




---