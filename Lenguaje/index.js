// ========== Variables globales ==========
let editorCodigo;
let listaTokensActuales = [];
let listaErroresActuales = [];
let listaPartidosActuales = [];
let conjuntoEquiposActuales = new Set();
let mapaGoleadoresActuales = new Map();

// ========== Inicializar editor ==========
document.addEventListener("DOMContentLoaded", () => {
  editorCodigo = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
    mode: "application/json",
    theme: "material",
    styleActiveLine: true,
    lineNumbers: true,
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

// ========== Archivos ==========
function cargarArchivo(evento) {
  const [archivo] = evento.target.files;
  if (!archivo) return;
  const lectorArchivo = new FileReader();
  lectorArchivo.onload = eventoLectura => editorCodigo.setValue(eventoLectura.target.result);
  lectorArchivo.onerror = () => alert("Error al leer el archivo.");
  lectorArchivo.readAsText(archivo);
}

// ========== Escaneo léxico ==========
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

// ========== Extracción de datos ==========
const extraerDatosDominio = listaTokens => {
  listaPartidosActuales = [];
  conjuntoEquiposActuales = new Set();
  mapaGoleadoresActuales = new Map();

  let indice = 0;
  let partidoActual = null;

  const verToken = desplazamiento => listaTokens[indice + desplazamiento];
  const esToken = (desplazamiento, tipo, lexema) => {
    const token = verToken(desplazamiento);
    if (!token) return false;
    if (tipo && token.type !== tipo) return false;
    if (lexema !== undefined && token.lexeme !== lexema) return false;
    return true;
  };

  const esPartido = desplazamiento => {
    const token = verToken(desplazamiento);
    return !!token && (token.type === "KW_partido" || (token.type === "TK_id" && token.lexeme === "partido"));
  };
  const esGoleador = desplazamiento => {
    const token = verToken(desplazamiento);
    return !!token && (token.type === "KW_goleador" || (token.type === "TK_id" && token.lexeme === "goleador"));
  };

  while (indice < listaTokens.length) {
    // equipo : "Nombre"
    if (esToken(0, "KW_equipo") && esToken(1, "TK_colon") && esToken(2, "TK_string")) {
      conjuntoEquiposActuales.add(verToken(2).lexeme);
      indice += 3;
      continue;
    }
    // partido : "A" vs "B"
    if (esPartido(0) && esToken(1, "TK_colon") && esToken(2, "TK_string") && esToken(3, "TK_id", "vs") && esToken(4, "TK_string")) {
      partidoActual = { local: verToken(2).lexeme, visita: verToken(4).lexeme, gl: null, gv: null };
      listaPartidosActuales.push(partidoActual);
      indice += 5;
      continue;
    }
    // resultado : "x-y"
    if (esToken(0, "TK_id", "resultado") && esToken(1, "TK_colon") && esToken(2, "TK_string")) {
      const resultadoString = (verToken(2).lexeme || "").trim();
      const matchResultado = resultadoString.match(/^(\d+)\s*-\s*(\d+)$/);
      if (matchResultado && partidoActual) {
        partidoActual.gl = parseInt(matchResultado[1]);
        partidoActual.gv = parseInt(matchResultado[2]);
      }
      indice += 3;
      continue;
    }
    // goleador : "Nombre"
    if (esGoleador(0) && esToken(1, "TK_colon") && esToken(2, "TK_string")) {
      const nombreGoleador = verToken(2).lexeme;
      mapaGoleadoresActuales.set(nombreGoleador, (mapaGoleadoresActuales.get(nombreGoleador) || 0) + 1);
      indice += 3;
      continue;
    }
    indice++;
  }

  return {
    equipos: Array.from(conjuntoEquiposActuales),
    partidos: [...listaPartidosActuales],
    goleadores: Array.from(mapaGoleadoresActuales.entries()).map(([jugador, goles]) => ({ jugador, goles })),
  };
};

const extraerRondas = listaTokens => {
  const listaRondas = [];
  let indice = 0;
  const verToken = desplazamiento => listaTokens[indice + desplazamiento];
  const esToken = (desplazamiento, tipo, lexema) => {
    const token = verToken(desplazamiento);
    if (!token) return false;
    if (tipo && token.type !== tipo) return false;
    if (lexema !== undefined && token.lexeme !== lexema) return false;
    return true;
  };
  const esPartido = desplazamiento => {
    const token = verToken(desplazamiento);
    return !!token && (token.type === "KW_partido" || (token.type === "TK_id" && token.lexeme === "partido"));
  };
  while (indice < listaTokens.length) {
    if (esToken(0, "TK_id") && esToken(1, "TK_colon") && esToken(2, "TK_lbrk")) {
      const nombreRonda = verToken(0).lexeme;
      indice += 3;
      let profundidad = 1;
      const ronda = { nombre: nombreRonda, partidos: [] };
      let partidoActual = null;
      while (indice < listaTokens.length && profundidad > 0) {
        if (esToken(0, "TK_lbrk")) { profundidad++; indice++; continue; }
        if (esToken(0, "TK_rbrk")) { profundidad--; indice++; continue; }
        if (esPartido(0) && esToken(1, "TK_colon") && esToken(2, "TK_string") && esToken(3, "TK_id", "vs") && esToken(4, "TK_string")) {
          partidoActual = { local: verToken(2).lexeme, visita: verToken(4).lexeme, gl: null, gv: null };
          ronda.partidos.push(partidoActual);
          indice += 5;
          continue;
        }
        if (esToken(0, "TK_id", "resultado") && esToken(1, "TK_colon") && esToken(2, "TK_string")) {
          const resultadoString = (verToken(2).lexeme || "").trim();
          const matchResultado = resultadoString.match(/^(\d+)\s*-\s*(\d+)$/);
          if (matchResultado && partidoActual) {
            partidoActual.gl = parseInt(matchResultado[1]);
            partidoActual.gv = parseInt(matchResultado[2]);
          }
          indice += 3;
          continue;
        }
        indice++;
      }
      listaRondas.push(ronda);
      continue;
    }
    indice++;
  }
  // Orden sugerido
  const listaOrdenRondas = ["octavos", "cuartos", "semifinal", "final"];
  listaRondas.sort((rondaA, rondaB) => {
    const indiceA = listaOrdenRondas.indexOf((rondaA.nombre || "").toLowerCase());
    const indiceB = listaOrdenRondas.indexOf((rondaB.nombre || "").toLowerCase());
    if (indiceA === -1 && indiceB === -1) return 0;
    if (indiceA === -1) return 1;
    if (indiceB === -1) return -1;
    return indiceA - indiceB;
  });
  return listaRondas;
};

const obtenerTituloTorneo = listaTokens => {
  let indice = 0, dentro = false, profundidad = 0;
  const verToken = desplazamiento => listaTokens[indice + desplazamiento];
  const esToken = (desplazamiento, tipo, lexema) => {
    const token = verToken(desplazamiento);
    if (!token) return false;
    if (tipo && token.type !== tipo) return false;
    if (lexema !== undefined && token.lexeme !== lexema) return false;
    return true;
  };
  while (indice < listaTokens.length) {
    if (!dentro && esToken(0, "KW_torneo")) {
      indice++;
      while (indice < listaTokens.length && !esToken(0, "TK_lbrc")) indice++;
      if (esToken(0, "TK_lbrc")) { dentro = true; profundidad = 1; indice++; continue; }
    }
    if (dentro) {
      if (esToken(0, "TK_lbrc")) { profundidad++; indice++; continue; }
      if (esToken(0, "TK_rbrc")) { profundidad--; indice++; if (profundidad === 0) break; continue; }
      if (esToken(0, "TK_id", "nombre") && esToken(1, "TK_colon") && esToken(2, "TK_string"))
        return verToken(2).lexeme;
    }
    indice++;
  }
  return "Torneo";
};

// ========== Estadísticas ==========
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

// ========== Reporte HTML ==========
const construirReporteHTML = ({ htmlGeneral, htmlEquipos, htmlGoleadores }) => {
  const fechaGeneracion = new Date().toLocaleString();
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reporte de Torneo</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Arial; margin: 24px; }
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
  <p class="meta">Generado: ${escaparHTML(fechaGeneracion)}</p>
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

const descargarHTML = (nombreArchivo, contenidoArchivo) => {
  const blob = new Blob([contenidoArchivo], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlaceDescarga = document.createElement("a");
  enlaceDescarga.href = url;
  enlaceDescarga.download = nombreArchivo;
  document.body.appendChild(enlaceDescarga);
  enlaceDescarga.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    enlaceDescarga.remove();
  }, 0);
};

// ========== Acciones ==========
function analizarTorneo() {
  const { tokens, errores } = escanearCodigo();
  document.getElementById("resultsContent").innerHTML =
    crearSeccionHTML("Tokens", renderizarTablaTokens(tokens)) +
    crearSeccionHTML("Errores Léxicos", renderizarTablaErrores(errores));
}

function generarReporte() {
  if (listaTokensActuales.length === 0) escanearCodigo();
  if (listaTokensActuales.length === 0) {
    document.getElementById("resultsContent").innerHTML = "<p>No hay tokens para generar reportes. Escribe o carga un archivo y presiona Analizar Torneo.</p>";
    return;
  }
  const dominio = extraerDatosDominio(listaTokensActuales);
  const estadisticas = calcularEstadisticasEquipos(dominio.equipos, dominio.partidos);
  const htmlGeneral = `
    <ul>
      <li><strong>Total de equipos:</strong> ${dominio.equipos.length}</li>
      <li><strong>Total de partidos:</strong> ${dominio.partidos.length}</li>
      <li><strong>Partidos con resultado:</strong> ${dominio.partidos.filter(partido => Number.isInteger(partido.gl) && Number.isInteger(partido.gv)).length}</li>
      <li><strong>Goleadores distintos:</strong> ${dominio.goleadores.length}</li>
    </ul>
  `;
  const htmlEquipos = renderizarTablaEstadisticasEquipos(estadisticas);
  const htmlGoleadores = renderizarTablaGoleadores(dominio.goleadores);
  document.getElementById("resultsContent").innerHTML =
    crearSeccionHTML("Reporte - Información General", htmlGeneral) +
    crearSeccionHTML("Reporte - Estadísticas por Equipo", htmlEquipos) +
    crearSeccionHTML("Reporte - Goleadores", htmlGoleadores);
  const documentoHTML = construirReporteHTML({ htmlGeneral, htmlEquipos, htmlGoleadores });
  descargarHTML("reporte_torneo.html", documentoHTML);
}

// ========== Renderizar tabla de estadísticas por equipo ==========
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

// ========== Renderizar tabla de goleadores ==========
function renderizarTablaGoleadores(listaGoleadores) {
  if (!listaGoleadores || listaGoleadores.length === 0)
    return `<span class="cm-badge">No hay goleadores</span>`;
  const filas = listaGoleadores.map((goleador) => `
    <tr>
      <td>${goleador.jugador}</td>
      <td class="num">${goleador.goles}</td>
    </tr>
  `).join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead>
        <tr><th>Jugador</th><th>Goles</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

// ========== Mostrar Bracket (Viz.js) ==========
function mostrarBracket() {
  // Analiza y obtiene los datos del torneo
  if (listaTokensActuales.length === 0) escanearCodigo();
  if (listaTokensActuales.length === 0) {
    document.getElementById("resultsContent").innerHTML = "<p>No hay datos para mostrar el bracket. Escribe o carga un archivo y presiona Analizar Torneo.</p>";
    return;
  }
  const listaRondas = extraerRondas(listaTokensActuales);
  const tituloTorneo = obtenerTituloTorneo(listaTokensActuales);

  // Construye el DOT para Graphviz
  let codigoDot = `digraph G {
    graph [rankdir=TB, fontsize=18, fontname="Arial"];
    node [shape=box, style=filled, fontname="Arial", fontsize=14];
    label="${tituloTorneo}";
    labelloc="t";
    fontcolor="black";
  `;

  // Para cada ronda
  const listaColores = ["#D3D3D3", "#BFE2FF", "#FFFF99"];
  listaRondas.forEach((ronda, indiceRonda) => {
    codigoDot += `subgraph cluster_${indiceRonda} {
      label="${ronda.nombre.charAt(0).toUpperCase() + ronda.nombre.slice(1)}";
      bgcolor="${listaColores[indiceRonda] || "#FFFFFF"}";
      style="filled";
    `;
    ronda.partidos.forEach((partido, indicePartido) => {
      const nombreLocal = `"${partido.local}_${indiceRonda}_${indicePartido}_L"`;
      const nombreVisita = `"${partido.visita}_${indiceRonda}_${indicePartido}_V"`;
      const resultado = Number.isInteger(partido.gl) && Number.isInteger(partido.gv) ? `${partido.gl}-${partido.gv}` : partido.gl || partido.gv || "Pendiente";
      codigoDot += `
        ${nombreLocal} [fillcolor="${partido.gl > partido.gv ? "#98FB98" : "#FFB6C1"}", label="${partido.local} ${Number.isInteger(partido.gl) ? partido.gl : ""}"];
        ${nombreVisita} [fillcolor="${partido.gv > partido.gl ? "#98FB98" : "#FFB6C1"}", label="${partido.visita} ${Number.isInteger(partido.gv) ? partido.gv : ""}"];
        ${nombreLocal} -> ${nombreVisita} [label="${resultado}", color="red", fontcolor="red", style="dashed"];
      `;
    });
    codigoDot += `}\n`;
  });

  codigoDot += "}";

  // Renderizar SVG con Viz.js para que se muestre el bracket
  try {
    const viz = new Viz();
    viz.renderSVGElement(codigoDot)
      .then(function(elementoSVG) {
        document.getElementById("resultsContent").innerHTML = "";
        // Crea un div para el bracket y lo pone en el panel para que se vea mejor
        const divSVG = document.createElement("div");
        divSVG.id = "bracket-svg";
        divSVG.appendChild(elementoSVG);
        document.getElementById("resultsContent").appendChild(divSVG);
      })
      .catch(function(error) {
        document.getElementById("resultsContent").innerHTML = "<p>Error al generar el bracket.</p>";
        console.error(error);
      });
  } catch (err) {
    document.getElementById("resultsContent").innerHTML = "<p>Error al renderizar el bracket.</p>";
  }
}

// ========== Utilidades paraa HTML ==========
function crearSeccionHTML(tituloSeccion, contenidoSeccion) {
  return `<section>
    <h2>${tituloSeccion}</h2>
    ${contenidoSeccion}
  </section>`;
}
function renderizarTablaTokens(listaTokens) {
  if (!listaTokens || listaTokens.length === 0)
    return `<span class="cm-badge">No hay tokens</span>`;
  const filas = listaTokens.map((token, indice) => `
    <tr>
      <td class="num">${indice + 1}</td>
      <td>${escaparHTML(token.type || "")}</td>
      <td>${escaparHTML(token.lexeme || "")}</td>
      <td class="num">${token.line ?? ""}</td>
      <td class="num">${token.column ?? ""}</td>
    </tr>
  `).join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead>
        <tr><th>#</th><th>Token</th><th>Lexema</th><th>Línea</th><th>Columna</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}
function renderizarTablaErrores(listaErrores) {
  if (!listaErrores || listaErrores.length === 0)
    return `<span class="cm-badge">Sin errores léxicos</span>`;
  const filas = listaErrores.map((error, indice) => `
    <tr>
      <td class="num">${indice + 1}</td>
      <td>${escaparHTML(error.mensaje || error.message || "")}</td>
      <td class="num">${error.linea ?? error.line ?? ""}</td>
      <td class="num">${error.columna ?? error.column ?? ""}</td>
    </tr>
  `).join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead>
        <tr><th>#</th><th>Error</th><th>Línea</th><th>Columna</th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}
function escaparHTML(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}