/**
 * File Parser — extracts text from uploaded files (TXT, MD, DOCX, PDF).
 * V2 — Fixed PDF worker, added .md support, better error handling.
 */

/**
 * Parse an uploaded file and extract its text content.
 * @param {File} file - The uploaded file object
 * @returns {Promise<string>} - Extracted text content
 */
export async function parseFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();

    switch (extension) {
        case 'txt':
        case 'md':
            return parseTxt(file);
        case 'docx':
            return parseDocx(file);
        case 'pdf':
            return parsePdf(file);
        default:
            throw new Error(`Unsupported file type: .${extension}. Please upload a .txt, .md, .docx, or .pdf file.`);
    }
}

/**
 * Parse plain text / markdown file.
 */
async function parseTxt(file) {
    const text = await file.text();
    if (!text || !text.trim()) {
        throw new Error('The file appears to be empty.');
    }
    return text;
}

/**
 * Parse DOCX file using mammoth.js.
 */
async function parseDocx(file) {
    try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (!result.value || !result.value.trim()) {
            throw new Error('The DOCX file appears to be empty or could not be read.');
        }
        return result.value;
    } catch (err) {
        if (err.message.includes('empty')) throw err;
        throw new Error(`Could not parse DOCX file: ${err.message}. Try saving it as .txt instead.`);
    }
}

/**
 * Parse PDF file using pdfjs-dist.
 */
async function parsePdf(file) {
    try {
        const pdfjsLib = await import('pdfjs-dist');

        // Fix: Use a compatible worker source
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.min.mjs',
                import.meta.url
            ).toString();
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        const result = fullText.trim();
        if (!result) {
            throw new Error('The PDF appears to contain no extractable text (it may be image-based).');
        }
        return result;
    } catch (err) {
        if (err.message.includes('PDF') || err.message.includes('empty') || err.message.includes('image-based')) throw err;
        throw new Error(`Could not parse PDF: ${err.message}. Try copying the text and pasting it directly.`);
    }
}
