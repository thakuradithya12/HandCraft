import { useState, useCallback, useEffect } from 'react';
import TextInput from './components/TextInput.jsx';
import HeaderFields from './components/HeaderFields.jsx';
import StyleControls from './components/StyleControls.jsx';
import PagePreview from './components/PagePreview.jsx';
import ActionBar from './components/ActionBar.jsx';
import ToastContainer, { showToast } from './components/Toast.jsx';
import HelpModal from './components/HelpModal.jsx';
import ProgressBar from './components/ProgressBar.jsx';
import HandwritingSampler from './components/HandwritingSampler.jsx';
import AdUnit from './components/AdUnit.jsx';

// Utils & Constants
import { HANDWRITING_STYLES, PAGE_TYPES, PAGE_TEMPLATES } from './utils/variationEngine.js';
import { exportToPDF } from './utils/pdfExporter.js';
import { HistoryManager } from './utils/historyManager.js';

// Custom Hooks
import { useAI } from './hooks/useAI.js';
import { useRenderer } from './hooks/useRenderer.js';

export default function App() {
    // Content state
    const [text, setText] = useState('');
    const [header, setHeader] = useState({
        title: '', name: '', rollNumber: '', subject: '', date: ''
    });

    // Style state
    const [selectedStyle, setSelectedStyle] = useState(HANDWRITING_STYLES[1]);
    const [inkColor, setInkColor] = useState('blue');
    const [pageType, setPageType] = useState(PAGE_TYPES[0]);
    const [lineSpacing, setLineSpacing] = useState(1.6);
    const [variationIntensity, setVariationIntensity] = useState(1.0);
    const [fontSize, setFontSize] = useState(26);
    const [fatigueMode, setFatigueMode] = useState('none');
    const [pageTemplate, setPageTemplate] = useState('none');
    const [glyphMap, setGlyphMap] = useState(null);
    const [isAppStarted, setIsAppStarted] = useState(false);

    // Initial AI Config from LocalStorage
    const [aiConfig, setAiConfig] = useState(() => {
        try {
            const saved = localStorage.getItem('hw-ai-config');
            return saved ? JSON.parse(saved) : { mode: 'cloud', url: 'http://localhost:11434', apiKey: '' };
        } catch (e) {
            return { mode: 'cloud', url: 'http://localhost:11434', apiKey: '' };
        }
    });

    // Initialize Hooks
    const {
        isAiGenerating,
        aiStatus,
        // aiConfig, // managed in App.jsx now to prevent sync loops
        // setAiConfig,
        handleAiGenerate: handleAiGenerateBase,
        showSetupGuide,
        setShowSetupGuide,
        setOllamaUrl
    } = useAI(aiConfig, setAiConfig);

    const {
        canvases,
        currentPage,
        setCurrentPage,
        isGenerating,
        handleGenerate: handleGenerateBase
    } = useRenderer();

    // Persist AI Config
    useEffect(() => {
        localStorage.setItem('hw-ai-config', JSON.stringify(aiConfig));
        HistoryManager.saveSettings({
            mode: aiConfig.mode,
            ollamaUrl: aiConfig.url,
            apiKey: aiConfig.apiKey
        });
    }, [aiConfig]);

    // UI state
    const [theme, setTheme] = useState(() => localStorage.getItem('hw-theme') || 'light');
    const [helpOpen, setHelpOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('hw-history') || '[]'); } catch { return []; }
    });

    // SaaS specific state

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('hw-theme', theme);
    }, [theme]);




    // Load Draft on mount
    useEffect(() => {
        const saved = HistoryManager.loadDraft();
        if (saved) {
            setText(saved.text || '');
            if (saved.header) setHeader(saved.header);
        }
    }, []);

    // Auto-save draft
    useEffect(() => {
        const timer = setTimeout(() => {
            HistoryManager.saveDraft({ text, header });
        }, 1000);
        return () => clearTimeout(timer);
    }, [text, header]);

    const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

    // AI Content Generation Wrapper
    const handleAiGenerate = useCallback((prompt, useMock = false) => {
        setIsAppStarted(true);
        handleAiGenerateBase(prompt, setText, header.title, setHeader, useMock);
    }, [handleAiGenerateBase, header.title, setHeader]);

    // Render handwritten pages
    const handleGenerate = useCallback(async () => {
        const styleParams = {
            selectedStyle,
            inkColor,
            pageType,
            lineSpacing,
            variationIntensity,
            fontSize,
            fatigueMode
        };

        try {
            const count = await handleGenerateBase(text, styleParams, header, glyphMap);
            if (count) {
                // Save to history
                const entry = {
                    id: Date.now(),
                    title: header.title || text.slice(0, 40).trim() + '...',
                    pages: count,
                    style: selectedStyle.name,
                    date: new Date().toLocaleString()
                };
                const newHistory = [entry, ...history.slice(0, 9)];
                setHistory(newHistory);
                localStorage.setItem('hw-history', JSON.stringify(newHistory));
            }
        } catch (err) {
            // Error handled by hook toast
        }
    }, [text, header, selectedStyle, inkColor, pageType, lineSpacing, variationIntensity, fontSize, fatigueMode, glyphMap, history, handleGenerateBase]);

    const handleDownload = useCallback(async () => {
        if (canvases.length === 0) return;
        showToast('Creating PDF...', 'info');
        try {
            const filename = header.title
                ? header.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 40)
                : 'assignment';
            await exportToPDF(canvases, filename);
            showToast('PDF downloaded!', 'success');
        } catch (err) {
            showToast(`PDF Error: ${err.message}`, 'error');
        }
    }, [canvases, header.title]);

    const handleExportPNG = useCallback(() => {
        if (canvases.length === 0) return;
        const canvas = canvases[currentPage];
        const link = document.createElement('a');
        link.download = `page_${currentPage + 1}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast(`Page ${currentPage + 1} saved as PNG`, 'success');
    }, [canvases, currentPage]);

    const handlePrint = useCallback(() => {
        if (canvases.length === 0) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showToast('Pop-up blocked. Please allow pop-ups to print.', 'error');
            return;
        }
        const images = canvases.map(c => c.toDataURL('image/png'));
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Print Assignment</title>
        <style>@page{size:A4;margin:0}body{margin:0}img{width:100%;height:auto;page-break-after:always;display:block}img:last-child{page-break-after:avoid}</style>
        </head><body>${images.map(src => `<img src="${src}"/>`).join('')}</body></html>`);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    }, [canvases]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (helpOpen && e.key === 'Escape') { setHelpOpen(false); return; }
            if (e.ctrlKey && e.key === 'g') { e.preventDefault(); handleGenerate(); }
            if (e.ctrlKey && e.key === 'd') { e.preventDefault(); handleDownload(); }
            if (e.ctrlKey && e.key === 'p' && canvases.length > 0) { e.preventDefault(); handlePrint(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleGenerate, handleDownload, handlePrint, canvases, helpOpen]);

    return (
        <div className="app">
            <ToastContainer />
            <ProgressBar isActive={isGenerating || isAiGenerating} />
            <HelpModal isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

            {/* Header */}
            <header className="app-header">
                <div className="app-logo">
                    <div className="app-logo-icon">H</div>
                    <div>
                        <h1>HandCraft</h1>
                        <div className="subtitle">AI Handwriting Generator</div>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="header-btn" onClick={() => setHistoryOpen(!historyOpen)} title="Generation history">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </button>
                    <button className="header-btn" onClick={() => setSettingsOpen(true)} title="AI Settings">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    </button>
                    <button className="header-btn" onClick={() => setHelpOpen(true)} title="Help & shortcuts">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </button>
                    <button className="theme-toggle" onClick={toggleTheme} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
                        {theme === 'light' ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        )}
                    </button>
                </div>
            </header>

            {/* History Drawer */}
            {historyOpen && (
                <div className="history-drawer fade-in">
                    <div className="history-header">
                        <span>Recent Generations</span>
                        {history.length > 0 && (
                            <button className="history-clear" onClick={() => { setHistory([]); localStorage.removeItem('hw-history'); }}>
                                Clear
                            </button>
                        )}
                    </div>
                    {history.length === 0 ? (
                        <div className="history-empty">No generations yet</div>
                    ) : (
                        <div className="history-list">
                            {history.map(h => (
                                <div key={h.id} className="history-item">
                                    <div className="history-title">{h.title}</div>
                                    <div className="history-meta">{h.pages} page{h.pages > 1 ? 's' : ''} · {h.style} · {h.date}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* AI Settings Modal */}
            {settingsOpen && (
                <div className="modal-overlay fade-in" onClick={() => setSettingsOpen(false)}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>AI Connectivity Settings</h2>
                            <button className="modal-close" onClick={() => setSettingsOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="settings-hint">
                                HandCraft uses <b>Google Gemini AI</b> for content generation.
                            </p>

                            <div className="field-group fade-in">
                                <label className="field-label">Google Gemini API Key (Free)</label>
                                <input
                                    type="password"
                                    className="field-input"
                                    value={aiConfig.apiKey}
                                    onChange={e => setAiConfig(c => ({ ...c, apiKey: e.target.value }))}
                                    placeholder="Paste your API Key here..."
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Get a free key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>Google AI Studio</a>.
                                </p>
                            </div>
                        </div>
                        <div className="settings-actions">
                            <button className="btn-primary" onClick={() => setSettingsOpen(false)}>Save Settings</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Setup Guide Modal */}
            {
                showSetupGuide && (
                    <div className="modal-overlay fade-in" onClick={() => setShowSetupGuide(false)}>
                        <div className="modal-content glass setup-guide" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>AI Setup Guide 🛠️</h2>
                                <button className="modal-close" onClick={() => setShowSetupGuide(false)}>&times;</button>
                            </div>
                            <div className="modal-body">
                                <div className="setup-steps">
                                    <div className="setup-step">
                                        <div className="step-num">1</div>
                                        <div className="step-text">Install <b>Ollama</b> on your PC from <a href="https://ollama.com" target="_blank" rel="noreferrer">ollama.com</a></div>
                                    </div>
                                    <div className="setup-step">
                                        <div className="step-num">2</div>
                                        <div className="step-text">Run <code>ollama run llama3</code> in your terminal.</div>
                                    </div>
                                    <div className="setup-step">
                                        <div className="step-num">3</div>
                                        <div className="step-text"><b>Using Phone?</b> Set IP to <code>http://192.168.1.71:11434</code> in AI Settings.</div>
                                    </div>
                                </div>
                                <div className="setup-actions">
                                    <button className="btn-primary" onClick={() => {
                                        setOllamaUrl('http://192.168.1.71:11434');
                                        showToast('Switched to PC AI (192.168.1.71)', 'success');
                                        setShowSetupGuide(false);
                                    }}>Connect to My PC (192.168.1.71)</button>
                                    <button className="btn-secondary" onClick={() => { setShowSetupGuide(false); setSettingsOpen(true); }}>Manual Config</button>
                                </div>
                                <div className="setup-footer" style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    <button className="btn-ghost" onClick={() => { setShowSetupGuide(false); handleAiGenerate('5 page assignment on Modern Technology', true); }}>Try Mock Demo Instead</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Main Editor Content */}
            <div className="app-main">
                <aside className="controls-panel">
                    <TextInput
                        text={text}
                        onTextChange={setText}
                        onGenerate={handleAiGenerate}
                        isGenerating={isAiGenerating}
                        aiStatus={aiStatus}
                    />
                    <HeaderFields header={header} onHeaderChange={setHeader} />
                    <StyleControls
                        selectedStyle={selectedStyle} onStyleChange={setSelectedStyle}
                        inkColor={inkColor} onInkColorChange={setInkColor}
                        pageType={pageType} onPageTypeChange={setPageType}
                        lineSpacing={lineSpacing} onLineSpacingChange={setLineSpacing}
                        variationIntensity={variationIntensity} onVariationIntensityChange={setVariationIntensity}
                        fontSize={fontSize} onFontSizeChange={setFontSize}
                        fatigueMode={fatigueMode} onFatigueModeChange={setFatigueMode}
                        pageTemplate={pageTemplate} onPageTemplateChange={(tmplId) => {
                            setPageTemplate(tmplId);
                            const tmpl = PAGE_TEMPLATES.find(t => t.id === tmplId);
                            if (tmpl && tmpl.headerDefaults) {
                                setHeader(prev => ({
                                    title: tmpl.headerDefaults.title || prev.title,
                                    name: prev.name || '',
                                    rollNumber: prev.rollNumber || '',
                                    subject: tmpl.headerDefaults.subject || prev.subject,
                                    date: tmpl.headerDefaults.date || prev.date
                                }));
                            }
                            if (tmpl && tmpl.pageTypeId) {
                                const pt = PAGE_TYPES.find(p => p.id === tmpl.pageTypeId);
                                if (pt) setPageType(pt);
                            }
                        }}
                        glyphMap={glyphMap}
                    />
                    <HandwritingSampler glyphMap={glyphMap} onGlyphMapChange={setGlyphMap} />
                    <ActionBar
                        onGenerate={handleGenerate}
                        onDownload={handleDownload}
                        onPrint={handlePrint}
                        onExportPNG={handleExportPNG}
                        isGenerating={isGenerating}
                        hasPages={canvases.length > 0}
                    />

                    {/* Left Sidebar Ad Slot */}
                    <div style={{ padding: '0 20px 20px' }}>
                        <AdUnit slot="SIDEBAR_SLOT_ID" label="Sponsored" />
                    </div>
                </aside>

                <main className="preview-panel">
                    <div className="professional-preview-container">
                        <PagePreview
                            canvases={canvases}
                            currentPage={currentPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </main>

                <aside className="right-panel">
                    <div className="section-label" style={{ padding: '16px 20px 8px', borderBottom: '1px solid var(--border)' }}>SPONSORED</div>
                    <div className="right-panel-content">
                        <AdUnit slot="RIGHT_SIDEBAR_TOP" label="ADVERTISEMENT" />
                        <div style={{ marginTop: '20px' }}>
                            <AdUnit slot="RIGHT_SIDEBAR_BOTTOM" />
                        </div>
                    </div>
                </aside>
            </div>

            <footer className="professional-footer">
                <div className="footer-left">
                    <span className="footer-link">HandCraft v2.7</span>
                    <span className="footer-dot">•</span>
                    <span>Ready for Professional Use</span>
                </div>
                <div className="footer-right">
                    <a href="https://github.com/thakuradithya12/HandCraft" target="_blank" rel="noreferrer" className="footer-link">GitHub Repo</a>
                </div>
            </footer>
        </div >
    );
}
