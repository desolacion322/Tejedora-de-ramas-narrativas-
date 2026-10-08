
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { StoryNodeData, StoryBlock, BlockType, Character } from '../types';
import { EditIcon, SaveIcon, XIcon, FileTextIcon, EyeIcon, EyeOffIcon, SparkleIcon, LayersIcon, StarIcon, TrashIcon, UndoIcon, RedoIcon, SearchIcon, ListCheckIcon, CheckIcon } from './icons';
import { RichTextRenderer } from './ui/RichTextRenderer';
import { NodeTextRenderer } from './story/NodeTextRenderer';
import { parseTextToStructuredBlocks } from '../utils/ai/textParser';
import { useHistory } from '../hooks/useHistory';

interface EditModalProps {
  nodeData: StoryNodeData;
  allCharacters: Character[];
  onSave: (nodeId: string, newName: string, bookmarkedParagraphs?: number[], blocks?: StoryBlock[]) => void;
  onClose: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);


const initializeBlocks = (text: string): StoryBlock[] => {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    return paragraphs.map(p => {
        let type: BlockType = 'action';
        if (p.startsWith('—') || p.startsWith('-')) type = 'dialogue';
        else if (p.startsWith('(') && p.endsWith(')')) type = 'thought';
        else if (p.startsWith('**') && p.endsWith('**')) type = 'system';
        
        return {
            id: generateId(),
            type,
            text: p.trim()
        };
    });
};

const syncTextToBlocks = (newText: string, currentBlocks: StoryBlock[]): StoryBlock[] => {
    const paragraphs = newText.split(/\n\n+/).filter(p => p.trim());
    const usedBlockIds = new Set<string>();
    
    return paragraphs.map(p => {
        const trimmed = p.trim();
        const existingBlock = currentBlocks.find(b => b.text === trimmed && !usedBlockIds.has(b.id));
        
        if (existingBlock) {
            usedBlockIds.add(existingBlock.id);
            return existingBlock;
        }
        
        let type: BlockType = 'action';
        if (trimmed.startsWith('—') || trimmed.startsWith('-')) type = 'dialogue';
        else if (trimmed.startsWith('(') && trimmed.endsWith(')')) type = 'thought';
        else if (trimmed.startsWith('**') && trimmed.endsWith('**')) type = 'system';
        
        return {
            id: generateId(),
            type,
            text: trimmed
        };
    });
};

