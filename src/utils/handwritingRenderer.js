/**
 * Handwriting Renderer V3 — renders text as realistic human handwriting
 * onto HTML5 Canvas with A4 notebook page formatting.
 * 
 * V3 additions:
 * - Inline diagram rendering support (pencil-style diagrams)
 */

import { A4_WIDTH_PX, A4_HEIGHT_PX } from './paginationEngine.js';
import { createVariationEngine, INK_COLORS } from './variationEngine.js';
import { renderDiagram } from './diagramRenderer.js';

const TOP_MARGIN = 140;

/**
 * Draw realistic notebook page background.
 */
function drawPageBackground(ctx, pageType, lineSpacing) {
    // Paper color — warm off-white
    const paperColor = pageType.paperColor || '#FFFEF5';
    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, A4_WIDTH_PX, A4_HEIGHT_PX);

    // Paper texture — organic grain
    const grainColors = ['#e8e4d8', '#ddd9cc', '#eae6da', '#d5d0c4'];
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 2000; i++) {
        const x = Math.random() * A4_WIDTH_PX;
        const y = Math.random() * A4_HEIGHT_PX;
        const size = 0.5 + Math.random() * 1.5;
        ctx.fillStyle = grainColors[Math.floor(Math.random() * grainColors.length)];
        ctx.fillRect(x, y, size, size);
    }
    // Subtle fiber lines
    ctx.globalAlpha = 0.015;
    for (let i = 0; i < 40; i++) {
        const x1 = Math.random() * A4_WIDTH_PX;
        const y1 = Math.random() * A4_HEIGHT_PX;
        ctx.strokeStyle = '#c0b8a0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + (Math.random() - 0.5) * 60, y1 + (Math.random() - 0.5) * 8);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    if (pageType.hasRuledLines) {
        // Horizontal ruled lines
        const startY = TOP_MARGIN;
        const endY = A4_HEIGHT_PX - 140;

        for (let y = startY; y <= endY; y += lineSpacing) {
            ctx.strokeStyle = pageType.ruledLineColor || '#a8c8e8';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x < A4_WIDTH_PX; x += 100) {
                const wobble = (Math.random() - 0.5) * 0.5;
                ctx.lineTo(x, y + wobble);
            }
            ctx.lineTo(A4_WIDTH_PX, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        // Left margin line
        if (pageType.marginLeft) {
            ctx.strokeStyle = pageType.marginLineColor || '#d94040';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            ctx.moveTo(pageType.marginLeft, 0);
            ctx.lineTo(pageType.marginLeft, A4_HEIGHT_PX);
            ctx.stroke();
            // Double line effect
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(pageType.marginLeft + 6, 0);
            ctx.lineTo(pageType.marginLeft + 6, A4_HEIGHT_PX);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }

        // Right margin line
        if (pageType.marginRight) {
            ctx.strokeStyle = pageType.marginLineColor || '#d94040';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.65;
            ctx.beginPath();
            ctx.moveTo(A4_WIDTH_PX - pageType.marginRight, 0);
            ctx.lineTo(A4_WIDTH_PX - pageType.marginRight, A4_HEIGHT_PX);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    }

    // Subtle shadow at top edge
    const topGrad = ctx.createLinearGradient(0, 0, 0, 20);
    topGrad.addColorStop(0, 'rgba(0,0,0,0.03)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, A4_WIDTH_PX, 20);
}

/**
 * Get a slightly varied ink color for a character.
 */
function getInkColor(inkColorKey, variation) {
    const ink = INK_COLORS[inkColorKey] || INK_COLORS.blue;
    const varIdx = Math.floor(variation.random() * ink.variations.length);
    const color = ink.variations[varIdx];
    return color;
}

/**
 * Render a single character with natural variation.
 * If glyphMap is provided and has this character, draws the glyph image.
 * Otherwise falls back to font-based rendering.
 */
function renderChar(ctx, char, x, y, charIndex, variation, style, inkColorKey, glyphMap) {
    variation.tick();

    const yOffset = variation.baselineJitter(style.variationIntensity)
        + variation.baselineWave(charIndex, style.variationIntensity * 0.6);
    const xOffset = variation.letterSpacingJitter(style.variationIntensity * 0.5);
    const rotation = variation.rotationJitter(style.variationIntensity);
    const fontSize = variation.sizeJitter(style.fontSize, style.variationIntensity * 0.6);
    const opacity = variation.opacityJitter(style.variationIntensity);

    const color = getInkColor(inkColorKey, variation);

    ctx.save();
    ctx.translate(x + xOffset, y + yOffset);
    ctx.rotate(rotation);

    // Custom glyph rendering with synthetic variation
    if (glyphMap && glyphMap[char]) {
        const glyph = glyphMap[char];
        const scale = fontSize / 60;

        // Synthetic variation: random micro-transforms for each character instance
        const scaleVar = 0.92 + variation.random() * 0.16;   // 0.92 to 1.08
        const skewX = (variation.random() - 0.5) * 0.08;     // slight horizontal shear
        const weightVar = 0.95 + variation.random() * 0.1;    // thickness variation

        const drawW = Math.ceil(glyph.width * scale * scaleVar);
        const drawH = Math.ceil(glyph.height * scale * scaleVar * weightVar);

        if (drawW > 0 && drawH > 0) {
            // Use offscreen canvas to tint the glyph in isolation
            if (!renderChar._tintCanvas) {
                renderChar._tintCanvas = document.createElement('canvas');
                renderChar._tintCtx = renderChar._tintCanvas.getContext('2d');
            }
            const tc = renderChar._tintCanvas;
            const tctx = renderChar._tintCtx;

            const pad = 6;
            tc.width = drawW + pad * 2;
            tc.height = drawH + pad * 2;

            // Clear and draw with skew transform for synthetic variation
            tctx.clearRect(0, 0, tc.width, tc.height);
            tctx.save();
            tctx.transform(1, 0, skewX, 1, pad, pad);
            tctx.drawImage(glyph, 0, 0, drawW, drawH);
            tctx.restore();

            // Tint with ink color
            tctx.globalCompositeOperation = 'source-atop';
            tctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            tctx.fillRect(0, 0, tc.width, tc.height);
            tctx.globalCompositeOperation = 'source-over';

            // Draw the tinted, varied glyph onto the main canvas
            ctx.globalAlpha = opacity;
            ctx.drawImage(tc, -pad, -drawH * 0.75 - pad);
            ctx.globalAlpha = 1.0;
        }

        ctx.restore();
        return;
    }

    // Font-based fallback
    // Ink blob effect
    // Ink blob effect
    if (variation.inkBlob()) {
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity * 0.6})`; // Darker blobs
        ctx.font = `${style.weight} ${fontSize + 3}px "${style.fontFamily}", cursive`;
        ctx.fillText(char, 0.5, 0.5);
    }

    // Main text - Higher opacity for better contrast
    const contrastOpacity = Math.min(1.0, opacity + 0.15);
    ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${contrastOpacity})`;
    ctx.font = `${style.weight} ${fontSize}px "${style.fontFamily}", cursive`;
    ctx.fillText(char, 0, 0);

    ctx.restore();
}

/**
 * Render a full line of text with character-by-character variation.
 */
function renderLine(ctx, text, startX, y, variation, style, inkColorKey, isHeading, headingLevel, glyphMap) {
    if (!text || text.trim() === '') return;

    const lineAngle = variation.lineAngle(style.variationIntensity);

    const fontSize = isHeading
        ? style.fontSize * (headingLevel === 1 ? 1.35 : 1.18)
        : style.fontSize;

    const effectiveStyle = isHeading
        ? { ...style, fontSize, weight: '700' }
        : style;

    ctx.save();
    ctx.translate(startX, y);
    ctx.rotate(lineAngle);
    ctx.translate(-startX, -y);

    ctx.font = `${effectiveStyle.weight} ${effectiveStyle.fontSize}px "${effectiveStyle.fontFamily}", cursive`;

    let x = startX + variation.lineStartJitter(style.variationIntensity);
    const headingStartX = x;

    let inWord = false;
    let currentWordShift = 0;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (char === ' ') {
            inWord = false;
        } else if (!inWord) {
            inWord = true;
            currentWordShift = variation.wordShift(style.variationIntensity);
        }

        ctx.font = `${effectiveStyle.weight} ${effectiveStyle.fontSize}px "${effectiveStyle.fontFamily}", cursive`;
        const charWidth = glyphMap && glyphMap[char]
            ? (glyphMap[char].width * (effectiveStyle.fontSize / 60))
            : ctx.measureText(char).width;

        if (char !== ' ') {
            renderChar(ctx, char, x, y + currentWordShift, i, variation, effectiveStyle, inkColorKey, glyphMap);
        }

        x += charWidth + style.letterSpacing + variation.letterSpacingJitter(style.variationIntensity * 0.25);

        if (char === ' ') {
            x += variation.wordSpacingJitter(style.variationIntensity);
        }
    }

    // Underline for headings
    if (isHeading) {
        const color = getInkColor(inkColorKey, variation);
        ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.45)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const underlineY = y + 10;
        ctx.moveTo(headingStartX, underlineY + (Math.random() - 0.5) * 2);
        const segments = 8;
        const segWidth = (x - headingStartX) / segments;
        for (let s = 1; s <= segments; s++) {
            ctx.lineTo(
                headingStartX + s * segWidth,
                underlineY + (Math.random() - 0.5) * 3
            );
        }
        ctx.stroke();
    }

    ctx.restore();
}

