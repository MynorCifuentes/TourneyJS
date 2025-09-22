# Manual Técnico - TourneyJS

Este documento describe la arquitectura, el proceso de análisis léxico, el funcionamiento del sistema, algoritmos clave, integración gráfica, dependencias y decisiones de diseño de TourneyJS.

---

## 1. Arquitectura del Sistema

- **Frontend Web:** Interfaz HTML/CSS/JS con editor de código y paneles de resultados.
- **Backend JS:** Procesa el archivo, realiza análisis léxico y genera reportes.
- **Integración Viz.js/Graphviz:** Para visualizar brackets de eliminación.

Diagrama de despliegue 

![Diagrama de arquitectura general](/docs/diagrama_despliegue.png)

Diagrama de Clases

![Diagrama de Clases](/docs/diagrama_clases.png)

Diagrama de Flujo General

![Diagrama de Flujo](/docs/diagrama_flujo.png)
---

## 2. Dependencias Utilizadas

**Principales dependencias y librerías:**

- **CodeMirror:** Editor de texto avanzado para mostrar y editar el archivo de entrada.
  - *Uso:* Permite edición con resaltado de sintaxis y manejo eficiente en el navegador.
  - *Referencia:* `<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.2/codemirror.min.js"></script>`

- **Viz.js:** Librería para renderizar gráficos DOT/Graphviz directamente en el navegador.
  - *Uso:* Genera el SVG del bracket de eliminación usando código DOT construido dinámicamente.
  - *Referencia:* `<script src="https://cdn.jsdelivr.net/npm/viz.js@2.1.2/viz.js"></script>`

- **HTML/CSS Vanilla:** Para la estructura y estilos básicos de la interfaz.
- **JavaScript Puro:** Para toda la lógica de análisis, generación de reportes y manipulación DOM.

*No se utilizan frameworks ni dependencias de backend; todo el procesamiento es client-side.*

---

## 3. Analizador Léxico

El corazón del sistema es el analizador léxico, implementado en `Lenguaje/Scanner.js`. Escanea el archivo de entrada y produce una lista de tokens y errores léxicos.

**Snippet: Escaneo de tokens**
```javascript
const escanearCodigo = () => {
  const scanner = new Scanner(editorCodigo.getValue());
  const listaTokens = [];
  while (true) {
    const token = scanner.obtenerSiguienteToken();
    if (!token || token.type === "EOF") break;
    listaTokens.push(token);
  }
  const listaErrores = typeof scanner.obtenerErroresLexicos === "function"
    ? scanner.obtenerErroresLexicos()
    : (typeof scanner.getErrors === "function" ? scanner.getErrors() : []);
  listaTokensActuales = listaTokens;
  listaErroresActuales = listaErrores;
  return { tokens: listaTokens, errores: listaErrores };
};
```
**Explicación:**  
Este algoritmo lee el texto del editor y, usando la clase Scanner, obtiene secuencialmente los tokens hasta encontrar el final (`EOF`). También recoge los errores léxicos detectados.

---

## 4. Diseño del AFD

El AFD (Autómata Finito Determinista) se encarga de identificar los tokens válidos y registrar los errores. Cada estado representa una expectativa sintáctica (equipo, jugador, partido, resultado, etc.) y las transiciones dependen del tipo de carácter encontrado.

**Snippet: Ejemplo de transición de estado**
```javascript
// Ejemplo simplificado de transición en Scanner.js
obtenerSiguienteToken() {
    return this.estadoInicial();
}
// Estado inicial y transición
estadoInicial() {
    // ... lógica para avanzar por los distintos estados según el caracter
    // ... por ejemplo, si encuentra 'equipo:', salta al estado de lectura de equipo
}
```
**Explicación:**  
El método `obtenerSiguienteToken` inicia el proceso y delega a los distintos estados según la lógica del lenguaje definido para el torneo.

---

## 5. Extracción de Datos del Dominio

Tras el análisis léxico, se procesan los tokens para extraer la información relevante del torneo: equipos, partidos, goleadores, etc.

**Snippet: Extracción de equipos y partidos**
```javascript
const extraerDatosDominio = listaTokens => {
  listaPartidosActuales = [];
  conjuntoEquiposActuales = new Set();
  mapaGoleadoresActuales = new Map();
  // ... lógica para recorrer tokens y poblar las estructuras
  // Se detectan equipos, partidos y goleadores según patrones
  // Regresa objetos estructurados para el reporte y el bracket
};
```
**Explicación:**  
Esta función recorre la lista de tokens y, según los patrones detectados (palabras clave y estructura), va agregando equipos, partidos y goleadores a sus respectivas colecciones.

