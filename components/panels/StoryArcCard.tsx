import React, { useState } from 'react';
import { StoryArc } from '../../types';
import { 
    ChevronDownIcon, SaveIcon, TrashIcon, CheckIcon, 
    CopyIcon, EditIcon, BookOpenIcon, ArrowUpIcon, FolderIcon, XIcon
} from '../icons';
import { RichTextRenderer } from '../ui/RichTextRenderer';

interface StoryArcCardProps {
    arc: StoryArc;
    index: number;
    totalArcs: number;
    activeArcId: string;
    existingGroups: string[];
    editingArcId: string | null;
    editingName: string;
    viewMode?: 'grid' | 'row';
    onEditStart: (arc: StoryArc) => void;
    onEditCancel: () => void;
    onEditSave: () => void;
    onEditingNameChange: (name: string) => void;
    onDuplicateArc: (arcId: string) => void;
    onDeleteArc: (arc: StoryArc) => void;
    onSetActiveArc: (arcId: string) => void;
    onMoveArc: (index: number, direction: 'up' | 'down') => void;
    onUpdateArcSignificance: (arcId: string, score: number) => void;
    onUpdateArcSummary: (arcId: string, newSummary: string) => void;
    onUpdateArcGroup?: (arcId: string, group: string) => void;
}

