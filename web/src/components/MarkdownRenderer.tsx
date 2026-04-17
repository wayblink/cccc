import { useMemo, useEffect, useRef } from 'react';
import MarkdownIt from 'markdown-it';
import type { MessageAttachment } from '../types';
import { classNames } from '../utils/classNames';
import type { TextDocumentReferenceMatch } from '../utils/messageAttachments';
import { INLINE_DOCUMENT_LINK_CLASS_NAME } from './messageBubble/InlineDocumentText';
import { copyTextToClipboard } from '../utils/copy';

interface MarkdownRendererProps {
    content: string;
    isDark?: boolean;
    className?: string;
    /** Force light text (for colored backgrounds like user messages) */
    invertText?: boolean;
    textDocumentMatches?: TextDocumentReferenceMatch[];
    onTextDocumentClick?: (attachment: MessageAttachment) => void;
}

function replaceInlineDocumentMentions(
    container: HTMLDivElement,
    matches: TextDocumentReferenceMatch[],
): void {
    const referencesByText = new Map<string, MessageAttachment>();

    matches.forEach((match) => {
        const matchedText = String(match.matchedText || "");
        const attachmentPath = String(match.attachment.path || "").trim();
        if (!matchedText || !attachmentPath || referencesByText.has(matchedText)) return;
        referencesByText.set(matchedText, match.attachment);
    });

    if (referencesByText.size <= 0) return;

    const matchTexts = Array.from(referencesByText.keys()).sort((left, right) => right.length - left.length);
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent || !String(node.textContent || "").trim()) return NodeFilter.FILTER_REJECT;
            if (parent.closest('pre')) return NodeFilter.FILTER_REJECT;
            if (parent.closest('a')) return NodeFilter.FILTER_REJECT;
            if (parent.closest('button, textarea, input, select')) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        },
    });

    const textNodes: Text[] = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
        textNodes.push(currentNode as Text);
        currentNode = walker.nextNode();
    }

    textNodes.forEach((textNode) => {
        const value = String(textNode.textContent || "");
        let cursor = 0;
        let didReplace = false;
        const fragment = document.createDocumentFragment();

        while (cursor < value.length) {
            let nextIndex = -1;
            let nextMatchText = "";

            matchTexts.forEach((matchText) => {
                const index = value.indexOf(matchText, cursor);
                if (index < 0) return;
                if (nextIndex < 0 || index < nextIndex || (index === nextIndex && matchText.length > nextMatchText.length)) {
                    nextIndex = index;
                    nextMatchText = matchText;
                }
            });

            if (nextIndex < 0 || !nextMatchText) break;
            if (nextIndex > cursor) {
                fragment.append(document.createTextNode(value.slice(cursor, nextIndex)));
            }

            const attachment = referencesByText.get(nextMatchText);
            const link = document.createElement('a');
            link.href = '#';
            link.dataset.documentLink = 'true';
            link.dataset.documentPath = String(attachment?.path || '');
            link.className = INLINE_DOCUMENT_LINK_CLASS_NAME;
            link.style.color = 'inherit';
            link.textContent = nextMatchText;
            fragment.append(link);

            cursor = nextIndex + nextMatchText.length;
            didReplace = true;
        }

        if (!didReplace) return;
        if (cursor < value.length) {
            fragment.append(document.createTextNode(value.slice(cursor)));
        }
        textNode.parentNode?.replaceChild(fragment, textNode);
    });
}

