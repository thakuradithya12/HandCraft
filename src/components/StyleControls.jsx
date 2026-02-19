import { HANDWRITING_STYLES, INK_COLORS, PAGE_TYPES, PAGE_TEMPLATES } from '../utils/variationEngine.js';

const FATIGUE_MODES = [
    { id: 'none', label: 'Natural' },
    { id: 'gradual', label: 'Gradual' },
    { id: 'rush', label: 'Rushed' },
    { id: 'careful-start', label: 'Careful Start' }
];

export default function StyleControls({
    selectedStyle, onStyleChange,
    inkColor, onInkColorChange,
    pageType, onPageTypeChange,
    lineSpacing, onLineSpacingChange,
    variationIntensity, onVariationIntensityChange,
    fontSize, onFontSizeChange,
    fatigueMode, onFatigueModeChange,
    pageTemplate, onPageTemplateChange,
    glyphMap
}) {
    return (
        <div className="controls-section">
            <div className="section-label">Handwriting Style</div>

            <div className="style-selector">
                {HANDWRITING_STYLES.map((style) => (
                    <div
                        key={style.id}
                        className={`style-option ${selectedStyle.id === style.id ? 'selected' : ''} ${style.isCustom ? 'style-custom' : ''}`}
                        onClick={() => onStyleChange(style)}
                    >
                        <div className="style-radio"><div className="style-radio-inner" /></div>
                        <div className="style-info">
                            <div className="style-name">
                                {style.name}
                                {style.isCustom && <span className="style-badge">Custom</span>}
                            </div>
                            {style.isCustom ? (
                                <div className="style-preview style-custom-hint">
                                    {glyphMap ? 'Your handwriting is loaded' : 'Upload your sample below'}
                                </div>
                            ) : (
                                <div className="style-preview" style={{ fontFamily: `"${style.fontFamily}", cursive` }}>
                                    The quick brown fox jumps
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Ink Color + Page Type */}
            <div className="control-row">
                <div className="control-group">
                    <div className="control-label">Ink Color</div>
                    <div className="pill-group">
                        {Object.entries(INK_COLORS).map(([key, color]) => (
                            <button key={key} className={`pill ${inkColor === key ? 'active' : ''}`} onClick={() => onInkColorChange(key)}>
                                <span className="color-dot" style={{ backgroundColor: `rgb(${color.base.r},${color.base.g},${color.base.b})` }} />
                                {color.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="control-row">
                <div className="control-group">
                    <div className="control-label">Page Type</div>
                    <div className="pill-group">
                        {PAGE_TYPES.map((pt) => (
                            <button key={pt.id} className={`pill ${pageType.id === pt.id ? 'active' : ''}`} onClick={() => onPageTypeChange(pt)}>
                                {pt.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Page Template */}
            <div className="control-row">
                <div className="control-group">
                    <div className="control-label">Template</div>
                    <div className="pill-group">
                        {PAGE_TEMPLATES.map((tmpl) => (
                            <button key={tmpl.id} className={`pill ${pageTemplate === tmpl.id ? 'active' : ''}`}
                                onClick={() => onPageTemplateChange(tmpl.id)}>
                                {tmpl.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Line Spacing */}
            <div className="slider-group">
                <div className="control-label">Line Spacing</div>
                <div className="slider-row">
                    <input type="range" className="slider" min="1.0" max="2.5" step="0.1" value={lineSpacing}
                        onChange={(e) => onLineSpacingChange(parseFloat(e.target.value))} />
                    <span className="slider-value">{lineSpacing}x</span>
                </div>
            </div>

            {/* Text Size */}
            <div className="slider-group" style={{ marginTop: '10px' }}>
                <div className="control-label">Text Size</div>
                <div className="slider-row">
                    <input type="range" className="slider" min="18" max="40" step="1" value={fontSize}
                        onChange={(e) => onFontSizeChange(parseInt(e.target.value))} />
                    <span className="slider-value">{fontSize <= 22 ? 'Small' : fontSize <= 28 ? 'Medium' : fontSize <= 34 ? 'Large' : 'X-Large'}</span>
                </div>
            </div>

            {/* Variation Intensity */}
            <div className="slider-group" style={{ marginTop: '10px' }}>
                <div className="control-label">Handwriting Messiness</div>
                <div className="slider-row">
                    <input type="range" className="slider" min="0" max="2.0" step="0.1" value={variationIntensity}
                        onChange={(e) => onVariationIntensityChange(parseFloat(e.target.value))} />
                    <span className="slider-value">{variationIntensity < 0.5 ? 'Neat' : variationIntensity < 1.2 ? 'Natural' : 'Messy'}</span>
                </div>
            </div>

            {/* Writing Mood / Fatigue */}
            <div className="control-row" style={{ marginTop: '10px' }}>
                <div className="control-group">
                    <div className="control-label">Writing Mood</div>
                    <div className="pill-group">
                        {FATIGUE_MODES.map((mode) => (
                            <button key={mode.id} className={`pill ${fatigueMode === mode.id ? 'active' : ''}`}
                                onClick={() => onFatigueModeChange(mode.id)}>
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
