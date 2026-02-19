/**
 * Diagram Renderer — draws hand-drawn pencil-style diagrams on canvas.
 * Supports: flowchart, tree, table, labeled, cycle
 * 
 * All diagrams use a sketchy, pencil-drawn aesthetic with slight wobble.
 */

import { A4_WIDTH_PX } from './paginationEngine.js';

const PENCIL_COLOR = '#3a3a3a';
const PENCIL_LIGHT = '#5a5a5a';
const PENCIL_FAINT = '#8a8a8a';

/**
 * Draw a sketchy/wobbly line (pencil effect).
 */
function sketchyLine(ctx, x1, y1, x2, y2, wobble = 2) {
    ctx.beginPath();
    ctx.moveTo(x1 + (Math.random() - 0.5) * wobble, y1 + (Math.random() - 0.5) * wobble);

    const segments = Math.max(3, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 20));
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * wobble;
        const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * wobble;
        ctx.lineTo(x, y);
    }
    ctx.stroke();
}

/**
 * Draw a sketchy rectangle.
 */
function sketchyRect(ctx, x, y, w, h, wobble = 2) {
    sketchyLine(ctx, x, y, x + w, y, wobble);
    sketchyLine(ctx, x + w, y, x + w, y + h, wobble);
    sketchyLine(ctx, x + w, y + h, x, y + h, wobble);
    sketchyLine(ctx, x, y + h, x, y, wobble);
}

/**
 * Draw a sketchy ellipse/circle.
 */
function sketchyEllipse(ctx, cx, cy, rx, ry, wobble = 2) {
    ctx.beginPath();
    const steps = 36;
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const x = cx + Math.cos(angle) * rx + (Math.random() - 0.5) * wobble;
        const y = cy + Math.sin(angle) * ry + (Math.random() - 0.5) * wobble;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
}

/**
 * Draw a sketchy arrow from (x1,y1) to (x2,y2).
 */
function sketchyArrow(ctx, x1, y1, x2, y2, wobble = 2) {
    sketchyLine(ctx, x1, y1, x2, y2, wobble);

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const headLen = 18;
    const a1 = angle - Math.PI / 6;
    const a2 = angle + Math.PI / 6;

    sketchyLine(ctx, x2, y2, x2 - headLen * Math.cos(a1), y2 - headLen * Math.sin(a1), 1);
    sketchyLine(ctx, x2, y2, x2 - headLen * Math.cos(a2), y2 - headLen * Math.sin(a2), 1);
}

/**
 * Draw pencil-style text.
 */
function pencilText(ctx, text, x, y, fontSize = 28, align = 'center') {
    ctx.save();
    ctx.font = `${fontSize}px "Caveat", cursive`;
    ctx.fillStyle = PENCIL_COLOR;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + (Math.random() - 0.5) * 1.5, y + (Math.random() - 0.5) * 1.5);
    ctx.restore();
}

function setupPencilStyle(ctx) {
    ctx.strokeStyle = PENCIL_COLOR;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.lineJoin = 'round';
}

/**
 * Draw sketchy cross-hatching fill for a rectangle.
 */
function sketchyHatch(ctx, x, y, w, h, density = 10, angle = Math.PI / 4) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.strokeStyle = PENCIL_FAINT;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;

    const diag = Math.sqrt(w * w + h * h);
    const startX = x - diag;
    const endX = x + w + diag;

    // Forward slash hatching
    for (let lx = startX; lx < endX; lx += density) {
        const x1 = lx;
        const y1 = y - diag;
        const x2 = lx + diag;
        const y2 = y + diag * 2; // overshoot

        // Rotate points around center of rect to match angle
        // For simplicity, we just do 45 deg diagonal lines without complex rotation logic for now
        // Adjusted simple diagonal logic:
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(lx - h, y + h);
        ctx.stroke();
    }

    ctx.restore();
}

// ============ DIAGRAM TYPES ============

/**
 * Render a flowchart diagram.
 * Description format: "Step1 -> Step2 -> Step3 -> Step4"
 */
