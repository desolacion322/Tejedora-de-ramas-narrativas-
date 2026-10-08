
import { HierarchyPointNode, HierarchyNode } from 'd3-hierarchy';
import { StoryNodeData, StoryArc, Character, Scenario, Tag, CharacterStateSnapshot, TagGroup, ProjectData } from '../types';

interface InheritedContext {
    date: string;
    tags: string[];
    customCharactersSummary?: string;
}

// --- CONTEXT RESOLUTION UTILS ---

export const getEffectiveNodeContext = (node: HierarchyNode<StoryNodeData> | StoryNodeData) => {
    let effectiveDate = '';
    let effectiveScenariosIds: string[] | undefined = undefined;
    let effectiveTagIds: string[] | undefined = undefined;
    let effectiveCharIds: string[] | undefined = undefined;
    let effectivePov: string | undefined = undefined;
    
    const effectiveOverrides: Record<string, CharacterStateSnapshot> = {};
    const overriddenChars = new Set<string>();
    let effectiveCustomSummary = '';

    let current: any = node;
    while (current) {
        const data = current.data || current;

        if (!effectiveDate && data.fantasyDate) effectiveDate = data.fantasyDate;
        if (effectiveScenariosIds === undefined && data.scenariosInScene !== undefined) effectiveScenariosIds = data.scenariosInScene;
        if (effectiveTagIds === undefined && data.statusTagIds !== undefined) effectiveTagIds = data.statusTagIds;
        if (effectiveCharIds === undefined && data.charactersInScene !== undefined) effectiveCharIds = data.charactersInScene;
        if (effectivePov === undefined && data.pointOfViewCharacterId !== undefined) effectivePov = data.pointOfViewCharacterId;
        
        if (data.characterStateOverrides) {
            Object.keys(data.characterStateOverrides).forEach(charId => {
                if (!overriddenChars.has(charId)) {
                    effectiveOverrides[charId] = data.characterStateOverrides[charId];
                    overriddenChars.add(charId);
                }
            });
        }

        if (!effectiveCustomSummary && data.customCharactersSummary) {
            effectiveCustomSummary = data.customCharactersSummary;
        }
        
        current = current.parent;
    }

    return {
        date: effectiveDate,
        scenarioIds: effectiveScenariosIds || [],
        tagIds: effectiveTagIds || [],
        characterIds: effectiveCharIds || [],
        pov: effectivePov,
        overrides: effectiveOverrides,
        customCharactersSummary: effectiveCustomSummary
    };
};

export const resolveCharacterStateSnapshots = (
    allCharacters: Character[],
    overrides: Record<string, CharacterStateSnapshot> | undefined
): Character[] => {
    if (!overrides) return allCharacters;
    return allCharacters.map(char => {
        const override = overrides[char.id];
        if (override) {
            return {
                ...char,
                attributes: override.attributes || char.attributes,
                states: override.states || char.states,
                relationships: override.relationships || char.relationships
            };
        }
        return char;
    });
};

export const resolveEffectiveEntities = (
    characterIds: string[], 
    scenarioIds: string[], 
    tagIds: string[],
    allCharacters: Character[],
    allScenarios: Scenario[],
    allTagGroups: TagGroup[],
    overrides?: Record<string, CharacterStateSnapshot>
) => {
    const snapshotCharacters = resolveCharacterStateSnapshots(allCharacters, overrides);
    const activeCharacters = (characterIds || []).map(id => snapshotCharacters.find(c => c.id === id)).filter(Boolean) as Character[];
    const activeScenarios = (scenarioIds || []).map(id => allScenarios.find(s => s.id === id)).filter(Boolean) as Scenario[];
    const activeStatusTags: { groupName: string; tag: Tag }[] = [];
    
    for (const tagId of (tagIds || [])) {
        for (const group of allTagGroups) {
            const tag = group.tags.find(t => t.id === tagId);
            if (tag) { activeStatusTags.push({ groupName: group.name, tag }); break; }
        }
    }
    
    return { activeCharacters, activeScenarios, activeStatusTags };
};

