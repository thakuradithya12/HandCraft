import { useState, useRef, useEffect, useCallback } from 'react';
import {
    downloadTemplate,
    processHandwritingSheet,
    saveGlyphMap,
    clearGlyphMap,
    loadGlyphMap,
    getGlyphStats,
    TEMPLATE_CHARS
} from '../utils/handwritingCloner.js';

export default function HandwritingSampler({ glyphMap, onGlyphMapChange }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [stats, setStats] = useState(null);
    const fileRef = useRef(null);

    // Load saved glyph map on mount
    useEffect(() => {
        loadGlyphMap().then(saved => {
            if (saved && Object.keys(saved).length > 0) {
                onGlyphMapChange(saved);
                setStats(getGlyphStats(saved));
            }
        });
    }, []);

    const handleUpload = useCallback(async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, etc.)');
            return;
        }

        setError('');
        setIsProcessing(true);
        setProgress(0);

        try {
            const gMap = await processHandwritingSheet(file, (p) => setProgress(p));
            const st = getGlyphStats(gMap);

            if (st.total < 10) {
                setError(`Only ${st.total} characters detected. Please ensure the image is clear and well-lit.`);
                setIsProcessing(false);
                return;
            }

            await saveGlyphMap(gMap);
            onGlyphMapChange(gMap);
            setStats(st);
        } catch (err) {
            setError(`Processing failed: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    }, [onGlyphMapChange]);

    const handleClear = useCallback(async () => {
        await clearGlyphMap();
        onGlyphMapChange(null);
        setStats(null);
        setError('');
    }, [onGlyphMapChange]);

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const hasGlyphs = glyphMap && Object.keys(glyphMap).length > 0;

    return (
        <div className="controls-section">
            <div className="section-label">My Handwriting</div>

            {/* Step 1: Download template */}
            <div className="sampler-step">
                <div className="sampler-step-num">1</div>
                <div className="sampler-step-content">
                    <div className="sampler-step-title">Download template</div>
                    <div className="sampler-step-desc">Print it, write each character by hand</div>
                    <button className="btn btn-outline sampler-download-btn" onClick={downloadTemplate}>
                        Download Template
                    </button>
                </div>
            </div>

            {/* Step 2: Upload filled sheet */}
            <div className="sampler-step">
                <div className="sampler-step-num">2</div>
                <div className="sampler-step-content">
                    <div className="sampler-step-title">Upload your sample</div>
                    <div className="sampler-step-desc">Photograph the filled sheet and upload</div>
                    <div
                        className={`sampler-upload-zone ${isProcessing ? 'processing' : ''}`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => !isProcessing && fileRef.current?.click()}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleUpload(e.target.files[0])}
                        />
                        {isProcessing ? (
                            <div className="sampler-processing">
                                <div className="sampler-progress-bar">
                                    <div className="sampler-progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="sampler-progress-text">Extracting characters... {progress}%</span>
                            </div>
                        ) : (
                            <>
                                <div className="sampler-upload-label">Drop image here or click to browse</div>
                                <div className="sampler-upload-hint">JPG, PNG — photo of your filled template</div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && <div className="sampler-error">{error}</div>}

            {/* Step 3: Results */}
            {hasGlyphs && stats && (
                <div className="sampler-step">
                    <div className="sampler-step-num sampler-step-done">3</div>
                    <div className="sampler-step-content">
                        <div className="sampler-step-title">Handwriting loaded</div>
                        <div className="sampler-stats">
                            <span>{stats.total} characters extracted</span>
                            <span>{stats.uppercase} uppercase</span>
                            <span>{stats.lowercase} lowercase</span>
                            <span>{stats.digits} digits</span>
                        </div>

                        {/* Mini preview grid */}
                        <div className="sampler-preview-grid">
                            {TEMPLATE_CHARS.slice(0, 36).map(char => (
                                <div
                                    key={char}
                                    className={`sampler-preview-cell ${glyphMap[char] ? '' : 'missing'}`}
                                    title={char}
                                >
                                    {glyphMap[char] ? (
                                        <img
                                            src={glyphMap[char].toDataURL('image/png')}
                                            alt={char}
                                            className="sampler-preview-glyph"
                                        />
                                    ) : (
                                        <span className="sampler-preview-missing">{char}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="btn btn-outline sampler-clear-btn" onClick={handleClear}>
                            Remove My Handwriting
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
