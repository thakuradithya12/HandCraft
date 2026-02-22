import { useState, useCallback } from 'react';
import { parseText, paginateContent } from '../utils/paginationEngine.js';
import { renderAllPages } from '../utils/handwritingRenderer.js';
import { showToast } from '../components/Toast.jsx';

export function useRenderer() {
    const [canvases, setCanvases] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = useCallback(async (content, styleParams, headerInfo, glyphMap) => {
        if (!content.trim()) {
            showToast('Please generate or type some content first.', 'error');
            return;
        }

        setIsGenerating(true);
        showToast('Rendering handwritten pages...', 'info');

        // Minor delay to let UI show the info toast
        await new Promise(resolve => setTimeout(resolve, 80));

        try {
            const blocks = parseText(content);
            const {
                selectedStyle,
                inkColor,
                pageType,
                lineSpacing,
                variationIntensity,
                fontSize,
                fatigueMode
            } = styleParams;

            const style = {
                ...selectedStyle,
                lineHeight: lineSpacing,
                variationIntensity,
                fontSize: fontSize * 2
            };

            const hasHeader = headerInfo && Object.values(headerInfo).some(v => v.trim());
            const header = hasHeader ? headerInfo : null;

            const pages = paginateContent(blocks, style, pageType, header);
            const activeGlyphMap = selectedStyle.isCustom ? glyphMap : null;
            const rendered = renderAllPages(pages, style, pageType, inkColor, activeGlyphMap, fatigueMode);

            setCanvases(rendered);
            setCurrentPage(0);

            const count = rendered.length;
            showToast(`Generated ${count} page${count > 1 ? 's' : ''} successfully!`, 'success');
            return count;
        } catch (err) {
            console.error('Generation error:', err);
            showToast(`Error: ${err.message}`, 'error');
            throw err;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    return {
        canvases,
        setCanvases,
        currentPage,
        setCurrentPage,
        isGenerating,
        handleGenerate
    };
}
