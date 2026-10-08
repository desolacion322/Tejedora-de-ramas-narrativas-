const fs = require('fs');
let code = fs.readFileSync('components/director/DirectorChatInterface.tsx', 'utf8');

code = code.replace(
    'onDeleteMessage?: (msgId: string | string[]) => void;',
    'onDeleteMessage?: (msgId: string | string[]) => void;\n    onReorderMessages?: (newMessages: ChatMessage[]) => void;'
);

code = code.replace(
    'onDeleteMessage, onRegenerateResponse, initialInput = \'\', onStop, onSplitChat,',
    'onDeleteMessage, onReorderMessages, onRegenerateResponse, initialInput = \'\', onStop, onSplitChat,'
);

const reorderLogic = `    const handleBulkDelete = () => {
        if (!onDeleteMessage) return;
        if (confirm(\`¿Estás seguro de que quieres eliminar \${selectedIds.size} mensajes?\`)) {
            onDeleteMessage(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
        }
    };

    const moveSelectedUp = () => {
        if (!onReorderMessages) return;
        const newMessages = [...messages];
        let moved = false;
        for (let i = 1; i < newMessages.length; i++) {
            if (selectedIds.has(newMessages[i].id) && !selectedIds.has(newMessages[i - 1].id)) {
                const temp = newMessages[i - 1];
                newMessages[i - 1] = newMessages[i];
                newMessages[i] = temp;
                moved = true;
            }
        }
        if (moved) onReorderMessages(newMessages);
    };

    const moveSelectedDown = () => {
        if (!onReorderMessages) return;
        const newMessages = [...messages];
        let moved = false;
        for (let i = newMessages.length - 2; i >= 0; i--) {
            if (selectedIds.has(newMessages[i].id) && !selectedIds.has(newMessages[i + 1].id)) {
                const temp = newMessages[i + 1];
                newMessages[i + 1] = newMessages[i];
                newMessages[i] = temp;
                moved = true;
            }
        }
        if (moved) onReorderMessages(newMessages);
    };`;

code = code.replace(
    /    const handleBulkDelete = \(\) => \{\s+if \(!onDeleteMessage\) return;\s+if \(confirm\(`¿Estás seguro de que quieres eliminar \$\{selectedIds\.size\} mensajes\?`\)\) \{\s+onDeleteMessage\(Array\.from\(selectedIds\)\);\s+setSelectedIds\(new Set\(\)\);\s+setIsSelectionMode\(false\);\s+\}\s+\};/,
    reorderLogic
);

const toolbarButtons = `                            <div className="flex items-center space-x-1 md:space-x-2">
                                <button onClick={moveSelectedUp} disabled={selectedIds.size === 0} className="p-1.5 rounded-lg bg-gray-800 text-white hover:text-cyan-400 disabled:opacity-30"><ArrowUpIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                                <button onClick={moveSelectedDown} disabled={selectedIds.size === 0} className="p-1.5 rounded-lg bg-gray-800 text-white hover:text-cyan-400 disabled:opacity-30"><ArrowDownIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                                <button onClick={handleSelectAll} className="px-2 py-1 md:px-4 md:py-1.5 rounded-lg text-[8px] md:text-[10px] font-black bg-cyan-700 text-white border border-cyan-400/50 uppercase">Todos</button>
                                <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="p-1.5 rounded-lg bg-red-600 text-white disabled:opacity-30"><TrashIcon className="w-4 h-4 md:w-5 md:h-5" /></button>
                            </div>`;

code = code.replace(
    /<div className="flex items-center space-x-1 md:space-x-2">\s*<button onClick=\{handleSelectAll\} className="px-2 py-1 md:px-4 md:py-1\.5 rounded-lg text-\[8px\] md:text-\[10px\] font-black bg-cyan-700 text-white border border-cyan-400\/50 uppercase">Todos<\/button>\s*<button onClick=\{handleBulkDelete\} disabled=\{selectedIds\.size === 0\} className="p-1\.5 rounded-lg bg-red-600 text-white disabled:opacity-30"><TrashIcon className="w-4 h-4 md:w-5 md:h-5" \/><\/button>\s*<\/div>/,
    toolbarButtons
);

fs.writeFileSync('components/director/DirectorChatInterface.tsx', code, 'utf8');
console.log("Patched DirectorChatInterface.tsx");
