// Interfaz y lógica de análisis léxico para el torneo (ES6, español)

// ========== DOM y utilidades ==========
const $ = selector => document.querySelector(selector);

const escaparHTML = texto =>
  String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const crearSeccionHTML = (titulo, contenido) => `
  <div class="result-section cm-card">
    <h3>${escaparHTML(titulo)}</h3>
    ${contenido}
  </div>
`;

// ========== Renderizado de tablas ==========
const renderizarTablaTokens = tokens => {
  const filas = tokens.map((t, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escaparHTML(t.type || "")}</td>
      <td>${escaparHTML(t.lexeme ?? "")}</td>
      <td class="num">${t.line ?? ""}</td>
      <td class="num">${t.column ?? ""}</td>
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
};

const renderizarTablaErrores = errores => {
  if (!errores || errores.length === 0)
    return `<span class="cm-badge">Sin errores léxicos</span>`;
  const filas = errores.map((e, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escaparHTML(e.mensaje || e.message || "")}</td>
      <td class="num">${e.linea ?? e.line ?? ""}</td>
      <td class="num">${e.columna ?? e.column ?? ""}</td>
    </tr>
  `).join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead><tr><th>#</th><th>Descripción</th><th>Línea</th><th>Columna</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
};

const renderizarTablaEstadisticasEquipos = equipos => {
  const filas = equipos.map((e, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>${escaparHTML(e.equipo)}</td>
      <td class="num">${e.J}</td>
      <td class="num">${e.G}</td>
      <td class="num">${e.P}</td>
      <td class="num">${e.GF}</td>
      <td class="num">${e.GC}</td>
    </tr>
  `).join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead><tr><th>#</th><th>Equipo</th><th>J</th><th>G</th><th>P</th><th>GF</th><th>GC</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
};

const renderizarTablaGoleadores = goleadores => {
  const ordenados = [...goleadores].sort((a, b) => b.goles - a.goles);
  const filas = ordenados.map((g, i) => `
    <tr><td class="num">${i + 1}</td><td>${escaparHTML(g.jugador)}</td><td class="num">${g.goles}</td></tr>
  `).join("");
  return `
    <table class="cm-table cm-striped cm-hover">
      <thead><tr><th>#</th><th>Jugador</th><th>Goles</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>
  `;
};

// ========== Estado global ==========
let editorCodigo = null;
let tokensActuales = [];
let erroresActuales = [];
let partidosActuales = [];
let equiposActuales = new Set();
let goleadoresActuales = new Map();

// ========== Inicializar editor ==========
document.addEventListener("DOMContentLoaded", () => {
  editorCodigo = CodeMirror.fromTextArea($("#codeEditor"), {
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

// ========== Archivos ==========
function cargarArchivo(event) {
  const [archivo] = event.target.files;
  if (!archivo) return;
  const lector = new FileReader();
  lector.onload = e => editorCodigo.setValue(e.target.result);
  lector.onerror = () => alert("Error al leer el archivo.");
  lector.readAsText(archivo);
}

// ========== Escaneo léxico ==========
const escanearCodigo = () => {
  const scanner = new Scanner(editorCodigo.getValue());
  const tokens = [];
  while (true) {
    const token = scanner.obtenerSiguienteToken();
    if (!token || token.type === "EOF") break;
    tokens.push(token);
  }
  const errores = typeof scanner.obtenerErroresLexicos === "function"
    ? scanner.obtenerErroresLexicos()
    : (typeof scanner.getErrors === "function" ? scanner.getErrors() : []);
  tokensActuales = tokens;
  erroresActuales = errores;
  return { tokens, errores };
};

// ========== Extracción de datos ==========
const extraerDatosDominio = tokens => {
  partidosActuales = [];
  equiposActuales = new Set();
  goleadoresActuales = new Map();

  let i = 0;
  let partidoActual = null;

  const ver = k => tokens[i + k];
  const es = (k, tipo, lexema) => {
    const t = ver(k);
    if (!t) return false;
    if (tipo && t.type !== tipo) return false;
    if (lexema !== undefined && t.lexeme !== lexema) return false;
    return true;
  };

  const esPartido = k => {
    const t = ver(k);
    return !!t && (t.type === "KW_partido" || (t.type === "TK_id" && t.lexeme === "partido"));
  };
  const esGoleador = k => {
    const t = ver(k);
    return !!t && (t.type === "KW_goleador" || (t.type === "TK_id" && t.lexeme === "goleador"));
  };

  while (i < tokens.length) {
    // equipo : "Nombre"
    if (es(0, "KW_equipo") && es(1, "TK_colon") && es(2, "TK_string")) {
      equiposActuales.add(ver(2).lexeme);
      i += 3;
      continue;
    }
    // partido : "A" vs "B"
    if (esPartido(0) && es(1, "TK_colon") && es(2, "TK_string") && es(3, "TK_id", "vs") && es(4, "TK_string")) {
      partidoActual = { local: ver(2).lexeme, visita: ver(4).lexeme, gl: null, gv: null };
      partidosActuales.push(partidoActual);
      i += 5;
      continue;
    }
    // resultado : "x-y"
    if (es(0, "TK_id", "resultado") && es(1, "TK_colon") && es(2, "TK_string")) {
      const res = (ver(2).lexeme || "").trim();
      const m = res.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m && partidoActual) {
        partidoActual.gl = parseInt(m[1]);
        partidoActual.gv = parseInt(m[2]);
      }
      i += 3;
      continue;
    }
    // goleador : "Nombre"
    if (esGoleador(0) && es(1, "TK_colon") && es(2, "TK_string")) {
      const nombre = ver(2).lexeme;
      goleadoresActuales.set(nombre, (goleadoresActuales.get(nombre) || 0) + 1);
      i += 3;
      continue;
    }
    i++;
  }

  return {
    equipos: Array.from(equiposActuales),
    partidos: [...partidosActuales],
    goleadores: Array.from(goleadoresActuales.entries()).map(([jugador, goles]) => ({ jugador, goles })),
  };
};

const extraerRondas = tokens => {
  const rondas = [];
  let i = 0;
  const ver = k => tokens[i + k];
  const es = (k, tipo, lexema) => {
    const t = ver(k);
    if (!t) return false;
    if (tipo && t.type !== tipo) return false;
    if (lexema !== undefined && t.lexeme !== lexema) return false;
    return true;
  };
  const esPartido = k => {
    const t = ver(k);
    return !!t && (t.type === "KW_partido" || (t.type === "TK_id" && t.lexeme === "partido"));
  };
  while (i < tokens.length) {
    if (es(0, "TK_id") && es(1, "TK_colon") && es(2, "TK_lbrk")) {
      const nombreRonda = ver(0).lexeme;
      i += 3;
      let profundidad = 1;
      const ronda = { nombre: nombreRonda, partidos: [] };
      let partidoActual = null;
      while (i < tokens.length && profundidad > 0) {
        if (es(0, "TK_lbrk")) { profundidad++; i++; continue; }
        if (es(0, "TK_rbrk")) { profundidad--; i++; continue; }
        if (esPartido(0) && es(1, "TK_colon") && es(2, "TK_string") && es(3, "TK_id", "vs") && es(4, "TK_string")) {
          partidoActual = { local: ver(2).lexeme, visita: ver(4).lexeme, gl: null, gv: null };
          ronda.partidos.push(partidoActual);
          i += 5;
          continue;
        }
        if (es(0, "TK_id", "resultado") && es(1, "TK_colon") && es(2, "TK_string")) {
          const res = (ver(2).lexeme || "").trim();
          const m = res.match(/^(\d+)\s*-\s*(\d+)$/);
          if (m && partidoActual) {
            partidoActual.gl = parseInt(m[1]);
            partidoActual.gv = parseInt(m[2]);
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
    const ia = orden.indexOf((a.nombre || "").toLowerCase());
    const ib = orden.indexOf((b.nombre || "").toLowerCase());
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return rondas;
};

const obtenerTituloTorneo = tokens => {
  let i = 0, dentro = false, profundidad = 0;
  const ver = k => tokens[i + k];
  const es = (k, tipo, lexema) => {
    const t = ver(k);
    if (!t) return false;
    if (tipo && t.type !== tipo) return false;
    if (lexema !== undefined && t.lexeme !== lexema) return false;
    return true;
  };
  while (i < tokens.length) {
    if (!dentro && es(0, "KW_torneo")) {
      i++;
      while (i < tokens.length && !es(0, "TK_lbrc")) i++;
      if (es(0, "TK_lbrc")) { dentro = true; profundidad = 1; i++; continue; }
    }
    if (dentro) {
      if (es(0, "TK_lbrc")) { profundidad++; i++; continue; }
      if (es(0, "TK_rbrc")) { profundidad--; i++; if (profundidad === 0) break; continue; }
      if (es(0, "TK_id", "nombre") && es(1, "TK_colon") && es(2, "TK_string"))
        return ver(2).lexeme;
    }
    i++;
  }
  return "Torneo";
};

// ========== Estadísticas ==========
const calcularEstadisticasEquipos = (equipos, partidos) => {
  const mapa = new Map(equipos.map(e => [e, { equipo: e, J: 0, G: 0, P: 0, GF: 0, GC: 0 }]));
  for (const p of partidos) {
    if (!p) continue;
    const local = mapa.get(p.local);
    const visita = mapa.get(p.visita);
    if (!local || !visita) continue;
    if (!Number.isInteger(p.gl) || !Number.isInteger(p.gv)) continue;
    local.J++; visita.J++;
    local.GF += p.gl; local.GC += p.gv;
    visita.GF += p.gv; visita.GC += p.gl;
    if (p.gl > p.gv) { local.G++; visita.P++; }
    else if (p.gl < p.gv) { visita.G++; local.P++; }
  }
  return [...mapa.values()];
};

// ========== Reporte HTML ==========
const construirReporteHTML = ({ htmlGeneral, htmlEquipos, htmlGoleadores }) => {
  const generado = new Date().toLocaleString();
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

const descargarHTML = (nombre, contenido) => {
  const blob = new Blob([contenido], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
};

// ========== Acciones ==========
function analizarTorneo() {
  const { tokens, errores } = escanearCodigo();
  $("#resultsContent").innerHTML =
    crearSeccionHTML("Tokens", renderizarTablaTokens(tokens)) +
    crearSeccionHTML("Errores Léxicos", renderizarTablaErrores(errores));
}

function generarReporte() {
  if (tokensActuales.length === 0) escanearCodigo();
  if (tokensActuales.length === 0) {
    $("#resultsContent").innerHTML = "<p>No hay tokens para generar reportes. Escribe o carga un archivo y presiona Analizar Torneo.</p>";
    return;
  }
  const dominio = extraerDatosDominio(tokensActuales);
  const estadisticas = calcularEstadisticasEquipos(dominio.equipos, dominio.partidos);
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
  const documentoHTML = construirReporteHTML({ htmlGeneral, htmlEquipos, htmlGoleadores });
  descargarHTML("reporte_torneo.html", documentoHTML);
}

// Si tienes una función para el bracket, la puedes dejar igual, sólo revisa los nombres.
