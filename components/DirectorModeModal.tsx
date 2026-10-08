
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HierarchyPointNode } from 'd3-hierarchy';
import { StoryNodeData, Character, Scenario, TagGroup, DirectorContext, ChatMessage, AiRoleType } from '../types';
import { generateUUID } from '../utils/uuid';
import { ChatIcon, XIcon, SaveIcon, FileTextIcon, ListCheckIcon, SearchIcon, CheckIcon } from './icons';
import { DirectorContextEditor } from './director/DirectorContextEditor';
import { DirectorChatInterface } from './director/DirectorChatInterface';
import { CharacterStateModal } from './CharacterStateModal';

interface DirectorModeModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetNode: HierarchyPointNode<StoryNodeData> | null;
    
    onChat: (
        node: HierarchyPointNode<StoryNodeData>, 
        chatHistory: ChatMessage[], 
        userMessageText: string, 
        context: DirectorContext,
        isRegeneration?: boolean,
        isSystemMode?: boolean,
        requestMultipleDrafts?: boolean,
        onChunk?: (text: string) => void
    ) => Promise<string>;

    onManualMessageAdd?: (nodeId: string, message: ChatMessage) => void;
    
    onCreateChild: (nodeId: string, initialData?: Partial<StoryNodeData>) => void; 
    onUpdateNodeData: (nodeId: string, data: Partial<StoryNodeData>, actionName?: string) => void;

    allCharacters: Character[];
    allScenarios: Scenario[];
    allTagGroups: TagGroup[];
    isGenerating: boolean;
    onUpdateMessage?: (nodeId: string, msgId: string, text: string, bookmarkedParagraphs?: number[], variants?: string[], selectedVariantIndex?: number) => void;
    onApproveVariants?: (nodeId: string, msgId: string, action: 'current' | 'all') => void;
    onToggleBookmark?: (nodeId: string, msgId: string) => void;
    onDeleteMessage?: (nodeId: string, msgId: string | string[]) => void;
    onRegenerateResponse?: () => void;
    onUpdateCharacter: (id: string, u: Partial<Character>) => void;
    onStop?: () => void; 
    onLocateNode?: (node: HierarchyPointNode<StoryNodeData>) => void;
    onSaveProject?: () => void;
    allDocuments?: any[];
}

