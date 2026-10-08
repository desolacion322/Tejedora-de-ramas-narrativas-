
import React, { useState, useRef } from 'react';
import { LoreEntry, LoreProfile } from '../../types';
import { FileTextIcon, PlusIcon, UploadIcon } from '../icons';
import { LoreEntryAccordion } from '../accordions/LoreEntryAccordion';
import { PanelShell } from '../ui/PanelShell';
import { ProfileManager } from '../shared/ProfileManager';
import { generateUUID } from '../../utils/uuid';

export const WorldLorePanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    loreEntries: LoreEntry[];
    onAddLoreEntry: () => void;
    onUpdateLoreEntry: (id: string, u: Partial<LoreEntry>) => void;
    onDeleteLoreEntry: (l: LoreEntry) => void;

    // Lore Profiles
    loreProfiles?: LoreProfile[];
    onAddLoreProfile?: (name: string) => void;
    onApplyLoreProfile?: (id: string) => void;
    onUpdateLoreProfile?: (id: string) => void;
    onDeleteLoreProfile?: (id: string) => void;
    onReplaceLoreEntries?: (entries: LoreEntry[]) => void;
}> = ({ 
    isOpen, onClose, loreEntries, onAddLoreEntry, onUpdateLoreEntry, onDeleteLoreEntry, onReplaceLoreEntries,
    loreProfiles = [], onAddLoreProfile, onApplyLoreProfile, onUpdateLoreProfile, onDeleteLoreProfile
}) => {
    const [activeAccordionId, setActiveAccordionId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(loreEntries, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `lore_export_${new Date().toISOString()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const importedEntries = JSON.parse(content) as Partial<LoreEntry>[];
                if (Array.isArray(importedEntries) && onReplaceLoreEntries) {
                    const newEntries: LoreEntry[] = importedEntries.map(entry => ({
                        id: entry.id || generateUUID(),
                        name: entry.name || 'Entrada importada',
                        content: entry.content || '',
                        category: entry.category || 'General',
                        aliases: entry.aliases || [],
                        active: entry.active ?? true
                    }));
                    onReplaceLoreEntries([...loreEntries, ...newEntries]);
                }
            } catch (error) {
                console.error("Error importing lore:", error);
                alert("Error al importar el archivo JSON de lore.");
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
     return (
        <PanelShell
            id="lore"
            side="left"
            isOpen={isOpen}
            onClose={onClose}
            title="Lore del Mundo"
            icon={<FileTextIcon />}
            widthConfig={{ initial: 400, min: 300, max: 800 }}
        >
            <div className="flex-grow overflow-y-auto p-3 space-y-4">
                <ProfileManager 
                    title="Perfiles de Lore (Sets)"
                    description="Gestiona qué entradas de historia están activas (ej. 'Mitos Antiguos')."
                    profiles={loreProfiles}
                    onAdd={onAddLoreProfile!}
                    onApply={onApplyLoreProfile!}
                    onUpdate={onUpdateLoreProfile!}
                    onDelete={onDeleteLoreProfile!}
                />

                <div className="flex justify-between items-center mb-2">
                     <h3 className="text-lg font-semibold text-gray-300">Entradas de Lore</h3>
                     <div className="flex space-x-2">
                        <button onClick={handleExport} className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded text-xs text-white font-semibold flex items-center shadow-md transition-colors" title="Exportar Todo (JSON)">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Exportar
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none' }} 
                            accept=".json"
                            onChange={handleImport}
                        />
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-green-700 hover:bg-green-600 rounded text-xs text-white font-semibold flex items-center shadow-md transition-colors" title="Importar JSON (Añadir)">
                            <UploadIcon className="w-3.5 h-3.5 mr-1" />
                            Importar
                        </button>
                        <button onClick={onAddLoreEntry} className="p-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-white shadow-md transition-colors" title="Nueva Entrada"><PlusIcon className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="space-y-2">
                    {loreEntries.map(entry => (
                        <div key={entry.id} className="bg-gray-700/30 rounded-md">
                            <LoreEntryAccordion
                                entry={entry}
                                isOpen={activeAccordionId === entry.id}
                                onToggle={() => setActiveAccordionId(activeAccordionId === entry.id ? null : entry.id)}
                                onUpdate={onUpdateLoreEntry}
                                onDelete={() => onDeleteLoreEntry(entry)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </PanelShell>
    )
}
