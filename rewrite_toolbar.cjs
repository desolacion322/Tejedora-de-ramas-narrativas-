const fs = require('fs');
let code = fs.readFileSync('components/director/DirectorChatInterface.tsx', 'utf8');

const targetStr = `            {/* TOOLBAR SUPERIOR RESPONSIVO */}
            <div className={\`flex-shrink-0 border-b p-2 px-3 md:px-6 flex items-center justify-between z-[60] transition-all h-12 md:h-14 \${isSelectionMode ? 'bg-cyan-900/90 border-cyan-500/50' : (isSystemMode ? 'bg-purple-900/80 border-purple-800' : 'bg-gray-950/40 border-white/5 backdrop-blur-md')}\`}>
                
                {isSelectionMode ? (
                    <div className="flex items-center justify-between w-full animate-fade-in-fast">
                        <div className="flex items-center space-x-2 md:space-x-4">
                            <button onClick={toggleSelectionMode} className="p-1.5 rounded-lg bg-gray-800 text-white"><XIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                            <span className="text-[8px] md:text-xs font-black text-white uppercase tracking-widest">{selectedIds.size} Marcados</span>
                        </div>
                        <div className="flex items-center space-x-1 md:space-x-2">
                            <button onClick={handleSelectAll} className="px-2 py-1 md:px-4 md:py-1.5 rounded-lg text-[8px] md:text-[10px] font-black bg-cyan-700 text-white border border-cyan-400/50 uppercase">Todos</button>
                            <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="p-1.5 rounded-lg bg-red-600 text-white disabled:opacity-30"><TrashIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
                            <button 
                                onClick={() => setShowRoleConfig(!showRoleConfig)}
                                disabled={isSystemMode}
                                className={\`flex items-center space-x-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[8px] md:text-[10px] font-black tracking-widest transition-all border shadow-lg truncate \${isSystemMode ? 'opacity-30 grayscale cursor-not-allowed' : (showRoleConfig ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-gray-800 border-white/10 text-gray-400')}\`}
                            >
                                {ROLE_LABELS[safeRole].icon}
                                <span className="hidden xs:inline">{ROLE_LABELS[safeRole].label.toUpperCase()}</span>
                                <ChevronDownIcon className={\`w-3 h-3 transition-transform \${showRoleConfig ? 'rotate-180' : ''}\`} />
                            </button>
                            {isSystemMode && (
                                <div className="flex items-center space-x-1.5 bg-purple-900/30 px-2 py-1 rounded-full border border-purple-500/30">
                                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                                    <span className="text-[7px] md:text-[9px] text-purple-200 font-black uppercase">SINC DATOS</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center space-x-1.5">
                            <button 
                                onClick={() => setIsSystemMode(!isSystemMode)}
                                className={\`px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[8px] md:text-[9px] font-black transition-all border shadow-xl flex items-center space-x-1.5 \${isSystemMode ? 'bg-purple-600 text-white border-purple-400 scale-105' : 'bg-gray-800 text-gray-500 border-white/5 hover:text-purple-300'}\`}
                            >
                                <ActivityIcon className={\`w-3 h-3 md:w-3.5 md:h-3.5 \${isSystemMode ? 'animate-spin-slow' : ''}\`} />
                                <span className="hidden xxs:inline">SISTEMA</span>
                            </button>
                            <button 
                                onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                                title="Mostrar solo marcadores" 
                                className={\`p-1.5 md:p-2 rounded-xl border transition-all \${showBookmarksOnly ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-gray-800 text-gray-500 border-white/5 hover:text-yellow-400'}\`}
                            >
                                <StarIcon className={\`w-4 h-4 \${showBookmarksOnly ? 'fill-yellow-400' : ''}\`} />
                            </button>
                            <button onClick={toggleSelectionMode} title="Seleccionar mensajes" className="p-1.5 md:p-2 rounded-xl border bg-gray-800 text-gray-500 border-white/5 hover:text-cyan-400"><ListCheckIcon className="w-4 h-4" /></button>
                        </div>
                    </>
                )}
            </div>`;

