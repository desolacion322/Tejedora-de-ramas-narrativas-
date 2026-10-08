
import React, { useState, useRef } from 'react';
import { 
    UndoIcon, RedoIcon, LayersIcon, BookOpenIcon, ScaleIcon, 
    FileTextIcon, MenuIcon, TargetIcon, SaveIcon, ShareIcon, FolderOpenIcon, UploadIcon,
    ShieldIcon
} from './icons';
import { EditableProjectName } from './EditableProjectName';
import { ShareModal } from './ShareModal';
import { cloneTreeWithNewIds, findNodeAndModify } from '../utils/treeUtils';

interface TopBarProps {
    history: {
        undo: () => void;
        redo: () => void;
        canUndo: boolean;
        canRedo: boolean;
    };
    ui: any; // app.ui
    project: any; // app.project
    actions?: any; // app.actions
    collab: any; // app.collab
    blackoutProtection?: any;
}

export const TopBar: React.FC<TopBarProps> = ({ history, ui, project, actions, collab, blackoutProtection }) => {
    const { panels } = ui;
    const { tokenCounts } = project;
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importNodesFileInputRef = useRef<HTMLInputElement>(null);
    
    const handleImportNodes = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedNodes = JSON.parse(content);
                if (Array.isArray(importedNodes) && ui.interaction.selectedNodeIds.size === 1) {
                    const targetNodeId = Array.from(ui.interaction.selectedNodeIds)[0] as string;
                    const clonedNodes = importedNodes.map((node: any) => cloneTreeWithNewIds(node, true));
                    
                    actions.node.updateActiveArcRoot((root: any) => findNodeAndModify(root, targetNodeId, (node: any) => {
                        if (!node.children) node.children = [];
                        node.children.push(...clonedNodes);
                    }), true);
                    
                    ui.interaction.setSelectedNodeIds(new Set());
                }
            } catch (error) {
                console.error("Error importing nodes:", error);
            }
        };
        reader.readAsText(file);
        if (importNodesFileInputRef.current) {
            importNodesFileInputRef.current.value = '';
        }
    };
    
    return (
        <>
            <div className="p-4 bg-gray-800 border-b border-gray-700 shadow-md z-20 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <button onClick={history.undo} disabled={!history.canUndo} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Deshacer (Ctrl+Z)">
                            <UndoIcon />
                        </button>
                        <button onClick={history.redo} disabled={!history.canRedo} className="p-2 rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Rehacer (Ctrl+Y)">
                            <RedoIcon />
                        </button>
                    </div>
                    <div className="h-8 w-px bg-gray-700"></div>
                    <button onClick={() => panels.setIsStoryArcsPanelOpen(!panels.isStoryArcsPanelOpen)} className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${panels.isStoryArcsPanelOpen ? 'bg-gray-700 text-cyan-400' : ''}`} title="Alternar Panel de Arcos">
                        <LayersIcon />
                    </button>
                    <button onClick={() => panels.setIsWorldStructurePanelOpen(!panels.isWorldStructurePanelOpen)} className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${panels.isWorldStructurePanelOpen ? 'bg-gray-700 text-cyan-400' : ''}`} title="Alternar Panel de Estructura">
                        <BookOpenIcon />
                    </button>
                    <button onClick={() => panels.setIsWorldRulesPanelOpen(!panels.isWorldRulesPanelOpen)} className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${panels.isWorldRulesPanelOpen ? 'bg-gray-700 text-cyan-400' : ''}`} title="Alternar Panel de Reglas">
                        <ScaleIcon />
                    </button>
                    <button onClick={() => panels.setIsLorePanelOpen(!panels.isLorePanelOpen)} className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${panels.isLorePanelOpen ? 'bg-gray-700 text-cyan-400' : ''}`} title="Alternar Panel de Lore">
                        <FileTextIcon className="w-6 h-6" />
                    </button>
                    <button onClick={() => panels.setIsStoryObjectivesPanelOpen(!panels.isStoryObjectivesPanelOpen)} className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${panels.isStoryObjectivesPanelOpen ? 'bg-gray-700 text-cyan-400' : ''}`} title="Objetivos Narrativos">
                        <TargetIcon className="w-6 h-6" />
                    </button>
                    {ui.interaction.selectedNodeIds && ui.interaction.selectedNodeIds.size > 0 && (
                        <button 
                            onClick={() => {
                                const selectedIds = ui.interaction.selectedNodeIds;
                                const selectedNodes: any[] = [];
                                const collectNodes = (nodes: any[]) => {
                                    for (const node of nodes) {
                                        if (selectedIds.has(node.id)) {
                                            selectedNodes.push(node);
                                        } else if (node.children) {
                                            collectNodes(node.children);
                                        }
                                    }
                                };
                                project.data.storyArcs.forEach((arc: any) => collectNodes([arc.rootNode]));
                                
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedNodes, null, 2));
                                const downloadAnchorNode = document.createElement('a');
                                downloadAnchorNode.setAttribute("href", dataStr);
                                downloadAnchorNode.setAttribute("download", `nodes_export_${new Date().toISOString()}.json`);
                                document.body.appendChild(downloadAnchorNode);
                                downloadAnchorNode.click();
                                downloadAnchorNode.remove();
                                
                                ui.interaction.setSelectedNodeIds(new Set());
                            }} 
                            className="p-2 ml-4 rounded-md bg-cyan-700 hover:bg-cyan-600 transition-colors text-white font-bold flex items-center space-x-2 shadow-lg"
                            title="Exportar nodos seleccionados"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span>Exportar JSON</span>
                        </button>
                    )}
                    {ui.interaction.selectedNodeIds && ui.interaction.selectedNodeIds.size === 1 && (
                        <>
                            <input 
                                type="file" 
                                ref={importNodesFileInputRef} 
                                style={{ display: 'none' }} 
                                accept=".json"
                                onChange={handleImportNodes}
                            />
                            <button 
                                onClick={() => importNodesFileInputRef.current?.click()}
                                className="p-2 ml-4 rounded-md bg-green-700 hover:bg-green-600 transition-colors text-white font-bold flex items-center space-x-2 shadow-lg"
                                title="Importar JSON como hijos del nodo seleccionado"
                            >
                                <UploadIcon className="w-4 h-4" />
                                <span>Importar JSON</span>
                            </button>
                        </>
                    )}
                    <div>
                        <EditableProjectName name={project.name} onNameChange={project.setName} />
                        <p className="text-gray-400 text-sm">Arco Activo: <span className="font-semibold text-cyan-400">{project.activeArc?.name || '...'}</span></p>
                    </div>
                </div>
                <div className="flex items-center space-x-4">
                    {collab.cloudProjectId && (
                        <div className="flex items-center space-x-2 mr-2">
                            <span className="flex h-3 w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-green-400 font-medium">Sincronizado</span>
                        </div>
                    )}
                    <button onClick={() => setIsShareModalOpen(true)} className={`p-2 rounded-md hover:bg-gray-700 transition-colors ${collab.cloudProjectId ? 'text-green-400' : 'text-gray-400'}`} title="Compartir y Colaborar">
                        <ShareIcon />
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-cyan-400" title="Cargar/Importar Proyecto">
                        <FolderOpenIcon />
                    </button>
                    <input id="field-f60dc0" name="field-f60dc0" 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".json,.txt"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                try {
                                    const json = JSON.parse(ev.target?.result as string);
                                    if(actions?.project?.handleLoadProject) {
                                        actions.project.handleLoadProject(json);
                                    }
                                } catch (err) {
                                    alert("Error al analizar el archivo del proyecto.");
                                }
                            };
                            reader.readAsText(file);
                            e.target.value = ''; // Reset
                        }}
                    />
                    <button 
                        onClick={() => blackoutProtection?.setIsBlackoutCenterOpen(true)} 
                        className="p-2 rounded-md hover:bg-gray-700 transition-colors text-emerald-400 flex items-center space-x-1.5" 
                        title="Protección contra apagones activa (Caja Negra / Respaldos en Navegador)"
                    >
                        <div className="relative">
                            <ShieldIcon className="w-5 h-5 text-emerald-400" />
                            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <span className="hidden xl:inline text-xs font-semibold text-emerald-300">Anti-Apagón</span>
                    </button>
                    <button onClick={() => ui.modals.setIsSaveAsModalOpen(true)} className="p-2 rounded-md hover:bg-gray-700 transition-colors text-cyan-400" title="Guardar Proyecto Como...">
                        <SaveIcon />
                    </button>
                    <button onClick={() => panels.setIsMenuOpen(!panels.isMenuOpen)} className="p-2 rounded-md hover:bg-gray-700 transition-colors" title="Alternar Menú de Herramientas">
                        <MenuIcon />
                    </button>
                </div>
            </div>
            {isShareModalOpen && (
                <ShareModal 
                    isOpen={isShareModalOpen} 
                    onClose={() => setIsShareModalOpen(false)} 
                    collab={collab} 
                />
            )}
        </>
    );
};
