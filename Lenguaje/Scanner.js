// Analizador léxico (Scanner) con nombres de variables en español.
// Mantiene el método next_token para compatibilidad y ofrece obtenerSiguienteToken() en español.

class Scanner {
    constructor(entradaTexto) {
        //saltos de línea y gestion de columna
        this.textoEntrada = entradaTexto.replace(/\r\n/g, "\n") + "\0";

        // Punteros y estado de lectura
        this.indiceCaracter = 0;
        this.acumuladorLexema = "";
        this.numeroLinea = 1;
        this.numeroColumna = 1;

        // Caracter de trabajo
        this.caracterActual = "";

        // Acumulador de errores léxicos
        this.listaErroresLexicos = [];

        // Palabras reservadas (puedes ampliar aquí)
        this.palabrasReservadas = {
            TORNEO: "KW_torneo",
            EQUIPOS: "KW_equipos",
            equipo: "KW_equipo",
            PORTERO: "KW_portero",
        };
    }

    // Utilidades internas para construir lexemas
    iniciarAcumulador(car) {
        this.acumuladorLexema = car;
        this.numeroColumna++;
        this.indiceCaracter++;
        this.ultimoCaracter = car;
    }

    agregarAlAcumulador(car) {
        this.acumuladorLexema += car;
        this.numeroColumna++;
        this.indiceCaracter++;
        this.ultimoCaracter = car;
    }

    // Estado principal: consume espacios, decide transiciones y reporta tokens
    estadoInicial() {
        while ((this.caracterActual = this.textoEntrada[this.indiceCaracter]) !== "\0") {
            const ch = this.caracterActual;
            const code = ch.charCodeAt(0);

            // Letras -> identificadores o palabras reservadas
            if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {  
                this.iniciarAcumulador(ch);
                return this.estadoIdentificador();
            }

            // Dígitos -> número
            if (code >= 48 && code <= 57) {
                this.iniciarAcumulador(ch);
                return this.estadoNumero();
            }

            // Cadenas entre comillas
            if (ch === '"') {
                this.iniciarAcumulador(ch);
                return this.estadoCadenaAbierta();
            }

            // Símbolos simples
            if (ch === "{") { 
                this.iniciarAcumulador(ch); 
                return this.tokenLLaveIzquierda();
            }
            if (ch === "}") 
                { this.iniciarAcumulador(ch); 
                    return this.tokenLLaveDerecha(); 
                }
            if (ch === "[") { 
                this.iniciarAcumulador(ch); 
                return this.tokenCorcheteIzquierdo(); 
            }
            if (ch === "]") { 
                this.iniciarAcumulador(ch); 
                return this.tokenCorcheteDerecho(); 
            }
            if (ch === ",") { 
                this.iniciarAcumulador(ch); 
                return this.tokenComa(); 
            }
            if (ch === ":") { 
                this.iniciarAcumulador(ch); 
                return this.tokenDosPuntos(); 
            }
//---------------------------------------------------------------------------------------------------------------------
            // Espacios en blanco
            if (ch === " ") {
                this.numeroColumna++;
            } else if (ch === "\t") {
                this.numeroColumna += 4;
            } else if (ch === "\n") {
                this.numeroColumna = 1;
                this.numeroLinea++;
            } else {
                // Error léxico: símbolo desconocido
                this.numeroColumna++;
                this.listaErroresLexicos.push({
                    mensaje: `Símbolo no reconocido '${ch}'`,
                    linea: this.numeroLinea,
                    columna: this.numeroColumna,
                });
            }

            this.indiceCaracter++;
        }

        return { type: "EOF", line: this.numeroLinea, column: this.numeroColumna };
    }

    // Identificadores o palabras reservadas
    estadoIdentificador() {
        this.caracterActual = this.textoEntrada[this.indiceCaracter];
        const code = this.caracterActual?.charCodeAt(0) ?? -1;  // 

        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
            this.agregarAlAcumulador(this.caracterActual);
            return this.estadoIdentificador();
        }

        const lexema = this.acumuladorLexema;
        const tipo = this.palabrasReservadas[lexema] || "TK_id";
        return { lexeme: lexema, type: tipo, line: this.numeroLinea, column: this.numeroColumna };
    }

    // Números enteros
    estadoNumero() {
        this.caracterActual = this.textoEntrada[this.indiceCaracter];
        const code = this.caracterActual?.charCodeAt(0) ?? -1;

        if (code >= 48 && code <= 57) {
            this.agregarAlAcumulador(this.caracterActual);
            return this.estadoNumero();
        }

        return { lexeme: this.acumuladorLexema, type: "TK_number", line: this.numeroLinea, column: this.numeroColumna };
    }

    // Cadenas "..."
    estadoCadenaAbierta() {
        this.caracterActual = this.textoEntrada[this.indiceCaracter];

        if (this.caracterActual !== '"') {
            this.agregarAlAcumulador(this.caracterActual);
            return this.estadoCadenaAbierta();
        }

        // Cerrar comillas
        this.agregarAlAcumulador(this.caracterActual);
        return this.estadoCadenaCerrada();
    }

    estadoCadenaCerrada() {
        const contenido = this.acumuladorLexema.substring(1, this.acumuladorLexema.length - 1);
        const tipo = this.palabrasReservadas[contenido] || "TK_string";
        return { lexeme: contenido, type: tipo, line: this.numeroLinea, column: this.numeroColumna };
    }

    // Tokens de un solo carácter
    tokenLLaveIzquierda() { return { lexeme: this.acumuladorLexema, type: "TK_lbrc", line: this.numeroLinea, column: this.numeroColumna }; }
    tokenLLaveDerecha()   { return { lexeme: this.acumuladorLexema, type: "TK_rbrc", line: this.numeroLinea, column: this.numeroColumna }; }
    tokenCorcheteIzquierdo(){ return { lexeme: this.acumuladorLexema, type: "TK_lbrk", line: this.numeroLinea, column: this.numeroColumna }; }
    tokenCorcheteDerecho(){ return { lexeme: this.acumuladorLexema, type: "TK_rbrk", line: this.numeroLinea, column: this.numeroColumna }; }
    tokenComa()           { return { lexeme: this.acumuladorLexema, type: "TK_comma", line: this.numeroLinea, column: this.numeroColumna }; }
    tokenDosPuntos()      { return { lexeme: this.acumuladorLexema, type: "TK_colon", line: this.numeroLinea, column: this.numeroColumna }; }

    // API pública: obtener siguiente token (en español) y alias en inglés para compatibilidad
    obtenerSiguienteToken() {
        return this.estadoInicial();
    }
    next_token() {
        return this.obtenerSiguienteToken();
    }

    // Errores léxicos
    obtenerErroresLexicos() {
        // Devolvemos una copia para no mutar el original externamente
        return this.listaErroresLexicos.slice();
    }
    getErrors() {
        return this.obtenerErroresLexicos();
    }
}