function renderFlowchart(ctx, title, description, x, y, width, height) {
    const steps = description.split('->').map(s => s.trim()).filter(Boolean);
    if (steps.length === 0) return;

    const boxW = Math.min(240, (width - 80) / Math.min(steps.length, 3));
    const boxH = 55;
    const cols = Math.min(steps.length, 3);
    const rows = Math.ceil(steps.length / cols);
    const gapX = (width - cols * boxW) / (cols + 1);
    const startY = y + 50;
    const rowGap = 90;

    // Title
    pencilText(ctx, title, x + width / 2, y + 20, 32);

    setupPencilStyle(ctx);

    for (let i = 0; i < steps.length; i++) {
        const row = Math.floor(i / cols);
        const col = row % 2 === 0 ? i % cols : (cols - 1) - (i % cols); // zigzag
        const bx = x + gapX + col * (boxW + gapX);
        const by = startY + row * rowGap;

        // Draw box (first and last are rounded/ellipse, others are rect)
        if (i === 0 || i === steps.length - 1) {
            sketchyEllipse(ctx, bx + boxW / 2, by + boxH / 2, boxW / 2, boxH / 2, 2);
        } else {
            sketchyRect(ctx, bx, by, boxW, boxH, 2);
        }

        pencilText(ctx, steps[i], bx + boxW / 2, by + boxH / 2, 24);

        // Arrow to next
        if (i < steps.length - 1) {
            const nextRow = Math.floor((i + 1) / cols);
            const nextCol = nextRow % 2 === 0 ? (i + 1) % cols : (cols - 1) - ((i + 1) % cols);
            const nx = x + gapX + nextCol * (boxW + gapX);
            const ny = startY + nextRow * rowGap;

            if (nextRow === row) {
                // Horizontal arrow
                if (nextCol > col) {
                    sketchyArrow(ctx, bx + boxW, by + boxH / 2, nx, ny + boxH / 2, 1.5);
                } else {
                    sketchyArrow(ctx, bx, by + boxH / 2, nx + boxW, ny + boxH / 2, 1.5);
                }
            } else {
                // Vertical arrow down
                sketchyArrow(ctx, bx + boxW / 2, by + boxH, nx + boxW / 2, ny, 1.5);
            }
        }
    }

    ctx.globalAlpha = 1.0;
}

/**
 * Render a tree diagram.
 * Description format: "Root:50, Left:30(Left:20,Right:40), Right:70"
 * Simplified: just renders a basic tree from node names.
 */
function renderTree(ctx, title, description, x, y, width, height) {
    // Parse simple node list
    const nodes = description.split(',').map(s => s.trim()).filter(Boolean);

    pencilText(ctx, title, x + width / 2, y + 20, 32);
    setupPencilStyle(ctx);

    if (nodes.length === 0) return;

    const startY = y + 65;
    const nodeR = 30;

    // Build tree levels
    const levels = [];
    let idx = 0;
    let levelSize = 1;
    while (idx < nodes.length) {
        levels.push(nodes.slice(idx, idx + levelSize));
        idx += levelSize;
        levelSize *= 2;
    }

    const levelGap = 80;

    for (let lvl = 0; lvl < levels.length; lvl++) {
        const count = levels[lvl].length;
        const levelY = startY + lvl * levelGap;
        const spacing = width / (count + 1);

        for (let i = 0; i < count; i++) {
            const cx = x + spacing * (i + 1);
            const cy = levelY;

            // Draw connection to parent
            if (lvl > 0) {
                const parentCount = levels[lvl - 1].length;
                const parentSpacing = width / (parentCount + 1);
                const parentIdx = Math.floor(i / 2);
                const px = x + parentSpacing * (parentIdx + 1);
                const py = startY + (lvl - 1) * levelGap;
                sketchyLine(ctx, px, py + nodeR, cx, cy - nodeR, 1.5);
            }

            // Draw node circle
            sketchyEllipse(ctx, cx, cy, nodeR, nodeR, 1.5);

            // Node label — extract just the value
            let label = levels[lvl][i];
            const colonIdx = label.indexOf(':');
            if (colonIdx > -1) label = label.substring(colonIdx + 1).trim();
            label = label.replace(/[()]/g, '');

            pencilText(ctx, label, cx, cy, 22);
        }
    }

    ctx.globalAlpha = 1.0;
}

