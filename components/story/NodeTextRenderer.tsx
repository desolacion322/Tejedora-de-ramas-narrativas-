
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { RichTextRenderer } from '../ui/RichTextRenderer';
import { Character } from '../../types';

interface NodeTextRendererProps {
    text: string;
    allCharacters?: Character[];
    onChange?: (newText: string) => void;
}

const EditableParagraph: React.FC<{
    text: string;
    paraId: string;
    onChange?: (newText: string) => void;
    renderContent: (text: string) => React.ReactNode;
}> = ({ text, paraId, onChange, renderContent }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setValue(text);
    }, [text]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
            textareaRef.current.focus();
        }
    }, [isEditing, value]);

    if (isEditing) {
        return (
            <textarea
                ref={textareaRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={() => {
                    setIsEditing(false);
                    if (value !== text && onChange) {
                        onChange(value);
                    }
                }}
                className="w-full bg-gray-800/90 text-gray-200 rounded p-4 font-serif text-sm md:text-lg resize-none outline-none border border-cyan-500/50 shadow-lg"
            />
        );
    }

    return (
        <div 
            data-para-id={paraId}
            onClick={() => {
                const selection = window.getSelection();
                if (selection && selection.toString().trim().length > 0) return;
                if (onChange) setIsEditing(true);
            }} 
            title={onChange ? "Clic para editar" : undefined}
            className={`w-full ${onChange ? "cursor-text hover:bg-gray-800/30 rounded transition-colors" : ""}`}
        >
            {renderContent(text)}
        </div>
    );
};

