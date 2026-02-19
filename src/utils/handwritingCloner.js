/**
 * Handwriting Cloner — extracts character glyphs from a user's handwriting
 * sample sheet and builds a glyph map for rendering.
 *
 * Flow:
 * 1. User prints a template with labeled grid cells
 * 2. User writes each character in its cell, photographs the sheet
 * 3. This module processes the photo: detects grid → extracts glyphs
 * 4. Returns a glyphMap: { 'A': Canvas, 'B': Canvas, ... }
 */

// Characters expected on the template, row by row
const TEMPLATE_ROWS = [
    'A B C D E F G H I J K L M'.split(' '),
    'N O P Q R S T U V W X Y Z'.split(' '),
    'a b c d e f g h i j k l m'.split(' '),
    'n o p q r s t u v w x y z'.split(' '),
    '0 1 2 3 4 5 6 7 8 9'.split(' '),
    '. , ; : ! ? ( ) - /'.split(' '),
];

export const TEMPLATE_CHARS = TEMPLATE_ROWS.flat();

// Template grid configuration
const CELL_W = 120;
const CELL_H = 140;
const LABEL_H = 30;    // height reserved for the printed character label
const GRID_PAD = 40;   // padding around the grid
const COLS = 13;        // max columns per row

/**
 * Generate a printable template image.
 * Returns a data URL (PNG) of the template the user should print & fill in.
 */
export function generateTemplateDataURL() {
    const totalRows = TEMPLATE_ROWS.length;
    const width = GRID_PAD * 2 + COLS * CELL_W;
    const height = GRID_PAD * 2 + totalRows * CELL_H + 100; // +100 for title

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#222';
    ctx.font = 'bold 28px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HandCraft — Handwriting Sample Sheet', width / 2, 40);

    ctx.font = '14px Inter, Arial, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('Write each character clearly inside its box. Photograph this sheet and upload it.', width / 2, 65);
    ctx.textAlign = 'start';

    // Draw grid rows
    let y = GRID_PAD + 80;

    for (let row = 0; row < totalRows; row++) {
        const chars = TEMPLATE_ROWS[row];
        for (let col = 0; col < chars.length; col++) {
            const x = GRID_PAD + col * CELL_W;

            // Cell border
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, CELL_W, CELL_H);

            // Label area (top of cell, light gray bg)
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(x + 1, y + 1, CELL_W - 2, LABEL_H);

            // Label text
            ctx.fillStyle = '#444';
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(chars[col], x + CELL_W / 2, y + 22);
            ctx.textAlign = 'start';

            // Dotted baseline in writing area
            ctx.setLineDash([4, 4]);
            ctx.strokeStyle = '#ccc';
            ctx.lineWidth = 1;
            const baselineY = y + LABEL_H + (CELL_H - LABEL_H) * 0.7;
            ctx.beginPath();
            ctx.moveTo(x + 8, baselineY);
            ctx.lineTo(x + CELL_W - 8, baselineY);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        y += CELL_H;
    }

    // Footer instructions
    ctx.fillStyle = '#888';
    ctx.font = '12px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tip: Use a dark pen. Keep characters within the boxes. Avoid touching the borders.', width / 2, y + 25);

    return canvas.toDataURL('image/png');
}

/**
 * Download the template as a PNG file.
 */
export function downloadTemplate() {
    const dataUrl = generateTemplateDataURL();
    const link = document.createElement('a');
    link.download = 'handwriting_template.png';
    link.href = dataUrl;
    link.click();
}

// ──────────────────────────────────────────────
// IMAGE PROCESSING & CHARACTER EXTRACTION
// ──────────────────────────────────────────────

/**
 * Load an image file into an HTMLImageElement.
 */
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

/**
 * Convert image to grayscale pixel array.
 * Returns { data: Uint8Array (grayscale), width, height }
 */
function toGrayscale(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i++) {
        const r = imageData.data[i * 4];
        const g = imageData.data[i * 4 + 1];
        const b = imageData.data[i * 4 + 2];
        gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    return gray;
}

/**
 * Compute Otsu's threshold for binarization.
 */
function otsuThreshold(gray) {
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < gray.length; i++) histogram[gray[i]]++;

    const total = gray.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0, wB = 0, wF = 0;
    let maxVar = 0, threshold = 128;

    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        wF = total - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;

        const varBetween = wB * wF * (mB - mF) * (mB - mF);
        if (varBetween > maxVar) {
            maxVar = varBetween;
            threshold = t;
        }
    }
    return threshold;
}

/**
 * Find horizontal lines in the image using projection profile.
 * Returns array of y-coordinates where strong horizontal lines exist.
 */
