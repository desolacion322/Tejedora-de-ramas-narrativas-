import { useState, useEffect, useRef, useCallback } from 'react';
import { ProjectData, ProjectSaveState, EmergencySnapshotMeta } from '../types';
import { 
    saveBlackoutSnapshot, 
    getBlackoutMetaList, 
    getBlackoutState, 
    deleteBlackoutSnapshot, 
    clearAllBlackoutSnapshots, 
    checkRecoverableSnapshotOnBoot 
} from '../services/blackoutRecoveryService';

export const useBlackoutProtection = (
    projectName: string,
    projectData: ProjectData,
    aiSettings: any,
    isLoaded: boolean,
    onRestoreProject: (state: ProjectSaveState) => void
) => {
    // Only metadata is stored in React memory (< 1KB total!)
    const [snapshots, setSnapshots] = useState<EmergencySnapshotMeta[]>([]);
    const [pendingRecovery, setPendingRecovery] = useState<EmergencySnapshotMeta | null>(null);
    const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
    const [isBlackoutCenterOpen, setIsBlackoutCenterOpen] = useState(false);
    const [lastSavedTimestamp, setLastSavedTimestamp] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Track whether there are unsaved modifications since the last snapshot
    const dirtyRef = useRef(false);

    // Keep fresh references for event listeners without causing effect re-subscriptions
    const projectRef = useRef({ projectName, projectData, aiSettings, isLoaded });
    useEffect(() => {
        projectRef.current = { projectName, projectData, aiSettings, isLoaded };
    }, [projectName, projectData, aiSettings, isLoaded]);

    // Mark as dirty whenever project data or name changes (after initial load)
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (!isLoaded) return;
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        dirtyRef.current = true;
    }, [projectData, projectName, isLoaded]);

    // 1. Initial check upon loading project data from DB
    useEffect(() => {
        if (!isLoaded) return;

        let isMounted = true;
        const initProtection = async () => {
            try {
                const list = await getBlackoutMetaList();
                if (isMounted) setSnapshots(list);

                const recoverable = await checkRecoverableSnapshotOnBoot(projectData);
                if (recoverable && isMounted) {
                    setPendingRecovery(recoverable);
                    setIsRecoveryModalOpen(true);
                }
            } catch (err) {
                console.error("Error initializing blackout protection:", err);
            }
        };

        initProtection();
        return () => { isMounted = false; };
    }, [isLoaded]);

    // 2. Perform a snapshot save (only if dirty or manual)
    const executeSave = useCallback(async (trigger: 'timer' | 'change' | 'beforeunload' | 'manual' = 'timer') => {
        const { projectName, projectData, aiSettings, isLoaded } = projectRef.current;
        if (!isLoaded || !projectData) return;

        // Skip automatic saves if nothing has changed
        if (trigger !== 'manual' && !dirtyRef.current) {
            return;
        }

        try {
            setIsSaving(true);
            dirtyRef.current = false;
            const newMeta = await saveBlackoutSnapshot(projectName, projectData, aiSettings, trigger);
            setLastSavedTimestamp(newMeta.timestamp);
            setSnapshots(prev => [newMeta, ...prev.filter(s => s.id !== newMeta.id)].slice(0, 5));
        } catch (err) {
            console.error("Blackout Protection Save Error:", err);
        } finally {
            setIsSaving(false);
        }
    }, []);

    // 3. Periodic Background Timer (Every 60 seconds, only runs if dirty)
    useEffect(() => {
        if (!isLoaded) return;
        const intervalId = setInterval(() => {
            if (dirtyRef.current) {
                executeSave('timer');
            }
        }, 60 * 1000);

        return () => clearInterval(intervalId);
    }, [isLoaded, executeSave]);

    // 4. Debounced Save on Project Changes (12 seconds of inactivity after editing)
    useEffect(() => {
        if (!isLoaded || !dirtyRef.current) return;
        const timeoutId = setTimeout(() => {
            if (dirtyRef.current) {
                executeSave('change');
            }
        }, 12000);

        return () => clearTimeout(timeoutId);
    }, [projectData, isLoaded, executeSave]);

    // 5. Visibility and Unload listeners (instant shield on tab change or window close)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && dirtyRef.current) {
                executeSave('beforeunload');
            }
        };

        const handleBeforeUnload = () => {
            if (dirtyRef.current) {
                executeSave('beforeunload');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [executeSave]);

    // Actions
    const handleRestoreSnapshot = useCallback(async (meta: EmergencySnapshotMeta) => {
        if (!meta?.id) return;
        try {
            const state = await getBlackoutState(meta.id);
            if (state) {
                onRestoreProject(state);
                dirtyRef.current = false;
                setPendingRecovery(null);
                setIsRecoveryModalOpen(false);
                setIsBlackoutCenterOpen(false);
            } else {
                alert("No se pudo cargar el respaldo desde la memoria local.");
            }
        } catch (err) {
            console.error("Error restoring snapshot:", err);
        }
    }, [onRestoreProject]);

    const handleDismissRecovery = useCallback(() => {
        setPendingRecovery(null);
        setIsRecoveryModalOpen(false);
    }, []);

    const handleManualSnapshot = useCallback(async () => {
        await executeSave('manual');
    }, [executeSave]);

    const handleDeleteSnapshot = useCallback(async (id: string) => {
        const updated = await deleteBlackoutSnapshot(id);
        setSnapshots(updated);
    }, []);

    const handleClearAllSnapshots = useCallback(async () => {
        await clearAllBlackoutSnapshots();
        setSnapshots([]);
        setPendingRecovery(null);
    }, []);

    return {
        snapshots,
        pendingRecovery,
        isRecoveryModalOpen,
        setIsRecoveryModalOpen,
        isBlackoutCenterOpen,
        setIsBlackoutCenterOpen,
        lastSavedTimestamp,
        isSaving,
        handleRestoreSnapshot,
        handleDismissRecovery,
        handleManualSnapshot,
        handleDeleteSnapshot,
        handleClearAllSnapshots
    };
};