/**
 * Render a table diagram.
 * Description format: "Headers: A,B,C; Row1: 1,2,3; Row2: 4,5,6"
 */
function renderTable(ctx, title, description, x, y, width, height) {
    const parts = description.split(';').map(s => s.trim()).filter(Boolean);

    pencilText(ctx, title, x + width / 2, y + 20, 32);
    setupPencilStyle(ctx);

    const rows = [];
    for (const part of parts) {
        const colonIdx = part.indexOf(':');
        const content = colonIdx > -1 ? part.substring(colonIdx + 1).trim() : part;
        rows.push(content.split(',').map(c => c.trim()));
    }

    if (rows.length === 0) return;

    const cols = Math.max(...rows.map(r => r.length));
    const cellW = Math.min(220, (width - 60) / cols);
    const cellH = 48;
    const tableW = cols * cellW;
    const tableX = x + (width - tableW) / 2;
    const tableY = y + 50;

    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols; c++) {
            const cx = tableX + c * cellW;
            const cy = tableY + r * cellH;

            sketchyRect(ctx, cx, cy, cellW, cellH, 1.5);

            if (r === 0) {
                // Header row — sketchy hatching
                sketchyHatch(ctx, cx + 2, cy + 2, cellW - 4, cellH - 4, 6);
                setupPencilStyle(ctx);
            }

            const text = rows[r] && rows[r][c] ? rows[r][c] : '';
            pencilText(ctx, text, cx + cellW / 2, cy + cellH / 2, 20);
        }
    }

    ctx.globalAlpha = 1.0;
}

/**
 * Render a labeled component diagram.
 * Description format: "Components: ALU, Control Unit, Registers with arrows"
 */
function renderLabeled(ctx, title, description, x, y, width, height) {
    const parts = description.replace(/components?:/i, '').replace(/with.*/i, '').split(',').map(s => s.trim()).filter(Boolean);

    pencilText(ctx, title, x + width / 2, y + 20, 32);
    setupPencilStyle(ctx);

    if (parts.length === 0) return;

    const boxW = 180;
    const boxH = 55;
    const centerX = x + width / 2;
    const centerY = y + height / 2 + 10;
    const radius = Math.min(width, height) * 0.3;

    // Arrange components in a circle
    for (let i = 0; i < parts.length; i++) {
        const angle = (i / parts.length) * Math.PI * 2 - Math.PI / 2;
        const cx = centerX + Math.cos(angle) * radius;
        const cy = centerY + Math.sin(angle) * radius;

        sketchyRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 2);
        pencilText(ctx, parts[i], cx, cy, 20);

        // Arrow to next component
        const nextAngle = ((i + 1) / parts.length) * Math.PI * 2 - Math.PI / 2;
        const nx = centerX + Math.cos(nextAngle) * radius;
        const ny = centerY + Math.sin(nextAngle) * radius;

        const fromX = cx + Math.cos(nextAngle - (i / parts.length) * Math.PI * 2 + Math.PI / 2) * boxW * 0.3;
        const fromY = cy + Math.sin(nextAngle - (i / parts.length) * Math.PI * 2 + Math.PI / 2) * boxH * 0.3;

        // Simple arrow between centers (shortened)
        const dx = nx - cx;
        const dy = ny - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            const startOff = 60;
            const endOff = 60;
            sketchyArrow(ctx,
                cx + (dx / dist) * startOff, cy + (dy / dist) * startOff,
                nx - (dx / dist) * endOff, ny - (dy / dist) * endOff, 1.5
            );
        }
    }

    ctx.globalAlpha = 1.0;
}

/**
 * Render a cycle diagram.
 * Description format: "Step1 -> Step2 -> Step3 -> Step1"
 */
