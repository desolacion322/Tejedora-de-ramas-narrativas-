import { get, set, del } from 'idb-keyval';
import { ProjectData, ProjectSaveState, EmergencySnapshotMeta, StoryArc, StoryNodeData } from '../types';

const BLACKOUT_META_LIST_KEY = 'blackout_shield_meta_list';
const BLACKOUT_META_LS_KEY = '__BLACKOUT_SHIELD_META__';
const BLACKOUT_LEGACY_LS_KEY = '__BLACKOUT_SHIELD_LAST_STATE__';
const MAX_SNAPSHOTS = 5;

// Clean up any legacy bloated localStorage key on module load
try {
    localStorage.removeItem(BLACKOUT_LEGACY_LS_KEY);
} catch {}

/**
 * Counts all nodes in a node tree recursively.
 */
export const countNodesInTree = (node: StoryNodeData | null | undefined): number => {
    if (!node) return 0;
    let count = 1;
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            count += countNodesInTree(child);
        }
    }
    return count;
};

/**
 * Counts total nodes across all story arcs.
 */
export const countTotalNodes = (storyArcs: StoryArc[] | null | undefined): number => {
    if (!Array.isArray(storyArcs)) return 0;
    return storyArcs.reduce((acc, arc) => acc + (arc?.rootNode ? countNodesInTree(arc.rootNode) : 0), 0);
};

/**
 * Saves an emergency blackout snapshot safely.
 * Only lightweight metadata is stored in localStorage (<200 bytes).
 * State is stored in IndexedDB under its own key, keeping RAM usage near zero.
 */
export const saveBlackoutSnapshot = async (
    projectName: string,
    projectData: ProjectData,
    aiSettings: any,
    trigger: 'timer' | 'change' | 'beforeunload' | 'manual' = 'timer'
): Promise<EmergencySnapshotMeta> => {
    const timestamp = Date.now();
    const dateFormatted = new Date(timestamp).toLocaleString();
    const nodeCount = countTotalNodes(projectData.storyArcs);
    const characterCount = projectData.characters?.length || 0;
    const arcCount = projectData.storyArcs?.length || 0;
    const id = `snap_${timestamp}`;

    const meta: EmergencySnapshotMeta = {
        id,
        timestamp,
        dateFormatted,
        projectName,
        nodeCount,
        characterCount,
        arcCount,
        trigger
    };

    // 1. Ultra-lightweight synchronous save of metadata to localStorage (< 200 bytes)
    try {
        localStorage.setItem(BLACKOUT_META_LS_KEY, JSON.stringify(meta));
    } catch {}

    // 2. Asynchronously save project state in IndexedDB under its individual key
    const state: ProjectSaveState = {
        ...projectData,
        projectName,
        aiSettings,
        autoSaveInterval: 5 * 60 * 1000,
        autoDownloadEnabled: false,
        searchHistory: []
    };

    try {
        await set(`blackout_state_${id}`, state);

        // Update metadata list in IndexedDB
        let metaList: EmergencySnapshotMeta[] = [];
        try {
            const raw = await get(BLACKOUT_META_LIST_KEY);
            if (Array.isArray(raw)) metaList = raw;
        } catch {}

        const updatedMetaList = [meta, ...metaList.filter(m => m.id !== id)];
        const toKeep = updatedMetaList.slice(0, MAX_SNAPSHOTS);
        const toDelete = updatedMetaList.slice(MAX_SNAPSHOTS);

        // Delete discarded states from IndexedDB to free space
        for (const discarded of toDelete) {
            del(`blackout_state_${discarded.id}`).catch(() => {});
        }

        await set(BLACKOUT_META_LIST_KEY, toKeep);
    } catch (idbErr) {
        console.error("Failed to write snapshot to IndexedDB:", idbErr);
    }

    return meta;
};

/**
 * Retrieves list of snapshot metadata without loading heavy states into RAM.
 */
export const getBlackoutMetaList = async (): Promise<EmergencySnapshotMeta[]> => {
    try {
        const list = await get(BLACKOUT_META_LIST_KEY);
        if (Array.isArray(list) && list.length > 0) {
            return list;
        }
    } catch (e) {
        console.warn("Error reading blackout meta list from IDB:", e);
    }

    // Fallback: check localStorage for the single latest meta
    try {
        const raw = localStorage.getItem(BLACKOUT_META_LS_KEY);
        if (raw) {
            const meta = JSON.parse(raw) as EmergencySnapshotMeta;
            if (meta?.id) return [meta];
        }
    } catch {}

    return [];
};

/**
 * Retrieves the full ProjectSaveState for a specific snapshot ID on demand.
 */
export const getBlackoutState = async (id: string): Promise<ProjectSaveState | null> => {
    try {
        const state = await get(`blackout_state_${id}`);
        if (state) return state as ProjectSaveState;
    } catch (e) {
        console.error("Error reading blackout state from IDB:", e);
    }
    return null;
};

/**
 * Retrieves the latest snapshot's state on demand.
 */
export const getLatestBlackoutState = async (): Promise<ProjectSaveState | null> => {
    const list = await getBlackoutMetaList();
    if (list.length === 0) return null;
    return getBlackoutState(list[0].id);
};

/**
 * Deletes a snapshot by ID.
 */
export const deleteBlackoutSnapshot = async (id: string): Promise<EmergencySnapshotMeta[]> => {
    try {
        await del(`blackout_state_${id}`);
        const list = await getBlackoutMetaList();
        const filtered = list.filter(m => m.id !== id);
        await set(BLACKOUT_META_LIST_KEY, filtered);
        return filtered;
    } catch (e) {
        console.error("Failed to delete blackout snapshot:", e);
        return [];
    }
};

/**
 * Clears all blackout snapshots and frees IndexedDB keys.
 */
export const clearAllBlackoutSnapshots = async (): Promise<void> => {
    try {
        const list = await getBlackoutMetaList();
        for (const meta of list) {
            del(`blackout_state_${meta.id}`).catch(() => {});
        }
        await del(BLACKOUT_META_LIST_KEY);
    } catch {}
    try {
        localStorage.removeItem(BLACKOUT_META_LS_KEY);
        localStorage.removeItem(BLACKOUT_LEGACY_LS_KEY);
    } catch {}
};

/**
 * Checks if there is a pending snapshot that has more content or is newer
 * than what was just loaded from DB on startup.
 */
export const checkRecoverableSnapshotOnBoot = async (
    loadedData: ProjectData,
    loadedTimestamp?: number
): Promise<EmergencySnapshotMeta | null> => {
    try {
        const metaList = await getBlackoutMetaList();
        if (metaList.length === 0) return null;
        const latest = metaList[0];

        const currentNodes = countTotalNodes(loadedData.storyArcs);
        const currentCharCount = loadedData.characters?.length || 0;

        const hasMoreContent = (latest.nodeCount > currentNodes) || (latest.characterCount > currentCharCount);
        const isNoticeablyNewer = loadedTimestamp ? (latest.timestamp - loadedTimestamp > 15000) : false;
        const isRecoveringFromEmpty = (currentNodes <= 1 && currentCharCount === 0 && (latest.nodeCount > 1 || latest.characterCount > 0));

        if (hasMoreContent || isNoticeablyNewer || isRecoveringFromEmpty) {
            return latest;
        }

        return null;
    } catch (e) {
        console.error("Error evaluating recoverable snapshot:", e);
        return null;
    }
};
