import React, { useState, useMemo } from 'react';
import { StoryArc, ContextPreset } from '../../types';
import { 
    LayersIcon, XIcon, ChevronDownIcon, SaveIcon, TrashIcon, 
    CheckIcon, PlusIcon, FolderIcon, FolderOpenIcon,
    LayoutGridIcon, LayoutListIcon
} from '../icons';
import { PanelShell } from '../ui/PanelShell';
import { StoryArcGroupSection } from './StoryArcGroupSection';

interface StoryArcsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    storyArcs: StoryArc[];
    activeArcId: string;
    onAddArc: () => void;
    onDeleteArc: (arc: StoryArc) => void;
    onDuplicateArc: (arcId: string) => void;
    onUpdateArcName: (arcId: string, newName: string) => void;
    onUpdateArcSummary: (arcId: string, newSummary: string) => void;
    onUpdateArcSignificance: (arcId: string, score: number) => void;
    onUpdateArcGroup?: (arcId: string, group: string) => void;
    onBulkUpdateSignificance?: (arcIds: string[], score: number) => void;
    onBulkUpdateGroup?: (arcIds: string[], group: string) => void;
    onSetActiveArc: (arcId: string) => void;
    onReorderArcs: (arcs: StoryArc[]) => void;
    contextPresets: ContextPreset[];
    onAddPreset: (name: string) => void;
    onApplyPreset: (presetId: string) => void;
    onDeletePreset: (presetId: string) => void;
    onUpdatePreset: (presetId: string) => void;
}

