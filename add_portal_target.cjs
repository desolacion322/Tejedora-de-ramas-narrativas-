const fs = require('fs');
let code = fs.readFileSync('components/director/DirectorChatInterface.tsx', 'utf8');

const hookStr = `    const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);`;
const replacement = hookStr + `\n    const [portalTarget, setPortalTarget] = useState<Element | null>(null);\n    useEffect(() => {\n        setPortalTarget(document.getElementById('director-header-portal-target'));\n    }, []);`;

code = code.replace(hookStr, replacement);
fs.writeFileSync('components/director/DirectorChatInterface.tsx', code, 'utf8');
console.log("Added portal target");
