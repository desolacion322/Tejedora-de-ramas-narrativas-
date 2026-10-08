const fs = require('fs');

function fixFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/import \{([^}]*)LoreEntry([^}]*)\} from '(.*types.*)';/, (match, p1, p2, p3) => {
        if (!match.includes('Nation')) {
            return `import {${p1}LoreEntry, Nation${p2}} from '${p3}';`;
        }
        return match;
    });
    fs.writeFileSync(file, content, 'utf8');
}

fixFile('services/geminiService.ts');
fixFile('utils/ai/prompts.ts');
