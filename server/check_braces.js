import fs from 'fs';

const text = fs.readFileSync('c:/Users/stanl/OneDrive/Documents/Stanness Technologies/kaf/server/controllers/finance.controller.js', 'utf8');
const lines = text.split('\n');

let depth = 0;
for (let i = 2112; i < 2684; i++) {
    const line = lines[i];
    let inString = false;
    let inTemplate = false;
    let stringChar = null;
    let skipNext = false;
    
    for (let j = 0; j < line.length; j++) {
        if (skipNext) {
            skipNext = false;
            continue;
        }
        const char = line[j];
        if (char === '\\') {
            skipNext = true;
            continue;
        }
        if (inTemplate) {
            if (char === '`') inTemplate = false;
            continue;
        }
        if (inString) {
            if (char === stringChar) inString = false;
            continue;
        }
        if (char === '`') {
            inTemplate = true;
            continue;
        }
        if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            continue;
        }
        if (line.substring(j, j + 2) === '//') {
            break;
        }
        if (char === '{') {
            depth++;
            console.log(`Line ${i + 1} '{': Depth is now ${depth}`);
        }
        if (char === '}') {
            depth--;
            console.log(`Line ${i + 1} '}': Depth is now ${depth}`);
        }
    }
}
console.log(`Final depth at 2684: ${depth}`);
