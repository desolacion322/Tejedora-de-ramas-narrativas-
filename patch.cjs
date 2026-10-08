const fs = require('fs');
let content = fs.readFileSync('utils/promptUtils.ts', 'utf8');

const targetStr = `export const buildLorebookContext = (`;
const idx = content.indexOf(targetStr);
if (idx === -1) throw new Error("Could not find function");

content = content.substring(0, idx);

content += `export const buildLorebookContext = (
    relevantChars: Character[], 
    relevantScenarios: any[], 
    relevantMagic: any[], 
    relevantObjects: any[], 
    relevantSpecies: any[],
    relevantLore: LoreEntry[],
    relevantNations: Nation[], 
    allCharactersLookup: Character[],
    allTraits: PsychologicalTrait[] 
): string => {
    let text = '';
    
    if (relevantChars.length > 0) {
        text += \`\\n--- RELEVANT CHARACTERS (Auto-Detected) ---\\n\` + relevantChars.map(c => {
            const statesJson = formatCharacterStates(c.states);
            const abilitiesStr = formatCharacterAbilities(c.abilitiesList);
            const memoriesStr = formatCharacterMemories(c.memories);
            const relsStr = formatCharacterRelationships(c.relationships, allCharactersLookup);
            const possessionsStr = formatCharacterPossessions(c.inventory, c.resources);
            
            const evolutionBlock = formatCharacterEvolution(c.evolution);
            const vitalsBlock = formatCharacterVitals([c]); 

            let charInfo = \`- \${c.name}: Arquetipo: \${c.archetype || 'Desconocido'}. Motivación: \${c.mainMotivation || 'N/A'}\`;
            
            if (c.appearance) charInfo += \`\\n  [APARIENCIA]: \${c.appearance}\`;
            if (c.ticsMannerisms) charInfo += \`\\n  [TICS/CONDUCTA]: \${c.ticsMannerisms}\`;
            if (c.personality) charInfo += \`\\n  [PERSONALIDAD]: \${c.personality}\`;
            if (c.backstory) charInfo += \`\\n  [PASADO REMOTO]: \${c.backstory}\`;
            // Inject Evolution & Vitals
            if (evolutionBlock) charInfo += evolutionBlock;
            if (vitalsBlock) charInfo += vitalsBlock.replace(\`PERSONAJE: \${c.name}\`, ''); 

            if (possessionsStr) charInfo += possessionsStr;
            if (abilitiesStr) charInfo += \`\\n  [OFFICIAL SYSTEM SKILLS]: \${abilitiesStr}\`;
            if (c.abilities) charInfo += \`\\n  [LEGACY NOTES/DRAFTS]: \${c.abilities}\`;
            if (statesJson) charInfo += \`\\n  [CURRENT STATES JSON]: \${statesJson}\`;
            if (memoriesStr) charInfo += \`\\n  [KEY MEMORIES]: \${memoriesStr}\`;
            if (relsStr) charInfo += \`\\n  [RELATIONSHIPS]: \${relsStr}\`;
            
            if (c.voice) {
                const v = c.voice;
                const voiceParts = [];
                if (v.tone) voiceParts.push(\`Tone: \${v.tone}\`);
                if (v.rhythm) voiceParts.push(\`Rhythm: \${v.rhythm}\`);
                if (v.style) voiceParts.push(\`Style: \${v.style}\`);
                if (v.vocabulary) voiceParts.push(\`Vocab: \${v.vocabulary}\`);
                if (v.catchphrases && v.catchphrases.length > 0) voiceParts.push(\`Phrases: [\${v.catchphrases.join(', ')}]\`);
                if (v.sampleQuote) voiceParts.push(\`Sample: "\${v.sampleQuote}"\`);
                if (voiceParts.length > 0) charInfo += \`\\n  [VOICE & DIALOGUE SIGNATURE]: \${voiceParts.join(' | ')}\`;
            }
            if (c.traitIds && c.traitIds.length > 0 && allTraits.length > 0) {
                const activeTraits = allTraits.filter(t => c.traitIds?.includes(t.id) && t.active !== false);
                if (activeTraits.length > 0) {
                    let traitInfo = activeTraits.map(t => {
                        let details = \`\${t.name} (\${t.intensity || 5}/10)\`;
                        if (t.details && t.details.length > 0) {
                            details += \` [Details: \${t.details.map(d => d.title + ': ' + d.content).join('; ')}]\`;
                        }
                        return details;
                    }).join('; ');
                    charInfo += \`\\n  [ACTIVE PSYCHOLOGICAL TRAITS]: \${traitInfo}\`;
                }
            }
            
            return charInfo;
        }).join('\\n');
    }

    if (relevantScenarios && relevantScenarios.length > 0) {
        text += \`\\n\\n--- RELEVANT SCENARIOS ---\\n\` + relevantScenarios.map(s => \`- \${s.name}: \${s.description}\`).join('\\n');
    }
    
    if (relevantMagic && relevantMagic.length > 0) {
        text += \`\\n\\n--- RELEVANT MAGIC SYSTEMS ---\\n\` + relevantMagic.map(m => \`- \${m.name}: \${m.description}\\n  Rules: \${m.rules}\\n  Costs: \${m.costs}\`).join('\\n');
    }
    
    if (relevantObjects && relevantObjects.length > 0) {
        text += \`\\n\\n--- RELEVANT WORLD OBJECTS ---\\n\` + relevantObjects.map(o => \`- \${o.name}: \${o.description}\\n  Properties: \${o.properties}\`).join('\\n');
    }

    if (relevantSpecies && relevantSpecies.length > 0) {
        text += \`\\n\\n--- RELEVANT SPECIES ---\\n\` + relevantSpecies.map(s => \`- \${s.name}: \${s.description}\\n  Traits: \${s.traits}\\n  Culture: \${s.culture}\`).join('\\n');
    }

    if (relevantLore && relevantLore.length > 0) {
        text += \`\\n\\n--- LORE ENTRIES ---\\n\` + relevantLore.map(l => \`- [\${l.category}] \${l.name}: \${l.content}\`).join('\\n');
    }

    if (relevantNations && relevantNations.length > 0) {
        text += \`\\n\\n--- NATIONS & FACTIONS ---\\n\` + relevantNations.map(n => {
            let nInfo = \`- \${n.name}: \${n.description}\`;
            if (n.governmentType) nInfo += \`\\n  Gov: \${n.governmentType}, Ruler: \${n.ruler}\`;
            if (n.capitalName) nInfo += \`\\n  Capital: \${n.capitalName}\`;
            if (n.factions && n.factions.length > 0) nInfo += \`\\n  Factions: \${n.factions.map((f: any) => f.name).join(', ')}\`;
            return nInfo;
        }).join('\\n');
    }

    return text;
};
`;

fs.writeFileSync('utils/promptUtils.ts', content, 'utf8');