---

## 6. Cálculo de Estadísticas Deportivas

Con los datos extraídos, se calculan las estadísticas por equipos (jugados, ganados, perdidos, goles a favor/en contra).

**Snippet: Estadísticas por equipo**
```javascript
const calcularEstadisticasEquipos = (arrayEquipos, arrayPartidos) => {
  const mapaEstadisticas = new Map(arrayEquipos.map(equipo => [equipo, { equipo: equipo, J: 0, G: 0, P: 0, GF: 0, GC: 0 }]));
  for (const partido of arrayPartidos) {
    if (!partido) continue;
    const equipoLocal = mapaEstadisticas.get(partido.local);
    const equipoVisita = mapaEstadisticas.get(partido.visita);
    if (!equipoLocal || !equipoVisita) continue;
    if (!Number.isInteger(partido.gl) || !Number.isInteger(partido.gv)) continue;
    equipoLocal.J++; equipoVisita.J++;
    equipoLocal.GF += partido.gl; equipoLocal.GC += partido.gv;
    equipoVisita.GF += partido.gv; equipoVisita.GC += partido.gl;
    if (partido.gl > partido.gv) { equipoLocal.G++; equipoVisita.P++; }
    else if (partido.gl < partido.gv) { equipoVisita.G++; equipoLocal.P++; }
  }
  return [...mapaEstadisticas.values()];
};
```
**Explicación:**  
Por cada partido con resultado válido, actualiza los partidos jugados, ganados, perdidos y los goles de cada equipo.

---

## 7. Generación de Reporte HTML

Los resultados se presentan en reportes HTML, generando tablas con la información relevante y permitiendo la descarga.

**Snippet: Renderizado de tabla de estadísticas**
```javascript
function renderizarTablaEstadisticasEquipos(estadisticas) {
  if (!estadisticas || estadisticas.length === 0)
    return `<span class="cm-badge">No hay estadísticas para equipos</span>`;
  const filas = estadisticas.map((equipoEstadistica) => `
    <tr>
      <td>${equipoEstadistica.equipo}</td>
      <td class="num">${equipoEstadistica.J}</td>
      <td class="num">${equipoEstadistica.G}</td>
      <td class="num">${equipoEstadistica.P}</td>
      <td class="num">${equipoEstadistica.GF}</td>
      <td class="num">${equipoEstadistica.GC}</td>
    </tr>
  `).join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead>
        <tr>
          <th>Equipo</th><th>Jugados</th><th>Ganados</th>
          <th>Perdidos</th><th>Goles a favor</th><th>Goles en contra</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}
```
**Explicación:**  
Esta función recibe el arreglo de estadísticas y retorna una tabla HTML lista para mostrar en el reporte.

---

## 8. Visualización Gráfica de Bracket

Se genera el diagrama gráfico del bracket de eliminación usando Viz.js y Graphviz, procesando la sección ELIMINACION del archivo.

**Snippet: Generación y renderizado del bracket**
```javascript
function mostrarBracket() {
  // Obtención de datos, construcción de código DOT para Graphviz
  // Renderizado SVG con Viz.js
  const viz = new Viz();
  viz.renderSVGElement(codigoDot)
    .then(function(elementoSVG) {
      document.getElementById("resultsContent").innerHTML = "";
      const divSVG = document.createElement("div");
      divSVG.id = "bracket-svg";
      divSVG.appendChild(elementoSVG);
      document.getElementById("resultsContent").appendChild(divSVG);
    })
    .catch(function(error) {
      document.getElementById("resultsContent").innerHTML = "<p>Error al generar el bracket.</p>";
      console.error(error);
    });
}
```
**Explicación:**  
Genera el código DOT que describe el bracket, lo procesa con Viz.js y muestra el SVG en pantalla. Si hay error, lo reporta al usuario.

---

## 9. Interfaz Web y Navegación

- Botones para cargar archivo, analizar, generar reporte y mostrar bracket.
- Editor de código visible para modificar el archivo de entrada.
- Paneles dinámicos para mostrar tokens, errores, reportes y gráficos.

---

## 10. Decisiones de Diseño

- Separación de lógica de análisis y visualización.
- Uso de Viz.js para integración gráfica y compatibilidad web.
- Reportes en HTML para facilidad de exportación y visualización.

---

## Contacto

Para reportar errores o sugerencias puedes hacerlos a través de los issues del repositorio:  
[Issues - MynorCifuentes / LFP_Proyecto1_201318644 ](https://github.com/MynorCifuentes/LFP_Proyecto1_201318644/issues)

---