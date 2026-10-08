import React from 'react';
import { EmergencySnapshotMeta } from '../types';
import { getBlackoutState } from '../services/blackoutRecoveryService';
import { ShieldIcon, ZapIcon, AlertIcon, HistoryIcon, TrashIcon, SaveIcon, XIcon } from './icons';

interface BlackoutRecoveryModalProps {
    isOpen: boolean;
    onClose: () => void;
    pendingRecovery: EmergencySnapshotMeta | null;
    onRestore: (snapshot: EmergencySnapshotMeta) => void;
    onDismissPending: () => void;
    snapshots: EmergencySnapshotMeta[];
    onManualSnapshot: () => Promise<void>;
    onDeleteSnapshot: (id: string) => Promise<void>;
    onClearAll: () => Promise<void>;
    isSaving: boolean;
    currentStats: {
        nodeCount: number;
        characterCount: number;
        projectName: string;
    };
}

export const BlackoutRecoveryModal: React.FC<BlackoutRecoveryModalProps> = ({
    isOpen,
    onClose,
    pendingRecovery,
    onRestore,
    onDismissPending,
    snapshots,
    onManualSnapshot,
    onDeleteSnapshot,
    onClearAll,
    isSaving,
    currentStats
}) => {
    if (!isOpen) return null;

    const isAlertMode = !!pendingRecovery;

    const handleDownloadJson = async (snapshot: EmergencySnapshotMeta) => {
        try {
            const state = await getBlackoutState(snapshot.id);
            if (!state) {
                alert("No se pudo recuperar el archivo de respaldo.");
                return;
            }
            const jsonStr = JSON.stringify(state, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = (snapshot.projectName || 'proyecto').replace(/[^a-z0-9_-]/gi, '_');
            a.download = `RESPALDO_EMERGENCIA_${safeName}_${new Date(snapshot.timestamp).toISOString().replace(/:/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Error downloading snapshot JSON:", e);
        }
    };

    const getTriggerBadge = (trigger: string) => {
        switch (trigger) {
            case 'timer':
                return <span className="text-[10px] bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 px-1.5 py-0.5 rounded">Auto (30s)</span>;
            case 'change':
                return <span className="text-[10px] bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 px-1.5 py-0.5 rounded">Por Cambio</span>;
            case 'beforeunload':
                return <span className="text-[10px] bg-amber-900/40 text-amber-300 border border-amber-700/50 px-1.5 py-0.5 rounded">Cierre/Apagón</span>;
            case 'manual':
                return <span className="text-[10px] bg-purple-900/40 text-purple-300 border border-purple-700/50 px-1.5 py-0.5 rounded">Manual</span>;
            default:
                return null;
        }
    };

    const formatRelativeTime = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        if (diff < 45000) return 'Hace unos segundos';
        if (diff < 90000) return 'Hace 1 minuto';
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `Hace ${mins} minutos`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Hace ${hours} horas`;
        return new Date(timestamp).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className={`p-4 flex items-center justify-between border-b ${
                    isAlertMode 
                        ? 'bg-amber-950/40 border-amber-800/60' 
                        : 'bg-gray-800/70 border-gray-700'
                }`}>
                    <div className="flex items-center space-x-3">
                        <div className={`p-2.5 rounded-xl ${
                            isAlertMode 
                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' 
                                : 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/40'
                        }`}>
                            {isAlertMode ? <ZapIcon className="w-6 h-6 animate-pulse" /> : <ShieldIcon className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                {isAlertMode ? '¡Protección Contra Apagones: Respaldo Detectado!' : 'Caja Negra: Protección Contra Apagones'}
                            </h2>
                            <p className="text-xs text-gray-400">
                                {isAlertMode 
                                    ? 'Se detectó una interrupción inesperada. Tu trabajo está a salvo en el navegador.' 
                                    : 'Guardado continuo automático en memoria del navegador (cada 30s + tras cada cambio).'}
                            </p>
                        </div>
                    </div>
                    {!isAlertMode && (
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                            <XIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto space-y-5">
                    
                    {/* Primary Alert Banner if an unrecovered snapshot is pending */}
                    {isAlertMode && pendingRecovery && (
                        <div className="bg-gradient-to-br from-amber-950/60 to-gray-900 border-2 border-amber-600/60 rounded-xl p-4 shadow-xl space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                                    <AlertIcon className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-semibold text-amber-200 text-sm">
                                        ¿Se fue la luz o se cerró el navegador inesperadamente?
                                    </h3>
                                    <p className="text-xs text-gray-300 leading-relaxed">
                                        El sistema guardó un <strong>respaldo de emergencia</strong> justo antes o durante tu última sesión activa. Puedes restaurar todo tu contenido con un solo clic para no perder nada.
                                    </p>
                                </div>
                            </div>

                            {/* Comparison table */}
                            <div className="grid grid-cols-2 gap-3 bg-gray-950/60 rounded-lg p-3 border border-gray-800 text-xs">
                                <div className="space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Versión Cargada Actual</span>
                                    <div className="text-gray-300 font-medium">{currentStats.projectName}</div>
                                    <div className="text-gray-400">
                                        <span className="text-gray-200 font-semibold">{currentStats.nodeCount}</span> nodos • <span className="text-gray-200 font-semibold">{currentStats.characterCount}</span> personajes
                                    </div>
                                </div>
                                <div className="space-y-1 border-l border-gray-800 pl-3">
                                    <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider flex items-center gap-1">
                                        <span>⚡ Respaldo de Emergencia</span>
                                        {getTriggerBadge(pendingRecovery.trigger)}
                                    </span>
                                    <div className="text-amber-200 font-medium truncate" title={pendingRecovery.projectName}>
                                        {pendingRecovery.projectName}
                                    </div>
                                    <div className="text-gray-300">
                                        <span className="text-amber-300 font-bold text-sm">{pendingRecovery.nodeCount}</span> nodos • <span className="text-amber-300 font-bold">{pendingRecovery.characterCount}</span> personajes
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                        {pendingRecovery.dateFormatted} ({formatRelativeTime(pendingRecovery.timestamp)})
                                    </div>
                                </div>
                            </div>

                            {/* Alert Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                <button
                                    onClick={() => onRestore(pendingRecovery)}
                                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                                >
                                    <ZapIcon className="w-5 h-5 text-yellow-300" />
                                    <span>⚡ Restaurar mi trabajo completo</span>
                                </button>
                                <button
                                    onClick={onDismissPending}
                                    className="py-2.5 px-4 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold border border-gray-700 transition-colors"
                                >
                                    Mantener versión actual (Descartar aviso)
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Blackout Control & Snapshots list */}
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <HistoryIcon className="w-4 h-4 text-cyan-400" />
                                <h3 className="font-semibold text-gray-200 text-sm">
                                    Historial de Respaldos en Navegador ({snapshots.length})
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onManualSnapshot}
                                    disabled={isSaving}
                                    className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/50 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                                >
                                    <ShieldIcon className="w-3.5 h-3.5" />
                                    <span>{isSaving ? 'Guardando...' : 'Tomar Respaldo Ahora'}</span>
                                </button>
                                {snapshots.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm("¿Estás seguro de vaciar el historial de respaldos de emergencia?")) {
                                                onClearAll();
                                            }
                                        }}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                        title="Limpiar todo el historial"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List */}
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {snapshots.map((snap) => (
                                <div
                                    key={snap.id}
                                    className="bg-gray-800/60 hover:bg-gray-800 border border-gray-700/70 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                                >
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-200 text-xs truncate max-w-[200px]" title={snap.projectName}>
                                                {snap.projectName || 'Sin título'}
                                            </span>
                                            {getTriggerBadge(snap.trigger)}
                                            <span className="text-[10px] text-cyan-400 font-mono">
                                                {formatRelativeTime(snap.timestamp)}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-gray-400 flex items-center gap-2">
                                            <span>{snap.dateFormatted}</span>
                                            <span>•</span>
                                            <span className="text-gray-300 font-semibold">{snap.nodeCount} nodos</span>
                                            <span>•</span>
                                            <span className="text-gray-300 font-semibold">{snap.characterCount} personajes</span>
                                            {snap.arcCount > 1 && <span>• {snap.arcCount} arcos</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleDownloadJson(snap)}
                                            className="p-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 hover:text-cyan-300 transition-colors"
                                            title="Descargar este punto como archivo JSON"
                                        >
                                            <SaveIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`¿Restaurar respaldo del ${snap.dateFormatted} con ${snap.nodeCount} nodos? Se reemplazará el estado actual en pantalla.`)) {
                                                    onRestore(snap);
                                                }
                                            }}
                                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 border border-emerald-500/50 text-xs font-semibold flex items-center gap-1 transition-colors"
                                        >
                                            <ZapIcon className="w-3.5 h-3.5" />
                                            <span>Restaurar</span>
                                        </button>
                                        <button
                                            onClick={() => onDeleteSnapshot(snap.id)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                                            title="Eliminar este respaldo"
                                        >
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {snapshots.length === 0 && (
                                <div className="p-8 text-center bg-gray-950/30 border border-dashed border-gray-800 rounded-xl space-y-2">
                                    <ShieldIcon className="w-8 h-8 text-gray-600 mx-auto" />
                                    <p className="text-xs text-gray-400">
                                        Aún no hay respaldos generados. El sistema creará uno automáticamente cada 30 segundos o cuando realices cambios en tu historia.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Technical assurance note */}
                    <div className="bg-gray-950/40 rounded-xl p-3 border border-gray-800 text-[11px] text-gray-400 flex items-start gap-2.5">
                        <ShieldIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="text-gray-300 font-semibold">¿Cómo te protege esto contra apagones?</span>
                            <p className="mt-0.5 leading-relaxed text-gray-400">
                                Los respaldos se guardan en la <strong>memoria local de tu navegador (IndexedDB + copia espejo en LocalStorage)</strong>, no dependen de servidores ni de que recuerdes presionar "Guardar archivo". Aunque la computadora se apague en seco, al volver a encenderla el navegador conservará tu sesión intacta.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-800/50 border-t border-gray-700/80 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
