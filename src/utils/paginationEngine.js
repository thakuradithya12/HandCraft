/**
 * Pagination Engine V3 — splits text into pages based on A4 dimensions.
 * Now supports diagram blocks that take up variable vertical space.
 */

import { isDiagramLine, parseDiagramMarker, getDiagramHeight } from './diagramRenderer.js';

// A4 at 300 DPI
export const A4_WIDTH_PX = 2480;
export const A4_HEIGHT_PX = 3508;

// Margins in pixels (at 300 DPI)
const TOP_MARGIN = 140;
const BOTTOM_MARGIN = 100;

/**
 * Parse raw text into structured paragraphs with heading and diagram detection.
 */
export function parseText(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split('\n');
    const blocks = [];
    let currentParagraph = [];

    for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '') {
            if (currentParagraph.length > 0) {
                blocks.push({
                    type: 'paragraph',
                    text: currentParagraph.join(' ')
                });
                currentParagraph = [];
            }
            continue;
        }

        // Diagram detection
        if (isDiagramLine(trimmed)) {
            if (currentParagraph.length > 0) {
                blocks.push({ type: 'paragraph', text: currentParagraph.join(' ') });
                currentParagraph = [];
            }
            const diagram = parseDiagramMarker(trimmed);
            if (diagram) {
                blocks.push({
                    type: 'diagram',
                    diagram,
                    height: getDiagramHeight(diagram.type)
                });
            }
            continue;
        }

        // Heading detection: lines starting with #
        if (trimmed.startsWith('#')) {
            if (currentParagraph.length > 0) {
                blocks.push({ type: 'paragraph', text: currentParagraph.join(' ') });
                currentParagraph = [];
            }
            const level = trimmed.match(/^#+/)[0].length;
            blocks.push({
                type: 'heading',
                level: Math.min(level, 3),
                text: trimmed.replace(/^#+\s*/, '')
            });
            continue;
        }

        // Short ALL CAPS lines as headings
        if (trimmed.length < 60 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
            if (currentParagraph.length > 0) {
                blocks.push({ type: 'paragraph', text: currentParagraph.join(' ') });
                currentParagraph = [];
            }
            blocks.push({ type: 'heading', level: 2, text: trimmed });
            continue;
        }

        currentParagraph.push(trimmed);
    }

    if (currentParagraph.length > 0) {
        blocks.push({ type: 'paragraph', text: currentParagraph.join(' ') });
    }

    return blocks;
}

/**
 * Calculate how many ruled lines fit on a single page.
 */
export function getLinesPerPage(lineSpacing, hasHeader, headerLineCount = 0) {
    const usableHeight = A4_HEIGHT_PX - TOP_MARGIN - BOTTOM_MARGIN;
    const totalLines = Math.floor(usableHeight / lineSpacing);

    if (hasHeader) {
        return totalLines - headerLineCount - 1;
    }
    return totalLines;
}

/**
 * Word-wrap text to fit within available width.
 */
export function wordWrap(text, maxCharsPerLine) {
    if (!text) return [''];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            if (currentLine) lines.push(currentLine);
            if (word.length > maxCharsPerLine) {
                let remaining = word;
                while (remaining.length > maxCharsPerLine) {
                    lines.push(remaining.substring(0, maxCharsPerLine - 1) + '-');
                    remaining = remaining.substring(maxCharsPerLine - 1);
                }
                currentLine = remaining;
            } else {
                currentLine = word;
            }
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
}

/**
 * Estimate characters per line based on font size and available width.
 */
export function estimateCharsPerLine(fontSize, pageType) {
    const leftMargin = (pageType.marginLeft || 120) + 30;
    const rightMargin = pageType.marginRight ? (pageType.marginRight + 20) : 100;
    const availableWidth = A4_WIDTH_PX - leftMargin - rightMargin;
    const charWidth = fontSize * 0.48;
    return Math.floor(availableWidth / charWidth);
}

/**
 * Paginate content blocks into pages of line arrays.
 * Now handles diagram blocks that consume vertical space.
 */
export function paginateContent(blocks, style, pageType, headerInfo) {
    const lineSpacing = style.fontSize * style.lineHeight;
    const charsPerLine = estimateCharsPerLine(style.fontSize, pageType);
    const usableHeight = A4_HEIGHT_PX - TOP_MARGIN - BOTTOM_MARGIN;

    // Build header lines
    const headerLines = [];
    if (headerInfo) {
        if (headerInfo.title) headerLines.push({ text: headerInfo.title, type: 'header-title' });
        const details = [];
        if (headerInfo.name) details.push(`Name: ${headerInfo.name}`);
        if (headerInfo.rollNumber) details.push(`Roll No: ${headerInfo.rollNumber}`);
        if (details.length) headerLines.push({ text: details.join('     '), type: 'header-detail' });
        const details2 = [];
        if (headerInfo.subject) details2.push(`Subject: ${headerInfo.subject}`);
        if (headerInfo.date) details2.push(`Date: ${headerInfo.date}`);
        if (details2.length) headerLines.push({ text: details2.join('     '), type: 'header-detail' });
        if (headerLines.length > 0) {
            headerLines.push({ text: '', type: 'spacer' });
        }
    }

    // Convert blocks → flat lines (with diagram entries)
    const allLines = [];
    for (const block of blocks) {
        if (block.type === 'diagram') {
            allLines.push({ text: '', type: 'spacer' });
            allLines.push({
                type: 'diagram',
                diagram: block.diagram,
                heightPx: block.height
            });
            allLines.push({ text: '', type: 'spacer' });
        } else if (block.type === 'heading') {
            if (allLines.length > 0) {
                allLines.push({ text: '', type: 'spacer' });
            }
            const wrapped = wordWrap(block.text, Math.floor(charsPerLine * 0.82));
            for (const wl of wrapped) {
                allLines.push({ text: wl, type: 'heading', level: block.level });
            }
            allLines.push({ text: '', type: 'spacer' });
        } else {
            const wrapped = wordWrap(block.text, charsPerLine);
            for (const wl of wrapped) {
                allLines.push({ text: wl, type: 'paragraph' });
            }
            allLines.push({ text: '', type: 'spacer' });
        }
    }

    // Distribute across pages with diagram height awareness
    const pages = [];
    let lineIndex = 0;

    while (lineIndex < allLines.length) {
        const isFirstPage = pages.length === 0;
        const pageLines = [];

        let currentY = 0;

        // Add header on first page
        if (isFirstPage && headerLines.length > 0) {
            pageLines.push(...headerLines);
            currentY += headerLines.length * lineSpacing;
        }

        while (lineIndex < allLines.length) {
            const line = allLines[lineIndex];

            if (line.type === 'diagram') {
                const diagramSpace = line.heightPx || 320;
                if (currentY + diagramSpace > usableHeight && pageLines.length > 0) {
                    break; // diagram doesn't fit, start new page
                }
                pageLines.push(line);
                currentY += diagramSpace;
                lineIndex++;
            } else {
                if (currentY + lineSpacing > usableHeight) {
                    break; // text line doesn't fit
                }
                pageLines.push(line);
                currentY += lineSpacing;
                lineIndex++;
            }
        }

        pages.push({ lines: pageLines, isFirstPage });
    }

    if (pages.length === 0) {
        const pageLines = headerLines.length > 0 ? [...headerLines] : [];
        pages.push({ lines: pageLines, isFirstPage: true });
    }

    return pages;
}