export const generateStorySummary = (storyArcs: StoryArc[], activeArcId: string): string => {
    const traverseNode = (node: StoryNodeData, depth: number, context: InheritedContext): string => {
        const effectiveDate = node.fantasyDate || context.date;
        const effectiveSummary = node.customCharactersSummary || context.customCharactersSummary;
        let summary = '';
        
        if (!node.excludeFromContext) {
            summary = `${'  '.repeat(depth)}- ${node.name}`;
            const metadataParts = [];
            if (effectiveDate && effectiveDate !== context.date) metadataParts.push(`Date: ${effectiveDate}`);
            if (node.tags && node.tags.length > 0) metadataParts.push(`Tags: ${node.tags.join(', ')}`);
            if (effectiveSummary && effectiveSummary !== context.customCharactersSummary) {
                 metadataParts.push(`STATUS: ${effectiveSummary}`);
            } else if (node.customCharactersSummary) {
                 metadataParts.push(`STATUS: ${node.customCharactersSummary}`);
            }
            if (metadataParts.length > 0) {
                summary += ` [${metadataParts.join(' | ')}]`;
            }
            summary += '\n';
        }

        const newContext: InheritedContext = {
            date: effectiveDate,
            tags: context.tags,
            customCharactersSummary: effectiveSummary
        };
        
        if (node.children && node.children.length > 0 && !node.isCollapsed) {
            node.children.forEach(child => { 
                summary += traverseNode(child, !node.excludeFromContext ? depth + 1 : depth, newContext); 
            });
        }
        return summary;
    };

    const traverseTaggedNodes = (node: StoryNodeData, depth: number, context: InheritedContext): string => {
        const effectiveDate = node.fantasyDate || context.date;
        let summary = '';
        
        if (!node.excludeFromContext && node.tags && node.tags.length > 0) {
            summary += `${'  '.repeat(depth)}- ${node.name} [Tags: ${node.tags.join(', ')}]${effectiveDate ? ` [Date: ${effectiveDate}]` : ''}\n`;
        }
        
        const newContext = { date: effectiveDate, tags: [] };
        if (node.children && node.children.length > 0 && !node.isCollapsed) {
            node.children.forEach(child => { 
                summary += traverseTaggedNodes(child, !node.excludeFromContext ? depth + 1 : depth, newContext); 
            });
        }
        return summary;
    };

    const traverseCanonicalPath = (node: StoryNodeData, depth: number, context: InheritedContext): string => {
        const effectiveDate = node.fantasyDate || context.date;
        let summary = '';
        
        if (!node.excludeFromContext) {
            summary = `${'  '.repeat(depth)}- ${node.name}${effectiveDate ? ` [Date: ${effectiveDate}]` : ''}\n`;
        }
        
        const newContext = { date: effectiveDate, tags: [] };
        if (node.children && node.children.length > 0 && !node.isCollapsed) {
            const nextId = node.canonicalChildId || node.children[0].id;
            const nextNode = node.children.find(c => c.id === nextId);
            if (nextNode) { 
                summary += traverseCanonicalPath(nextNode, !node.excludeFromContext ? depth + 1 : depth, newContext); 
            }
        }
        return summary;
    };

    let summaryText = '';
    const activeArcObj = storyArcs.find(a => a.id === activeArcId);
    if (activeArcObj && (activeArcObj.significance === undefined || activeArcObj.significance > 0)) {
        summaryText += `=== ARCO ACTIVO: ${activeArcObj.name.toUpperCase()} ===\n`;
        summaryText += traverseNode(activeArcObj.rootNode, 0, { date: '', tags: [] });
        summaryText += '\n\n';
    }
    const otherArcs = storyArcs.filter(a => a.id !== activeArcId && (a.significance || 0) > 0).sort((a, b) => (b.significance || 0) - (a.significance || 0));
    if (otherArcs.length > 0) {
        otherArcs.forEach(arc => {
            const score = arc.significance || 0;
            if (score <= 3) {
                summaryText += `=== CONTEXTO DE FONDO [Arco: ${arc.name}] ===\n${arc.summary || '(Sin resumen)'}\n`;
            } else if (score <= 6) {
                summaryText += `=== CONTEXTO TEMÁTICO [Arco: ${arc.name}] ===\nResumen del Arco: ${arc.summary}\n--- Eventos Etiquetados Clave ---\n${traverseTaggedNodes(arc.rootNode, 0, { date: '', tags: [] })}`;
            } else if (score <= 9) {
                summaryText += `=== HISTORIA CANÓNICA [Arco: ${arc.name}] ===\nResumen del Arco: ${arc.summary}\n--- Línea de Timeline ---\n${traverseCanonicalPath(arc.rootNode, 0, { date: '', tags: [] })}`;
            } else {
                 summaryText += `=== CONTEXTO CRÍTICO [Arco: ${arc.name}] ===\n${traverseNode(arc.rootNode, 0, { date: '', tags: [] })}`;
            }
            summaryText += '\n';
        });
    }
    return summaryText;
};