const replacement = `            {/* TOOLBAR SUPERIOR RESPONSIVO TRASLADADO AL PORTAL */}
            {portalTarget && createPortal(
                <div className={\`flex items-center justify-between w-full h-full transition-all \${isSelectionMode ? 'bg-cyan-900/90 rounded-xl px-2 border border-cyan-500/50' : ''}\`}>
                    {isSelectionMode ? (
                        <div className="flex items-center justify-between w-full animate-fade-in-fast">
                            <div className="flex items-center space-x-2 md:space-x-4">
                                <button onClick={toggleSelectionMode} className="p-1.5 rounded-lg bg-gray-800 text-white"><XIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                                <span className="text-[8px] md:text-xs font-black text-white uppercase tracking-widest">{selectedIds.size} Marcados</span>
                            </div>
                            <div className="flex items-center space-x-1 md:space-x-2">
                                <button onClick={handleSelectAll} className="px-2 py-1 md:px-4 md:py-1.5 rounded-lg text-[8px] md:text-[10px] font-black bg-cyan-700 text-white border border-cyan-400/50 uppercase">Todos</button>
                                <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="p-1.5 rounded-lg bg-red-600 text-white disabled:opacity-30"><TrashIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
                                <button 
                                    onClick={() => setShowRoleConfig(!showRoleConfig)}
                                    disabled={isSystemMode}
                                    className={\`flex items-center space-x-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[8px] md:text-[10px] font-black tracking-widest transition-all border shadow-lg truncate \${isSystemMode ? 'opacity-30 grayscale cursor-not-allowed' : (showRoleConfig ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-gray-800 border-white/10 text-gray-400')}\`}
                                >
                                    {ROLE_LABELS[safeRole].icon}
                                    <span className="hidden xs:inline">{ROLE_LABELS[safeRole].label.toUpperCase()}</span>
                                    <ChevronDownIcon className={\`w-3 h-3 transition-transform \${showRoleConfig ? 'rotate-180' : ''}\`} />
                                </button>
                                {isSystemMode && (
                                    <div className="flex items-center space-x-1.5 bg-purple-900/30 px-2 py-1 rounded-full border border-purple-500/30">
                                        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                                        <span className="text-[7px] md:text-[9px] text-purple-200 font-black uppercase">SINC DATOS</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-end space-x-1.5 flex-grow">
                                <button 
                                    onClick={() => setIsSystemMode(!isSystemMode)}
                                    className={\`px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[8px] md:text-[9px] font-black transition-all border shadow-xl flex items-center space-x-1.5 \${isSystemMode ? 'bg-purple-600 text-white border-purple-400 scale-105' : 'bg-gray-800 text-gray-500 border-white/5 hover:text-purple-300'}\`}
                                >
                                    <ActivityIcon className={\`w-3 h-3 md:w-3.5 md:h-3.5 \${isSystemMode ? 'animate-spin-slow' : ''}\`} />
                                    <span className="hidden xl:inline">SISTEMA</span>
                                </button>
                                <button 
                                    onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
                                    title="Mostrar solo marcadores" 
                                    className={\`p-1.5 md:p-2 rounded-xl border transition-all \${showBookmarksOnly ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-gray-800 text-gray-500 border-white/5 hover:text-yellow-400'}\`}
                                >
                                    <StarIcon className={\`w-4 h-4 \${showBookmarksOnly ? 'fill-yellow-400' : ''}\`} />
                                </button>
                                <button onClick={toggleSelectionMode} title="Seleccionar mensajes" className="p-1.5 md:p-2 rounded-xl border bg-gray-800 text-gray-500 border-white/5 hover:text-cyan-400"><ListCheckIcon className="w-4 h-4" /></button>
                            </div>
                        </>
                    )}
                </div>, 
                portalTarget
            )}`;

if (code.includes('const targetStr')) {
    console.log("Already replaced?");
}
code = code.replace(targetStr, replacement);
fs.writeFileSync('components/director/DirectorChatInterface.tsx', code, 'utf8');
console.log("Replaced toolbar");
