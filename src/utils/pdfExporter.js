/**
 * PDF Exporter — assembles rendered canvases into a high-res A4 PDF.
 */

import { jsPDF } from 'jspdf';
import { A4_WIDTH_PX, A4_HEIGHT_PX } from './paginationEngine.js';

// A4 in mm
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/**
 * Export rendered canvases as a multi-page A4 PDF.
 * @param {HTMLCanvasElement[]} canvases - Array of rendered page canvases
 * @param {string} filename - Output filename (without extension)
 * @returns {Promise<void>}
 */
export async function exportToPDF(canvases, filename = 'assignment') {
    if (!canvases || canvases.length === 0) {
        throw new Error('No pages to export');
    }

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
    });

    for (let i = 0; i < canvases.length; i++) {
        if (i > 0) {
            pdf.addPage('a4', 'portrait');
        }

        const canvas = canvases[i];
        const imgData = canvas.toDataURL('image/png'); // PNG for lossless quality

        pdf.addImage(
            imgData,
            'PNG',
            0,
            0,
            A4_WIDTH_MM,
            A4_HEIGHT_MM,
            undefined,
            'FAST'
        );
    }

    pdf.save(`${filename}.pdf`);
}

/**
 * Generate a preview image URL for a single page canvas.
 */
export function getPreviewURL(canvas) {
    return canvas.toDataURL('image/png');
}