/**
 * Render a complete page of handwritten content (with diagrams).
 */
export function renderPage(canvas, page, style, pageType, inkColor, pageIndex = 0, totalPages = 1, glyphMap = null, fatigueMode = 'none') {
    canvas.width = A4_WIDTH_PX;
    canvas.height = A4_HEIGHT_PX;

    const ctx = canvas.getContext('2d');
    const lineSpacing = style.fontSize * style.lineHeight;
    const textStartX = (pageType.marginLeft || 120) + 30;
    const textWidth = A4_WIDTH_PX - textStartX - (pageType.marginRight ? pageType.marginRight + 20 : 100);

    // Compute progress through document for fatigue
    const pageProgress = totalPages > 1 ? pageIndex / (totalPages - 1) : 0;

    // Seed variation per page with fatigue
    const variation = createVariationEngine(pageIndex * 13337 + 7919, fatigueMode, pageProgress);

    // Draw page background
    drawPageBackground(ctx, pageType, lineSpacing);

    // Render each line
    let y = TOP_MARGIN;

    for (const line of page.lines) {
        if (line.type === 'spacer') {
            y += lineSpacing * 0.55;
            continue;
        }

        // DIAGRAM RENDERING
        if (line.type === 'diagram') {
            const diagramHeight = line.heightPx || 320;
            renderDiagram(ctx, line.diagram, textStartX - 10, y, textWidth + 20, diagramHeight);
            y += diagramHeight;
            continue;
        }

        const isHeading = line.type === 'heading' || line.type === 'header-title';
        const isHeaderDetail = line.type === 'header-detail';
        const headingLevel = line.level || 2;

        if (isHeading) {
            renderLine(ctx, line.text, textStartX, y, variation, style, inkColor, true, headingLevel, glyphMap);
        } else if (isHeaderDetail) {
            const headerStyle = {
                ...style,
                fontSize: style.fontSize * 0.88,
                variationIntensity: style.variationIntensity * 0.65
            };
            renderLine(ctx, line.text, textStartX, y, variation, headerStyle, inkColor, false, 2, glyphMap);
        } else {
            renderLine(ctx, line.text, textStartX, y, variation, style, inkColor, false, 2, glyphMap);
        }

        y += lineSpacing;

        if (y > A4_HEIGHT_PX - 100) break;
    }

    // Page number
    if (totalPages > 1) {
        const pageNumText = `- ${pageIndex + 1} -`;
        const color = getInkColor(inkColor, variation);
        const pageNumSize = style.fontSize * 0.7;
        ctx.font = `${style.weight} ${pageNumSize}px "${style.fontFamily}", cursive`;
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.55)`;
        ctx.textAlign = 'center';
        ctx.fillText(pageNumText, A4_WIDTH_PX / 2, A4_HEIGHT_PX - 60);
        ctx.textAlign = 'start';
    }
}

/**
 * Render all pages and return canvas elements.
 */
export function renderAllPages(pages, style, pageType, inkColor, glyphMap = null, fatigueMode = 'none') {
    const canvases = [];
    const total = pages.length;

    for (let i = 0; i < total; i++) {
        const canvas = document.createElement('canvas');
        renderPage(canvas, pages[i], style, pageType, inkColor, i, total, glyphMap, fatigueMode);
        canvases.push(canvas);
    }

    return canvases;
}