function findGridLines(gray, width, height, isHorizontal) {
    const len = isHorizontal ? height : width;
    const span = isHorizontal ? width : height;
    const projections = new Array(len).fill(0);

    for (let i = 0; i < len; i++) {
        let darkCount = 0;
        for (let j = 0; j < span; j++) {
            const idx = isHorizontal ? i * width + j : j * width + i;
            if (gray[idx] < 140) darkCount++;
        }
        projections[i] = darkCount / span;
    }

    // Find positions where dark pixel ratio is high (grid lines)
    const lines = [];
    const LINE_THRESHOLD = 0.3;
    let inLine = false;
    let lineStart = 0;

    for (let i = 0; i < len; i++) {
        if (projections[i] > LINE_THRESHOLD && !inLine) {
            inLine = true;
            lineStart = i;
        } else if (projections[i] <= LINE_THRESHOLD && inLine) {
            inLine = false;
            lines.push(Math.round((lineStart + i) / 2));
        }
    }

    return lines;
}

/**
 * Try to auto-detect grid cells from the uploaded image.
 * If grid detection fails, falls back to uniform grid division.
 */
function detectGridCells(gray, width, height) {
    const hLines = findGridLines(gray, width, height, true);
    const vLines = findGridLines(gray, width, height, false);

    // Need at least enough lines to form the expected grid
    if (hLines.length >= TEMPLATE_ROWS.length + 1 && vLines.length >= 2) {
        // Use detected grid
        const cells = [];
        for (let r = 0; r < hLines.length - 1; r++) {
            const rowCells = [];
            for (let c = 0; c < vLines.length - 1; c++) {
                rowCells.push({
                    x: vLines[c],
                    y: hLines[r],
                    w: vLines[c + 1] - vLines[c],
                    h: hLines[r + 1] - hLines[r]
                });
            }
            cells.push(rowCells);
        }
        return cells;
    }

    // Fallback: divide image into uniform grid based on template dimensions
    return uniformGrid(width, height);
}

/**
 * Fallback: Create a uniform grid based on expected template layout.
 */
function uniformGrid(width, height) {
    // Estimate top offset for title area
    const titleHeight = Math.round(height * 0.08);
    const availableH = height - titleHeight - Math.round(height * 0.04);
    const rowH = Math.round(availableH / TEMPLATE_ROWS.length);

    const cells = [];
    for (let r = 0; r < TEMPLATE_ROWS.length; r++) {
        const rowChars = TEMPLATE_ROWS[r].length;
        const cellW = Math.round(width / rowChars);
        const rowCells = [];
        for (let c = 0; c < rowChars; c++) {
            rowCells.push({
                x: Math.round(c * cellW),
                y: titleHeight + r * rowH,
                w: cellW,
                h: rowH
            });
        }
        cells.push(rowCells);
    }
    return cells;
}

/**
 * Extract a single character glyph from a cell region.
 * Crops to the ink bounding box and returns a small canvas.
 */
function extractGlyph(sourceCtx, cell, threshold) {
    const { x, y, w, h } = cell;

    // Skip the label area (top portion of each cell)
    const labelSkip = Math.round(h * 0.25);
    const writeY = y + labelSkip;
    const writeH = h - labelSkip;

    // Padding to avoid border ink
    const pad = Math.round(Math.min(w, writeH) * 0.08);
    const cropX = x + pad;
    const cropY = writeY + pad;
    const cropW = w - pad * 2;
    const cropH = writeH - pad * 2;

    if (cropW <= 0 || cropH <= 0) return null;

    const imgData = sourceCtx.getImageData(cropX, cropY, cropW, cropH);
    const data = imgData.data;

    // Find ink bounding box
    let minX = cropW, minY = cropH, maxX = 0, maxY = 0;
    let hasInk = false;

    for (let py = 0; py < cropH; py++) {
        for (let px = 0; px < cropW; px++) {
            const idx = (py * cropW + px) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            if (lum < threshold) {
                hasInk = true;
                if (px < minX) minX = px;
                if (py < minY) minY = py;
                if (px > maxX) maxX = px;
                if (py > maxY) maxY = py;
            }
        }
    }

    if (!hasInk) return null;

    // Add small padding around the glyph
    const glyphPad = 4;
    minX = Math.max(0, minX - glyphPad);
    minY = Math.max(0, minY - glyphPad);
    maxX = Math.min(cropW - 1, maxX + glyphPad);
    maxY = Math.min(cropH - 1, maxY + glyphPad);

    const glyphW = maxX - minX + 1;
    const glyphH = maxY - minY + 1;

    if (glyphW < 3 || glyphH < 3) return null;

    // Extract the glyph onto its own canvas
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = glyphW;
    glyphCanvas.height = glyphH;
    const glyphCtx = glyphCanvas.getContext('2d');

    glyphCtx.drawImage(
        sourceCtx.canvas,
        cropX + minX, cropY + minY, glyphW, glyphH,
        0, 0, glyphW, glyphH
    );

    // Make the background transparent and ink colored
    const glyphData = glyphCtx.getImageData(0, 0, glyphW, glyphH);
    const gd = glyphData.data;
    for (let i = 0; i < gd.length; i += 4) {
        const lum = 0.299 * gd[i] + 0.587 * gd[i + 1] + 0.114 * gd[i + 2];
        if (lum >= threshold) {
            // Background → transparent
            gd[i + 3] = 0;
        } else {
            // Ink → keep dark, set alpha based on darkness
            const darkness = 1 - lum / threshold;
            gd[i] = 0;
            gd[i + 1] = 0;
            gd[i + 2] = 0;
            gd[i + 3] = Math.round(darkness * 255);
        }
    }
    glyphCtx.putImageData(glyphData, 0, 0);

    return glyphCanvas;
}