export const generateNodeReadableIds = (nodes: HierarchyPointNode<StoryNodeData>[]): Map<string, string> => {
    const idMap = new Map<string, string>();
    const parentAliasMap = new Map<string, string>();
    if (nodes.length === 0) return idMap;
    const rootNode = nodes.find(n => n.depth === 0);
    if (!rootNode) return idMap;
    const indexToIdentifier = (index: number): string => { return (index + 1).toString(36).toUpperCase(); };
    const MAX_PARENT_LABEL_LENGTH = 20;
    let nextAliasCounter = 1;
    const getNextAlias = () => {
        let num = nextAliasCounter;
        let letters = '';
        while (num >= 0) { letters = String.fromCharCode(num % 26 + 'A'.charCodeAt(0)) + letters; num = Math.floor(num / 26) - 1; }
        nextAliasCounter++;
        return letters;
    };
    idMap.set(rootNode.data.id, 'A');
    const queue: HierarchyPointNode<StoryNodeData>[] = [rootNode];
    while(queue.length > 0) {
        const parentNode = queue.shift();
        if(!parentNode || !parentNode.children) continue;
        const parentReadableId = idMap.get(parentNode.data.id);
        if (!parentReadableId) continue;
        let childrenBaseId = parentReadableId;
        if (parentReadableId.length > MAX_PARENT_LABEL_LENGTH) {
            if (!parentAliasMap.has(parentNode.data.id)) { parentAliasMap.set(parentNode.data.id, getNextAlias()); }
            childrenBaseId = parentAliasMap.get(parentNode.data.id)!;
        }
        parentNode.children.forEach((childNode, index) => {
            const identifier = indexToIdentifier(index);
            const childId = `${childrenBaseId}-${identifier}`;
            idMap.set(childNode.data.id, childId);
            queue.push(childNode);
        });
    }
    return idMap;
};

// --- SCRIPT COMPILATION UTILS ---

export const compileStoryScript = (rootNode: StoryNodeData, arcName: string): string => {
    let script = `# Guion: ${arcName}\n\n`;
    let current: StoryNodeData | undefined = rootNode;
    let sceneCount = 1;
    let currentInheritedDate = '';
    while (current) {
        if (current.fantasyDate) { currentInheritedDate = current.fantasyDate; }
        script += `## Escena ${sceneCount}: ${current.name.trim() || 'Sin Título'}\n`;
        if (currentInheritedDate) { script += `**Fecha:** ${currentInheritedDate}\n`; }
        const metadata: string[] = [];
        if (current.pointOfViewCharacterId) metadata.push(`POV: ${current.pointOfViewCharacterId}`);
        if (current.scenariosInScene?.length) metadata.push(`Loc: [${current.scenariosInScene.length}]`);
        if (current.customCharactersSummary) metadata.push(`Estado: ${current.customCharactersSummary}`);
        if (metadata.length > 0) { script += `> *${metadata.join(' | ')}*\n`; }
        script += '\n';
        if (current.note && current.note.trim()) { script += `${current.note.trim()}\n\n`; }
        else { script += `(Sin contenido detallado en esta nota)\n\n`; }
        script += `---\n\n`;
        sceneCount++;
        if (current.children && current.children.length > 0) {
            if (current.canonicalChildId) { current = current.children.find(c => c.id === current.canonicalChildId) || current.children[0]; }
            else { current = current.children[0]; }
        } else { current = undefined; }
    }
    return script;
};