export const StoryArcsPanel: React.FC<StoryArcsPanelProps> = ({ 
    isOpen, onClose, storyArcs, activeArcId, onAddArc, onDeleteArc, 
    onDuplicateArc, onUpdateArcName, onUpdateArcSummary, onUpdateArcSignificance, 
    onUpdateArcGroup, onBulkUpdateSignificance, onBulkUpdateGroup,
    onSetActiveArc, onReorderArcs, contextPresets, onAddPreset, onApplyPreset, onDeletePreset, onUpdatePreset 
}) => {
    const [editingArcId, setEditingArcId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [newPresetName, setNewPresetName] = useState('');
    const [isCreatingPreset, setIsCreatingPreset] = useState(false);
    const [isPresetsOpen, setIsPresetsOpen] = useState(false);

    // View mode: 'grid' (fills space vertically/horizontally, wrap into columns) or 'row' (single horizontal row)
    const [viewMode, setViewMode] = useState<'grid' | 'row'>(() => {
        try {
            const saved = localStorage.getItem('story_arcs_view_mode');
            return (saved === 'row' || saved === 'grid') ? saved : 'grid';
        } catch {
            return 'grid';
        }
    });

    const handleViewModeChange = (mode: 'grid' | 'row') => {
        setViewMode(mode);
        try {
            localStorage.setItem('story_arcs_view_mode', mode);
        } catch (e) {
            console.error(e);
        }
    };

    // Collapsed groups state
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
        try {
            const saved = localStorage.getItem('story_arcs_collapsed_groups');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // New group creation modal/input
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    const toggleGroupCollapse = (groupName: string) => {
        setCollapsedGroups(prev => {
            const next = { ...prev, [groupName]: !prev[groupName] };
            try {
                localStorage.setItem('story_arcs_collapsed_groups', JSON.stringify(next));
            } catch (e) {
                console.error(e);
            }
            return next;
        });
    };

    const collapseAllGroups = (collapse: boolean) => {
        const next: Record<string, boolean> = {};
        groupedArcs.forEach(g => {
            next[g.name] = collapse;
        });
        setCollapsedGroups(next);
        try {
            localStorage.setItem('story_arcs_collapsed_groups', JSON.stringify(next));
        } catch (e) {
            console.error(e);
        }
    };

    const handleEditStart = (arc: StoryArc) => {
        setEditingArcId(arc.id);
        setEditingName(arc.name);
    };
    
    const handleEditCancel = () => {
        setEditingArcId(null);
        setEditingName('');
    };

    const handleEditSave = () => {
        if (editingArcId && editingName.trim()) {
            onUpdateArcName(editingArcId, editingName.trim());
        }
        handleEditCancel();
    };

    const handleCreatePresetSubmit = () => {
        if (newPresetName.trim()) {
            onAddPreset(newPresetName.trim());
            setNewPresetName('');
            setIsCreatingPreset(false);
        }
    };

    const handleMoveArc = (index: number, direction: 'up' | 'down') => {
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === storyArcs.length - 1)) return;
        
        const newArcs = [...storyArcs];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newArcs[index], newArcs[targetIndex]] = [newArcs[targetIndex], newArcs[index]];
        
        onReorderArcs(newArcs);
    };

    // Extract all existing unique group names
    const existingGroups = useMemo(() => {
        const groups = new Set<string>();
        storyArcs.forEach(arc => {
            if (arc.group && arc.group.trim()) {
                groups.add(arc.group.trim());
            }
        });
        return Array.from(groups).sort();
    }, [storyArcs]);

    // Group arcs
    const groupedArcs = useMemo(() => {
        const groupsMap = new Map<string, StoryArc[]>();
        
        // Ensure "Sin Grupo" is initialized if there are ungrouped arcs
        storyArcs.forEach(arc => {
            const g = (arc.group && arc.group.trim()) ? arc.group.trim() : 'Sin Grupo';
            if (!groupsMap.has(g)) {
                groupsMap.set(g, []);
            }
            groupsMap.get(g)!.push(arc);
        });

        // Convert to array of groups. Named groups first, then 'Sin Grupo'
        const result: { name: string; arcs: StoryArc[] }[] = [];
        Array.from(groupsMap.keys())
            .filter(k => k !== 'Sin Grupo')
            .sort()
            .forEach(name => {
                result.push({ name, arcs: groupsMap.get(name)! });
            });

        if (groupsMap.has('Sin Grupo')) {
            result.push({ name: 'Sin Grupo', arcs: groupsMap.get('Sin Grupo')! });
        }

        return result;
    }, [storyArcs]);

    const handleRenameGroup = (oldName: string, newName: string) => {
        if (!onBulkUpdateGroup) return;
        const arcsToUpdate = storyArcs.filter(a => (a.group || '').trim() === oldName.trim()).map(a => a.id);
        if (arcsToUpdate.length > 0) {
            onBulkUpdateGroup(arcsToUpdate, newName);
        }
    };

    return (
        <PanelShell
            id="storyarcs-full"
            side="left"
            isOpen={isOpen}
            onClose={onClose}
            title="Arcos Narrativos y Agrupaciones"
            icon={<LayersIcon />}
            widthConfig={{ initial: typeof window !== 'undefined' ? window.innerWidth : 1200, min: 400, max: 4000 }}
        >
            {/* Context Presets Section - Collapsible */}
            <div className="p-3 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
                 <button 
                    onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                    className="w-full flex items-center justify-between text-xs font-bold text-gray-400 uppercase hover:text-white transition-colors focus:outline-none"
                 >
                    <span>Perfiles de Contexto (Context Profiles)</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isPresetsOpen ? 'rotate-180' : ''}`} />
                 </button>
                 
                 {isPresetsOpen && (
                    <div className="mt-3 space-y-2 animate-fade-in-fast">
                        {contextPresets.length > 0 && (
                            <div className="grid grid-cols-1 gap-2">
                                {contextPresets.map(preset => (
                                    <div key={preset.id} className="flex items-center justify-between bg-gray-700/50 p-2 rounded text-sm">
                                        <span className="font-medium truncate flex-grow">{preset.name}</span>
                                        <div className="flex space-x-1">
                                            <button onClick={() => onApplyPreset(preset.id)} className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-xs rounded font-semibold" title="Cargar este perfil (Score + Resumen)">Cargar</button>
                                            <button onClick={() => onUpdatePreset(preset.id)} className="p-1 bg-gray-600 hover:bg-green-500 text-xs rounded" title="Actualizar con configuración actual"><SaveIcon /></button>
                                            <button onClick={() => onDeletePreset(preset.id)} className="p-1 bg-gray-600 hover:bg-red-500 text-xs rounded" title="Eliminar"><TrashIcon /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {isCreatingPreset ? (
                            <div className="flex items-center space-x-2 mt-2">
                                <input 
                                    type="text" 
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    placeholder="Nombre del perfil..."
                                    className="flex-grow bg-gray-900 border border-cyan-500 rounded px-2 py-1 text-sm text-white"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreatePresetSubmit();
                                        if (e.key === 'Escape') setIsCreatingPreset(false);
                                    }}
                                />
                                <button onClick={handleCreatePresetSubmit} className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white" title="Guardar"><CheckIcon className="w-4 h-4"/></button>
                                <button onClick={() => setIsCreatingPreset(false)} className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-white" title="Cancelar"><XIcon className="w-4 h-4"/></button>
                            </div>
                        ) : (
                            <button onClick={() => setIsCreatingPreset(true)} className="w-full text-xs flex items-center justify-center space-x-1 py-1.5 bg-gray-700 hover:bg-gray-600 rounded border border-dashed border-gray-500 text-gray-300">
                                <SaveIcon />
                                <span>Guardar Config Actual (Score + Textos)</span>
                            </button>
                        )}
                    </div>
                 )}
            </div>

            {/* Actions Bar: Add Arc & Group Management */}
            <div className="p-3 border-b border-gray-700 bg-gray-900/60 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={onAddArc} 
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-md font-semibold transition-colors text-xs shadow" 
                        title="Añadir Nuevo Arco"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Añadir Arco Narrativo</span>
                    </button>

                    {isCreatingGroup ? (
                        <div className="flex items-center space-x-1">
                            <input 
                                type="text"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="Nombre de nueva agrupación..."
                                autoFocus
                                className="bg-gray-900 border border-cyan-500 text-xs rounded px-2 py-1 text-white outline-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newGroupName.trim()) {
                                        // create an arc inside this group or make it available
                                        setIsCreatingGroup(false);
                                        setNewGroupName('');
                                    }
                                    if (e.key === 'Escape') setIsCreatingGroup(false);
                                }}
                            />
                            <button 
                                onClick={() => {
                                    setIsCreatingGroup(false);
                                    setNewGroupName('');
                                }} 
                                className="p-1 hover:bg-gray-700 rounded text-gray-400"
                            >
                                <XIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => collapseAllGroups(true)}
                            className="text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
                            title="Plegar todas las agrupaciones"
                        >
                            Plegar Todos
                        </button>
                    )}

                    <button 
                        onClick={() => collapseAllGroups(false)}
                        className="text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
                        title="Desplegar todas las agrupaciones"
                    >
                        Desplegar Todos
                    </button>
                </div>

                {/* View Mode & Status / Count */}
                <div className="flex items-center space-x-3 text-xs">
                    {/* View mode toggle */}
                    <div className="flex items-center bg-gray-800 p-0.5 rounded-lg border border-gray-700">
                        <button
                            onClick={() => handleViewModeChange('grid')}
                            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                viewMode === 'grid' 
                                    ? 'bg-cyan-600 text-white shadow' 
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Vista Cuadrícula Completa: Aprovecha toda la pantalla vertical y horizontalmente"
                        >
                            <LayoutGridIcon className="w-3.5 h-3.5" />
                            <span>Cuadrícula</span>
                        </button>
                        <button
                            onClick={() => handleViewModeChange('row')}
                            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                                viewMode === 'row' 
                                    ? 'bg-cyan-600 text-white shadow' 
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                            title="Vista Tira Horizontal: Una sola fila deslizable por grupo"
                        >
                            <LayoutListIcon className="w-3.5 h-3.5" />
                            <span>Fila Horizontal</span>
                        </button>
                    </div>

                    <div className="text-gray-400 flex items-center space-x-2">
                        <span><strong>{storyArcs.length}</strong> {storyArcs.length === 1 ? 'arco' : 'arcos'}</span>
                        <span className="text-gray-600">•</span>
                        <span><strong>{groupedArcs.length}</strong> {groupedArcs.length === 1 ? 'agrupación' : 'agrupaciones'}</span>
                    </div>
                </div>
            </div>

            {/* Groups & Arcs Content */}
            <div className="flex-grow p-3 space-y-4 overflow-y-auto">
                {groupedArcs.map(group => (
                    <StoryArcGroupSection
                        key={group.name}
                        groupName={group.name}
                        arcs={group.arcs}
                        isCollapsed={!!collapsedGroups[group.name]}
                        onToggleCollapse={() => toggleGroupCollapse(group.name)}
                        activeArcId={activeArcId}
                        existingGroups={existingGroups}
                        editingArcId={editingArcId}
                        editingName={editingName}
                        viewMode={viewMode}
                        onEditStart={handleEditStart}
                        onEditCancel={handleEditCancel}
                        onEditSave={handleEditSave}
                        onEditingNameChange={setEditingName}
                        onDuplicateArc={onDuplicateArc}
                        onDeleteArc={onDeleteArc}
                        onSetActiveArc={onSetActiveArc}
                        onMoveArc={(indexInGroup, direction) => {
                            const arc = group.arcs[indexInGroup];
                            const globalIndex = storyArcs.findIndex(a => a.id === arc.id);
                            if (globalIndex !== -1) {
                                handleMoveArc(globalIndex, direction);
                            }
                        }}
                        onUpdateArcSignificance={onUpdateArcSignificance}
                        onUpdateArcSummary={onUpdateArcSummary}
                        onUpdateArcGroup={onUpdateArcGroup}
                        onBulkUpdateSignificance={onBulkUpdateSignificance}
                        onRenameGroup={handleRenameGroup}
                    />
                ))}
            </div>
        </PanelShell>
    );
};