/**
 * Process an uploaded handwriting sample sheet.
 *
 * @param {File} imageFile - The uploaded image file (photo of filled-in template)
 * @param {Function} onProgress - Callback (0-100) for progress updates
 * @returns {Object} glyphMap - { char: Canvas, ... }
 */
export async function processHandwritingSheet(imageFile, onProgress = () => { }) {
    onProgress(5);

    // Load the image
    const img = await loadImage(imageFile);
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    // Draw onto canvas for pixel access
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    URL.revokeObjectURL(img.src);
    onProgress(15);

    // Grayscale + threshold
    const gray = toGrayscale(ctx, width, height);
    const threshold = otsuThreshold(gray);
    onProgress(25);

    // Detect grid cells
    const gridCells = detectGridCells(gray, width, height);
    onProgress(40);

    // Extract glyphs
    const glyphMap = {};
    let charIndex = 0;
    const totalChars = TEMPLATE_CHARS.length;

    for (let row = 0; row < gridCells.length && charIndex < totalChars; row++) {
        const rowCells = gridCells[row];
        for (let col = 0; col < rowCells.length && charIndex < totalChars; col++) {
            const glyph = extractGlyph(ctx, rowCells[col], threshold);
            const char = TEMPLATE_CHARS[charIndex];
            if (glyph) {
                glyphMap[char] = glyph;
            }
            charIndex++;

            const progress = 40 + (charIndex / totalChars) * 55;
            onProgress(Math.round(progress));
        }
    }

    onProgress(100);
    return glyphMap;
}

/**
 * Save glyph map to IndexedDB for persistence.
 */
export async function saveGlyphMap(glyphMap) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('HandCraftDB', 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('glyphs')) {
                db.createObjectStore('glyphs');
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('glyphs', 'readwrite');
            const store = tx.objectStore('glyphs');

            // Convert canvases to data URLs for storage
            const serialized = {};
            for (const [char, canvas] of Object.entries(glyphMap)) {
                serialized[char] = canvas.toDataURL('image/png');
            }

            store.put(serialized, 'userGlyphs');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Load glyph map from IndexedDB.
 * Returns null if not found.
 */
export async function loadGlyphMap() {
    return new Promise((resolve) => {
        const request = indexedDB.open('HandCraftDB', 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('glyphs')) {
                db.createObjectStore('glyphs');
            }
        };

        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('glyphs', 'readonly');
            const store = tx.objectStore('glyphs');
            const getReq = store.get('userGlyphs');

            getReq.onsuccess = () => {
                const serialized = getReq.result;
                if (!serialized) { resolve(null); return; }

                // Convert data URLs back to canvases
                const glyphMap = {};
                const entries = Object.entries(serialized);
                let loaded = 0;

                if (entries.length === 0) { resolve(null); return; }

                entries.forEach(([char, dataUrl]) => {
                    const img = new Image();
                    img.onload = () => {
                        const c = document.createElement('canvas');
                        c.width = img.naturalWidth;
                        c.height = img.naturalHeight;
                        c.getContext('2d').drawImage(img, 0, 0);
                        glyphMap[char] = c;
                        loaded++;
                        if (loaded === entries.length) resolve(glyphMap);
                    };
                    img.onerror = () => {
                        loaded++;
                        if (loaded === entries.length) resolve(glyphMap);
                    };
                    img.src = dataUrl;
                });
            };

            getReq.onerror = () => resolve(null);
        };

        request.onerror = () => resolve(null);
    });
}

/**
 * Clear saved glyph map from IndexedDB.
 */
export async function clearGlyphMap() {
    return new Promise((resolve) => {
        const request = indexedDB.open('HandCraftDB', 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction('glyphs', 'readwrite');
            tx.objectStore('glyphs').delete('userGlyphs');
            tx.oncomplete = () => resolve();
        };
        request.onerror = () => resolve();
    });
}

/**
 * Count how many characters were successfully extracted.
 */
export function getGlyphStats(glyphMap) {
    if (!glyphMap) return { total: 0, uppercase: 0, lowercase: 0, digits: 0, punctuation: 0 };

    const keys = Object.keys(glyphMap);
    return {
        total: keys.length,
        uppercase: keys.filter(c => c >= 'A' && c <= 'Z').length,
        lowercase: keys.filter(c => c >= 'a' && c <= 'z').length,
        digits: keys.filter(c => c >= '0' && c <= '9').length,
        punctuation: keys.filter(c => '.,;:!?()-/'.includes(c)).length
    };
}
