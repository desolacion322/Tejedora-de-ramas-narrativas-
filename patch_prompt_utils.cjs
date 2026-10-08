const fs = require('fs');
let code = fs.readFileSync('utils/promptUtils.ts', 'utf8');

code = code.replace(
    'export const formatCharacterEvolution = (evolution: EvolutionMilestone[] | undefined): string => {',
    'export const formatCharacterEvolution = (evolution: EvolutionMilestone[] | undefined, ignoredArcIds: string[] = []): string => {'
);
code = code.replace(
    'const achieved = evolution.filter(m => m.achieved);',
    'const achieved = evolution.filter(m => m.achieved && (!m.arcId || !ignoredArcIds.includes(m.arcId)));'
);

code = code.replace(
    'export const buildLorebookContext = (',
    'export const buildLorebookContext = (\n    ignoredArcIds: string[],'
);

code = code.replace(
    'const evolutionBlock = formatCharacterEvolution(c.evolution);',
    'const evolutionBlock = formatCharacterEvolution(c.evolution, ignoredArcIds);'
);

fs.writeFileSync('utils/promptUtils.ts', code, 'utf8');
console.log("Patched prompt utils!");