export function MarkdownRenderer({
    content,
    isDark,
    className,
    invertText,
    textDocumentMatches = [],
    onTextDocumentClick,
}: MarkdownRendererProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const md = useMemo(() => {
        const instance = new MarkdownIt({
            html: false, // Security: Disable raw HTML to prevent XSS
            linkify: true,
            typographer: true,
            breaks: true,
            highlight: (str: string, lang: string): string => {
                const finalLang = lang?.toLowerCase().trim() || 'code';
                const escaped = instance.utils.escapeHtml(str);

                // 代码块带 Copy 按钮，无语法高亮
                // 使用 CSS 类切换显示状态，避免直接修改 innerHTML 与 React reconciliation 冲突
                return (
                    '<div class="code-block-wrapper relative group">' +
                    '<div class="code-block-header flex items-center justify-between">' +
                    '<span class="uppercase">' + finalLang + '</span>' +
                    '<button class="copy-button flex items-center gap-1 select-none" data-code="' + encodeURIComponent(str) + '">' +
                    '<span class="copy-icon pointer-events-none"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg></span>' +
                    '<span class="copy-text pointer-events-none">Copy</span>' +
                    '<span class="copied-icon pointer-events-none hidden text-green-500 dark:text-emerald-400"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></span>' +
                    '<span class="copied-text pointer-events-none hidden text-green-500 dark:text-emerald-400">Copied!</span>' +
                    '</button>' +
                    '</div>' +
                    '<pre><code class="language-' + finalLang + '">' + escaped + '</code></pre>' +
                    '</div>'
                );
            },
        });
        return instance;
    }, []);

    const htmlContent = useMemo(() => {
        return md.render(content || "");
    }, [md, content]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = htmlContent;
        replaceInlineDocumentMentions(container, textDocumentMatches);
    }, [htmlContent, textDocumentMatches]);

    // 使用事件委托处理复制逻辑与正文文档打开逻辑
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const attachmentByPath = new Map<string, MessageAttachment>();
        textDocumentMatches.forEach((match) => {
            const path = String(match.attachment.path || "").trim();
            if (!path || attachmentByPath.has(path)) return;
            attachmentByPath.set(path, match.attachment);
        });

        const handleCopy = async (e: MouseEvent) => {
            const documentLink = (e.target as HTMLElement).closest('a[data-document-link="true"]');
            if (documentLink) {
                e.preventDefault();
                e.stopPropagation();
                const path = String(documentLink.getAttribute('data-document-path') || '').trim();
                const attachment = attachmentByPath.get(path);
                if (attachment) onTextDocumentClick?.(attachment);
                return;
            }

            const button = (e.target as HTMLElement).closest('.copy-button');
            if (!button) return;

            e.preventDefault();
            e.stopPropagation();

            const code = decodeURIComponent(button.getAttribute('data-code') || '');
            if (!code) {
                console.error('No code found in data-code attribute');
                return;
            }
            try {
                const copied = await copyTextToClipboard(code);
                if (!copied) throw new Error('copy failed');
                // 使用 CSS 类切换显示状态，避免修改 innerHTML 导致 React DOM 同步错误
                button.classList.add('copied', 'pointer-events-none');
                const copyIcon = button.querySelector('.copy-icon');
                const copyText = button.querySelector('.copy-text');
                const copiedIcon = button.querySelector('.copied-icon');
                const copiedText = button.querySelector('.copied-text');
                if (copyIcon) copyIcon.classList.add('hidden');
                if (copyText) copyText.classList.add('hidden');
                if (copiedIcon) copiedIcon.classList.remove('hidden');
                if (copiedText) copiedText.classList.remove('hidden');

                setTimeout(() => {
                    button.classList.remove('copied', 'pointer-events-none');
                    if (copyIcon) copyIcon.classList.remove('hidden');
                    if (copyText) copyText.classList.remove('hidden');
                    if (copiedIcon) copiedIcon.classList.add('hidden');
                    if (copiedText) copiedText.classList.add('hidden');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy code:', err);
            }
        };

        container.addEventListener('click', handleCopy);
        return () => container.removeEventListener('click', handleCopy);
    }, [htmlContent, onTextDocumentClick, textDocumentMatches]);

    return (
        <div
            ref={containerRef}
            className={classNames(
                'markdown-body prose max-w-none prose-sm',
                (isDark || invertText) ? 'prose-invert' : '',
                '[&_p]:m-0 [&_ul]:my-1 [&_ol]:my-1',
                '[&_a]:![color:inherit] [&_a]:underline',
                className
            )}
            style={{ color: 'inherit' }}
        />
    );
}