export const StoryArcCard: React.FC<StoryArcCardProps> = ({
    arc,
    index,
    totalArcs,
    activeArcId,
    existingGroups,
    editingArcId,
    editingName,
    viewMode = 'grid',
    onEditStart,
    onEditCancel,
    onEditSave,
    onEditingNameChange,
    onDuplicateArc,
    onDeleteArc,
    onSetActiveArc,
    onMoveArc,
    onUpdateArcSignificance,
    onUpdateArcSummary,
    onUpdateArcGroup
}) => {
    const score = arc.significance ?? 0;
    const isIgnored = score === 0;
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [groupInput, setGroupInput] = useState(arc.group || '');

    const handleSaveGroup = () => {
        if (onUpdateArcGroup) {
            onUpdateArcGroup(arc.id, groupInput.trim());
        }
        setIsEditingGroup(false);
    };

    return (
        <div 
            className={`p-3.5 rounded-xl group transition-all flex items-stretch space-x-2.5 w-full ${
                viewMode === 'row' 
                    ? 'min-w-[340px] max-w-[400px] flex-shrink-0' 
                    : 'flex-1 min-w-[300px]'
            } ${
                arc.id === activeArcId 
                    ? 'bg-cyan-950/40 border-2 border-cyan-500/70 shadow-lg shadow-cyan-950/50' 
                    : 'bg-gray-800/80 border border-gray-700/80 hover:border-gray-600 shadow-md'
            }`}
        >
            {/* Reorder Buttons */}
            <div className="flex flex-col space-y-1 mt-1 flex-shrink-0">
                <button 
                    onClick={() => onMoveArc(index, 'up')} 
                    disabled={index === 0}
                    className="text-gray-500 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 rounded hover:bg-gray-700/50"
                    title={viewMode === 'row' ? "Mover Izquierda" : "Mover Arriba"}
                >
                    <ArrowUpIcon className={`w-3.5 h-3.5 ${viewMode === 'row' ? '-rotate-90' : ''}`} />
                </button>
                <button 
                    onClick={() => onMoveArc(index, 'down')} 
                    disabled={index === totalArcs - 1}
                    className="text-gray-500 hover:text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed p-0.5 rounded hover:bg-gray-700/50"
                    title={viewMode === 'row' ? "Mover Derecha" : "Mover Abajo"}
                >
                    <ArrowUpIcon className={`w-3.5 h-3.5 ${viewMode === 'row' ? 'rotate-90' : 'rotate-180'}`} />
                </button>
            </div>

            <div className="flex-grow min-w-0 flex flex-col">
                {/* Header: Title, Active badge & actions */}
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    {editingArcId === arc.id ? (
                        <div className="flex-grow flex items-center space-x-1.5 mr-2">
                            <input 
                                type="text"
                                value={editingName}
                                onChange={(e) => onEditingNameChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onEditSave();
                                    if (e.key === 'Escape') onEditCancel();
                                }}
                                onBlur={onEditSave}
                                className="bg-gray-900 border border-cyan-500 rounded px-2 py-1 text-xs w-full text-white"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div className="flex-grow min-w-0 flex items-center space-x-1.5 mr-1">
                            <p 
                                className={`text-sm font-bold truncate cursor-pointer hover:text-cyan-300 transition-colors ${
                                    isIgnored && arc.id !== activeArcId ? 'text-gray-400 line-through decoration-gray-600' : 'text-gray-100'
                                }`} 
                                title={arc.name} 
                                onClick={() => onSetActiveArc(arc.id)}
                            >
                                {arc.name}
                            </p>
                            {arc.id === activeArcId && (
                                <span className="text-[10px] uppercase font-bold bg-cyan-600/90 px-1.5 py-0.5 rounded text-white flex-shrink-0">
                                    Activo
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex-shrink-0 flex items-center space-x-1">
                        {editingArcId === arc.id ? (
                            <>
                                <button onClick={onEditCancel} className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white" title="Cancelar"><XIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={onEditSave} className="p-1 rounded-full hover:bg-green-600 text-gray-400 hover:text-white" title="Guardar"><CheckIcon className="w-3.5 h-3.5"/></button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => onDuplicateArc(arc.id)} className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Duplicar Arco (Clonar Árbol)"><CopyIcon className="w-3.5 h-3.5" /></button>
                                <button onClick={() => onEditStart(arc)} className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Renombrar"><EditIcon className="w-3.5 h-3.5" /></button>
                                <button onClick={() => onDeleteArc(arc)} className="p-1 rounded-full hover:bg-red-500/80 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Borrar"><TrashIcon className="w-3.5 h-3.5" /></button>
                                <button 
                                    onClick={() => onSetActiveArc(arc.id)} 
                                    disabled={arc.id === activeArcId} 
                                    className="px-2 py-0.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed ml-1 transition-colors"
                                >
                                    Ver
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Arc Group Badge / Selector */}
                <div className="mb-2.5 flex items-center justify-between text-xs bg-gray-900/60 px-2 py-1 rounded-md border border-gray-700/60">
                    <div className="flex items-center space-x-1.5 flex-grow min-w-0">
                        <FolderIcon className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                        {isEditingGroup ? (
                            <div className="flex items-center space-x-1 flex-grow">
                                <input 
                                    type="text"
                                    list={`group-suggestions-${arc.id}`}
                                    value={groupInput}
                                    onChange={(e) => setGroupInput(e.target.value)}
                                    placeholder="Nombre de grupo..."
                                    className="bg-gray-950 border border-cyan-500 text-[11px] rounded px-1.5 py-0.5 text-white w-full outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveGroup();
                                        if (e.key === 'Escape') setIsEditingGroup(false);
                                    }}
                                />
                                <datalist id={`group-suggestions-${arc.id}`}>
                                    {existingGroups.map(g => (
                                        <option key={g} value={g} />
                                    ))}
                                </datalist>
                                <button onClick={handleSaveGroup} className="p-0.5 text-green-400 hover:text-green-300"><CheckIcon className="w-3 h-3" /></button>
                                <button onClick={() => setIsEditingGroup(false)} className="p-0.5 text-gray-400 hover:text-white"><XIcon className="w-3 h-3" /></button>
                            </div>
                        ) : (
                            <div 
                                onClick={() => {
                                    setGroupInput(arc.group || '');
                                    setIsEditingGroup(true);
                                }}
                                className="truncate cursor-pointer hover:text-cyan-300 flex items-center space-x-1 flex-grow"
                                title="Click para asignar o cambiar grupo"
                            >
                                <span className="text-[10px] text-gray-400 uppercase font-semibold">Grupo:</span>
                                <span className={`text-[11px] font-medium truncate ${arc.group ? 'text-cyan-300' : 'text-gray-500 italic'}`}>
                                    {arc.group || 'Sin Grupo'}
                                </span>
                            </div>
                        )}
                    </div>
                    {!isEditingGroup && (
                        <button 
                            onClick={() => {
                                setGroupInput(arc.group || '');
                                setIsEditingGroup(true);
                            }}
                            className="text-[10px] text-gray-400 hover:text-cyan-300 p-0.5 rounded"
                            title="Cambiar grupo"
                        >
                            <EditIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Context Priority UI */}
                <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/60 shadow-inner flex flex-col flex-grow">
                    <div className="flex justify-between items-end mb-2 flex-shrink-0">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Nivel de Importancia
                        </label>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            score >= 10 ? 'bg-red-900/30 border-red-500/50 text-red-300' :
                            score >= 7 ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300' :
                            score >= 4 ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-300' :
                            score > 0 ? 'bg-gray-800 border-gray-600 text-gray-300' :
                            'bg-gray-800 border-gray-700 text-gray-500'
                        }`}>
                            {score === 0 ? 'Ignorado' : score}
                        </span>
                    </div>
                    
                    <input 
                        type="range" 
                        min="0" 
                        max="10" 
                        step="1" 
                        value={score} 
                        onChange={(e) => onUpdateArcSignificance(arc.id, parseInt(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-cyan-400 transition-all"
                    />
                    
                    <p className="text-[10px] mt-1.5 leading-tight h-7 flex items-center">
                        {score === 0 ? <span className="text-gray-500 flex items-center">🚫 Excluido de la memoria de la IA.</span> :
                        score >= 10 ? <span className="text-red-300 flex items-center">🔥 <strong>Crítico:</strong> Todo el árbol de nodos.</span> :
                        score >= 7 ? <span className="text-yellow-300 flex items-center">✨ <strong>Canónico:</strong> Resumen + camino oficial.</span> :
                        score >= 4 ? <span className="text-cyan-300 flex items-center">🏷️ <strong>Temático:</strong> Resumen + nodos con tags.</span> :
                        <span className="text-gray-300 flex items-center">📄 <strong>Fondo:</strong> Solo resumen manual.</span>}
                    </p>

                    {(arc.significance || 0) > 0 && (
                        <div className="mt-2.5 pt-2.5 border-t border-gray-700/50 flex flex-col flex-grow">
                            <label className="flex items-center space-x-1 text-[10px] font-bold text-gray-400 uppercase mb-1 flex-shrink-0">
                                <BookOpenIcon className="w-3 h-3" /> <span>Resumen Global</span>
                            </label>
                            <div className="relative flex-grow min-h-[160px] rounded bg-gray-800/90 border border-gray-600/80 shadow-inner overflow-hidden flex flex-col focus-within:ring-1 focus-within:ring-cyan-500 transition-all duration-200">
                                <div 
                                    className="absolute inset-0 p-2 text-xs leading-relaxed text-gray-200 pointer-events-none z-0 overflow-hidden whitespace-pre-wrap break-words"
                                    aria-hidden="true"
                                >
                                    <RichTextRenderer text={(arc.summary || '') + '\n'} preserveSyntax={true} />
                                </div>
                                <textarea 
                                    id={`summary-${arc.id}`} 
                                    name={`summary-${arc.id}`} 
                                    value={arc.summary || ''}
                                    onChange={(e) => onUpdateArcSummary(arc.id, e.target.value)}
                                    onScroll={(e) => {
                                        const bgDiv = e.currentTarget.previousElementSibling as HTMLDivElement;
                                        if (bgDiv) {
                                            bgDiv.scrollTop = e.currentTarget.scrollTop;
                                        }
                                    }}
                                    placeholder="Resume este arco para la IA (ahorra tokens)..."
                                    className="absolute inset-0 w-full h-full text-xs leading-relaxed text-transparent caret-cyan-400 bg-transparent p-2 outline-none resize-none z-10 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent whitespace-pre-wrap break-words"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
