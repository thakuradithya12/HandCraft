import { useState, useEffect, useCallback } from 'react';

let toastId = 0;
let addToastGlobal = null;

export function showToast(msg, type = 'info') {
    if (addToastGlobal) addToastGlobal({ id: ++toastId, msg, type });
}

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((toast) => {
        setToasts(prev => [...prev.slice(-4), toast]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, 3500);
    }, []);

    useEffect(() => {
        addToastGlobal = addToast;
        return () => { addToastGlobal = null; };
    }, [addToast]);

    return (
        <div className="toast-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast toast-${t.type}`}>
                    <span className="toast-icon">
                        {t.type === 'error' ? '!' : t.type === 'success' ? '\u2713' : 'i'}
                    </span>
                    <span className="toast-msg">{t.msg}</span>
                    <button className="toast-close" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}>×</button>
                </div>
            ))}
        </div>
    );
}
