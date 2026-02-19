export default function HelpModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>How to Use</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    <div className="help-section">
                        <h3>Getting Started</h3>
                        <ol>
                            <li>Type or paste your assignment text, or use a sample</li>
                            <li>Fill in the header fields (name, roll number, etc.)</li>
                            <li>Choose a handwriting style and ink color</li>
                            <li>Click <strong>Generate</strong> to create handwritten pages</li>
                            <li>Download as PDF or print directly</li>
                        </ol>
                    </div>

                    <div className="help-section">
                        <h3>Formatting Tips</h3>
                        <ul>
                            <li>Use <code>#</code> at the start of a line for headings</li>
                            <li>ALL CAPS short lines are auto-detected as headings</li>
                            <li>Leave blank lines between paragraphs</li>
                            <li>Long text automatically flows across multiple pages</li>
                        </ul>
                    </div>

                    <div className="help-section">
                        <h3>Keyboard Shortcuts</h3>
                        <div className="shortcuts-grid">
                            <div className="shortcut-item"><kbd>Ctrl + G</kbd><span>Generate handwriting</span></div>
                            <div className="shortcut-item"><kbd>Ctrl + D</kbd><span>Download PDF</span></div>
                            <div className="shortcut-item"><kbd>Ctrl + P</kbd><span>Print pages</span></div>
                            <div className="shortcut-item"><kbd>Esc</kbd><span>Close this dialog</span></div>
                        </div>
                    </div>

                    <div className="help-section">
                        <h3>Style Options</h3>
                        <ul>
                            <li><strong>5 writing styles</strong> — from neat to casual</li>
                            <li><strong>3 ink colors</strong> — blue, dark blue, black</li>
                            <li><strong>Messiness slider</strong> — control handwriting naturalness</li>
                            <li><strong>Page types</strong> — ruled, blank, double-margin</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
