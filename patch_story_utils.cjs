const fs = require('fs');
let code = fs.readFileSync('utils/storyUtils.ts', 'utf8');

const oldFuncStart = `export const compileDeepStoryProfile = (projectData: ProjectData): string => {`;
const startIdx = code.indexOf(oldFuncStart);
if (startIdx === -1) {
    console.error("Could not find start");
    process.exit(1);
}

const endBraceIdx = code.indexOf('};', startIdx);
if (endBraceIdx === -1) {
    console.error("Could not find end");
    process.exit(1);
}

const newFunc = `export const compileDeepStoryProfile = (projectData: ProjectData): string => {
    const { storyArcs: allArcs, activeArcId, characters: allCharacters, worldObjects, worldLogicRules, magicSystems, species, nations, scenarios, secrets } = projectData;
    const activeArc = allArcs.find(a => a.id === activeArcId) || allArcs[0];
    if (!activeArc) return '';
    let profile = \`# PERFIL DE CONTEXTO PROFUNDO: \${activeArc.name.toUpperCase()}\\n\`;
    profile += \`> Generado para simulación de alta fidelidad en IAs externas.\\n\\n\`;
    
    // SECTION: WORLD LORE AND CONTEXT
    profile += \`## LORE DEL MUNDO Y CONTEXTO\\n\\n\`;
    
    if (worldObjects && worldObjects.length > 0) {
        profile += \`### OBJETOS Y LORE DEL MUNDO\\n\`;
        worldObjects.forEach(obj => {
            profile += \`- **\${obj.name}**: \${obj.description || 'Sin descripción'}\\n\`;
            if (obj.notes) profile += \`  - *Notas*: \${obj.notes}\\n\`;
        });
        profile += \`\\n\`;
    }

    if (worldLogicRules && worldLogicRules.length > 0) {
        profile += \`### REGLAS DEL MUNDO\\n\`;
        worldLogicRules.forEach(rule => {
            profile += \`- **\${rule.text || rule.id}**: \${rule.description || 'Sin descripción'}\\n\`;
            if (rule.consequences) profile += \`  - *Consecuencias*: \${rule.consequences}\\n\`;
        });
        profile += \`\\n\`;
    }

    if (magicSystems && magicSystems.length > 0) {
        profile += \`### SISTEMAS DE MAGIA/PODER\\n\`;
        magicSystems.forEach(sys => {
            profile += \`- **\${sys.name}**: \${sys.description || 'Sin descripción'}\\n\`;
            if (sys.notes) profile += \`  - *Notas*: \${sys.notes}\\n\`;
        });
        profile += \`\\n\`;
    }

    if (nations && nations.length > 0) {
        profile += \`### NACIONES Y FACCIONES\\n\`;
        nations.forEach(nat => {
            profile += \`- **\${nat.name}**: \${nat.description || 'Sin descripción'}\\n\`;
            if (nat.governmentType) profile += \`  - *Gobierno*: \${nat.governmentType}\\n\`;
        });
        profile += \`\\n\`;
    }

    if (species && species.length > 0) {
        profile += \`### ESPECIES Y RAZAS\\n\`;
        species.forEach(sp => {
            profile += \`- **\${sp.name}**: \${sp.description || 'Sin descripción'}\\n\`;
            if (sp.politics) profile += \`  - *Política*: \${sp.politics}\\n\`;
            if (sp.philosophy) profile += \`  - *Filosofía*: \${sp.philosophy}\\n\`;
        });
        profile += \`\\n\`;
    }

    if (scenarios && scenarios.length > 0) {
        profile += \`### ESCENARIOS IMPORTANTES\\n\`;
        scenarios.forEach(sc => {
            profile += \`- **\${sc.name}**: \${sc.description || 'Sin descripción'}\\n\`;
        });
        profile += \`\\n\`;
    }

    if (secrets && secrets.length > 0) {
        profile += \`### SECRETOS Y MISTERIOS (META-CONOCIMIENTO)\\n\`;
        secrets.forEach(sec => {
            profile += \`- **\${sec.name}**: \${sec.content || 'Sin descripción'}\\n\`;
            if (sec.consequences) profile += \`  - *Consecuencias*: \${sec.consequences}\\n\`;
        });
        profile += \`\\n\`;
    }
    
    profile += \`---\\n\\n\`;

    // SECTION: OTHER ACTIVE ARCS (BACKGROUND CONTEXT)
    const otherActiveArcs = allArcs.filter(a => a.id !== activeArcId && (a.significance || 0) > 0);
    if (otherActiveArcs.length > 0) {
        profile += \`## ESTADO GLOBAL DEL MUNDO (TRAMAS PARALELAS)\\n\`;
        otherActiveArcs.forEach(arc => {
            profile += \`### ARCO: \${arc.name} (Importancia: \${arc.significance}/10)\\n\`;
            profile += \`\${arc.summary || "(Sin resumen detallado proporcionado)"}\\n\\n\`;
        });
        profile += \`---\\n\\n\`;
    }

     // SECTION: ACTIVE ARC DEEP DIVE
    if (activeArc.significance === undefined || activeArc.significance > 0) {
        profile += \`## HISTORIA PRINCIPAL (PASO A PASO CANÓNICO)\\n\`;
        
        let current: StoryNodeData | undefined = activeArc.rootNode;
        let step = 1;

        while (current) {
            const ctx = getEffectiveNodeContext(current);
            const resolvedChars = resolveCharacterStateSnapshots(allCharacters, ctx.overrides);
            const sceneChars = ctx.characterIds.map(id => resolvedChars.find(c => c.id === id)).filter(Boolean) as Character[];

            profile += \`### ESCENA \${step}: \${current.name.trim()}\\n\`;
            if (ctx.date) profile += \`**FECHA SIMULACIÓN:** \${ctx.date}\\n\`;
            
            if (sceneChars.length > 0) {
                profile += \`\\n**ESTADO DE ACTORES EN ESTA ESCENA:**\\n\`;
                sceneChars.forEach(c => {
                    profile += \`#### \${c.name} \${ctx.pov === c.id ? '(POV)' : ''}\\n\`;
                    
                    // ADD DEEP EVOLUTION LOGS
                    const relevantEvol = c.evolution?.filter(e => e.arcId === activeArcId) || [];
                    if (relevantEvol.length > 0) {
                        profile += \`- **Evolución y Archivos Recientes:**\\n\`;
                        relevantEvol.forEach(e => {
                            profile += \`  * [\${e.name}] Rol: \${e.roleAtMoment || '?'} | Estado Mental: \${e.mentalState || '?'}\\n\`;
                            if (e.description) profile += \`    Hechos: \${e.description}\\n\`;
                            if (e.tacticalPoints?.length) profile += \`    Táctica: \${e.tacticalPoints.join('; ')}\\n\`;
                            if (e.privateThoughts) profile += \`    Privado: \${e.privateThoughts}\\n\`;
                            if (e.diaryFragment) profile += \`    Diario: "\${e.diaryFragment}"\\n\`;
                        });
                    }

                    if (c.attributes && c.attributes.length > 0) {
                        profile += \`- **Atributos:** \${c.attributes.map(a => \`\${a.name}: \${a.current}/\${a.max}\`).join(', ')}\\n\`;
                    }
                    
                    const activeStates = c.states?.filter(s => s.active);
                    if (activeStates && activeStates.length > 0) {
                        profile += \`- **Estados Activos:** \${activeStates.map(s => \`\${s.name} (Nvl \${s.intensity || 1})\`).join(', ')}\\n\`;
                    }
                });
            }

            if (current.note) {
                profile += \`\\n**ACCIÓN NARRATIVA:**\\n\${current.note.trim()}\\n\`;
            }

            profile += \`\\n---\\n\\n\`;
            step++;

            if (current.children && current.children.length > 0) {
                current = current.canonicalChildId 
                    ? current.children.find(c => c.id === current.canonicalChildId) || current.children[0]
                    : current.children[0];
            } else {
                current = undefined;
            }
        }
    }

    return profile;
}`;

const finalCode = code.substring(0, startIdx) + newFunc + code.substring(endBraceIdx + 2);
fs.writeFileSync('utils/storyUtils.ts', finalCode, 'utf8');
console.log("Patched!");
