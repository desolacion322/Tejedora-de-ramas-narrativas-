const fs = require('fs');
let code = fs.readFileSync('utils/ai/contextPreparation.ts', 'utf8');

code = code.replace(
    'const lorebookContextString = buildLorebookContext(',
    `const ignoredArcIds = storyArcs.filter(a => a.significance === 0).map(a => a.id);\n    const lorebookContextString = buildLorebookContext(\n        ignoredArcIds,`
);

fs.writeFileSync('utils/ai/contextPreparation.ts', code, 'utf8');
console.log("Patched context preparation!");