export const NodeTextRenderer: React.FC<NodeTextRendererProps> = ({ text, allCharacters = [], onChange }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    const segments = useMemo(() => {
        const result: { role: string, content: string, originalTag?: string }[] = [];
        let currentRole = 'IA';
        let currentContent = '';
        let currentTag = '';

        const lines = text.split('\n');
        for (const line of lines) {
            const match = line.trim().match(/^(\[(AUTOR|IA|SISTEMA)\]:?)$/);
            if (match) {
                if (currentContent.trim()) {
                    result.push({ role: currentRole, content: currentContent.trim(), originalTag: currentTag });
                }
                currentRole = match[2];
                currentTag = match[1];
                currentContent = '';
            } else {
                currentContent += line + '\n';
            }
        }
        if (currentContent.trim() || result.length === 0) {
            result.push({ role: currentRole, content: currentContent.trim(), originalTag: currentTag });
        }
        return result;
    }, [text]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Backspace' || e.key === 'Delete') {
                if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;

                const selection = window.getSelection();
                if (selection && !selection.isCollapsed) {
                    if (container.contains(selection.anchorNode)) {
                        const getParaId = (node: Node | null) => {
                            let curr = node instanceof Element ? node : node?.parentElement;
                            while (curr && curr !== container) {
                                if (curr.hasAttribute('data-para-id')) return curr.getAttribute('data-para-id');
                                curr = curr.parentElement;
                            }
                            return null;
                        };

                        const startId = getParaId(selection.anchorNode);
                        const endId = getParaId(selection.focusNode);

                        if (startId && endId && startId !== endId) {
                            e.preventDefault();
                            
                            const paragraphs = Array.from(container.querySelectorAll('[data-para-id]')) as HTMLElement[];
                            const idsToDelete = new Set<string>();
                            
                            paragraphs.forEach(p => {
                                if (selection.containsNode(p, true)) {
                                    idsToDelete.add(p.getAttribute('data-para-id')!);
                                }
                            });
                            
                            if (idsToDelete.size > 0 && onChange) {
                                let newText = "";
                                segments.forEach((seg, sIdx) => {
                                    const paras = seg.content.split(/\n\n+/);
                                    const kept = paras.filter((p, pIdx) => !idsToDelete.has(`${sIdx}-${pIdx}`));
                                    
                                    if (kept.length > 0) {
                                        const tag = seg.originalTag || `[${seg.role}]`;
                                        newText += `${tag}\n${kept.join('\n\n')}\n\n`;
                                    }
                                });
                                onChange(newText.trim());
                                selection.removeAllRanges();
                            }
                        }
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [segments, onChange]);

    const handleParagraphChange = (segmentIndex: number, paragraphIndex: number, newParagraphText: string) => {
        if (!onChange) return;
        
        const newSegments = [...segments];
        const seg = newSegments[segmentIndex];
        const paragraphs = seg.content.split(/\n\n+/);
        paragraphs[paragraphIndex] = newParagraphText;
        seg.content = paragraphs.join('\n\n');
        
        const isBareText = segments.length === 1 && segments[0].role === 'IA' && !text.startsWith('[IA]:') && !text.startsWith('[IA]');
        
        if (isBareText) {
            onChange(seg.content);
        } else {
            const newText = newSegments.map(s => {
                if (!s.content.trim()) return '';
                const tag = s.originalTag || `[${s.role}]`;
                return `${tag}\n${s.content}`;
            }).filter(Boolean).join('\n\n');
            onChange(newText);
        }
    };

    return (
        <div className="space-y-6" ref={containerRef}>
            {segments.map((segment, index) => {
                if (!segment.content) return null;
                const paragraphs = segment.content.split(/\n\n+/);
                const isAuthor = segment.role === 'AUTOR';
                const isSystem = segment.role === 'SISTEMA';
                const isAi = segment.role === 'IA';

                // If it's a single IA segment without tags, don't wrap it in a bubble
                const isBareText = segments.length === 1 && isAi && !text.startsWith('[IA]:');

                if (isBareText) {
                    return (
                        <div key={index} className="space-y-4 md:space-y-6 w-full">
                            {paragraphs.map((pText, pIndex) => (
                                <EditableParagraph
                                    key={pIndex}
                                    text={pText}
                                    paraId={`${index}-${pIndex}`}
                                    onChange={onChange ? (newVal) => handleParagraphChange(index, pIndex, newVal) : undefined}
                                    renderContent={(currentPText) => {
                                        let charAvatarMatch = null;
                                        if (allCharacters.length > 0) {
                                            const match = currentPText.match(/^(?:\*\*)?([A-Za-zÀ-ÿ0-9 _\-./(),'|]+)(?:\*\*)?:\s*(.*)/s);
                                    if (match) {
                                        const namePart = match[1].trim();
                                        const contentPart = match[2].trim();
                                        let char = null;
                                        const cleanNamePart = namePart.toLowerCase();

                                        char = allCharacters.find(c => c.name.toLowerCase() === cleanNamePart);
                                        if (!char) {
                                            char = allCharacters.find(c => c.aliases && c.aliases.some(a => {
                                                const parts = a.split(/[,/;|]+/).map(p => p.trim().toLowerCase());
                                                return parts.includes(cleanNamePart) || a.toLowerCase() === cleanNamePart;
                                            }));
                                        }
                                        if (!char) {
                                            const sorted = [...allCharacters].sort((a,b) => b.name.length - a.name.length);
                                            char = sorted.find(c => 
                                                cleanNamePart.includes(c.name.toLowerCase()) || 
                                                c.name.toLowerCase().includes(cleanNamePart) ||
                                                (c.aliases && c.aliases.some(a => a.toLowerCase().includes(cleanNamePart)))
                                            );
                                        }

                                        if (char) {
                                            let expressionImg = char.avatar;
                                            let cleanText = contentPart;
                                            const exprMatch = contentPart.match(/^(?:—|-|–|\s)*[\(（\[]([A-Za-zÀ-ÿ0-9 _\-]+)[\)）\]]\s*(.*)/s);
                                            if (exprMatch) {
                                                const exprName = exprMatch[1].trim().toLowerCase();
                                                const restOfText = exprMatch[2].trim();
                                                const foundExpr = char.expressions?.find(e => e.name.toLowerCase() === exprName);
                                                if (foundExpr) {
                                                    expressionImg = foundExpr.imageUrl;
                                                    const trimmedContent = contentPart.trim();
                                                    const dashMatch = trimmedContent.match(/^((?:—|-|–|\s)+)/);
                                                    cleanText = dashMatch ? `${dashMatch[1].trim()} ${restOfText}` : `— ${restOfText}`;
                                                }
                                            }
                                            charAvatarMatch = { character: char, text: cleanText, nameMatched: namePart, expressionImg: expressionImg };
                                        }
                                    }
                                }

                                return (
                                    <div key={pIndex} className="relative group/block min-h-[1em] flex flex-col">
                                        {charAvatarMatch ? (
                                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start bg-gray-900/40 p-3 sm:p-4 rounded-xl border border-white/5 mt-1 mb-2 relative overflow-hidden group/dialogue shadow-lg">
                                                <div className={`absolute -left-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${charAvatarMatch.character.color || 'bg-cyan-500'}`}></div>
                                                <div className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 bg-black shadow-lg relative z-10 ${
                                                    charAvatarMatch.character.color ? 
                                                    charAvatarMatch.character.color.replace('bg-', 'border-').replace('text-', '') : 'border-cyan-500/30'
                                                }`}>
                                                    {charAvatarMatch.expressionImg ? (
                                                        <img src={charAvatarMatch.expressionImg} alt={charAvatarMatch.nameMatched} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className={`w-full h-full flex items-center justify-center text-2xl font-black ${charAvatarMatch.character.color || 'bg-gray-800 text-white'}`}>
                                                            {charAvatarMatch.nameMatched.charAt(0)}
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-0.5 sm:p-1">
                                                        <span className="text-[7px] sm:text-[8px] font-black text-white px-1 uppercase tracking-wider block text-center truncate">{charAvatarMatch.nameMatched}</span>
                                                    </div>
                                                </div>
                                                <div className="flex-grow z-10 w-full pt-0.5">
                                                    <div className={`font-black text-[10px] sm:text-xs uppercase tracking-widest mb-1 flex items-center gap-2 ${charAvatarMatch.character.color ? charAvatarMatch.character.color.replace('bg-', 'text-') : 'text-cyan-400'}`}>
                                                        <span>{charAvatarMatch.nameMatched}</span>
                                                        <div className={`h-[1px] flex-grow opacity-20 hidden sm:block ${charAvatarMatch.character.color || 'bg-cyan-400'}`}></div>
                                                    </div>
                                                    <RichTextRenderer text={charAvatarMatch.text} className="whitespace-pre-wrap font-serif text-sm md:text-lg text-gray-200 leading-relaxed" />
                                                </div>
                                            </div>
                                        ) : (
                                            <RichTextRenderer text={currentPText} className="text-base md:text-lg text-gray-200 break-words whitespace-pre-wrap pr-2 leading-relaxed font-serif tracking-wide" />
                                        )}
                                    </div>
                                );
                            }}
                        />
                    ))}
                        </div>
                    );
                }

                return (
                    <div key={index} className={`flex w-full ${isAuthor ? 'justify-end' : isSystem ? 'justify-center' : 'justify-start'}`}>
                        <div className={`group relative flex flex-col transition-all duration-300 ${isAuthor ? 'items-end max-w-[95%] md:max-w-[90%]' : isSystem ? 'items-center w-full' : 'items-start w-full'}`}>
                            <div className={`
                                rounded-xl md:rounded-2xl px-3 py-3 md:px-5 md:py-4 text-sm md:text-lg leading-[1.6] md:leading-[1.8] transition-all border relative
                                ${isAuthor ? 'bg-cyan-900/30 text-cyan-50 border-cyan-500/10 rounded-br-none' : 
                                  isSystem ? 'bg-gray-950/40 text-cyan-400 border-dashed border-cyan-500/20 w-full font-mono' : 
                                  'bg-gray-800/20 text-gray-100 rounded-bl-none border-white/5 backdrop-blur-sm w-full'}
                            `}>
                                <div className={`font-black text-[7px] md:text-[9px] opacity-30 mb-2 md:mb-3 uppercase tracking-[0.2em] md:tracking-[0.4em] flex justify-between items-center ${isSystem ? 'text-cyan-500' : isAi ? 'text-purple-400' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span>{isAuthor ? 'AUTOR' : isSystem ? 'SISTEMA' : 'INTELIGENCIA'}</span>
                                    </div>
                                </div>
                                <div className="space-y-4 md:space-y-6 w-full">
                                    {paragraphs.map((pText, pIndex) => (
                                        <EditableParagraph
                                            key={pIndex}
                                            text={pText}
                                            paraId={`${index}-${pIndex}`}
                                            onChange={onChange ? (newVal) => handleParagraphChange(index, pIndex, newVal) : undefined}
                                            renderContent={(currentPText) => {
                                                let charAvatarMatch = null;
                                                if (allCharacters.length > 0) {
                                                    const match = currentPText.match(/^(?:\*\*)?([A-Za-zÀ-ÿ0-9 _\-./(),'|]+)(?:\*\*)?:\s*(.*)/s);
                                            if (match) {
                                                const namePart = match[1].trim();
                                                const contentPart = match[2].trim();
                                                let char = null;
                                                const cleanNamePart = namePart.toLowerCase();

                                                char = allCharacters.find(c => c.name.toLowerCase() === cleanNamePart);
                                                if (!char) {
                                                    char = allCharacters.find(c => c.aliases && c.aliases.some(a => {
                                                        const parts = a.split(/[,/;|]+/).map(p => p.trim().toLowerCase());
                                                        return parts.includes(cleanNamePart) || a.toLowerCase() === cleanNamePart;
                                                    }));
                                                }
                                                if (!char) {
                                                    const sorted = [...allCharacters].sort((a,b) => b.name.length - a.name.length);
                                                    char = sorted.find(c => 
                                                        cleanNamePart.includes(c.name.toLowerCase()) || 
                                                        c.name.toLowerCase().includes(cleanNamePart) ||
                                                        (c.aliases && c.aliases.some(a => a.toLowerCase().includes(cleanNamePart)))
                                                    );
                                                }

                                                if (char) {
                                                    let expressionImg = char.avatar;
                                                    let cleanText = contentPart;
                                                    const exprMatch = contentPart.match(/^(?:—|-|–|\s)*[\(（\[]([A-Za-zÀ-ÿ0-9 _\-]+)[\)）\]]\s*(.*)/s);
                                                    if (exprMatch) {
                                                        const exprName = exprMatch[1].trim().toLowerCase();
                                                        const restOfText = exprMatch[2].trim();
                                                        const foundExpr = char.expressions?.find(e => e.name.toLowerCase() === exprName);
                                                        if (foundExpr) {
                                                            expressionImg = foundExpr.imageUrl;
                                                            const trimmedContent = contentPart.trim();
                                                            const dashMatch = trimmedContent.match(/^((?:—|-|–|\s)+)/);
                                                            cleanText = dashMatch ? `${dashMatch[1].trim()} ${restOfText}` : `— ${restOfText}`;
                                                        }
                                                    }
                                                    charAvatarMatch = { character: char, text: cleanText, nameMatched: namePart, expressionImg: expressionImg };
                                                }
                                            }
                                        }

                                        return (
                                            <div key={pIndex} className="relative group/block min-h-[1em] flex flex-col">
                                                {charAvatarMatch ? (
                                                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start bg-gray-900/40 p-3 sm:p-4 rounded-xl border border-white/5 mt-1 mb-2 relative overflow-hidden group/dialogue shadow-lg">
                                                        <div className={`absolute -left-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-10 ${charAvatarMatch.character.color || 'bg-cyan-500'}`}></div>
                                                        <div className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 bg-black shadow-lg relative z-10 ${
                                                            charAvatarMatch.character.color ? 
                                                            charAvatarMatch.character.color.replace('bg-', 'border-').replace('text-', '') : 'border-cyan-500/30'
                                                        }`}>
                                                            {charAvatarMatch.expressionImg ? (
                                                                <img src={charAvatarMatch.expressionImg} alt={charAvatarMatch.nameMatched} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className={`w-full h-full flex items-center justify-center text-2xl font-black ${charAvatarMatch.character.color || 'bg-gray-800 text-white'}`}>
                                                                    {charAvatarMatch.nameMatched.charAt(0)}
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-0.5 sm:p-1">
                                                                <span className="text-[7px] sm:text-[8px] font-black text-white px-1 uppercase tracking-wider block text-center truncate">{charAvatarMatch.nameMatched}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex-grow z-10 w-full pt-0.5">
                                                            <div className={`font-black text-[10px] sm:text-xs uppercase tracking-widest mb-1 flex items-center gap-2 ${charAvatarMatch.character.color ? charAvatarMatch.character.color.replace('bg-', 'text-') : 'text-cyan-400'}`}>
                                                                <span>{charAvatarMatch.nameMatched}</span>
                                                                <div className={`h-[1px] flex-grow opacity-20 hidden sm:block ${charAvatarMatch.character.color || 'bg-cyan-400'}`}></div>
                                                            </div>
                                                            <RichTextRenderer text={charAvatarMatch.text} className="whitespace-pre-wrap font-serif text-sm md:text-lg text-gray-200 leading-relaxed" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <RichTextRenderer text={currentPText} className="whitespace-pre-wrap font-serif text-sm md:text-lg leading-relaxed" />
                                                )}
                                            </div>
                                        );
                                    }}
                                />
                            ))}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
