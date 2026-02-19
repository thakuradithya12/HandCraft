/**
 * History Manager — handles persistence of assignment drafts and settings.
 */

const STORAGE_KEY_PREFIX = 'handcraft_';

export const HistoryManager = {
    /**
     * Save the current draft.
     */
    saveDraft: (data) => {
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}draft`, JSON.stringify({
                ...data,
                timestamp: Date.now()
            }));
        } catch (err) {
            console.error('Failed to save draft:', err);
        }
    },

    /**
     * Load the last saved draft.
     */
    loadDraft: () => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}draft`);
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    },

    /**
     * Save application settings.
     */
    saveSettings: (settings) => {
        try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}settings`, JSON.stringify(settings));
        } catch (err) {
            console.error('Failed to save settings:', err);
        }
    },

    /**
     * Load application settings.
     */
    loadSettings: () => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}settings`);
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    },

    /**
     * Clear all saved data.
     */
    clearAll: () => {
        localStorage.removeItem(`${STORAGE_KEY_PREFIX}draft`);
    }
};
