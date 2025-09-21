let editor;

// Utilidades
const $ = (sel) => document.querySelector(sel);
function escapeHTML(str = "") {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
function sectionHTML(title, inner) {
    return `
        <div class="result-section cm-card">
            <h3>${escapeHTML(title)}</h3>
            ${inner}
        </div>
    `;
}
function renderTokensTable(tokens) {
    const rows = tokens.map((t, i) => `
        <tr>
            <td class="num">${i + 1}</td>
            <td>${escapeHTML(t.type || "")}</td>
            <td>${escapeHTML(t.lexeme != null ? String(t.lexeme) : "")}</td>
            <td class="num">${t.line ?? ""}</td>
            <td class="num">${t.column ?? ""}</td>
        </tr>
    `).join("");
    return `
        <table class="cm-table cm-striped cm-hover">
            <thead><tr><th>#</th><th>Token</th><th>Lexema</th><th>Línea</th><th>Columna</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}
function renderErrorsTable(errors) {
    if (!errors || !errors.length) return `<span class="cm-badge">Sin errores léxicos</span>`;
    const rows = errors.map((e, i) => `
        <tr>
            <td class="num">${i + 1}</td>
            <td>${escapeHTML(e.message || "")}</td>
            <td class="num">${e.line ?? ""}</td>
            <td class="num">${e.column ?? ""}</td>
        </tr>
    `).join("");
    return `
        <table class="cm-table cm-striped cm-hover">
            <thead><tr><th>#</th><th>Descripción</th><th>Línea</th><th>Columna</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// Estado del último análisis (solo léxico)
let LAST_TOKENS = [];
let LAST_ERRORS = [];
let LAST_MATCHES = [];     // { local, visita, gl, gv }
let LAST_EQUIPOS = new Set();
let LAST_GOLEADORES = new Map();

// Inicializar CodeMirror
document.addEventListener("DOMContentLoaded", function () {
    editor = CodeMirror.fromTextArea(document.getElementById("codeEditor"), {
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
  nombre: "Mega Copa Universitaria",
  equipos: 4,
  sede: "El Salvador"
}

EQUIPOS {
  equipo: "Leones Dorados" [
    jugador: "Daniel Pérez" [posicion: "DELANTERO", numero: 9, edad: 23],
    jugador: "Roberto López" [posicion: "MEDIOCAMPO", numero: 8, edad: 22],
    jugador: "Santiago Ramírez" [posicion: "DEFENSA", numero: 4, edad: 25],
    jugador: "Manuel Torres" [posicion: "PORTERO", numero: 1, edad: 29]
  ],
  equipo: "Tiburones Azules" [
    jugador: "Cristian Morales" [posicion: "DELANTERO", numero: 11, edad: 26],
    jugador: "Alejandro Ruiz" [posicion: "DEFENSA", numero: 3, edad: 28]
  ],
  equipo: "Águilas Negras" [
    jugador: "Javier Gómez" [posicion: "DELANTERO", numero: 7, edad: 24],
    jugador: "Felipe Díaz" [posicion: "PORTERO", numero: 12, edad: 27]
  ],
  equipo: "Pumas Blancos" [
    jugador: "Oscar Hernández" [posicion: "DELANTERO", numero: 10, edad: 20],
    jugador: "Luis Ramírez" [posicion: "MEDIOCAMPO", numero: 6, edad: 22]
  ]
}

ELIMINACION {
  cuartos: [
    partido: "Leones Dorados" vs "Tiburones Azules" [
      resultado: "2-2",
      goleadores: [
        goleador: "Cristian Morales" [minuto: 12],
        goleador: "Daniel Pérez" [minuto: 30],
        goleador: "Alejandro Ruiz" [minuto: 60],
        goleador: "Roberto López" [minuto: 78]
      ]
    ],
    partido: "Águilas Negras" vs "Pumas Blancos" [
      resultado: "3-1",
      goleadores: [
        goleador: "Javier Gómez" [minuto: 15],
        goleador: "Oscar Hernández" [minuto: 43],
        goleador: "Felipe Díaz" [minuto: 55],
        goleador: "Javier Gómez" [minuto: 88]
      ]
    ]
  ],
  semifinal: [
    partido: "Leones Dorados" vs "Águilas Negras" [resultado: "Pendiente"]
  ]
}`
    });

    setTimeout(() => {
        editor.refresh();
    }, 100);
});

function cargarArchivo(event) {
    const files = event.target.files;
    if (files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = function(e) { editor.setValue(e.target.result); };
        reader.onerror = function() { alert("Error al leer el archivo"); };
        reader.readAsText(file);
    }
}

// Escaneo completo hasta EOF
function scanAll() {
    const scanner = new Scanner(editor.getValue());
    const tokens = [];
    let token = scanner.next_token();
    while (token && token.type !== 'EOF') {
        tokens.push(token);
        token = scanner.next_token();
    }
    const errors = typeof scanner.getErrors === 'function' ? scanner.getErrors() : [];
    LAST_TOKENS = tokens;
    LAST_ERRORS = errors;
    return { tokens, errors };
}

// Patrones por tokens (sin parser)
function analyzeDomainFromTokens(tokens) {
    LAST_MATCHES = [];
    LAST_EQUIPOS = new Set();
    LAST_GOLEADORES = new Map();

    let i = 0;
    let currentMatch = null;

    const at = (k) => tokens[i + k];
    const isLex = (k, type, lexeme) => {
        const t = at(k);
        if (!t) return false;
        if (type && t.type !== type) return false;
        if (lexeme !== undefined && t.lexeme !== lexeme) return false;
        return true;
    };

    while (i < tokens.length) {
        // equipo : "Nombre"
        if (isLex(0, 'KW_equipo') && isLex(1, 'TK_colon') && isLex(2, 'TK_string')) {
            LAST_EQUIPOS.add(at(2).lexeme);
            i += 3;
            continue;
        }

        // partido : "Equipo A" vs "Equipo B"
        if (isLex(0, 'TK_id', 'partido') && isLex(1, 'TK_colon') && isLex(2, 'TK_string') && isLex(3, 'TK_id', 'vs') && isLex(4, 'TK_string')) {
            currentMatch = { local: at(2).lexeme, visita: at(4).lexeme, gl: null, gv: null };
            LAST_MATCHES.push(currentMatch);
            i += 5;
            continue;
        }

        // resultado : "x-y" (para el último partido visto)
        if (isLex(0, 'TK_id', 'resultado') && isLex(1, 'TK_colon') && isLex(2, 'TK_string')) {
            const res = (at(2).lexeme || "").trim();
            const m = res.match(/^(\d+)\s*-\s*(\d+)$/);
            if (m && currentMatch) {
                currentMatch.gl = parseInt(m[1], 10);
                currentMatch.gv = parseInt(m[2], 10);
            }
            i += 3;
            continue;
        }

        // goleador : "Nombre"
        if (isLex(0, 'TK_id', 'goleador') && isLex(1, 'TK_colon') && isLex(2, 'TK_string')) {
            const name = at(2).lexeme;
            LAST_GOLEADORES.set(name, (LAST_GOLEADORES.get(name) || 0) + 1);
            i += 3;
            continue;
        }

        i++;
    }

    return {
        equipos: Array.from(LAST_EQUIPOS),
        matches: LAST_MATCHES.slice(),
        goleadores: Array.from(LAST_GOLEADORES.entries()).map(([jugador, goles]) => ({ jugador, goles }))
    };
}

// Detectar rondas y partidos por ronda
function analyzeRoundsFromTokens(tokens) {
    const rounds = []; // [{name, matches:[{local, visita, gl, gv}]}]
    let i = 0;

    const at = (k) => tokens[i + k];
    const is = (k, type, lexeme) => {
        const t = at(k);
        if (!t) return false;
        if (type && t.type !== type) return false;
        if (lexeme !== undefined && t.lexeme !== lexeme) return false;
        return true;
    };

    while (i < tokens.length) {
        // Una ronda: <id> : [
        if (is(0, 'TK_id') && is(1, 'TK_colon') && is(2, 'TK_lbrk')) {
            const roundName = at(0).lexeme;
            i += 3;
            let depth = 1;
            const round = { name: roundName, matches: [] };
            let currentMatch = null;

            while (i < tokens.length && depth > 0) {
                if (is(0, 'TK_lbrk')) { depth++; i++; continue; }
                if (is(0, 'TK_rbrk')) { depth--; i++; continue; }

                // partido : "A" vs "B"
                if (is(0, 'TK_id', 'partido') && is(1, 'TK_colon') && is(2, 'TK_string') && is(3, 'TK_id', 'vs') && is(4, 'TK_string')) {
                    currentMatch = { local: at(2).lexeme, visita: at(4).lexeme, gl: null, gv: null };
                    round.matches.push(currentMatch);
                    i += 5;
                    continue;
                }

                // resultado : "x-y"
                if (is(0, 'TK_id', 'resultado') && is(1, 'TK_colon') && is(2, 'TK_string')) {
                    const res = (at(2).lexeme || "").trim();
                    const m = res.match(/^(\d+)\s*-\s*(\d+)$/);
                    if (m && currentMatch) {
                        currentMatch.gl = parseInt(m[1], 10);
                        currentMatch.gv = parseInt(m[2], 10);
                    }
                    i += 3;
                    continue;
                }

                i++;
            }

            rounds.push(round);
            continue;
        }

        i++;
    }

    // Orden sugerido de rondas
    const order = ['octavos', 'cuartos', 'semifinal', 'final'];
    rounds.sort((a, b) => {
        const ia = order.indexOf((a.name || '').toLowerCase());
        const ib = order.indexOf((b.name || '').toLowerCase());
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
    return rounds;
}

// Título del torneo desde el bloque TORNEO { nombre: "..." }
function getTournamentTitleFromTokens(tokens) {
    let i = 0;
    let inTorneo = false;
    let depth = 0;

    const at = (k) => tokens[i + k];
    const is = (k, type, lexeme) => {
        const t = at(k);
        if (!t) return false;
        if (type && t.type !== type) return false;
        if (lexeme !== undefined && t.lexeme !== lexeme) return false;
        return true;
    };

    while (i < tokens.length) {
        if (!inTorneo && is(0, 'KW_torneo')) {
            // Debe venir un bloque {...}
            i++;
            while (i < tokens.length && !is(0, 'TK_lbrc')) i++;
            if (is(0, 'TK_lbrc')) { inTorneo = true; depth = 1; i++; continue; }
        }

        if (inTorneo) {
            if (is(0, 'TK_lbrc')) { depth++; i++; continue; }
            if (is(0, 'TK_rbrc')) { depth--; i++; if (depth === 0) break; continue; }
            if (is(0, 'TK_id', 'nombre') && is(1, 'TK_colon') && is(2, 'TK_string')) {
                return at(2).lexeme;
            }
        }

        i++;
    }
    return "Torneo";
}

// Helpers de bracket
const COLORS = {
    winner: "#b7e1cd",
    loser: "#f4c7c3",
    pending: "#fff9c4",
    cluster: {
        cuartos: "#d9d9d9",
        semifinal: "#cfe9f3",
        final: "#fff59d",
        default: "#eeeeee",
    }
};
function roundFill(name) {
    const k = (name || "").toLowerCase();
    return COLORS.cluster[k] || COLORS.cluster.default;
}
function sanitizeId(s) {
    return String(s || "").replace(/\W/g, "_");
}
function winnerSide(m) {
    if (Number.isInteger(m.gl) && Number.isInteger(m.gv)) {
        if (m.gl > m.gv) return "L";
        if (m.gv > m.gl) return "R";
    }
    return null; // pendiente o empate
}
function teamLabel(name, score) {
    const scoreLine = Number.isInteger(score) ? `\\n${score}` : "";
    return `${name.replaceAll('"','\\"')}${scoreLine}`;
}

// Generar DOT con clusters y estilos similares al ejemplo de imagen
function buildStyledBracketDOT(rounds, titleText) {
    const lines = [];
    lines.push('digraph bracket {');
    lines.push('  rankdir=TB;');
    lines.push('  labelloc="t";');
    lines.push('  fontname="Helvetica";');
    lines.push('  node [fontname="Helvetica"];');
    lines.push('  edge [fontname="Helvetica"];');
    lines.push('');

    // Título arriba como óvalo
    const titleId = 'TITLE';
    lines.push(`  ${titleId} [shape=ellipse, style=filled, fillcolor="#ffeb3b", label="${(titleText || "Torneo").replaceAll('"','\\"')}"];`);
    lines.push('  { rank=source; TITLE; }');
    lines.push('');

    // Definición de nodos de equipo por partido y nodos "match" auxiliares
    const matchNodeId = (rIdx, mIdx) => `M_${rIdx}_${mIdx}`;
    const teamNodeId = (rIdx, mIdx, side) => `T_${rIdx}_${mIdx}_${side}`; // side: L | R

    // Subgrafos (clusters) por ronda
    rounds.forEach((r, ridx0) => {
        const rIdx = ridx0 + 1;
        const fill = roundFill(r.name);
        lines.push(`  subgraph cluster_${rIdx} {`);
        lines.push(`    label="${(r.name || "").charAt(0).toUpperCase() + (r.name || "").slice(1)}";`);
        lines.push('    style=filled;');
        lines.push('    color="#333333";');
        lines.push(`    fillcolor="${fill}";`);
        lines.push('    fontsize=18;');
        lines.push('    labelloc="t";');

        // Nodos de cada partido: dos equipos (cajas) y un nodo de partido (elipse gris)
        r.matches.forEach((m, mIdx0) => {
            const mIdx = mIdx0 + 1;
            const wSide = winnerSide(m);

            const lColor = wSide === "L" ? COLORS.winner : (wSide === "R" ? COLORS.loser : COLORS.pending);
            const rColor = wSide === "R" ? COLORS.winner : (wSide === "L" ? COLORS.loser : COLORS.pending);

            const lLabel = teamLabel(m.local || "TBD", m.gl);
            const rLabel = teamLabel(m.visita || "TBD", m.gv);

            lines.push(`    ${teamNodeId(rIdx, mIdx, "L")} [shape=box, style="rounded,filled", fillcolor="${lColor}", label="${lLabel}"];`);
            lines.push(`    ${teamNodeId(rIdx, mIdx, "R")} [shape=box, style="rounded,filled", fillcolor="${rColor}", label="${rLabel}"];`);
            lines.push(`    ${matchNodeId(rIdx, mIdx)} [shape=ellipse, style=filled, fillcolor="lightgray", label=""];`);

            // Conectar equipos al nodo de partido (estético/estructura)
            lines.push(`    ${teamNodeId(rIdx, mIdx, "L")} -> ${matchNodeId(rIdx, mIdx)} [color="#666666", arrowsize=0.7];`);
            lines.push(`    ${teamNodeId(rIdx, mIdx, "R")} -> ${matchNodeId(rIdx, mIdx)} [color="#666666", arrowsize=0.7];`);
        });

        lines.push('  }');
        lines.push('');
    });

    // Conexiones entre rondas: cada par de partidos alimenta uno en la siguiente
    for (let i = 1; i < rounds.length; i++) {
        const prev = rounds[i - 1];
        const curr = rounds[i];

        for (let j = 1; j <= curr.matches.length; j++) {
            const src1 = (2 * j - 1);
            const src2 = (2 * j);
            const prev1 = prev.matches[src1 - 1];
            const prev2 = prev.matches[src2 - 1];

            const to = matchNodeId(i + 1, j);

            // Desde partido anterior 1 -> actual
            if (prev1) {
                const w1 = winnerSide(prev1); // "L" | "R" | null
                const fromId1 = matchNodeId(i, src1);
                const solid1 = w1 !== null; // hay ganador claro
                const edgeAttrs1 = solid1
                    ? 'color="black", penwidth=1.6, label="Ganador", fontsize=12'
                    : 'color="red", style="dashed", penwidth=1.2';
                lines.push(`  ${fromId1} -> ${to} [${edgeAttrs1}];`);
            }

            // Desde partido anterior 2 -> actual
            if (prev2) {
                const w2 = winnerSide(prev2);
                const fromId2 = matchNodeId(i, src2);
                const solid2 = w2 !== null;
                const edgeAttrs2 = solid2
                    ? 'color="black", penwidth=1.6, label="Ganador", fontsize=12'
                    : 'color="red", style="dashed", penwidth=1.2';
                lines.push(`  ${fromId2} -> ${to} [${edgeAttrs2}];`);
            }
        }
    }

    // Unir título con la primera ronda para que quede arriba
    if (rounds.length > 0) {
        lines.push(`  ${titleId} -> ${matchNodeId(1, 1)} [style="invis"];`);
    }

    lines.push('}');
    return lines.join('\n');
}

// Estadísticas por equipo
function computeTeamStats(equipos, matches) {
    const map = new Map(equipos.map(e => [e, { equipo: e, J: 0, G: 0, P: 0, GF: 0, GC: 0 }]));
    for (const p of matches) {
        if (!p) continue;
        const l = map.get(p.local);
        const v = map.get(p.visita);
        if (!l || !v) continue;
        if (!Number.isInteger(p.gl) || !Number.isInteger(p.gv)) continue; // partido sin resultado

        l.J++; v.J++;
        l.GF += p.gl; l.GC += p.gv;
        v.GF += p.gv; v.GC += p.gl;
        if (p.gl > p.gv) { l.G++; v.P++; }
        else if (p.gl < p.gv) { v.G++; l.P++; }
    }
    return Array.from(map.values());
}

function renderTeamStatsTable(rows) {
    const body = rows.map((r, i) =>
        `<tr><td class="num">${i + 1}</td><td>${escapeHTML(r.equipo)}</td><td class="num">${r.J}</td><td class="num">${r.G}</td><td class="num">${r.P}</td><td class="num">${r.GF}</td><td class="num">${r.GC}</td></tr>`
    ).join("");
    return `
        <table class="cm-table cm-striped cm-hover">
            <thead><tr><th>#</th><th>Equipo</th><th>J</th><th>G</th><th>P</th><th>GF</th><th>GC</th></tr></thead>
            <tbody>${body}</tbody>
        </table>
    `;
}

function renderGoleadoresTable(rows) {
    const sorted = rows.slice().sort((a,b) => b.goles - a.goles);
    const body = sorted.map((r, i) =>
        `<tr><td class="num">${i + 1}</td><td>${escapeHTML(r.jugador)}</td><td class="num">${r.goles}</td></tr>`
    ).join("");
    return `
        <table class="cm-table cm-striped cm-hover">
            <thead><tr><th>#</th><th>Jugador</th><th>Goles</th></tr></thead>
            <tbody>${body}</tbody>
        </table>
    `;
}

// Documento HTML descargable (reporte)
function buildReportHTMLDoc({ generalInner, equiposInner, goleadoresInner }) {
    const generatedAt = new Date().toLocaleString();
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    th { background: #222; }
  }
  .meta { color: #666; font-size: 0.9rem; }
</style>
</head>
<body>
  <h1>Reporte de Torneo</h1>
  <p class="meta">Generado: ${escapeHTML(generatedAt)}</p>

  <section>
    <h2>Información General</h2>
    ${generalInner}
  </section>

  <section>
    <h2>Estadísticas por Equipo</h2>
    ${equiposInner}
  </section>

  <section>
    <h2>Goleadores</h2>
    ${goleadoresInner}
  </section>
</body>
</html>`;
}
function downloadHTML(filename, html) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
    }, 0);
}

// Botón: Analizar Torneo (solo léxico)
function analizarTorneo() {
    const { tokens, errors } = scanAll();
    const tokensHTML = renderTokensTable(tokens);
    const errorsHTML = renderErrorsTable(errors);
    const resultsEl = document.getElementById('resultsContent');
    resultsEl.innerHTML = sectionHTML("Tokens", tokensHTML) + sectionHTML("Errores Léxicos", errorsHTML);
}

// Botón: Generar Reporte (derivado solo de tokens) + descarga HTML
function generarReporte() {
    if (!LAST_TOKENS.length) {
        const { tokens } = scanAll();
        if (!tokens.length) {
            document.getElementById('resultsContent').innerHTML = "<p>No hay tokens para generar reportes. Carga o escribe contenido y presiona Analizar Torneo.</p>";
            return;
        }
    }
    const domain = analyzeDomainFromTokens(LAST_TOKENS);
    const teamStats = computeTeamStats(domain.equipos, domain.matches);

    const generalHTML = `
        <ul>
            <li><strong>Total de equipos:</strong> ${domain.equipos.length}</li>
            <li><strong>Total de partidos:</strong> ${domain.matches.length}</li>
            <li><strong>Partidos con resultado:</strong> ${domain.matches.filter(m => Number.isInteger(m.gl) && Number.isInteger(m.gv)).length}</li>
            <li><strong>Goleadores distintos:</strong> ${domain.goleadores.length}</li>
        </ul>
    `;
    const equiposHTML = renderTeamStatsTable(teamStats);
    const golesHTML = renderGoleadoresTable(domain.goleadores);

    document.getElementById('resultsContent').innerHTML =
        sectionHTML("Reporte - Información General", generalHTML) +
        sectionHTML("Reporte - Estadísticas por Equipo", equiposHTML) +
        sectionHTML("Reporte - Goleadores", golesHTML);

    const fullHTML = buildReportHTMLDoc({
        generalInner: generalHTML,
        equiposInner: equiposHTML,
        goleadoresInner: golesHTML
    });
    downloadHTML("reporte_torneo.html", fullHTML);
}

// Botón: Mostrar Bracket (DOT a SVG con Viz.js) estilo imagen
async function mostrarBracket() {
    if (!LAST_TOKENS.length) {
        const { tokens } = scanAll();
        if (!tokens.length) {
            document.getElementById('resultsContent').innerHTML = "<p>No hay tokens para mostrar el bracket. Carga o escribe contenido y presiona Analizar Torneo.</p>";
            return;
        }
    }

    const rounds = analyzeRoundsFromTokens(LAST_TOKENS);
    if (!rounds.length) {
        document.getElementById('resultsContent').innerHTML = "<p>No se detectaron rondas (p. ej.: cuartos, semifinal, final). Verifica el bloque ELIMINACION.</p>";
        return;
    }

    const title = getTournamentTitleFromTokens(LAST_TOKENS);
    const dot = buildStyledBracketDOT(rounds, title);

    const containerHTML =
        sectionHTML("Bracket (SVG)", `<div id="bracket-svg" style="overflow:auto;"></div>`) +
        sectionHTML("DOT de Graphviz", `<pre>${escapeHTML(dot)}</pre>`);

    const resultsEl = document.getElementById('resultsContent');
    resultsEl.innerHTML = containerHTML;

    const target = document.getElementById("bracket-svg");

    try {
        const viz = new Viz();
        const svgEl = await viz.renderSVGElement(dot);
        target.innerHTML = "";
        target.appendChild(svgEl);
    } catch (err) {
        console.error("Viz.js error:", err);
        target.innerHTML = `<p style="color:#b00;">Error renderizando SVG con Viz.js: ${escapeHTML(String(err))}</p>`;
    }
}