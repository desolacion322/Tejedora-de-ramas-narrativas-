const fs = require('fs');
let code = fs.readFileSync('utils/promptUtils.ts', 'utf8');

code = code.replace(
    'export const buildLorebookContext = (\n    ignoredArcIds: string[],\n    relevantChars: Character[],',
    'export const buildLorebookContext = (\n    relevantChars: Character[],'
);

code = code.replace(
    'allTraits: PsychologicalTrait[] \n): string => {',
    'allTraits: PsychologicalTrait[],\n    ignoredArcIds: string[] = []\n): string => {'
);

fs.writeFileSync('utils/promptUtils.ts', code, 'utf8');
console.log("Fixed prompt utils!");
