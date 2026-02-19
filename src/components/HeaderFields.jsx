export default function HeaderFields({ header, onHeaderChange }) {
    const update = (field, value) => {
        onHeaderChange({ ...header, [field]: value });
    };

    return (
        <div className="controls-section">
            <div className="section-label">Assignment Header</div>

            <div className="header-fields-grid">
                <div className="field-group full-width">
                    <label className="field-label">Title</label>
                    <input
                        className="field-input"
                        type="text"
                        placeholder="e.g., Data Structures Assignment - 3"
                        value={header.title || ''}
                        onChange={(e) => update('title', e.target.value)}
                    />
                </div>

                <div className="field-group">
                    <label className="field-label">Student Name</label>
                    <input
                        className="field-input"
                        type="text"
                        placeholder="Your name"
                        value={header.name || ''}
                        onChange={(e) => update('name', e.target.value)}
                    />
                </div>

                <div className="field-group">
                    <label className="field-label">Roll Number</label>
                    <input
                        className="field-input"
                        type="text"
                        placeholder="e.g., 21CS123"
                        value={header.rollNumber || ''}
                        onChange={(e) => update('rollNumber', e.target.value)}
                    />
                </div>

                <div className="field-group">
                    <label className="field-label">Subject</label>
                    <input
                        className="field-input"
                        type="text"
                        placeholder="e.g., Mathematics"
                        value={header.subject || ''}
                        onChange={(e) => update('subject', e.target.value)}
                    />
                </div>

                <div className="field-group">
                    <label className="field-label">Date</label>
                    <input
                        className="field-input"
                        type="text"
                        placeholder="e.g., 17/02/2026"
                        value={header.date || ''}
                        onChange={(e) => update('date', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}
