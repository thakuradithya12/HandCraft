import { useState, useRef } from 'react';
import { parseFile } from '../utils/fileParser.js';

export default function TextInput({ text, onTextChange, onGenerate, isGenerating, aiStatus }) {
    const [activeTab, setActiveTab] = useState('prompt');
    const [prompt, setPrompt] = useState('');
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(false);
    const fileRef = useRef(null);

    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    const handleFileUpload = async (file) => {
        if (!file) return;
        setError('');
        setFileName(file.name);
        try {
            const content = await parseFile(file);
            onTextChange(content);
            setActiveTab('preview');
        } catch (err) {
            setError(err.message);
            setFileName('');
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handlePromptSubmit = () => {
        if (!prompt.trim()) return;
        onGenerate(prompt.trim());
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handlePromptSubmit();
        }
    };

    return (
        <div className="controls-section">
            <div className="section-label">Assignment Content</div>

            <div className="input-tabs">
                <button className={`input-tab ${activeTab === 'prompt' ? 'active' : ''}`} onClick={() => setActiveTab('prompt')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7l-3 3-3-3c-2-1.5-4-4-4-7a7 7 0 0 1 7-7z" /><circle cx="12" cy="9" r="1.5" /></svg> AI Generate
                </button>
                <button className={`input-tab ${activeTab === 'type' ? 'active' : ''}`} onClick={() => setActiveTab('type')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg> Type
                </button>
                <button className={`input-tab ${activeTab === 'upload' ? 'active' : ''}`} onClick={() => setActiveTab('upload')}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> Upload
                </button>
            </div>

            {activeTab === 'prompt' && (
                <div className="fade-in">
                    <div className="prompt-container">
                        <textarea
                            className="prompt-input"
                            placeholder={"Describe your assignment...\n\ne.g. \"Write a 5 page assignment on Data Structures and Algorithms\""}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isGenerating}
                            rows={3}
                        />
                        <button
                            className={`prompt-send-btn ${isGenerating ? 'generating' : ''}`}
                            onClick={handlePromptSubmit}
                            disabled={isGenerating || !prompt.trim()}
                            title="Generate assignment content"
                        >
                            {isGenerating ? (
                                <span className="btn-spinner"></span>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                            )}
                        </button>
                    </div>

                    {aiStatus && (
                        <div className="ai-status fade-in">
                            <div className="ai-status-dot" />
                            <span>{aiStatus}</span>
                        </div>
                    )}

                    <div className="prompt-suggestions">
                        <div className="prompt-suggestions-label">Quick prompts:</div>
                        <div className="prompt-chips">
                            {[
                                '5 page assignment on Data Structures',
                                '3 page essay on Artificial Intelligence',
                                '4 page report on Operating Systems',
                                '5 page assignment on Computer Networks',
                                '3 page essay on Climate Change',
                                '4 page report on Newton\'s Laws of Motion'
                            ].map((s, i) => (
                                <button
                                    key={i}
                                    className="prompt-chip"
                                    onClick={() => { setPrompt(s); }}
                                    disabled={isGenerating}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {text && (
                        <div className="ai-preview-info">
                            <span>{wordCount} words generated</span>
                            <button className="text-clear-btn" onClick={() => { onTextChange(''); setPrompt(''); }}>Clear</button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'type' && (
                <div className="fade-in">
                    <div className="editor-toolbar">
                        <div className="dropdown">
                            <button className="toolbar-btn">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                                Insert Diagram
                            </button>
                            <div className="dropdown-menu">
                                <button onClick={() => onTextChange(text + '\n\n[DIAGRAM: flowchart | Flowchart Title | Step 1 -> Step 2 -> Step 3]\n')}>Flowchart</button>
                                <button onClick={() => onTextChange(text + '\n\n[DIAGRAM: tree | Tree Title | Root: A, Left: B, Right: C]\n')}>Tree Diagram</button>
                                <button onClick={() => onTextChange(text + '\n\n[DIAGRAM: cycle | Cycle Title | Planning -> Execution -> Review -> Planning]\n')}>Cycle Diagram</button>
                                <button onClick={() => onTextChange(text + '\n\n[DIAGRAM: table | Table Title | Headers: Col1, Col2; Row1: A, B; Row2: C, D]\n')}>Table</button>
                                <button onClick={() => onTextChange(text + '\n\n[DIAGRAM: labeled | Label Title | Components: Part A, Part B, Part C]\n')}>Labeled Diagram</button>
                            </div>
                        </div>
                        <div className="toolbar-divider"></div>
                        <button className="toolbar-btn" onClick={() => onTextChange(text + '\n# New Heading\n')}>H1</button>
                        <button className="toolbar-btn" onClick={() => onTextChange(text + '\n## Sub-Heading\n')}>H2</button>
                    </div>
                    <textarea
                        className="text-area"
                        placeholder={"Paste or type your assignment content here...\n\nUse # for headings (e.g., # Introduction)\nLeave blank lines between paragraphs.\n\nAdd diagrams with:\n[DIAGRAM: flowchart | Title | Step1 -> Step2 -> Step3]"}
                        value={text}
                        onChange={(e) => onTextChange(e.target.value)}
                        spellCheck={false}
                    />
                    <div className="text-stats">
                        <span>{wordCount} words</span>
                        <span>{text.length} characters</span>
                        {text.length > 0 && (
                            <button className="text-clear-btn" onClick={() => onTextChange('')}>Clear</button>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'upload' && (
                <div className="fade-in">
                    <div
                        className={`file-upload-zone ${dragging ? 'dragging' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".txt,.md,.docx,.pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(e.target.files[0])}
                        />
                        <div className="file-upload-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg></div>
                        <div className="file-upload-text">Drop file here or <strong>click to browse</strong></div>
                        <div className="file-upload-hint">Supports .txt, .md, .docx, .pdf</div>
                    </div>
                    {fileName && (
                        <div className="file-name-display">
                            <span>{fileName}</span>
                            <button onClick={() => { setFileName(''); onTextChange(''); }}>&times;</button>
                        </div>
                    )}
                    {text && (
                        <div className="ai-preview-info" style={{ marginTop: '8px' }}>
                            <span>{wordCount} words loaded from file</span>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'preview' && text && (
                <div className="fade-in">
                    <div className="content-preview-header">
                        <span>Content loaded from {fileName || 'file'}</span>
                        <button className="input-tab active btn-xs" onClick={() => setActiveTab('type')} style={{ flex: 'none' }}>Edit</button>
                    </div>
                    <textarea
                        className="text-area"
                        value={text}
                        onChange={(e) => onTextChange(e.target.value)}
                        spellCheck={false}
                        style={{ minHeight: '100px' }}
                    />
                    <div className="text-stats">
                        <span>{wordCount} words</span>
                    </div>
                </div>
            )}

            {error && <div className="status-msg error fade-in">{error}</div>}
        </div>
    );
}