/**
 * NEW: Compiles a deep profile of the story for AI context consumption (Grok/GPT).
 */
export const compileDeepStoryProfile = (projectData: ProjectData): string => {
    const { storyArcs: allArcs, activeArcId, characters: allCharacters, worldObjects, worldLogicRules, magicSystems, species, nations, scenarios, secrets } = projectData;
    const activeArc = allArcs.find(a => a.id === activeArcId) || allArcs[0];
    if (!activeArc) return '';
    let profile = `# PERFIL DE CONTEXTO PROFUNDO: ${activeArc.name.toUpperCase()}\n`;
    profile += `> Generado para simulación de alta fidelidad en IAs externas.\n\n`;
    
    // SECTION: WORLD LORE AND CONTEXT
    profile += `## LORE DEL MUNDO Y CONTEXTO\n\n`;
    

    if (allCharacters && allCharacters.length > 0) {
        profile += `### PERSONAJES PRINCIPALES\n`;
        allCharacters.forEach(c => {
            profile += `- **${c.name}**${c.aliases && c.aliases.length > 0 ? ` (${c.aliases.join(', ')})` : ''}\n`;
            if (c.archetype) profile += `  - *Arquetipo*: ${c.archetype}\n`;
            if (c.backstory) profile += `  - *Historia*: ${c.backstory}\n`;
            if (c.personality) profile += `  - *Personalidad*: ${c.personality}\n`;
            if (c.mainMotivation) profile += `  - *Motivación*: ${c.mainMotivation}\n`;
        });
        profile += `\n`;
    }

    if (worldObjects && worldObjects.length > 0) {
        profile += `### OBJETOS Y LORE DEL MUNDO\n`;
        worldObjects.forEach(obj => {
            profile += `- **${obj.name}**: ${obj.description || 'Sin descripción'}\n`;
            if (obj.notes) profile += `  - *Notas*: ${obj.notes}\n`;
        });
        profile += `\n`;
    }

    if (worldLogicRules && worldLogicRules.length > 0) {
        profile += `### REGLAS DEL MUNDO\n`;
        worldLogicRules.forEach(rule => {
            profile += `- **${rule.text}**: ${rule.description || 'Sin descripción'}\n`;
            if (rule.consequences) profile += `  - *Consecuencias*: ${rule.consequences}\n`;
        });
        profile += `\n`;
    }

    if (magicSystems && magicSystems.length > 0) {
        profile += `### SISTEMAS DE MAGIA/PODER\n`;
        magicSystems.forEach(sys => {
            profile += `- **${sys.name}**: ${sys.description || 'Sin descripción'}\n`;
            if (sys.rules) profile += `  - *Reglas*: ${sys.rules}\n`;
        });
        profile += `\n`;
    }

    if (nations && nations.length > 0) {
        profile += `### NACIONES Y FACCIONES\n`;
        nations.forEach(nat => {
            profile += `- **${nat.name}**: ${nat.description || 'Sin descripción'}\n`;
            if (nat.governmentType) profile += `  - *Gobierno*: ${nat.governmentType}\n`;
        });
        profile += `\n`;
    }

    if (species && species.length > 0) {
        profile += `### ESPECIES Y RAZAS\n`;
        species.forEach(sp => {
            profile += `- **${sp.name}**: ${sp.description || 'Sin descripción'}\n`;
            if (sp.politics) profile += `  - *Política*: ${sp.politics}\n`;
            if (sp.philosophy) profile += `  - *Filosofía*: ${sp.philosophy}\n`;
        });
        profile += `\n`;
    }

    if (scenarios && scenarios.length > 0) {
        profile += `### ESCENARIOS IMPORTANTES\n`;
        scenarios.forEach(sc => {
            profile += `- **${sc.name}**: ${sc.description || 'Sin descripción'}\n`;
        });
        profile += `\n`;
    }

    if (secrets && secrets.length > 0) {
        profile += `### SECRETOS Y MISTERIOS (META-CONOCIMIENTO)\n`;
        secrets.forEach(sec => {
            profile += `- **${sec.name}**: ${sec.content || 'Sin descripción'}\n`;
            if (sec.consequences) profile += `  - *Consecuencias*: ${sec.consequences}\n`;
        });
        profile += `\n`;
    }
    
    profile += `---\n\n`;

    // SECTION: OTHER ACTIVE ARCS (BACKGROUND CONTEXT)
    const otherActiveArcs = allArcs.filter(a => a.id !== activeArcId && (a.significance || 0) > 0);
    if (otherActiveArcs.length > 0) {
        profile += `## ESTADO GLOBAL DEL MUNDO (TRAMAS PARALELAS)\n`;
        otherActiveArcs.forEach(arc => {
            profile += `### ARCO: ${arc.name} (Importancia: ${arc.significance}/10)\n`;
            profile += `${arc.summary || "(Sin resumen detallado proporcionado)"}\n\n`;
        });
        profile += `---\n\n`;
    }

     // SECTION: ACTIVE ARC DEEP DIVE
    if (activeArc.significance === undefined || activeArc.significance > 0) {
        profile += `## HISTORIA PRINCIPAL (PASO A PASO CANÓNICO)\n`;
        
        let current: StoryNodeData | undefined = activeArc.rootNode;
        let step = 1;

        while (current) {
            const ctx = getEffectiveNodeContext(current);
            const resolvedChars = resolveCharacterStateSnapshots(allCharacters, ctx.overrides);
            const sceneChars = ctx.characterIds.map(id => resolvedChars.find(c => c.id === id)).filter(Boolean) as Character[];

            profile += `### ESCENA ${step}: ${current.name.trim()}\n`;
            if (ctx.date) profile += `**FECHA SIMULACIÓN:** ${ctx.date}\n`;
            
            if (sceneChars.length > 0) {
                profile += `\n**ESTADO DE ACTORES EN ESTA ESCENA:**\n`;
                sceneChars.forEach(c => {
                    profile += `#### ${c.name} ${ctx.pov === c.id ? '(POV)' : ''}\n`;
                    
                    // ADD DEEP EVOLUTION LOGS
                    const relevantEvol = c.evolution?.filter(e => e.arcId === activeArcId) || [];
                    if (relevantEvol.length > 0) {
                        profile += `- **Archivos de Datos Recientes:**\n`;
                        relevantEvol.forEach(e => {
                            profile += `  * [${e.name}] Rol: ${e.roleAtMoment || '?'} | Estado: ${e.mentalState || '?'}\n`;
                            if (e.description) profile += `    Hechos: ${e.description}\n`;
                            if (e.tacticalPoints?.length) profile += `    Táctica: ${e.tacticalPoints.join('; ')}\n`;
                            if (e.privateThoughts) profile += `    Privado: ${e.privateThoughts}\n`;
                            if (e.diaryFragment) profile += `    Diario: "${e.diaryFragment}"\n`; // NUEVO: Se incluye el diario en el perfil profundo
                        });
                    }

                    if (c.attributes && c.attributes.length > 0) {
                        profile += `- **Atributos:** ${c.attributes.map(a => `${a.name}: ${a.current}/${a.max}`).join(', ')}\n`;
                    }
                    
                    const activeStates = c.states?.filter(s => s.active);
                    if (activeStates && activeStates.length > 0) {
                        profile += `- **Estados Activos:** ${activeStates.map(s => `${s.name} (Nvl ${s.intensity || 1})`).join(', ')}\n`;
                    }
                });
            }

            if (current.note) {
                profile += `\n**ACCIÓN NARRATIVA:**\n${current.note.trim()}\n`;
            }

            profile += `\n---\n\n`;
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
}
