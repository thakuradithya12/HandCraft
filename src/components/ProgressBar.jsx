export default function ProgressBar({ isActive }) {
    if (!isActive) return null;
    return (
        <div className="progress-bar-container">
            <div className="progress-bar-track">
                <div className="progress-bar-fill" />
            </div>
        </div>
    );
}
