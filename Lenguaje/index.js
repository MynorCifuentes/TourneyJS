// Lógica de interfaz, análisis léxico y generación de reportes/brackets (ES6, nombres en español)

let editorCodigo = null;

// ============================
// Utilidades de DOM y render
// ============================

/** Selecciona un elemento del DOM */
const $ = (selectorCSS) => document.querySelector(selectorCSS);

/** Escapa caracteres peligrosos para insertar texto en HTML con seguridad */
const escaparHTML = (texto = "") =>
  String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/** Crea una sección (tarjeta) bonita en el panel derecho */
const crearSeccionHTML = (titulo, contenidoHTML) => `
  <div class="result-section cm-card">
    <h3>${escaparHTML(titulo)}</h3>
    ${contenidoHTML}
  </div>
`;

/** Renderiza tabla de tokens */
const renderizarTablaTokens = (tokens) => {
  const filas = tokens
    .map(
      (t, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${escaparHTML(t.type || "")}</td>
        <td>${escaparHTML(t.lexeme != null ? String(t.lexeme) : "")}</td>
        <td class="num">${t.line ?? ""}</td>
        <td class="num">${t.column ?? ""}</td>
      </tr>
    `
    )
    .join("");

  return `
    <table class="cm-table cm-striped cm-hover">
      <thead>
        <tr><th>#</th><th>Token</th><th>Lexema</th><th>Línea</th><th>Columna</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
};

/** Renderiza tabla de errores léxicos */
const renderizarTablaErrores = (errores) => {
  if (!errores || errores.length === 0) {
    return `<span class="cm-badge">Sin errores léxicos</span>`;
  }
  const filas = errores
    .map(
      (e, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${escaparHTML(e.mensaje || e.message || "")}</td>
        <td class="num">${e.linea ?? e.line ?? ""}</td>
        <td class="num">${e.columna ?? e.column ?? ""}</td>
      </tr>
    `
    )
    .join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead><tr><th>#</th><th>Descripción</th><th>Línea</th><th>Columna</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
};

/** Renderiza tabla de estadísticas por equipo */
const renderizarTablaEstadisticasEquipos = (filasDatos) => {
  const filas = filasDatos
    .map(
      (r, i) =>
        `<tr>
          <td class="num">${i + 1}</td>
          <td>${escaparHTML(r.equipo)}</td>
          <td class="num">${r.J}</td>
          <td class="num">${r.G}</td>
          <td class="num">${r.P}</td>
          <td class="num">${r.GF}</td>
          <td class="num">${r.GC}</td>
        </tr>`
    )
    .join("");

  return `
    <table class="cm-table cm-striped cm-hover">
      <thead><tr><th>#</th><th>Equipo</th><th>J</th><th>G</th><th>P</th><th>GF</th><th>GC</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
};

/** Renderiza tabla de goleadores */
const renderizarTablaGoleadores = (goleadores) => {
  const ordenados = goleadores.slice().sort((a, b) => b.goles - a.goles);
  const filas = ordenados
    .map(
      (g, i) =>
        `<tr><td class="num">${i + 1}</td><td>${escaparHTML(g.jugador)}</td><td class="num">${g.goles}</td></tr>`
    )
    .join("");

  return `
    <table class="cm-table cm-striped cm-hover">
      <thead><tr><th>#</th><th>Jugador</th><th>Goles</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
};

// ============================
// Estado del análisis actual
// ============================

let ULTIMOS_TOKENS = [];
let ULTIMOS_ERRORES = [];
let PARTIDOS_DETECTADOS = []; // { local, visita, gl, gv }
let EQUIPOS_DETECTADOS = new Set();
let MAPA_GOLEADORES = new Map();

// ============================
// Inicialización de CodeMirror
// ============================

document.addEventListener("DOMContentLoaded", () => {
  editorCodigo = CodeMirror.fromTextArea($("#codeEditor"), {
    mode: "application/json",
    theme: "material",
    styleActiveLine: true,
    lineNumbers: true,
    lineWrapping: false,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    scrollbarStyle: "native",
    value: `TORNEO {
  nombre: "Copa Mundial Universitaria",
  equipos: 4,
  sede: "Guatemala"
}

EQUIPOS {
  equipo: "Leones FC" [
    jugador: "Daniel Pérez" [posicion: "DELANTERO", numero: 9, edad: 23],
    jugador: "Roberto López" [posicion: "MEDIOCAMPO", numero: 8, edad: 22],
    jugador: "Santiago Ramírez" [posicion: "DEFENSA", numero: 4, edad: 25],
    jugador: "Manuel Torres" [posicion: "PORTERO", numero: 1, edad: 29]
  ],
  equipo: "Cóndores FC" [
    jugador: "Cristian Morales" [posicion: "DELANTERO", numero: 11, edad: 26],
    jugador: "Alejandro Ruiz" [posicion: "DEFENSA", numero: 3, edad: 28]
  ],
  equipo: "Águilas United" [
    jugador: "Javier Gómez" [posicion: "DELANTERO", numero: 7, edad: 24],
    jugador: "Felipe Díaz" [posicion: "PORTERO", numero: 12, edad: 27]
  ],
  equipo: "Tigres Academy" [
    jugador: "Oscar Hernández" [posicion: "DELANTERO", numero: 10, edad: 20],
    jugador: "Luis Ramírez" [posicion: "MEDIOCAMPO", numero: 6, edad: 22]
  ]
}

ELIMINACION {
  cuartos: [
    partido: "Leones FC" vs "Cóndores FC" [resultado: "3-1"],
    partido: "Águilas United" vs "Tigres Academy" [resultado: "2-0"]
  ],
  semifinal: [
    partido: "Leones FC" vs "Águilas United" [resultado: "1-0"]
  ],
  final: [
    partido: "Leones FC" vs "TBD" [resultado: "Pendiente"]
  ]
}`
  });

  setTimeout(() => editorCodigo.refresh(), 100);
});

// ============================
// Entrada de archivos
// ============================

/** Lee un archivo de texto y coloca su contenido en el editor */
function cargarArchivoDesdeDispositivo(eventoCambio) {
  const archivos = eventoCambio.target.files;
  if (!archivos || archivos.length === 0) return;

  const archivo = archivos[0];
  const lector = new FileReader();

  lector.onload = (e) => {
    editorCodigo.setValue(e.target.result);
  };
  lector.onerror = () => alert("Error al leer el archivo.");
  lector.readAsText(archivo);
}

// ============================
// Escaneo léxico (sin parser)
// ============================

/** Escanea todo el contenido del editor y actualiza el estado global de tokens/errores */
const escanearTodo = () => {
  const escaner = new Scanner(editorCodigo.getValue());
  const tokens = [];

  while (true) {
    const token = escaner.obtenerSiguienteToken();
    if (!token || token.type === "EOF") break;
    tokens.push(token);
  }

  const errores = typeof escaner.obtenerErroresLexicos === "function"
    ? escaner.obtenerErroresLexicos()
    : (typeof escaner.getErrors === "function" ? escaner.getErrors() : []);

  ULTIMOS_TOKENS = tokens;
  ULTIMOS_ERRORES = errores;

  return { tokens, errores };
};

/** Extrae equipos, partidos y goleadores a partir de secuencias de tokens (sin parser) */
const extraerDominioDesdeTokens = (tokens) => {
  PARTIDOS_DETECTADOS = [];
  EQUIPOS_DETECTADOS = new Set();
  MAPA_GOLEADORES = new Map();

  let i = 0;
  let partidoActual = null;

  const en = (k) => tokens[i + k];
  const es = (k, tipo, lexema) => {
    const t = en(k);
    if (!t) return false;
    if (tipo && t.type !== tipo) return false;
    if (lexema !== undefined && t.lexeme !== lexema) return false;
    return true;
  };

  while (i < tokens.length) {
    // equipo : "Nombre"
    if (es(0, "KW_equipo") && es(1, "TK_colon") && es(2, "TK_string")) {
      EQUIPOS_DETECTADOS.add(en(2).lexeme);
      i += 3;
      continue;
    }

    // partido : "A" vs "B"
    if (es(0, "TK_id", "partido") && es(1, "TK_colon") && es(2, "TK_string") && es(3, "TK_id", "vs") && es(4, "TK_string")) {
      partidoActual = { local: en(2).lexeme, visita: en(4).lexeme, gl: null, gv: null };
      PARTIDOS_DETECTADOS.push(partidoActual);
      i += 5;
      continue;
    }

    // resultado : "x-y"
    if (es(0, "TK_id", "resultado") && es(1, "TK_colon") && es(2, "TK_string")) {
      const res = (en(2).lexeme || "").trim();
      const m = res.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m && partidoActual) {
        partidoActual.gl = parseInt(m[1], 10);
        partidoActual.gv = parseInt(m[2], 10);
      }
      i += 3;
      continue;
    }

    // goleador : "Nombre"
    if (es(0, "TK_id", "goleador") && es(1, "TK_colon") && es(2, "TK_string")) {
      const nombre = en(2).lexeme;
      MAPA_GOLEADORES.set(nombre, (MAPA_GOLEADORES.get(nombre) || 0) + 1);
      i += 3;
      continue;
    }

    i++;
  }

  return {
    equipos: Array.from(EQUIPOS_DETECTADOS),
    partidos: PARTIDOS_DETECTADOS.slice(),
    goleadores: Array.from(MAPA_GOLEADORES.entries()).map(([jugador, goles]) => ({ jugador, goles })),
  };
};

/** Extrae rondas y sus partidos (cuartos, semifinal, final, etc.) a partir de tokens */
const extraerRondasDesdeTokens = (tokens) => {
  const rondas = []; // [{ name, matches: [{local, visita, gl, gv}] }]
  let i = 0;

  const en = (k) => tokens[i + k];
  const es = (k, tipo, lexema) => {
    const t = en(k);
    if (!t) return false;
    if (tipo && t.type !== tipo) return false;
    if (lexema !== undefined && t.lexeme !== lexema) return false;
    return true;
  };

  while (i < tokens.length) {
    // Forma: <id> : [
    if (es(0, "TK_id") && es(1, "TK_colon") && es(2, "TK_lbrk")) {
      const nombreRonda = en(0).lexeme;
      i += 3;
      let profundidad = 1;
      const ronda = { name: nombreRonda, matches: [] };
      let partidoActual = null;

      while (i < tokens.length && profundidad > 0) {
        if (es(0, "TK_lbrk")) { profundidad++; i++; continue; }
        if (es(0, "TK_rbrk")) { profundidad--; i++; continue; }

        // partido : "A" vs "B"
        if (es(0, "TK_id", "partido") && es(1, "TK_colon") && es(2, "TK_string") && es(3, "TK_id", "vs") && es(4, "TK_string")) {
          partidoActual = { local: en(2).lexeme, visita: en(4).lexeme, gl: null, gv: null };
          ronda.matches.push(partidoActual);
          i += 5;
          continue;
        }

        // resultado : "x-y"
        if (es(0, "TK_id", "resultado") && es(1, "TK_colon") && es(2, "TK_string")) {
          const res = (en(2).lexeme || "").trim();
          const m = res.match(/^(\d+)\s*-\s*(\d+)$/);
          if (m && partidoActual) {
            partidoActual.gl = parseInt(m[1], 10);
            partidoActual.gv = parseInt(m[2], 10);
          }
          i += 3;
          continue;
        }

        i++;
      }

      rondas.push(ronda);
      continue;
    }

    i++;
  }

  // Orden sugerido
  const orden = ["octavos", "cuartos", "semifinal", "final"];
  rondas.sort((a, b) => {
    const ia = orden.indexOf((a.name || "").toLowerCase());
    const ib = orden.indexOf((b.name || "").toLowerCase());
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return rondas;
};

/** Obtiene el título del torneo desde el bloque TORNEO { nombre: "..." } */
const obtenerTituloTorneoDesdeTokens = (tokens) => {
  let i = 0;
  let dentroTorneo = false;
  let profundidad = 0;

  const en = (k) => tokens[i + k];
  const es = (k, tipo, lexema) => {
    const t = en(k);
    if (!t) return false;
    if (tipo && t.type !== tipo) return false;
    if (lexema !== undefined && t.lexeme !== lexema) return false;
    return true;
  };

  while (i < tokens.length) {
    if (!dentroTorneo && es(0, "KW_torneo")) {
      i++;
      while (i < tokens.length && !es(0, "TK_lbrc")) i++;
      if (es(0, "TK_lbrc")) { dentroTorneo = true; profundidad = 1; i++; continue; }
    }

    if (dentroTorneo) {
      if (es(0, "TK_lbrc")) { profundidad++; i++; continue; }
      if (es(0, "TK_rbrc")) { profundidad--; i++; if (profundidad === 0) break; continue; }
      if (es(0, "TK_id", "nombre") && es(1, "TK_colon") && es(2, "TK_string")) {
        return en(2).lexeme;
      }
    }

    i++;
  }
  return "Torneo";
};

// ============================
// Cálculo de estadísticas
// ============================

/** Calcula estadísticas por equipo: J, G, P, GF, GC */
const calcularEstadisticasPorEquipo = (listadoEquipos, listadoPartidos) => {
  const mapa = new Map(listadoEquipos.map((e) => [e, { equipo: e, J: 0, G: 0, P: 0, GF: 0, GC: 0 }]));
  for (const p of listadoPartidos) {
    if (!p) continue;
    const l = mapa.get(p.local);
    const v = mapa.get(p.visita);
    if (!l || !v) continue;
    if (!Number.isInteger(p.gl) || !Number.isInteger(p.gv)) continue;

    l.J++; v.J++;
    l.GF += p.gl; l.GC += p.gv;
    v.GF += p.gv; v.GC += p.gl;
    if (p.gl > p.gv) { l.G++; v.P++; }
    else if (p.gl < p.gv) { v.G++; l.P++; }
  }
  return Array.from(mapa.values());
};

// ============================
// Generación del DOT (bracket)
// ============================

const COLORES = {
  ganador: "#b7e1cd",
  perdedor: "#f4c7c3",
  pendiente: "#fff9c4",
  cluster: {
    cuartos: "#d9d9d9",
    semifinal: "#cfe9f3",
    final: "#fff59d",
    default: "#eeeeee",
  },
};

const colorClusterPorRonda = (nombre) => {
  const k = (nombre || "").toLowerCase();
  return COLORES.cluster[k] || COLORES.cluster.default;
};

const ladoGanador = (partido) => {
  if (Number.isInteger(partido.gl) && Number.isInteger(partido.gv)) {
    if (partido.gl > partido.gv) return "L";
    if (partido.gv > partido.gl) return "R";
  }
  return null; // pendiente o empate
};

const etiquetaEquipo = (nombre, goles) => {
  const suf = Number.isInteger(goles) ? `\\n${goles}` : "";
  return `${String(nombre || "TBD").replaceAll('"', '\\"')}${suf}`;
};

const idNodoPartido = (indiceRonda, indicePartido) => `M_${indiceRonda}_${indicePartido}`;
const idNodoEquipoPartido = (indiceRonda, indicePartido, lado) => `T_${indiceRonda}_${indicePartido}_${lado}`;

/** Construye un DOT con clusters por ronda y colores estilo la imagen compartida */
const construirDOTBracketEstilizado = (rondas, titulo) => {
  const lineas = [];
  lineas.push("digraph bracket {");
  lineas.push('  rankdir=TB;');
  lineas.push('  labelloc="t";');
  lineas.push('  fontname="Helvetica";');
  lineas.push('  node [fontname="Helvetica"];');
  lineas.push('  edge [fontname="Helvetica"];');
  lineas.push("");

  // Título (óvalo)
  lineas.push(`  TITLE [shape=ellipse, style=filled, fillcolor="#ffeb3b", label="${String(titulo || "Torneo").replaceAll('"','\\"')}"];`);
  lineas.push("  { rank=source; TITLE; }");
  lineas.push("");

  // Clusters (rondas)
  rondas.forEach((ronda, idx0) => {
    const idxRonda = idx0 + 1;
    const fill = colorClusterPorRonda(ronda.name);
    const etiquetaRonda = (ronda.name || "").charAt(0).toUpperCase() + (ronda.name || "").slice(1);

    lineas.push(`  subgraph cluster_${idxRonda} {`);
    lineas.push(`    label="${etiquetaRonda}";`);
    lineas.push("    style=filled;");
    lineas.push('    color="#333333";');
    lineas.push(`    fillcolor="${fill}";`);
    lineas.push("    fontsize=18;");
    lineas.push('    labelloc="t";');

    ronda.matches.forEach((p, j0) => {
      const idxPartido = j0 + 1;
      const ganador = ladoGanador(p);

      const colorLocal  = ganador === "L" ? COLORES.ganador : (ganador === "R" ? COLORES.perdedor : COLORES.pendiente);
      const colorVisita = ganador === "R" ? COLORES.ganador : (ganador === "L" ? COLORES.perdedor : COLORES.pendiente);

      const lblLocal  = etiquetaEquipo(p.local,  p.gl);
      const lblVisita = etiquetaEquipo(p.visita, p.gv);

      lineas.push(`    ${idNodoEquipoPartido(idxRonda, idxPartido, "L")} [shape=box, style="rounded,filled", fillcolor="${colorLocal}", label="${lblLocal}"];`);
      lineas.push(`    ${idNodoEquipoPartido(idxRonda, idxPartido, "R")} [shape=box, style="rounded,filled", fillcolor="${colorVisita}", label="${lblVisita}"];`);
      lineas.push(`    ${idNodoPartido(idxRonda, idxPartido)} [shape=ellipse, style=filled, fillcolor="lightgray", label=""];`);

      // Conectar equipos al nodo "partido"
      lineas.push(`    ${idNodoEquipoPartido(idxRonda, idxPartido, "L")} -> ${idNodoPartido(idxRonda, idxPartido)} [color="#666666", arrowsize=0.7];`);
      lineas.push(`    ${idNodoEquipoPartido(idxRonda, idxPartido, "R")} -> ${idNodoPartido(idxRonda, idxPartido)} [color="#666666", arrowsize=0.7];`);
    });

    lineas.push("  }");
    lineas.push("");
  });

  // Conexiones entre rondas (de a pares)
  for (let i = 1; i < rondas.length; i++) {
    const anterior = rondas[i - 1];
    const actual = rondas[i];

    for (let j = 1; j <= actual.matches.length; j++) {
      const fuente1 = 2 * j - 1;
      const fuente2 = 2 * j;

      const p1 = anterior.matches[fuente1 - 1];
      const p2 = anterior.matches[fuente2 - 1];

      const destino = idNodoPartido(i + 1, j);

      if (p1) {
        const hayGanador = ladoGanador(p1) !== null;
        const atributos = hayGanador
          ? 'color="black", penwidth=1.6, label="Ganador", fontsize=12'
          : 'color="red", style="dashed", penwidth=1.2';
        lineas.push(`  ${idNodoPartido(i, fuente1)} -> ${destino} [${atributos}];`);
      }

      if (p2) {
        const hayGanador = ladoGanador(p2) !== null;
        const atributos = hayGanador
          ? 'color="black", penwidth=1.6, label="Ganador", fontsize=12'
          : 'color="red", style="dashed", penwidth=1.2';
        lineas.push(`  ${idNodoPartido(i, fuente2)} -> ${destino} [${atributos}];`);
      }
    }
  }

  // Amarra el título a la primera ronda para que quede arriba
  if (rondas.length > 0) {
    lineas.push(`  TITLE -> ${idNodoPartido(1, 1)} [style="invis"];`);
  }

  lineas.push("}");
  return lineas.join("\n");
};

// ============================
// Generación de reporte HTML
// ============================

/** Construye un documento HTML completo para descargar como archivo */
const construirDocumentoReporteHTML = ({ htmlGeneral, htmlEquipos, htmlGoleadores }) => {
  const generado = new Date().toLocaleString();
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reporte de Torneo</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 24px; }
  h1 { margin-top: 0; }
  section { margin: 24px 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; }
  th { background: #f7f7f7; text-align: left; }
  @media (prefers-color-scheme: dark) {
    th, td { border-color: #444; }
    th { background: #222; color: #f7f7f7; }
    body { color: #f7f7f7; background-color: #121212; }
  }
  .meta { color: #666; font-size: 0.9rem; }
</style>
</head>
<body>
  <h1>Reporte de Torneo</h1>
  <p class="meta">Generado: ${escaparHTML(generado)}</p>

  <section>
    <h2>Información General</h2>
    ${htmlGeneral}
  </section>

  <section>
    <h2>Estadísticas por Equipo</h2>
    ${htmlEquipos}
  </section>

  <section>
    <h2>Goleadores</h2>
    ${htmlGoleadores}
  </section>
</body>
</html>`;
};

/** Dispara la descarga de un archivo HTML */
const descargarArchivoHTML = (nombreArchivo, contenidoHTML) => {
  const blob = new Blob([contenidoHTML], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
};

// ============================
// Acciones de botones (global)
// ============================

/** Analiza léxicamente y muestra tokens + errores en el panel derecho */
function analizarTorneo() {
  const { tokens, errores } = escanearTodo();
  const htmlTokens = renderizarTablaTokens(tokens);
  const htmlErrores = renderizarTablaErrores(errores);
  $("#resultsContent").innerHTML = crearSeccionHTML("Tokens", htmlTokens) + crearSeccionHTML("Errores Léxicos", htmlErrores);
}

/** Genera reporte HTML en el panel derecho y descarga un archivo HTML completo */
function generarReporte() {
  if (ULTIMOS_TOKENS.length === 0) escanearTodo();

  if (ULTIMOS_TOKENS.length === 0) {
    $("#resultsContent").innerHTML = "<p>No hay tokens para generar reportes. Escribe o carga un archivo y presiona Analizar Torneo.</p>";
    return;
  }

  const dominio = extraerDominioDesdeTokens(ULTIMOS_TOKENS);
  const estadisticas = calcularEstadisticasPorEquipo(dominio.equipos, dominio.partidos);

  const htmlGeneral = `
    <ul>
      <li><strong>Total de equipos:</strong> ${dominio.equipos.length}</li>
      <li><strong>Total de partidos:</strong> ${dominio.partidos.length}</li>
      <li><strong>Partidos con resultado:</strong> ${dominio.partidos.filter(p => Number.isInteger(p.gl) && Number.isInteger(p.gv)).length}</li>
      <li><strong>Goleadores distintos:</strong> ${dominio.goleadores.length}</li>
    </ul>
  `;

  const htmlEquipos = renderizarTablaEstadisticasEquipos(estadisticas);
  const htmlGoleadores = renderizarTablaGoleadores(dominio.goleadores);

  $("#resultsContent").innerHTML =
    crearSeccionHTML("Reporte - Información General", htmlGeneral) +
    crearSeccionHTML("Reporte - Estadísticas por Equipo", htmlEquipos) +
    crearSeccionHTML("Reporte - Goleadores", htmlGoleadores);

  const documentoHTML = construirDocumentoReporteHTML({
    htmlGeneral,
    htmlEquipos,
    htmlGoleadores,
  });
  descargarArchivoHTML("reporte_torneo.html", documentoHTML);
}

/** Muestra el bracket estilo imagen (SVG con Viz.js) y el DOT correspondiente */
async function mostrarBracket() {
  if (ULTIMOS_TOKENS.length === 0) escanearTodo();

  if (ULTIMOS_TOKENS.length === 0) {
    $("#resultsContent").innerHTML = "<p>No hay tokens para mostrar el bracket. Escribe o carga un archivo y presiona Analizar Torneo.</p>";
    return;
  }

  const rondas = extraerRondasDesdeTokens(ULTIMOS_TOKENS);
  if (rondas.length === 0) {
    $("#resultsContent").innerHTML = "<p>No se detectaron rondas (p.ej.: cuartos, semifinal, final). Verifica el bloque ELIMINACION.</p>";
    return;
  }

  const titulo = obtenerTituloTorneoDesdeTokens(ULTIMOS_TOKENS);
  const dot = construirDOTBracketEstilizado(rondas, titulo);

  const htmlContenedor =
    crearSeccionHTML("Bracket (SVG)", `<div id="bracket-svg" style="overflow:auto;"></div>`) +
    crearSeccionHTML("DOT de Graphviz", `<pre>${escaparHTML(dot)}</pre>`);

  $("#resultsContent").innerHTML = htmlContenedor;

  const contenedorSVG = $("#bracket-svg");
  try {
    const viz = new Viz();
    const elementoSVG = await viz.renderSVGElement(dot);
    contenedorSVG.innerHTML = "";
    contenedorSVG.appendChild(elementoSVG);
  } catch (error) {
    console.error("Viz.js error:", error);
    contenedorSVG.innerHTML = `<p style="color:#b00;">Error renderizando SVG con Viz.js: ${escaparHTML(String(error))}</p>`;
  }
}