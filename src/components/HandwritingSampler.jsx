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
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [calibrationFile, setCalibrationFile] = useState(null);
    const [thresholdOffset, setThresholdOffset] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [stats, setStats] = useState(null);
    const canvasRef = useRef(null);
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

    // Calibration Preview
    useEffect(() => {
        if (!isCalibrating || !calibrationFile || !canvasRef.current) return;

        const renderPreview = async () => {
            const img = new Image();
            img.src = URL.createObjectURL(calibrationFile);
            await new Promise(r => img.onload = r);

            const ctx = canvasRef.current.getContext('2d');
            const w = canvasRef.current.width;
            const h = canvasRef.current.height;

            // Draw a crop from the top-left area (where 'A' usually is)
            ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, w, h);

            // Apply threshold preview
            const imageData = ctx.getImageData(0, 0, w, h);
            const data = imageData.data;

            // Simple grayscale estimation for preview
            // In reality, we should use the exact same logic as backend, but this is a fast approximation
            // We'll just threshold the preview canvas directly

            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                // Base threshold is roughly 128 for preview + offset
                // Ideally we'd calculate Otsu here too, but fixed 128 + offset is decent visual feedback
                const t = 120 + thresholdOffset;

                if (gray < t) {
                    // Ink - keep dark
                    data[i] = 0;
                    data[i + 1] = 0;
                    data[i + 2] = 0;
                } else {
                    // Background - make white
                    data[i] = 255;
                    data[i + 1] = 255;
                    data[i + 2] = 255;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            URL.revokeObjectURL(img.src);
        };
        renderPreview();
    }, [isCalibrating, calibrationFile, thresholdOffset]);

    const handleUpload = useCallback(async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, etc.)');
            return;
        }
        setError('');
        setCalibrationFile(file);
        setIsCalibrating(true);
        setThresholdOffset(0);
    }, []);

    const confirmCalibration = async () => {
        if (!calibrationFile) return;
        setIsCalibrating(false);
        setIsProcessing(true);
        setProgress(0);

        try {
            const gMap = await processHandwritingSheet(calibrationFile, (p) => setProgress(p), thresholdOffset);
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
            setCalibrationFile(null);
        }
    };

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
            {!isCalibrating && !isProcessing && !hasGlyphs && (
                <div className="sampler-step">
                    <div className="sampler-step-num">2</div>
                    <div className="sampler-step-content">
                        <div className="sampler-step-title">Upload your sample</div>
                        <div className="sampler-step-desc">Photograph the filled sheet and upload</div>
                        <div
                            className="sampler-upload-zone"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleUpload(e.target.files[0])}
                            />
                            <div className="sampler-upload-label">Drop image here or click to browse</div>
                            <div className="sampler-upload-hint">JPG, PNG — photo of your filled template</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Calibration View */}
            {isCalibrating && (
                <div className="sampler-step">
                    <div className="sampler-step-num active">2</div>
                    <div className="sampler-step-content">
                        <div className="sampler-step-title">Calibrate Extraction</div>
                        <div className="sampler-step-desc">Adjust slider until ink is black & background is white.</div>

                        <div style={{ margin: '12px 0', background: '#eee', padding: '4px', borderRadius: '8px', overflow: 'hidden' }}>
                            <canvas ref={canvasRef} width="300" height="150" style={{ width: '100%', height: 'auto', display: 'block' }} />
                        </div>

                        <div className="field-group">
                            <label className="field-label">Ink Sensitivity: {thresholdOffset > 0 ? '+' : ''}{thresholdOffset}</label>
                            <input
                                type="range"
                                min="-60"
                                max="60"
                                value={thresholdOffset}
                                onChange={(e) => setThresholdOffset(parseInt(e.target.value))}
                                className="slider"
                            />
                        </div>

                        <div className="sampler-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => { setIsCalibrating(false); setCalibrationFile(null); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmCalibration}>Extract Characters</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Processing State */}
            {isProcessing && (
                <div className="sampler-step">
                    <div className="sampler-step-num active">3</div>
                    <div className="sampler-step-content">
                        <div className="sampler-step-title">Processing...</div>
                        <div className="sampler-processing">
                            <div className="sampler-progress-bar">
                                <div className="sampler-progress-fill" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="sampler-progress-text">Extracting characters... {progress}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && <div className="sampler-error">{error}</div>}

            {/* Step 3: Results */}
            {hasGlyphs && stats && !isProcessing && (
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
