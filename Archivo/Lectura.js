import fs from fs;
import readline from 'node:readline'
import {
    stdin as input,
    stdout as output
} from 'node:process';
import { resolve } from 'node:path';

const entrada = readline.createInterface({input, output});

export default class Lectura{

    lecturaTeclado = (mensaje) => {
        return new Promise(resolve => {
            entrada.question(`${mensaje}`, (input) => {
                resolve(input);
            });
        });
    }

    




}