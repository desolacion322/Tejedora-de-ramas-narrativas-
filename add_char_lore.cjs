const fs = require('fs');
let code = fs.readFileSync('utils/storyUtils.ts', 'utf8');

const anchor = `    if (worldObjects && worldObjects.length > 0) {`;

const charLore = `
    if (allCharacters && allCharacters.length > 0) {
        profile += \`### PERSONAJES PRINCIPALES\\n\`;
        allCharacters.forEach(c => {
            profile += \`- **\${c.name}**\${c.aliases && c.aliases.length > 0 ? \` (\${c.aliases.join(', ')})\` : ''}\\n\`;
            if (c.archetype) profile += \`  - *Arquetipo*: \${c.archetype}\\n\`;
            if (c.backstory) profile += \`  - *Historia*: \${c.backstory}\\n\`;
            if (c.personality) profile += \`  - *Personalidad*: \${c.personality}\\n\`;
            if (c.mainMotivation) profile += \`  - *Motivación*: \${c.mainMotivation}\\n\`;
        });
        profile += \`\\n\`;
    }

`;

const newCode = code.replace(anchor, charLore + anchor);
fs.writeFileSync('utils/storyUtils.ts', newCode, 'utf8');
console.log("Patched characters!");