export const DirectorModeModal: React.FC<DirectorModeModalProps> = ({
    isOpen, onClose, targetNode, onChat, onManualMessageAdd, onCreateChild, onUpdateNodeData, allCharacters, allScenarios, allTagGroups, allDocuments = [], isGenerating,
    onUpdateMessage, onApproveVariants, onToggleBookmark, onDeleteMessage: coreDeleteMessage, onRegenerateResponse, onUpdateCharacter, onStop, onLocateNode, onSaveProject
}) => {
    const messages = targetNode?.data.directorChatHistory || [];
    const chatDraft = targetNode?.data.chatDraft || '';
    
    const [isChatting, setIsChatting] = useState(false);
    const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
    
    // Local State
    const [fantasyDate, setFantasyDate] = useState('');
    const [characterIds, setCharacterIds] = useState<string[]>([]);
    const [focalCharacterIds, setFocalCharacterIds] = useState<string[]>([]); 
    const [strictFocus, setStrictFocus] = useState(false); 
    const [scenarioIds, setScenarioIds] = useState<string[]>([]);
    const [tagIds, setTagIds] = useState<string[]>([]);
    const [povCharId, setPovCharId] = useState<string | undefined>(undefined);
    const [initialInput, setInitialInput] = useState('');

    const [aiRole, setAiRole] = useState<AiRoleType>(targetNode?.data.customAiRole || 'co-writer');
    const [customInstr, setCustomInstr] = useState(targetNode?.data.customAiInstruction || '');
    const [isSystemMode, setIsSystemMode] = useState(false);
    const [streamingText, setStreamingText] = useState("");

    const [isReplaceMode, setIsReplaceMode] = useState(false);
    const [replaceSearchStr, setReplaceSearchStr] = useState('');
    const [replaceWithStr, setReplaceWithStr] = useState('');
    const [replaceMatchCase, setReplaceMatchCase] = useState(false);
    const [replaceWholeWord, setReplaceWholeWord] = useState(false);
    const [replaceSuccess, setReplaceSuccess] = useState(false);

    const handleLocalReplace = () => {
        if (!targetNode || !replaceSearchStr) return;
        
        const textualKeys = new Set([
            'text', 'name', 'description', 'content', 'note', 'summary', 
            'chatDraft', 'lastPlotGuidance'
        ]);

        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = replaceMatchCase ? 'g' : 'gi';
        const pattern = replaceWholeWord ? `\\b${escapeRegExp(replaceSearchStr)}\\b` : escapeRegExp(replaceSearchStr);
        const regex = new RegExp(pattern, flags);

        const recursiveReplace = (obj: any): any => {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj === 'string') return obj;
            if (Array.isArray(obj)) return obj.map(item => recursiveReplace(item));
            if (typeof obj === 'object') {
                const newObj: any = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (textualKeys.has(key)) {
                        if (typeof value === 'string') {
                            newObj[key] = value.replace(regex, replaceWithStr);
                        } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                            newObj[key] = value.map(v => typeof v === 'string' ? v.replace(regex, replaceWithStr) : v);
                        } else if (typeof value === 'object') {
                            newObj[key] = recursiveReplace(value);
                        } else {
                            newObj[key] = value;
                        }
                    } else if (typeof value === 'object') {
                        newObj[key] = recursiveReplace(value);
                    } else {
                        newObj[key] = value;
                    }
                }
                return newObj;
            }
            return obj;
        };

        const replacedData = recursiveReplace(targetNode.data);
        onUpdateNodeData(targetNode.data.id, replacedData, "Reemplazo Local");

        setReplaceSuccess(true);
        setTimeout(() => setReplaceSuccess(false), 2000);
    };

    useEffect(() => {
        if (isOpen && targetNode) {
            setAiRole(targetNode.data.customAiRole || 'co-writer');
            setCustomInstr(targetNode.data.customAiInstruction || '');
            
            if (!chatDraft && messages.length === 0 && targetNode.data.lastPlotGuidance) {
                setInitialInput(targetNode.data.lastPlotGuidance);
            } else {
                setInitialInput('');
            }

            let effectiveDate = '';
            let effectiveCharIds: string[] | undefined = undefined;
            let effectiveScenIds: string[] | undefined = undefined;
            let effectiveTagIds: string[] | undefined = undefined;
            let effectivePov: string | undefined = undefined;
            let effectiveStrictFocus: boolean | undefined = undefined;

            let current = targetNode;
            while (current) {
                if (!effectiveDate && current.data.fantasyDate) effectiveDate = current.data.fantasyDate;
                if (effectiveCharIds === undefined && current.data.charactersInScene !== undefined) effectiveCharIds = current.data.charactersInScene;
                if (effectiveScenIds === undefined && current.data.scenariosInScene !== undefined) effectiveScenIds = current.data.scenariosInScene;
                if (effectiveTagIds === undefined && current.data.statusTagIds !== undefined) effectiveTagIds = current.data.statusTagIds;
                if (effectivePov === undefined && current.data.pointOfViewCharacterId !== undefined) effectivePov = current.data.pointOfViewCharacterId;
                if (effectiveStrictFocus === undefined && current.data.strictFocus !== undefined) effectiveStrictFocus = current.data.strictFocus;
                
                if (!current.parent) break;
                current = current.parent;
            }

            setFantasyDate(effectiveDate || '');
            setCharacterIds(effectiveCharIds || []);
            setScenarioIds(effectiveScenIds || []);
            setTagIds(effectiveTagIds || []);
            setPovCharId(effectivePov);
            setStrictFocus(effectiveStrictFocus ?? false);
            setFocalCharacterIds([]); 
        }
    }, [isOpen, targetNode?.data.id]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isOpen && (e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                e.stopPropagation();
                if (onSaveProject) onSaveProject();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onSaveProject]);

    const persistDate = (val: string) => {
        setFantasyDate(val);
        if (targetNode) onUpdateNodeData(targetNode.data.id, { fantasyDate: val });
    };

    const persistCharacters = (newList: string[]) => {
        setCharacterIds(newList);
        if (targetNode) onUpdateNodeData(targetNode.data.id, { charactersInScene: newList });
    };

    const persistScenarios = (newList: string[]) => {
        setScenarioIds(newList);
        if (targetNode) onUpdateNodeData(targetNode.data.id, { scenariosInScene: newList });
    };

    const persistTags = (newList: string[]) => {
        setTagIds(newList);
        if (targetNode) onUpdateNodeData(targetNode.data.id, { statusTagIds: newList });
    };

    const persistPov = (id: string | undefined) => {
        setPovCharId(id);
        if (targetNode) onUpdateNodeData(targetNode.data.id, { pointOfViewCharacterId: id });
    };

    const handleUpdateStrictFocus = (val: boolean) => {
        setStrictFocus(val);
        if (targetNode) {
            onUpdateNodeData(targetNode.data.id, { strictFocus: val });
        }
    };

    const handleUpdateRoleSettings = (newRole: AiRoleType, newInstr: string) => {
        setAiRole(newRole);
        setCustomInstr(newInstr);
        if (targetNode) {
            onUpdateNodeData(targetNode.data.id, { customAiRole: newRole, customAiInstruction: newInstr });
        }
    };

    const handleAddToEvolution = useCallback((charId: string, category: string, text: string) => {
        const character = allCharacters.find(c => c.id === charId);
        if (!character) return;
        const newMilestone = {
            id: generateUUID(),
            name: "Nota de Director",
            category: category as any,
            description: text,
            achieved: true,
            priority: 'Medium' as any,
            privateThoughts: category === 'Psychological' ? text : undefined,
            diaryFragment: category === 'Psychological' ? text : undefined
        };
        const newEvolutions = [...(character.evolution || []), newMilestone];
        onUpdateCharacter(charId, { evolution: newEvolutions });
    }, [allCharacters, onUpdateCharacter]);

    const handleUpdateDraft = useCallback((text: string) => {
        if (targetNode) {
            onUpdateNodeData(targetNode.data.id, { chatDraft: text });
        }
    }, [targetNode, onUpdateNodeData]);

    const handleManualAdd = (role: 'user' | 'model' | 'system', text: string) => {
        if (targetNode && onManualMessageAdd) {
            onManualMessageAdd(targetNode.data.id, { id: generateUUID(), role, text });
        }
    };

    const handleChatSubmit = async (messageText: string, sysMode: boolean = false, requestMultipleDrafts: boolean = false) => {
        if (!targetNode) return;
        setIsChatting(true);
        setIsSystemMode(sysMode);
        setStreamingText("");
        try {
            await onChat(targetNode, messages, messageText, { 
                fantasyDate, 
                characterIds, 
                focalCharacterIds, 
                strictFocus, 
                scenarioIds, 
                tagIds, 
                povCharacterId: povCharId, 
                aiRole: aiRole, 
                aiCustomInstruction: customInstr 
            }, false, sysMode, requestMultipleDrafts, (chunkText: string) => setStreamingText(chunkText));
        } catch (error) { 
            console.error("Director Chat Error", error); 
        } finally { 
            setStreamingText("");
            setIsChatting(false); 
        }
    };

    const handleReorderMessagesLocal = useCallback((newMessages: ChatMessage[]) => {
        if (targetNode) {
            onUpdateNodeData(targetNode.data.id, { directorChatHistory: newMessages });
        }
    }, [targetNode?.data.id, onUpdateNodeData]);

    const handleDeleteMessageLocal = useCallback((msgIdOrIds: string | string[]) => {
        if (targetNode && coreDeleteMessage) {
            coreDeleteMessage(targetNode.data.id, msgIdOrIds);
        }
    }, [targetNode?.data.id, coreDeleteMessage]);

    const handleUpdateMessageLocal = useCallback((id: string, text: string, bp?: number[], variants?: string[], selectedVariantIndex?: number) => {
        if (targetNode && onUpdateMessage) {
            onUpdateMessage(targetNode.data.id, id, text, bp, variants, selectedVariantIndex);
        }
    }, [targetNode?.data.id, onUpdateMessage]);

    const handleToggleBookmarkLocal = useCallback((id: string, pIndex?: number) => {
        if (targetNode && onToggleBookmark) {
            onToggleBookmark(targetNode.data.id, id, pIndex);
        }
    }, [targetNode?.data.id, onToggleBookmark]);

    const handleApproveVariantsLocal = useCallback((msgId: string, action: 'current' | 'all') => {
        if (targetNode && onApproveVariants) {
            onApproveVariants(targetNode.data.id, msgId, action);
        }
    }, [targetNode?.data.id, onApproveVariants]);

    const handleStopLocal = useCallback(() => {
        if (onStop) onStop();
        setIsChatting(false);
    }, [onStop]);

    const handleSplitChat = (msgId: string) => {
        if (!targetNode || messages.length === 0) return;
        const msgIndex = messages.findIndex(m => m.id === msgId);
        if (msgIndex === -1) return;

        const messagesBefore = messages.slice(0, msgIndex);
        const messagesAfter = messages.slice(msgIndex);

        if (messagesAfter.length === 0) return;

        onUpdateNodeData(targetNode.data.id, { directorChatHistory: messagesBefore });

        const combinedText = messagesAfter.map(m => {
            if (m.role === 'user') return `[AUTOR]:\n${m.text}`;
            if (m.role === 'system') return `[SISTEMA]:\n${m.text}`;
            return `[IA]:\n${m.text}`;
        }).join('\n\n');

        onCreateChild(targetNode.data.id, { 
            name: combinedText, 
            directorChatHistory: [],
            fantasyDate, 
            charactersInScene: characterIds, 
            scenariosInScene: scenarioIds, 
            statusTagIds: tagIds, 
            pointOfViewCharacterId: povCharId, 
            strictFocus 
        });

        onClose();
    };

    const handleTransferChatToNode = () => {
        if (!targetNode || messages.length === 0) return;
        const combinedText = messages.map(m => {
            if (m.role === 'user') return `[AUTOR]:\n${m.text}`;
            if (m.role === 'system') return `[SISTEMA]:\n${m.text}`;
            return `[IA]:\n${m.text}`;
        }).join('\n\n');
        
        onCreateChild(targetNode.data.id, { name: combinedText, fantasyDate, charactersInScene: characterIds, scenariosInScene: scenarioIds, statusTagIds: tagIds, pointOfViewCharacterId: povCharId, strictFocus });
        
        // Borra la interfaz (Limpiar historial y borrador tras eyectar)
        onUpdateNodeData(targetNode.data.id, { directorChatHistory: [], chatDraft: '' });
        
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[60] animate-fade-in-fast p-0 md:p-4 lg:p-6">
            {editingCharacterId && (
                <div className="absolute inset-0 z-[70] flex items-center justify-center">
                    <CharacterStateModal isOpen={true} onClose={() => setEditingCharacterId(null)} targetNode={targetNode} allCharacters={allCharacters} onUpdateCharacter={onUpdateCharacter} />
                </div>
            )}

            <div className="bg-gray-900 border-none md:border md:border-cyan-500/20 w-full h-full md:max-w-[98vw] md:h-[95vh] md:rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden relative ring-0 md:ring-1 md:ring-white/10">
                
                {/* Header Responsivo */}
                <div className="flex justify-between items-center p-3 md:px-8 md:py-5 border-b border-white/5 bg-gray-950/40 backdrop-blur-md shrink-0">
                    <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
                        <div className="p-2 bg-gradient-to-br from-cyan-600/20 to-indigo-600/20 rounded-xl text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(34,211,238,0.15)] shrink-0 hidden sm:block">
                            <ChatIcon className="w-5 h-5 md:w-7 md:h-7"/>
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm md:text-2xl font-black text-gray-100 tracking-tight uppercase truncate">Asistente de Escena</h2>
                            <div className="flex items-center space-x-2 md:space-x-3 mt-0.5">
                                <span className="flex items-center text-[8px] md:text-[10px] text-gray-400 font-bold tracking-widest uppercase shrink-0">
                                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full mr-1 md:mr-1.5 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                                    Enlace Activo
                                </span>
                                <span className="h-2 w-px bg-white/10 hidden sm:block"></span>
                                <p className="text-[8px] md:text-[10px] text-cyan-500/70 font-mono truncate hidden sm:block">NODE_{targetNode?.data.id.substring(0, 8)}</p>
                                {allDocuments.length > 0 && (
                                    <>
                                        <span className="h-2 w-px bg-white/10 hidden sm:block"></span>
                                        <p className="text-[8px] md:text-[10px] text-yellow-500/70 font-mono truncate hidden sm:block flex items-center" title="Documentos conectados">
                                            <FileTextIcon className="w-2.5 h-2.5 mr-1" />
                                            {allDocuments.length} DOCS
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="ml-4 shrink-0 hidden sm:block">
                        <button
                            onClick={() => setIsReplaceMode(!isReplaceMode)}
                            className={`p-2 rounded-lg transition-all ${
                                isReplaceMode 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-green-400 hover:border-green-500/30'
                            }`}
                            title="Reemplazar en este Nodo"
                        >
                            <ListCheckIcon className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                    </div>

                    {/* PORTAL TARGET PARA CONTROLES DEL DIRECTOR CHAT */}
                    <div id="director-header-portal-target" className="flex-grow flex justify-end px-2 md:px-4 overflow-hidden"></div>

                    <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
                        {onSaveProject && (
                            <button 
                                onClick={onSaveProject} 
                                className="flex items-center space-x-2 px-3 py-1.5 md:px-4 md:py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg md:rounded-xl transition-all border border-white/5 shadow-lg active:scale-95"
                                title="Guardar Proyecto (Ctrl+S)"
                            >
                                <SaveIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider hidden xs:inline">Guardar</span>
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 md:p-3 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl md:rounded-2xl transition-all">
                            <XIcon className="w-6 h-6 md:w-8 md:h-8"/>
                        </button>
                    </div>
                </div>

                <div className="flex-grow flex flex-col lg:flex-row overflow-hidden bg-gray-900/20 relative">
                    {/* Local Replace Panel */}
                    {isReplaceMode && (
                        <div className="absolute top-0 left-0 right-0 z-[50] bg-gray-800/95 backdrop-blur-md border-b border-gray-700 p-4 shadow-2xl flex flex-wrap gap-4 items-end animate-fade-in-fast">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar (en Modo Director)</label>
                                <div className="relative">
                                    <input type="text" value={replaceSearchStr} onChange={e => setReplaceSearchStr(e.target.value)} placeholder="Texto original..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-1.5 pl-3 pr-8 text-sm focus:border-green-500 outline-none text-white" />
                                    <SearchIcon className="w-4 h-4 text-gray-500 absolute right-2.5 top-2" />
                                </div>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Reemplazar con</label>
                                <input type="text" value={replaceWithStr} onChange={e => setReplaceWithStr(e.target.value)} placeholder="Nuevo texto..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-1.5 px-3 text-sm focus:border-green-500 outline-none text-white" />
                            </div>
                            <div className="flex items-center space-x-4 mb-2">
                                <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                                    <input type="checkbox" checked={replaceMatchCase} onChange={e => setReplaceMatchCase(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-green-500 focus:ring-green-500" />
                                    <span>Mayús/Minús</span>
                                </label>
                                <label className="flex items-center space-x-2 text-xs text-gray-300 cursor-pointer">
                                    <input type="checkbox" checked={replaceWholeWord} onChange={e => setReplaceWholeWord(e.target.checked)} className="rounded border-gray-700 bg-gray-900 text-green-500 focus:ring-green-500" />
                                    <span>Palabra Completa</span>
                                </label>
                            </div>
                            <div className="flex space-x-2">
                                <button 
                                    onClick={handleLocalReplace}
                                    disabled={!replaceSearchStr}
                                    className={`px-4 py-1.5 rounded-md font-bold text-sm transition-colors flex items-center space-x-1 ${!replaceSearchStr ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'}`}
                                >
                                    {replaceSuccess ? <CheckIcon className="w-4 h-4" /> : <ListCheckIcon className="w-4 h-4" />}
                                    <span>{replaceSuccess ? '¡Listo!' : 'Reemplazar'}</span>
                                </button>
                                <button onClick={() => setIsReplaceMode(false)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    <DirectorContextEditor 
                        fantasyDate={fantasyDate} setFantasyDate={persistDate} 
                        characterIds={characterIds} setCharacterIds={persistCharacters} 
                        focalCharacterIds={focalCharacterIds} setFocalCharacterIds={setFocalCharacterIds}
                        strictFocus={strictFocus} setStrictFocus={handleUpdateStrictFocus}
                        scenarioIds={scenarioIds} setScenarioIds={persistScenarios} 
                        tagIds={tagIds} setTagIds={persistTags} 
                        povCharId={povCharId} setPovCharId={persistPov} 
                        allCharacters={allCharacters} allScenarios={allScenarios} allTagGroups={allTagGroups} 
                        onEditCharacter={setEditingCharacterId} 
                    />
                    <DirectorChatInterface 
                        messages={messages} 
                        chatDraft={chatDraft}
                        onUpdateDraft={handleUpdateDraft}
                        onChatSubmit={handleChatSubmit} 
                        onManualMessageAdd={handleManualAdd} 
                        onTransferChat={handleTransferChatToNode} 
                        isChatting={isChatting} 
                        isGenerating={isGenerating} 
                        onUpdateMessage={onUpdateMessage ? handleUpdateMessageLocal : undefined} 
                        onApproveVariants={onApproveVariants ? handleApproveVariantsLocal : undefined}
                        onToggleBookmark={onToggleBookmark ? handleToggleBookmarkLocal : undefined}
                        onReorderMessages={handleReorderMessagesLocal}
                        onDeleteMessage={handleDeleteMessageLocal} 
                        onRegenerateResponse={onRegenerateResponse} 
                        initialInput={initialInput} 
                        onStop={handleStopLocal} 
                        onSplitChat={handleSplitChat}
                        currentRole={aiRole} 
                        currentCustomInstr={customInstr} 
                        onUpdateRoleSettings={handleUpdateRoleSettings} 
                        isSystemModeExternal={isSystemMode} 
                        allCharacters={allCharacters}
                        focalCharacterIds={focalCharacterIds}
                        streamingText={streamingText}
                        onAddToEvolution={handleAddToEvolution}
                    />
                </div>
            </div>
        </div>
    );
};
