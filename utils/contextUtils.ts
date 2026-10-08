
/**
 * Filters a list of entities based on whether their name or aliases appear in the provided text.
 * If no specific entities are matched by keyword scanning, or if the text contains general query terms,
 * it falls back to returning all provided active entities so the AI always has access to world lore.
 */
export const filterContextByKeywords = <T extends { name: string; aliases?: string[]; active?: boolean }>(
    textToScan: string,
    entities: T[]
): T[] => {
    if (!entities || entities.length === 0) return [];
    
    // Filter active entities (defaulting to active if active property is undefined)
    const activeEntities = entities.filter(e => e.active !== false);
    if (activeEntities.length === 0) return [];

    if (!textToScan || !textToScan.trim()) {
        return activeEntities;
    }

    const normalizedText = textToScan.toLowerCase();

    // Search for specific entity mentions
    const matched = activeEntities.filter(entity => {
        if (!entity.name) return false;
        if (normalizedText.includes(entity.name.toLowerCase())) return true;
        if (entity.aliases && entity.aliases.length > 0) {
            return entity.aliases.some(alias => alias && normalizedText.includes(alias.toLowerCase()));
        }
        return false;
    });

    if (matched.length > 0) {
        return matched;
    }

    // Fallback: If no specific entity keyword was matched in the query/context,
    // return all active entities so the AI model knows the world lore and entities exist!
    return activeEntities;
};

