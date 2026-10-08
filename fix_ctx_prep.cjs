const fs = require('fs');
let code = fs.readFileSync('utils/ai/contextPreparation.ts', 'utf8');

code = code.replace(
    'const lorebookContextString = buildLorebookContext(\n        ignoredArcIds,\n        combinedRelevantCharacters,',
    'const lorebookContextString = buildLorebookContext(\n        combinedRelevantCharacters,'
);

code = code.replace(
    'psychologicalTraits\n    );',
    'psychologicalTraits,\n        ignoredArcIds\n    );'
);

fs.writeFileSync('utils/ai/contextPreparation.ts', code, 'utf8');
console.log("Fixed context preparation!");