function renderCycle(ctx, title, description, x, y, width, height) {
    let steps = description.split('->').map(s => s.trim()).filter(Boolean);
    // Remove duplicate last step if it cycles back
    if (steps.length > 1 && steps[steps.length - 1] === steps[0]) {
        steps = steps.slice(0, -1);
    }

    pencilText(ctx, title, x + width / 2, y + 20, 32);
    setupPencilStyle(ctx);

    if (steps.length === 0) return;

    const centerX = x + width / 2;
    const centerY = y + height / 2 + 15;
    const radius = Math.min(width, height) * 0.3;
    const boxW = 160;
    const boxH = 45;

    for (let i = 0; i < steps.length; i++) {
        const angle = (i / steps.length) * Math.PI * 2 - Math.PI / 2;
        const cx = centerX + Math.cos(angle) * radius;
        const cy = centerY + Math.sin(angle) * radius;

        sketchyRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 2);
        pencilText(ctx, steps[i], cx, cy, 18);

        // Arrow to next (cyclic)
        const nextIdx = (i + 1) % steps.length;
        const nextAngle = (nextIdx / steps.length) * Math.PI * 2 - Math.PI / 2;
        const nx = centerX + Math.cos(nextAngle) * radius;
        const ny = centerY + Math.sin(nextAngle) * radius;

        const dx = nx - cx;
        const dy = ny - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
            sketchyArrow(ctx,
                cx + (dx / dist) * 55, cy + (dy / dist) * 35,
                nx - (dx / dist) * 55, ny - (dy / dist) * 35, 1.5
            );
        }
    }

    ctx.globalAlpha = 1.0;
}

// ============ MAIN EXPORTS ============

/**
 * Parse a diagram marker string: "[DIAGRAM: type | title | description]"
 */
export function parseDiagramMarker(text) {
    const match = text.match(/\[DIAGRAM:\s*(\w+)\s*\|\s*([^|]+)\s*\|\s*(.+)\]/i);
    if (!match) return null;
    return {
        type: match[1].toLowerCase().trim(),
        title: match[2].trim(),
        description: match[3].trim()
    };
}

/**
 * Check if a line of text is a diagram marker.
 */
export function isDiagramLine(text) {
    return /\[DIAGRAM:/i.test(text);
}

/**
 * Get the height in pixels a diagram needs on the page.
 */
export function getDiagramHeight(diagramType) {
    const heights = {
        flowchart: 350,
        tree: 340,
        table: 300,
        labeled: 380,
        cycle: 360
    };
    return heights[diagramType] || 320;
}

/**
 * Render a diagram onto a canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} diagram - { type, title, description }
 * @param {number} x - Left position
 * @param {number} y - Top position
 * @param {number} width - Available width
 * @param {number} height - Available height
 */
export function renderDiagram(ctx, diagram, x, y, width, height) {
    ctx.save();

    // Light pencil border around diagram area
    ctx.strokeStyle = PENCIL_FAINT;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3;

    // Sketchy border
    sketchyRect(ctx, x + 10, y + 5, width - 20, height - 10, 1.5);

    setupPencilStyle(ctx);

    switch (diagram.type) {
        case 'flowchart':
            renderFlowchart(ctx, diagram.title, diagram.description, x + 20, y, width - 40, height);
            break;
        case 'tree':
            renderTree(ctx, diagram.title, diagram.description, x + 20, y, width - 40, height);
            break;
        case 'table':
            renderTable(ctx, diagram.title, diagram.description, x + 20, y, width - 40, height);
            break;
        case 'labeled':
            renderLabeled(ctx, diagram.title, diagram.description, x + 20, y, width - 40, height);
            break;
        case 'cycle':
            renderCycle(ctx, diagram.title, diagram.description, x + 20, y, width - 40, height);
            break;
        default:
            // Unknown type — render as labeled
            renderLabeled(ctx, diagram.title, diagram.description, x + 20, y, width - 40, height);
    }

    ctx.restore();
}
