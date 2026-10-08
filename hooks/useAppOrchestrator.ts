
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { ProjectData, AiSettings, StoryNodeData, DirectorContext, ChatMessage } from '../types';
import { INITIAL_AI_SETTINGS, INITIAL_NODE_DATA } from '../constants';
import { StoryGraphRef } from '../components/StoryGraph';
import { getInitialProjectData, loadProjectDataFromDB } from '../utils/storageUtils';
import { useHistory } from './useHistory';
import { usePersistence } from './usePersistence';
import { useUIState } from './useUIState';
import { useNodeActions } from './useNodeActions';
import { useAiActions } from './useAiActions';
import { useProjectActions } from './useProjectActions';
import { useAutoSave } from './useAutoSave';
import { useBlackoutProtection } from './useBlackoutProtection';
import { useStoryLayout } from './useStoryLayout';
import { useSearch } from './useSearch';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { HierarchyPointNode } from 'd3-hierarchy';
import { compileStoryScript, compileDeepStoryProfile, getEffectiveNodeContext, resolveCharacterStateSnapshots } from '../utils/storyUtils';
import { useCollaboration } from './useCollaboration';

export const useAppOrchestrator = () => {
    // --- 1. CORE STATE & SETTINGS ---
    const [initialProjectData, setInitialProjectData] = useState<ProjectData>(getInitialProjectData);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        loadProjectDataFromDB().then(data => {
            setInitialProjectData(data);
            setIsLoaded(true);
        }).catch(err => {
            console.error("Failed to load project data from DB:", err);
            setIsLoaded(true);
        });
    }, []);

    const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
        try {
            const saved = localStorage.getItem('aiSettings');
            const settings = saved ? { ...INITIAL_AI_SETTINGS, ...JSON.parse(saved) } : INITIAL_AI_SETTINGS;
            
            const obsoletePatterns = ['gemini-1.5', 'gemini-pro', 'gemini-2.0-pro-exp', 'gemini-2.0-flash-exp', 'nano-banana', 'gemini-3-pro-preview'];
            const isObsolete = obsoletePatterns.some(p => settings.model?.includes(p));
            if (isObsolete || !settings.model) {
                settings.model = 'gemini-3.1-pro-preview';
            }
            return settings;
        } catch { return INITIAL_AI_SETTINGS; }
    });
    const [projectName, setProjectName] = useState<string>(() => {
        try {
            return localStorage.getItem('projectName') || 'Semidios Atrapado';
        } catch {
            return 'Semidios Atrapado';
        }
    });
    
    useEffect(() => {
        try {
            localStorage.setItem('projectName', projectName);
        } catch {}
    }, [projectName]);

    // --- 2. HISTORY & PERSISTENCE ---
    const { state: projectData, setState: setProjectData, undo, redo, canUndo, canRedo, clearHistory } = useHistory<ProjectData>(initialProjectData, aiSettings.undoHistoryLimit);
    
    // Update history when DB load finishes
    useEffect(() => {
        if (isLoaded) {
            clearHistory(initialProjectData);
        }
    }, [isLoaded, initialProjectData, clearHistory]);

    const effectiveProjectData = projectData || initialProjectData;
    
    usePersistence(effectiveProjectData, isLoaded);

    // --- COLLABORATION ---
    const handleRemoteUpdate = useCallback((data: ProjectData, name: string) => {
        setProjectData(data);
        setProjectName(name);
    }, [setProjectData, setProjectName]);

    const collab = useCollaboration(effectiveProjectData, projectName, handleRemoteUpdate);

    // Sync local changes to cloud
    useEffect(() => {
        if (isLoaded && collab.cloudProjectId) {
            const timeoutId = setTimeout(() => {
                collab.syncLocalChanges(effectiveProjectData, projectName);
            }, 500); // Faster debounce for real-time feel
            return () => clearTimeout(timeoutId);
        }
    }, [effectiveProjectData, projectName, collab.cloudProjectId, isLoaded]); // Exclude collab.syncLocalChanges to avoid infinite loops if it changes

    // --- 3. DERIVED DATA ---
    const { storyArcs, activeArcId } = effectiveProjectData;
    const activeArc = useMemo(() => storyArcs.find(a => a.id === activeArcId) || storyArcs[0], [storyArcs, activeArcId]);
    const storyTree = useMemo(() => activeArc?.rootNode || INITIAL_NODE_DATA, [activeArc]);

    // --- 4. UI STATE ---
    const ui = useUIState();
    const [nodeHeights, setNodeHeights] = useState<Record<string, number>>({});
    const [movingNodeId, setMovingNodeId] = useState<string | null>(null);
    const [copiedNodeData, setCopiedNodeData] = useState<any>(null);
    const [chattingNodeId, setChattingNodeId] = useState<string | null>(null);
    const [translatingNodeId, setTranslatingNodeId] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<string[]>(() => {
        try { return JSON.parse(localStorage.getItem('searchHistory') || '[]'); } catch { return []; }
    });
    
    const graphRef = useRef<StoryGraphRef>(null);

    // --- 5. LOGIC HOOKS ---
    const nodeActions = useNodeActions(setProjectData);
    const projectActions = useProjectActions(setProjectData, setProjectName, clearHistory, setAiSettings, () => {});
    const aiActions = useAiActions(aiSettings, effectiveProjectData, nodeActions.updateActiveArcRoot, projectActions.handleUpdateItem, projectActions.handleRenameCharacterGlobally);

    const handleDirectorChatWithContext = useCallback((
        node: HierarchyPointNode<StoryNodeData>, 
        chatHistory: ChatMessage[], 
        userMessageText: string, 
        context: DirectorContext,
        isRegeneration: boolean = false,
        isSystemMode: boolean = false,
        requestMultipleDrafts: boolean = false,
        onChunk?: (text: string) => void
    ) => {
        const externalContextStr = (effectiveProjectData.referenceDocuments || []).map((d: any) => `## ${d.name}\n${d.content}`).join('\n\n');
        return aiActions.actions.handleDirectorChat(node, chatHistory, userMessageText, context, isRegeneration, isSystemMode, requestMultipleDrafts, externalContextStr, onChunk);
    }, [aiActions.actions.handleDirectorChat, effectiveProjectData.referenceDocuments]);

    const autoSave = useAutoSave(projectName, effectiveProjectData, aiSettings, searchHistory);

    const blackoutProtection = useBlackoutProtection(
        projectName,
        effectiveProjectData,
        aiSettings,
        isLoaded,
        useCallback((restoredState: any) => {
            projectActions.handleLoadProject(restoredState);
        }, [projectActions])
    );

    // --- 6. LAYOUT & SEARCH ---
    const layout = useStoryLayout(storyTree, activeArc, storyArcs, activeArcId, nodeHeights, chattingNodeId, translatingNodeId);
    const search = useSearch(layout.nodes, layout.nodeReadableIds);

    // --- 7. TOKEN COUNT CALCULATION ---
    const tokenCounts = useMemo(() => {
        if (ui.tabs.activeSideMenuTab !== 'project') return { total: 0, active: 0, breakdown: { storyTotal: 0, storyActive: 0, characters: 0, world: 0, rules: 0, summaries: 0 } };
        try {
            const jsonLen = (obj: any) => JSON.stringify(obj, (key, value) => {
                if (key === 'images' || key === 'imageUrl' || key === 'avatar' || key === 'referenceImage') return undefined;
                if (typeof value === 'string') {
                    if (value.startsWith('data:image/')) return undefined;
                    return value.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/]+={0,2}/g, '');
                }
                return value;
            })?.length || 0;
            const estTokens = (len: number) => Math.round(len / 3.5);
            
            const storyLen = jsonLen(effectiveProjectData.storyArcs);
            let activeArcLen = 0;
            if (activeArc) {
                // Filtrar solo los nodos de la ruta lineal activa y que no estén excluidos
                const activeNodes = layout.nodes.filter(n => layout.canonicalNodeIds.has(n.data.id) && !n.data.excludeFromContext);
                const last150Nodes = activeNodes.slice(-150);
                
                const stringifiedNodes = last150Nodes.map(n => JSON.stringify({
                    blocks: n.data.blocks,
                    name: n.data.name,
                    note: n.data.note,
                    chatHistory: n.data.chatHistory?.map(m => m.text),
                    directorChatHistory: n.data.directorChatHistory?.map(m => m.text)
                }));
                activeArcLen = stringifiedNodes.join("").length;
            }
            const charLen = jsonLen(effectiveProjectData.characters);
            const worldEntitiesLen = jsonLen({
                s: effectiveProjectData.scenarios, 
                m: effectiveProjectData.magicSystems, 
                o: effectiveProjectData.worldObjects,
                sp: effectiveProjectData.species, 
                l: effectiveProjectData.loreEntries,
                n: effectiveProjectData.nations,
                t: effectiveProjectData.tagGroups
            });
            const rulesAndPsychLen = jsonLen({
                r: effectiveProjectData.worldLogicRules.filter(r => r.active !== false),
                t: effectiveProjectData.psychologicalTraits.filter(t => t.active !== false)
            });
            const summariesLen = jsonLen({
                sum: layout.storySummary,
                goals: effectiveProjectData.narrativeGoals.filter(g => g.status === 'Active'),
                flags: effectiveProjectData.flags.filter(f => f.state)
            });

            const breakdown = { 
                storyTotal: estTokens(storyLen), 
                storyActive: estTokens(activeArcLen),
                characters: estTokens(charLen), 
                world: estTokens(worldEntitiesLen), 
                rules: estTokens(rulesAndPsychLen),
                summaries: estTokens(summariesLen)
            };
            
            const total = breakdown.storyTotal + breakdown.characters + breakdown.world + breakdown.rules + breakdown.summaries;
            const active = breakdown.storyActive + breakdown.characters + breakdown.world + breakdown.rules + breakdown.summaries;
            
            return { total, active, breakdown };
        } catch { return { total: 0, active: 0, breakdown: { storyTotal: 0, storyActive: 0, characters: 0, world: 0, rules: 0, summaries: 0 } }; }
    }, [effectiveProjectData, layout.storySummary, layout.nodes, layout.canonicalNodeIds, ui.tabs.activeSideMenuTab, activeArc]);

    const handleManualSave = useCallback((name: string) => {
        setProjectName(name);
        const fullState = { ...effectiveProjectData, projectName: name, aiSettings, autoSaveInterval: autoSave.autoSaveInterval, autoDownloadEnabled: autoSave.autoDownloadEnabled, searchHistory };
        autoSave.onDownloadManualSave(fullState);
    }, [setProjectName, effectiveProjectData, aiSettings, autoSave.autoSaveInterval, autoSave.autoDownloadEnabled, searchHistory, autoSave.onDownloadManualSave]);

    const handleExportScript = useCallback(() => {
        if (!activeArc) return;
        const script = compileStoryScript(activeArc.rootNode, activeArc.name);
        const blob = new Blob([script], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '_')}_${activeArc.name.replace(/\s+/g, '_')}_Script.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [activeArc, projectName]);

    const handleExportDeepProfile = useCallback(() => {
        if (!activeArc) return;
        const profile = compileDeepStoryProfile(effectiveProjectData);
        const blob = new Blob([profile], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '_')}_${activeArc.name.replace(/\s+/g, '_')}_AI_Profile.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [activeArc, projectName, effectiveProjectData]);

    // ADDED: Pass manual save callback
    useKeyboardShortcuts(
        undo, 
        redo, 
        () => setMovingNodeId(null), 
        movingNodeId,
        () => handleManualSave(projectName) 
    );

    const handleRegenerateAiResponse = useCallback(() => {
        if (ui.modals.directorTargetNode) {
            const node = layout.nodes.find(n => n.data.id === ui.modals.directorTargetNode!.data.id);
            if (node) {
                const history = node.data.directorChatHistory || [];
                const context: DirectorContext = {
                    fantasyDate: node.data.fantasyDate || '',
                    characterIds: node.data.charactersInScene || [],
                    scenarioIds: node.data.scenariosInScene || [],
                    tagIds: node.data.statusTagIds || [],
                    povCharacterId: node.data.pointOfViewCharacterId,
                    aiRole: node.data.customAiRole,
                    aiCustomInstruction: node.data.customAiInstruction,
                    strictFocus: node.data.strictFocus
                };
                aiActions.actions.handleRegenerateDirectorChat(node, history, context);
            }
        }
    }, [ui.modals.directorTargetNode, layout.nodes, aiActions.actions]);

    useEffect(() => {
        if (aiActions.loadingStates.chatLoadingNodeId && aiActions.loadingStates.chatLoadingNodeId !== chattingNodeId) {
            setChattingNodeId(aiActions.loadingStates.chatLoadingNodeId);
        }
    }, [aiActions.loadingStates.chatLoadingNodeId, chattingNodeId]);

    const handleNodeHeightChange = useCallback((id: string, h: number) => {
        setNodeHeights(prev => {
            if (prev[id] === h) return prev;
            return { ...prev, [id]: h };
        });
    }, []);

    const handleSearchResultClick = useCallback((node: HierarchyPointNode<StoryNodeData>) => {
        graphRef.current?.goToNode(node);
        ui.panels.setIsMenuOpen(false);
        search.setSearchQuery('');
    }, [ui.panels, search]);

    const freshDirectorNode = ui.modals.directorTargetNode ? layout.nodes.find(n => n.data.id === ui.modals.directorTargetNode!.data.id) || null : null;

    return {
        project: { data: effectiveProjectData, name: projectName, setName: setProjectName, activeArc, storyTree, tokenCounts },
        history: { undo, redo, canUndo, canRedo, clear: clearHistory },
        ai: { 
            settings: aiSettings, 
            setSettings: setAiSettings, 
            actions: { 
                ...aiActions.actions, 
                handleDirectorChat: handleDirectorChatWithContext,
                handleRegenerateAiResponse
            }, 
            loading: { 
                ...aiActions.loadingStates, 
                chatLoadingNodeId: aiActions.loadingStates.chatLoadingNodeId, 
                setChatLoadingNodeId: setChattingNodeId, 
                setTranslatingNodeId: setTranslatingNodeId 
            } 
        },
        ui: { ...ui, modals: { ...ui.modals, directorTargetNode: freshDirectorNode }, movingNodeId, setMovingNodeId, copiedNodeData, setCopiedNodeData, chattingNodeId, setChattingNodeId, translatingNodeId, setTranslatingNodeId, handleNodeHeightChange },
        layout,
        search: { ...search, handleClick: handleSearchResultClick },
        autoSave: { ...autoSave, onExportScript: handleExportScript, onExportDeepProfile: handleExportDeepProfile },
        blackoutProtection,
        actions: { node: { ...nodeActions, onPromoteToArc: projectActions.handlePromoteBranchToArc }, project: { ...projectActions, handleManualSave } },
        refs: { graphRef },
        collab
    };
};
