const fs = require('fs');
let code = fs.readFileSync('components/DirectorModeModal.tsx', 'utf8');

const hookStr = `    const handleDeleteMessageLocal = useCallback((msgIdOrIds: string | string[]) => {`;
const replacement = `    const handleReorderMessagesLocal = useCallback((newMessages: ChatMessage[]) => {
        if (targetNode) {
            onUpdateNodeData(targetNode.data.id, { directorChatHistory: newMessages });
        }
    }, [targetNode?.data.id, onUpdateNodeData]);

    const handleDeleteMessageLocal = useCallback((msgIdOrIds: string | string[]) => {`;

code = code.replace(hookStr, replacement);
code = code.replace(
    'onToggleBookmark={onToggleBookmark ? handleToggleBookmarkLocal : undefined}',
    'onToggleBookmark={onToggleBookmark ? handleToggleBookmarkLocal : undefined}\n                        onReorderMessages={handleReorderMessagesLocal}'
);

fs.writeFileSync('components/DirectorModeModal.tsx', code, 'utf8');
console.log("Patched DirectorModeModal.tsx");
