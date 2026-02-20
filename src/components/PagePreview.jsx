import { useState, useEffect } from 'react';

export default function PagePreview({ canvases, currentPage, onPageChange }) {
    const [previewUrls, setPreviewUrls] = useState([]);
    const [zoom, setZoom] = useState(100);
    // Removed strict "Fit Mode" to allow natural scrolling

    useEffect(() => {
        if (canvases && canvases.length > 0) {
            const urls = canvases.map(c => c.toDataURL('image/png'));
            setPreviewUrls(urls);
            setZoom(100); // Reset to standard readable zoom
        } else {
            setPreviewUrls([]);
        }
    }, [canvases]);

    const totalPages = previewUrls.length;

    if (totalPages === 0) {
        return (
            <div className="preview-content">
                <div className="preview-empty">
                    <div className="preview-empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg></div>
                    <h3>No Preview Yet</h3>
                    <p>Type or paste your assignment text, customize the style, then click <strong>Generate</strong> to see handwritten pages.</p>
                    <div className="preview-shortcuts">
                        <span className="shortcut-badge">Ctrl+G</span> Generate
                        <span className="shortcut-badge">Ctrl+D</span> Download
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="preview-toolbar">
                <div className="preview-toolbar-left">
                    <button className="preview-nav-btn" disabled={currentPage <= 0} onClick={() => onPageChange(currentPage - 1)}>‹</button>
                    <span className="preview-page-info">Page {currentPage + 1} of {totalPages}</span>
                    <button className="preview-nav-btn" disabled={currentPage >= totalPages - 1} onClick={() => onPageChange(currentPage + 1)}>›</button>
                </div>
                <div className="preview-toolbar-right">
                    <div className="zoom-controls">
                        <button className="zoom-btn" onClick={() => setZoom(z => Math.max(30, z - 15))} title="Zoom out">−</button>
                        <span className="zoom-value">{zoom}%</span>
                        <button className="zoom-btn" onClick={() => setZoom(z => Math.min(200, z + 15))} title="Zoom in">+</button>
                        <button className="zoom-btn zoom-fit" onClick={() => setZoom(100)} title="Reset Zoom">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                        </button>
                    </div>
                    <span className="preview-badge">A4 · 300 DPI</span>
                </div>
            </div>

            <div className="preview-body">
                {/* Thumbnail strip */}
                {totalPages > 1 && (
                    <div className="thumbnail-strip">
                        {previewUrls.map((url, i) => (
                            <button
                                key={i}
                                className={`thumbnail ${i === currentPage ? 'active' : ''}`}
                                onClick={() => onPageChange(i)}
                                title={`Page ${i + 1}`}
                            >
                                <img src={url} alt={`Page ${i + 1}`} />
                                <span className="thumbnail-num">{i + 1}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Main preview */}
                <div className="preview-content">
                    <img
                        className="preview-page fade-in"
                        src={previewUrls[currentPage]}
                        alt={`Page ${currentPage + 1}`}
                        key={`${currentPage}-${zoom}`}
                        style={{
                            width: `${zoom}%`,
                            maxWidth: 'none',
                            height: 'auto',
                            boxShadow: 'var(--shadow-card)',
                            marginBottom: '40px' // Add spacing at bottom for scrolling
                        }}
                    />
                </div>
            </div>
        </>
    );
}