export const EditModal: React.FC<EditModalProps> = ({ nodeData, allCharacters, onSave, onClose }) => {
  const getInitialBlocks = useCallback((data: StoryNodeData) => {
      let initialBlocks = data.blocks;
      const nameText = (data.name || '').trim();
      if (initialBlocks && initialBlocks.length > 0) {
          const blocksText = initialBlocks.map(b => b.text).join('\n\n').trim();
          if (blocksText !== nameText) {
              initialBlocks = undefined;
          }
      }
      return initialBlocks || initializeBlocks(data.name);
  }, []);

  const initialData = useMemo(() => {
      const initBlocks = getInitialBlocks(nodeData);
      return {
          blocks: initBlocks,
          text: initBlocks.map(b => b.text).join('\n\n'),
          bookmarkedParagraphs: nodeData.bookmarkedParagraphs || [],
      };
  }, [nodeData, getInitialBlocks]);

  const { state: historyState, setState: setHistoryState, undo, redo, clearHistory, canUndo, canRedo } = useHistory(initialData);
  const { blocks, text, bookmarkedParagraphs } = historyState;
  
  const [editorMode, setEditorMode] = useState<'rich' | 'raw' | 'blocks' | 'preview'>('blocks');

  const [editingBlockKey, setEditingBlockKey] = useState<number | null>(null);
  const [blockEditText, setBlockEditText] = useState('');
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [replaceSearchStr, setReplaceSearchStr] = useState('');
  const [replaceWithStr, setReplaceWithStr] = useState('');
  const [replaceMatchCase, setReplaceMatchCase] = useState(false);
  const [replaceWholeWord, setReplaceWholeWord] = useState(false);
  const [replaceSuccess, setReplaceSuccess] = useState(false);

  const handleLocalReplace = () => {
        if (!replaceSearchStr) return;
        const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flags = replaceMatchCase ? 'g' : 'gi';
        const pattern = replaceWholeWord ? `\\b${escapeRegExp(replaceSearchStr)}\\b` : escapeRegExp(replaceSearchStr);
        const regex = new RegExp(pattern, flags);

        const newBlocks = blocks.map(b => ({
            ...b,
            text: b.text.replace(regex, replaceWithStr)
        }));
        const newText = text.replace(regex, replaceWithStr);
        
        if (editingBlockKey !== null && blockEditText) {
            setBlockEditText(prev => prev.replace(regex, replaceWithStr));
        }

        setHistoryState({
            ...historyState,
            blocks: newBlocks,
            text: newText
        });
        
        setReplaceSuccess(true);
        setTimeout(() => setReplaceSuccess(false), 2000);
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      const handleKeyDownConditional = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          const isInput = target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.isContentEditable);
          
          if ((e.ctrlKey || e.metaKey)) {
              const key = e.key.toLowerCase();
              if (key === 'h') {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsReplaceMode(prev => !prev);
              } else if (key === 'z' || key === 'y') {
                  if (!isInput) {
                      e.preventDefault();
                      e.stopPropagation();
                      if (key === 'z') {
                          e.shiftKey ? redo() : undo();
                      } else {
                          redo();
                      }
                  }
              }
          } else if (editorMode === 'blocks' && editingBlockKey === null && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
              const key = e.key.toLowerCase();
              if (key === 'w' || key === 's') {
                  e.preventDefault();
                  if (scrollContainerRef.current) {
                      const amount = key === 'w' ? -140 : 140;
                      if (e.repeat) {
                          scrollContainerRef.current.scrollBy({ top: key === 'w' ? -45 : 45, behavior: 'auto' });
                      } else {
                          scrollContainerRef.current.scrollBy({ top: amount, behavior: 'smooth' });
                      }
                  }
              }
          }
      };
      
      window.addEventListener('keydown', handleKeyDownConditional);
      return () => window.removeEventListener('keydown', handleKeyDownConditional);
  }, [undo, redo, editorMode, editingBlockKey]);

  const historyInitialized = useRef(false);

  useEffect(() => {
    if (!historyInitialized.current) {
        const initBlocks = getInitialBlocks(nodeData);
        clearHistory({
            blocks: initBlocks,
            text: initBlocks.map(b => b.text).join('\n\n'),
            bookmarkedParagraphs: nodeData.bookmarkedParagraphs || []
        });
        historyInitialized.current = true;
    }
  }, []); // Only initialize history once on mount

  // Auto-resize textarea to fit content so the parent container scrolls
  useEffect(() => {
    if (textareaRef.current && editorMode !== 'blocks') {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text, editorMode]);

  // Real-time structure calculation
  const stats = useMemo(() => {
      const currentBlocks = editorMode === 'blocks' ? blocks : syncTextToBlocks(text, blocks);
      const dialogueCount = currentBlocks.filter(b => b.type === 'dialogue').length;
      const thoughtCount = currentBlocks.filter(b => b.type === 'thought').length;
      const actionCount = currentBlocks.filter(b => b.type === 'action').length;
      const emphasisCount = currentBlocks.filter(b => b.type === 'system').length;
      return { dialogueCount, thoughtCount, actionCount, emphasisCount, totalBlocks: currentBlocks.length };
  }, [text, blocks, editorMode]);

  const handleModeChange = (mode: 'rich' | 'raw' | 'blocks' | 'preview') => {
      if (mode === editorMode) return;
      
      setHistoryState(prev => {
          let newText = prev.text;
          let newBlocks = prev.blocks;

          if (editorMode === 'blocks' && mode !== 'blocks') {
              newText = prev.blocks.map(b => b.text).join('\n\n');
          } else if (editorMode !== 'blocks' && mode === 'blocks') {
              newBlocks = syncTextToBlocks(prev.text, prev.blocks);
          }
          return {
              ...prev,
              text: newText,
              blocks: newBlocks
          };
      }, true); // Use overwrite to avoid history push on mode switch
      setEditorMode(mode);
  };

  const handleSave = () => {
    let finalBlocks = blocks;
    let finalText = text;
    
    if (editorMode !== 'blocks') {
        finalBlocks = syncTextToBlocks(text, blocks);
        finalText = text.trim();
    } else {
        finalText = blocks.map(b => b.text).join('\n\n');
    }

    if (finalText) {
      onSave(nodeData.id, finalText, bookmarkedParagraphs, finalBlocks);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleStartBlockEdit = (index: number, content: string) => {
      setEditingBlockKey(index);
      setBlockEditText(content);
  };

  const handleCancelBlockEdit = () => {
      setEditingBlockKey(null);
      setBlockEditText('');
  };

  const handleSaveBlockEdit = (index: number) => {
      const newText = blockEditText.trim();
      const newParagraphs = newText.split(/\n\n+/);
      const diff = newParagraphs.length - 1;
      
      const newBlocks = [...blocks];
      const replacementBlocks = newParagraphs.map(p => {
          let type: BlockType = 'action';
          if (p.startsWith('—') || p.startsWith('-')) type = 'dialogue';
          else if (p.startsWith('(') && p.endsWith(')')) type = 'thought';
          else if (p.startsWith('**') && p.endsWith('**')) type = 'system';
          
          return {
              id: generateId(),
              type,
              text: p.trim()
          };
      });
      
      if (diff === 0) {
          replacementBlocks[0].characterId = newBlocks[index].characterId;
          replacementBlocks[0].type = newBlocks[index].type;
      }
      
      newBlocks.splice(index, 1, ...replacementBlocks);
      
      let newBookmarks = [...bookmarkedParagraphs];
      if (diff !== 0) {
          newBookmarks = newBookmarks.map(i => i > index ? i + diff : i);
      }
      
      const updatedText = newBlocks.map(b => b.text).join('\n\n');
      setHistoryState(prev => ({ ...prev, text: updatedText, blocks: newBlocks, bookmarkedParagraphs: newBookmarks }));
      handleCancelBlockEdit();
  };

  const handleQuickDeleteBlock = (index: number) => {
      const newBlocks = [...blocks];
      newBlocks.splice(index, 1);
      
      let newBookmarks = [...bookmarkedParagraphs];
      newBookmarks = newBookmarks.filter(i => i !== index).map(i => i > index ? i - 1 : i);
      
      const newText = newBlocks.map(b => b.text).join('\n\n');
      setHistoryState(prev => ({ ...prev, text: newText, blocks: newBlocks, bookmarkedParagraphs: newBookmarks }));
  };

  const handleBlockTypeChange = (index: number, type: BlockType) => {
      const newBlocks = [...blocks];
      newBlocks[index] = { ...newBlocks[index], type };
      const newText = newBlocks.map(b => b.text).join('\n\n');
      setHistoryState(prev => ({ ...prev, text: newText, blocks: newBlocks }));
  };
  
  const handleBlockCharacterChange = (index: number, characterId: string | undefined) => {
      const newBlocks = [...blocks];
      newBlocks[index] = { ...newBlocks[index], characterId };
      const newText = newBlocks.map(b => b.text).join('\n\n');
      setHistoryState(prev => ({ ...prev, text: newText, blocks: newBlocks }));
  };

  const handleToggleBookmark = (index: number) => {
      let newBookmarks = [...bookmarkedParagraphs];
      const pos = newBookmarks.indexOf(index);
      if (pos > -1) {
          newBookmarks.splice(pos, 1);
      } else {
          newBookmarks.push(index);
      }
      setHistoryState(prev => ({ ...prev, bookmarkedParagraphs: newBookmarks }));
  };

  // Shared typography classes to ensure perfect alignment
  const getTypographyClasses = (mode: string) => {
      if (mode === 'raw') {
          return "font-mono text-sm leading-relaxed antialiased transition-all duration-200";
      }
      return "font-serif text-lg md:text-xl leading-loose tracking-wide antialiased transition-all duration-200";
  };
  const typographyClasses = getTypographyClasses(editorMode);
  const layoutClasses = "p-4 md:p-8 whitespace-pre-wrap break-words border-none outline-none w-full h-full";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in-fast sm:p-2 md:p-6 lg:p-8">
      <div className="bg-gray-900 sm:rounded-xl shadow-2xl w-full h-[100vh] sm:h-[96vh] max-w-[1600px] border-x-0 sm:border border-gray-700 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 bg-gray-800/80 shrink-0">
            <div className="flex items-center space-x-3">
                <div className="p-2 bg-cyan-900/30 rounded-lg text-cyan-400">
                    <EditIcon className="w-5 h-5"/>
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-100">Editor Narrativo</h2>
                    <p className="text-xs text-gray-400">Edición de contenido de la rama.</p>
                </div>
            </div>
            <div className="flex items-center space-x-4">
                {/* HISTORY CONTROLS */}
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                    <button 
                        onClick={undo}
                        disabled={!canUndo}
                        className={`p-1.5 rounded-md transition-all ${canUndo ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 cursor-not-allowed hidden md:block'}`}
                        title="Deshacer (Ctrl+Z)"
                    >
                        <UndoIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={redo}
                        disabled={!canRedo}
                        className={`p-1.5 rounded-md transition-all ${canRedo ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 cursor-not-allowed hidden md:block'}`}
                        title="Rehacer (Ctrl+Y)"
                    >
                        <RedoIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* LOCAL REPLACE TOGGLE */}
                <button
                    onClick={() => setIsReplaceMode(!isReplaceMode)}
                    className={`p-2 rounded-lg transition-all ${
                        isReplaceMode 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-green-400 hover:border-green-500/30'
                    }`}
                    title="Reemplazar en este Nodo"
                >
                    <ListCheckIcon className="w-4 h-4" />
                </button>

                {/* BOOKMARK TOGGLE */}
                <button
                    onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                    className={`p-2 rounded-lg transition-all ${
                        showBookmarksOnly 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' 
                            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:text-yellow-400 hover:border-yellow-500/30'
                    }`}
                    title={showBookmarksOnly ? "Mostrar todo el contenido" : "Mostrar solo párrafos marcados"}
                >
                    <StarIcon className={`w-4 h-4 ${showBookmarksOnly ? 'fill-yellow-400' : ''}`} />
                </button>

                {/* MODO TOGGLE */}
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                    <button 
                      onClick={() => handleModeChange('blocks')}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-all ${
                        editorMode === 'blocks'
                          ? 'bg-cyan-900/40 text-cyan-300 shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title="Modo Bloques (Edición por párrafos)"
                    >
                      <LayersIcon className="w-3.5 h-3.5"/>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Bloques</span>
                    </button>
                    <button 
                      onClick={() => handleModeChange('rich')}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-all ${
                        editorMode === 'rich'
                          ? 'bg-indigo-900/40 text-indigo-300 shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title="Modo Visual (Resaltado de sintaxis)"
                    >
                      <SparkleIcon className="w-3.5 h-3.5"/>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Visual</span>
                    </button>
                    <button 
                      onClick={() => handleModeChange('preview')}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-all ${
                        editorMode === 'preview'
                          ? 'bg-purple-900/40 text-purple-300 shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title="Modo Lectura (Vista final con chat y personajes)"
                    >
                      <EyeIcon className="w-3.5 h-3.5"/>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Lectura</span>
                    </button>
                    <button 
                      onClick={() => handleModeChange('raw')}
                      className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-all ${
                        editorMode === 'raw'
                          ? 'bg-gray-700 text-gray-200 shadow-sm' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                      title="Modo Preciso (Texto plano)"
                    >
                      <FileTextIcon className="w-3.5 h-3.5"/>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Preciso</span>
                    </button>
                </div>

                <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
                    <XIcon className="w-6 h-6"/>
                </button>
            </div>
        </div>

        {/* Toolbar Info */}
        <div className="h-8 bg-gray-800/30 border-b border-gray-700/50 flex items-center px-6 space-x-4 text-xs text-gray-500 select-none shrink-0 overflow-x-auto scrollbar-hide">
            <span className="font-bold text-gray-400 whitespace-nowrap">Sintaxis:</span>
            <span className="whitespace-nowrap"><span className="text-yellow-500 font-bold">**Negrita**</span></span>
            <span className="whitespace-nowrap"><span className="text-cyan-400 italic">(Pensamiento)</span></span>
            <span className="whitespace-nowrap"><span className="text-rose-400">— Diálogo —</span></span>
            <span className="whitespace-nowrap"><span className="text-indigo-400 font-medium">¿Pregunta?</span></span>
            {editorMode === 'raw' && <span className="text-orange-500 font-bold ml-auto animate-pulse">● MODO EDICIÓN PRECISA ACTIVO</span>}
            {editorMode === 'blocks' && <span className="text-cyan-500 font-bold ml-auto animate-pulse">● MODO BLOQUES ACTIVO (W/S DESPLAZAR)</span>}
        </div>

        {/* Local Replace Panel */}
        {isReplaceMode && (
            <div className="bg-gray-800/90 border-b border-gray-700 p-4 shrink-0 shadow-inner flex flex-wrap gap-4 items-end animate-fade-in-fast z-10">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar</label>
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
                        <span>{replaceSuccess ? '¡Listo!' : 'Reemplazar en Nodo'}</span>
                    </button>
                    <button onClick={() => setIsReplaceMode(false)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}

        {/* Editor Area (Scrolling Container) */}
        <div className="flex-grow relative bg-gray-900 overflow-hidden flex flex-col">
            <div 
                ref={scrollContainerRef}
                className="flex-grow overflow-y-auto w-full relative scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                onClick={() => { if (editorMode !== 'blocks') textareaRef.current?.focus(); }}
            >
                {/* Content Wrapper */}
                <div className="relative min-h-full w-full">
                    
                    {editorMode === 'blocks' ? (
                        <div className={`w-full max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-4 md:space-y-8 ${showBookmarksOnly ? 'min-h-full' : ''}`}>
                            {showBookmarksOnly && bookmarkedParagraphs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-yellow-500 opacity-20 py-20">
                                    <StarIcon className="w-12 h-12 md:w-16 md:h-16 mb-4 text-yellow-700"/>
                                    <p className="text-xs font-black uppercase tracking-[0.4em]">Sin Marcadores</p>
                                </div>
                            )}
                            {blocks.map((block, pIndex) => {
                                const isEditingThisBlock = editingBlockKey === pIndex;
                                const isBookmarked = bookmarkedParagraphs.includes(pIndex);
                                
                                if (showBookmarksOnly && !isBookmarked) return null;

                                return (
                                    <div key={`${block.id}-${pIndex}`} className={`relative group/block min-h-[1em] ${isBookmarked ? 'border-l-2 border-yellow-500 pl-3 md:pl-4' : ''}`}>
                                        {isEditingThisBlock ? (
                                            <div className="bg-black/95 rounded-xl p-3 md:p-6 border-2 border-cyan-500 shadow-2xl animate-fade-in-fast relative z-50">
                                                <textarea id="field-5f8be4" name="field-5f8be4" 
                                                    className="w-full bg-transparent text-gray-100 outline-none resize-y font-sans p-1 min-h-[150px] md:min-h-[200px] text-base md:text-xl leading-relaxed" 
                                                    value={blockEditText} 
                                                    onChange={(e) => setBlockEditText(e.target.value)} 
                                                    autoFocus 
                                                />
                                                <div className="flex justify-end space-x-2 mt-4 md:mt-6">
                                                    <button onClick={handleCancelBlockEdit} className="px-3 py-1.5 bg-gray-800 text-[8px] md:text-[10px] font-black uppercase rounded-lg">Cancelar</button>
                                                    <button onClick={() => handleSaveBlockEdit(pIndex)} className="px-4 py-1.5 bg-cyan-600 text-[8px] md:text-[10px] font-black text-white uppercase rounded-lg">Confirmar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center space-x-2 mb-2 opacity-50 group-hover/block:opacity-100 transition-opacity">
                                                    <select id="field-6f9450" name="field-6f9450" 
                                                        value={block.type} 
                                                        onChange={(e) => handleBlockTypeChange(pIndex, e.target.value as BlockType)}
                                                        className="bg-gray-800 text-xs text-gray-300 border border-gray-700 rounded px-2 py-1 outline-none focus:border-cyan-500"
                                                    >
                                                        <option value="action">Acción</option>
                                                        <option value="dialogue">Diálogo</option>
                                                        <option value="thought">Pensamiento</option>
                                                        <option value="description">Descripción</option>
                                                        <option value="system">Sistema</option>
                                                    </select>
                                                    
                                                    <div className="relative flex items-center">
                                                        {block.characterId && (
                                                            <div 
                                                                className="absolute left-2 w-2 h-2 rounded-full pointer-events-none" 
                                                                style={{ backgroundColor: allCharacters.find(c => c.id === block.characterId)?.color || '#6b7280' }}
                                                            />
                                                        )}
                                                        <select id="field-6a9537" name="field-6a9537" 
                                                            value={block.characterId || ''} 
                                                            onChange={(e) => handleBlockCharacterChange(pIndex, e.target.value || undefined)}
                                                            className={`bg-gray-800 text-xs text-gray-300 border border-gray-700 rounded py-1 pr-2 outline-none focus:border-cyan-500 max-w-[150px] truncate ${block.characterId ? 'pl-6' : 'pl-2'}`}
                                                        >
                                                            <option value="">(Sin Personaje)</option>
                                                            {allCharacters.map(char => (
                                                                <option key={char.id} value={char.id}>{char.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="w-full">
                                                    <NodeTextRenderer text={block.text} allCharacters={allCharacters} />
                                                </div>
                                                {!editingBlockKey && (
                                                    <div className="absolute -left-1 md:-left-12 top-0 flex flex-col space-y-1.5 opacity-0 group-hover/block:opacity-100 transition-all pointer-events-auto bg-gray-900/60 p-1 rounded-lg backdrop-blur-sm md:bg-transparent md:p-0 md:backdrop-blur-none">
                                                        <button onClick={() => handleToggleBookmark(pIndex)} className={`p-2 md:p-2 bg-gray-800 rounded-lg shadow-lg ${isBookmarked ? 'text-yellow-400 hover:text-yellow-300 hover:bg-gray-700' : 'text-gray-400 hover:text-yellow-400 hover:bg-gray-700'}`}>
                                                            <StarIcon className={`w-3 h-3 md:w-3.5 md:h-3.5 ${isBookmarked ? 'fill-yellow-400' : ''}`}/>
                                                        </button>
                                                        <button onClick={() => handleStartBlockEdit(pIndex, block.text)} className="p-2 md:p-2 bg-gray-800 hover:bg-cyan-600 text-gray-400 hover:text-white rounded-lg shadow-lg">
                                                            <EditIcon className="w-3 h-3 md:w-3.5 md:h-3.5"/>
                                                        </button>
                                                        <button onClick={() => handleQuickDeleteBlock(pIndex)} className="p-2 md:p-2 bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white rounded-lg shadow-lg">
                                                            <TrashIcon className="w-3 h-3 md:w-3.5 md:h-3.5"/>
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : editorMode === 'preview' ? (
                        <div className="w-full max-w-[1400px] mx-auto py-8 px-4 md:px-8">
                            <NodeTextRenderer 
                                text={text} 
                                allCharacters={allCharacters} 
                                onChange={(newText) => setHistoryState(prev => ({ ...prev, text: newText }), true)}
                            />
                        </div>
                    ) : (
                        <div className="relative w-full max-w-[1400px] mx-auto min-h-full">
                            {/* BACKDROP: Syntax Highlighter Layer */}
                            {(editorMode === 'rich' || editorMode === 'raw') && (
                              <div 
                                  className={`absolute top-0 left-0 pointer-events-none z-0 ${typographyClasses} ${layoutClasses} text-gray-200`}
                                  aria-hidden="true"
                              >
                                  <RichTextRenderer text={text + '\n'} preserveSyntax={true} />
                              </div>
                            )}

                            {/* FOREGROUND: Input Layer */}
                            <textarea id="field-cf1518" name="field-cf1518"
                                ref={textareaRef}
                                value={text}
                                onChange={(e) => setHistoryState(prev => ({ ...prev, text: e.target.value }), true)}
                                onKeyDown={handleKeyDown}
                                className={`relative z-10 block min-h-full bg-transparent resize-none overflow-hidden ${typographyClasses} ${layoutClasses} ${
                                  (editorMode === 'rich' || editorMode === 'raw') ? 'text-transparent caret-cyan-400' : 'text-gray-100 caret-white'
                                }`}
                                placeholder="Escribe el siguiente capítulo de tu historia aquí..."
                                autoFocus
                                spellCheck={false}
                                style={{
                                    caretColor: (editorMode === 'rich' || editorMode === 'raw') ? '#22d3ee' : 'white',
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-800/80 flex justify-between items-center shrink-0">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-6 text-xs text-gray-500 font-mono">
                <div className="flex items-center space-x-2 mb-1 md:mb-0">
                    <span className="flex items-center"><FileTextIcon className="w-3 h-3 mr-1"/> {text.length} chars</span>
                    <span className="text-gray-600">|</span>
                    <span>{text.split(/\s+/).filter(w => w.length > 0).length} palabras</span>
                </div>
                
                {/* Estructura Detectada */}
                <div className="flex items-center space-x-3 text-[10px] uppercase font-bold tracking-wider">
                    <div className="flex items-center text-cyan-500" title="Pensamientos Internos detectados">
                        <span className="mr-1">🧠</span> {stats.thoughtCount}
                    </div>
                    <div className="flex items-center text-rose-400" title="Líneas de Diálogo detectadas">
                        <span className="mr-1">💬</span> {stats.dialogueCount}
                    </div>
                    <div className="flex items-center text-gray-400" title="Bloques de Narración detectados">
                        <span className="mr-1">📝</span> {stats.actionCount}
                    </div>
                    {stats.emphasisCount > 0 && (
                        <div className="flex items-center text-yellow-500" title="Énfasis detectados">
                            <span className="mr-1">⚡</span> {stats.emphasisCount}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex space-x-3">
                <button
                    onClick={onClose}
                    className="px-5 py-2 bg-transparent hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors text-sm"
                >
                    Cancelar
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition-colors shadow-lg flex items-center space-x-2 text-sm hover:shadow-cyan-500/20"
                >
                    <SaveIcon className="w-4 h-4" />
                    <span>Guardar (Ctrl+Enter)</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
