class Scanner {
    constructor(input) {
        this.input = input.replace(/\r\n/g, '\n') + '\0';
        this.pos_char = 0;
        this.buffer = '';
        this.char_line = 1;
        this.char_col = 1;
        this.next_char = '';
        this.keywords = {
            TORNEO: 'KW_torneo',
            EQUIPOS: 'KW_equipos',
            equipo: 'KW_equipo',
            PORTERO: 'KW_portero',
        }
    }

    initBuffer(current_char) {
        this.buffer = current_char;
        this.char_col ++;
        this.pos_char ++;
        this.last_char = current_char;
    }

    addBuffer(current_char) {
        this.buffer += current_char;
        this.char_col ++;
        this.pos_char ++;
        this.last_char = current_char;
    }

    S0() {
        while((this.next_char = this.input[this.pos_char]) !== '\0') {
            this.next_char = this.input[this.pos_char]
            if( // TRANSICIONES PARA
                // A-Z
                this.next_char.charCodeAt(0) >= 65 && this.next_char.charCodeAt(0) <= 90 ||
                // a-z
                this.next_char.charCodeAt(0) >= 97 && this.next_char.charCodeAt(0) <= 122
            ) {
                this.initBuffer(this.next_char);
                return this.S1();
            }

            if(this.next_char === '"') { // TRANSICIONES PARA CADENAS
                this.initBuffer(this.next_char);
                return this.S2();
            }

            if(this.next_char === '{') {
                this.initBuffer(this.next_char);
                return this.S4();
            }

            if(this.next_char === '}') {
                this.initBuffer(this.next_char);
                return this.S5();
            }

            if(this.next_char === '[') {
                this.initBuffer(this.next_char);
                return this.S6();
            }

            if(this.next_char === ']') {
                this.initBuffer(this.next_char);
                return this.S7();
            }

            if(this.next_char === ',') {
                this.initBuffer(this.next_char);
                return this.S8();
            }

            if(this.next_char === ':') {
                this.initBuffer(this.next_char);
                return this.S9();
            }

            // CARACTERES IGNORADOS
            if(this.next_char === ' ') {
                this.char_col ++;
            }
            else if(this.next_char === '\t') {
                this.char_col += 4;
            }
            else if(this.next_char === '\n') {
                this.char_col = 1;
                this.char_line ++;
            }
            // ERROR LÉXICO 
            else {
                this.char_col ++;
                console.log(`Error Léxico: Símbolo no reconocido '${this.next_char}'. [${this.char_line}:${this.char_col}]`);
            }

            this.pos_char ++;
        }
        return { type: `EOF`, line: this.char_line, column: this.char_col }; // End Of File: Final del archivo
    }

    S1() {
        this.next_char = this.input[this.pos_char]
        if(
            // A-Z
            this.next_char.charCodeAt(0) >= 65 && this.next_char.charCodeAt(0) <= 90 ||
            // a-z
            this.next_char.charCodeAt(0) >= 97 && this.next_char.charCodeAt(0) <= 122
        ){
            this.addBuffer(this.next_char);
            return this.S1();
        }

        // Retorna el token reconocido
        return { lexeme: this.buffer, type: this.keywords[this.buffer] || 'TK_id', line: this.char_line, column: this.char_col }; // Palabra reservada
    }

    S2() {
        this.next_char = this.input[this.pos_char]
        if(this.next_char !== '"') {
            this.addBuffer(this.next_char);
            return this.S2();
        }

        this.addBuffer(this.next_char);
        return this.S3();
    }

    S3() {
        return { lexeme: this.buffer.substring(1, this.buffer.length - 1), type: this.keywords[this.buffer.substring(1, this.buffer.length - 1)] || 'TK_string', line: this.char_line, column: this.char_col }; // Cadena
    }

    S4() {
        return { lexeme: this.buffer, type: 'TK_lbrc', line: this.char_line, column: this.char_col }; // Cadena
    }

    S5() {
        return { lexeme: this.buffer, type: 'TK_rbrc', line: this.char_line, column: this.char_col }; // Cadena
    }

    S6() {
        return { lexeme: this.buffer, type: 'TK_lbrk', line: this.char_line, column: this.char_col }; // Cadena
    }

    S7() {
        return { lexeme: this.buffer, type: 'TK_rbrk', line: this.char_line, column: this.char_col }; // Cadena
    }

    S8() {
        return { lexeme: this.buffer, type: 'TK_comma', line: this.char_line, column: this.char_col }; // Cadena
    }

    S9() {
        return { lexeme: this.buffer, type: 'TK_colon', line: this.char_line, column: this.char_col }; // Cadena
    }

    next_token = () => this.S0();
}