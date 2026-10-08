import React, { useState } from 'react';
import { StoryArc } from '../../types';
import { 
    ChevronDownIcon, FolderIcon, LayersIcon, EditIcon, CheckIcon, XIcon, PlusIcon
} from '../icons';
import { StoryArcCard } from './StoryArcCard';

interface StoryArcGroupSectionProps {
    groupName: string;
    arcs: StoryArc[];
    isCollapsed: boolean;
    onToggleCollapse: () => void;
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
    onBulkUpdateSignificance?: (arcIds: string[], score: number) => void;
    onRenameGroup?: (oldName: string, newName: string) => void;
}

export const StoryArcGroupSection: React.FC<StoryArcGroupSectionProps> = ({
    groupName,
    arcs,
    isCollapsed,
    onToggleCollapse,
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
    onUpdateArcGroup,
    onBulkUpdateSignificance,
    onRenameGroup
}) => {
    const [isEditingGroupName, setIsEditingGroupName] = useState(false);
    const [groupNameInput, setGroupNameInput] = useState(groupName);

    const isUngrouped = groupName === 'Sin Grupo';
    const arcIds = arcs.map(a => a.id);

    // Calculate average significance or status
    const allIgnored = arcs.every(a => (a.significance ?? 0) === 0);
    const avgScore = arcs.length > 0 
        ? Math.round(arcs.reduce((acc, a) => acc + (a.significance ?? 0), 0) / arcs.length) 
        : 0;

    const handleSaveGroupName = () => {
        if (!isUngrouped && onRenameGroup && groupNameInput.trim() && groupNameInput.trim() !== groupName) {
            onRenameGroup(groupName, groupNameInput.trim());
        }
        setIsEditingGroupName(false);
    };

    return (
        <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-3 flex flex-col space-y-3 transition-all">
            {/* Group Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-700/60">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={onToggleCollapse}
                        className="p-1 rounded hover:bg-gray-700 text-gray-300 transition-colors flex items-center space-x-1"
                        title={isCollapsed ? "Desplegar grupo" : "Plegar grupo"}
                    >
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? '-rotate-90 text-gray-500' : 'rotate-0 text-cyan-400'}`} />
                        <FolderIcon className={`w-4 h-4 ${isUngrouped ? 'text-gray-500' : 'text-cyan-400'}`} />
                    </button>

                    {isEditingGroupName ? (
                        <div className="flex items-center space-x-1">
                            <input 
                                type="text"
                                value={groupNameInput}
                                onChange={(e) => setGroupNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveGroupName();
                                    if (e.key === 'Escape') setIsEditingGroupName(false);
                                }}
                                autoFocus
                                className="bg-gray-900 border border-cyan-500 text-xs rounded px-2 py-0.5 text-white font-semibold outline-none"
                            />
                            <button onClick={handleSaveGroupName} className="p-1 hover:bg-green-600 rounded text-gray-300 hover:text-white"><CheckIcon className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setIsEditingGroupName(false)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"><XIcon className="w-3.5 h-3.5" /></button>
                        </div>
                    ) : (
                        <div className="flex items-center space-x-2">
                            <span 
                                onClick={onToggleCollapse}
                                className="font-bold text-sm text-gray-200 cursor-pointer hover:text-cyan-300 transition-colors select-none"
                            >
                                {groupName}
                            </span>
                            <span className="text-[11px] font-semibold bg-gray-700/80 text-cyan-300 px-2 py-0.5 rounded-full">
                                {arcs.length} {arcs.length === 1 ? 'arco' : 'arcos'}
                            </span>
                            {!isUngrouped && (
                                <button 
                                    onClick={() => {
                                        setGroupNameInput(groupName);
                                        setIsEditingGroupName(true);
                                    }}
                                    className="p-1 text-gray-500 hover:text-cyan-400 rounded hover:bg-gray-700/50"
                                    title="Renombrar grupo"
                                >
                                    <EditIcon className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Bulk Actions for Group */}
                <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 bg-gray-900/80 border border-gray-700/80 rounded-lg px-2 py-1">
                        <span className="text-[10px] uppercase font-bold text-gray-400 mr-1">
                            Ajustar Grupo:
                        </span>
                        
                        {/* Quick Presets for the entire group */}
                        <button 
                            onClick={() => onBulkUpdateSignificance && onBulkUpdateSignificance(arcIds, 0)}
                            className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                                allIgnored 
                                    ? 'bg-red-950/80 text-red-300 border border-red-700/50' 
                                    : 'bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-300'
                            }`}
                            title="Ignorar todos los arcos del grupo (Score = 0)"
                        >
                            Ignorar Todos (0)
                        </button>
                        
                        <button 
                            onClick={() => onBulkUpdateSignificance && onBulkUpdateSignificance(arcIds, 2)}
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                            title="Bajar a Fondo (Score = 2, solo resumen manual)"
                        >
                            Fondo (2)
                        </button>

                        <button 
                            onClick={() => onBulkUpdateSignificance && onBulkUpdateSignificance(arcIds, 5)}
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-800 hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-200 transition-colors"
                            title="Medio Temático (Score = 5)"
                        >
                            Medio (5)
                        </button>

                        <button 
                            onClick={() => onBulkUpdateSignificance && onBulkUpdateSignificance(arcIds, 8)}
                            className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gray-800 hover:bg-yellow-900/50 text-yellow-400 hover:text-yellow-200 transition-colors"
                            title="Canónico Alto (Score = 8)"
                        >
                            Canónico (8)
                        </button>

                        {/* Slider to adjust all at once */}
                        <div className="flex items-center space-x-1 pl-1 ml-1 border-l border-gray-700">
                            <span className="text-[10px] font-bold text-cyan-400 min-w-[14px] text-center">{avgScore}</span>
                            <input 
                                type="range" 
                                min="0" 
                                max="10" 
                                step="1" 
                                value={avgScore}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (onBulkUpdateSignificance) {
                                        onBulkUpdateSignificance(arcIds, val);
                                    }
                                }}
                                className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:rounded-full"
                                title="Ajustar nivel de importancia de todo el grupo a la vez"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Arcs Container (Collapsible) */}
            {!isCollapsed && (
                <div 
                    className={`p-1 animate-fade-in-fast ${
                        viewMode === 'row'
                            ? 'overflow-x-auto flex flex-row space-x-3 items-stretch scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-2'
                            : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 items-stretch'
                    }`}
                >
                    {arcs.map((arc, index) => (
                        <StoryArcCard 
                            key={arc.id}
                            arc={arc}
                            index={index}
                            totalArcs={arcs.length}
                            activeArcId={activeArcId}
                            existingGroups={existingGroups}
                            editingArcId={editingArcId}
                            editingName={editingName}
                            viewMode={viewMode}
                            onEditStart={onEditStart}
                            onEditCancel={onEditCancel}
                            onEditSave={onEditSave}
                            onEditingNameChange={onEditingNameChange}
                            onDuplicateArc={onDuplicateArc}
                            onDeleteArc={onDeleteArc}
                            onSetActiveArc={onSetActiveArc}
                            onMoveArc={onMoveArc}
                            onUpdateArcSignificance={onUpdateArcSignificance}
                            onUpdateArcSummary={onUpdateArcSummary}
                            onUpdateArcGroup={onUpdateArcGroup}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
