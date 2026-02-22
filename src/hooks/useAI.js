import { useState, useCallback, useEffect } from 'react';
import { generateAssignment, setAIConfig as setAIConfigUtil } from '../utils/aiContentGenerator.js';
import { showToast } from '../components/Toast.jsx';

export function useAI(aiConfig, setAiConfig) {
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [aiStatus, setAiStatus] = useState('');
    const [showSetupGuide, setShowSetupGuide] = useState(false);

    // Sync config with utils
    useEffect(() => {
        setAIConfigUtil(aiConfig);
    }, [aiConfig]);

    const handleAiGenerate = useCallback(async (prompt, onContentGenerated, headerTitle, setHeader, useMock = false) => {
        setIsAiGenerating(true);
        setAiStatus(useMock ? 'Generating Demo...' : 'Connecting to AI Service...');

        // Pre-check for missing credentials to avoid multiple errors
        if (!useMock) {
            const isLocal = aiConfig.mode === 'local';
            const hasKey = aiConfig.apiKey && aiConfig.apiKey.trim().length > 5;

            if (aiConfig.mode === 'cloud' && !hasKey) {
                showToast('No API Key found. Using Demo Mode.', 'info');
                return handleAiGenerate(prompt, onContentGenerated, headerTitle, setHeader, true);
            }
        }

        try {
            const content = await generateAssignment(
                prompt,
                (partialText) => {
                    onContentGenerated(partialText);
                    setAiStatus(`Generating... (${partialText.split(/\s+/).length} words)`);
                },
                (status) => setAiStatus(status),
                useMock
            );

            if (!content || !content.trim()) {
                throw new Error('AI generated empty content. Please try again.');
            }

            onContentGenerated(content);
            setAiStatus('Content generated! Click "Generate Pages" to render.');
            showToast('Assignment content generated!', 'success');

            // Auto-fill header title from prompt if empty
            if (!headerTitle) {
                const topicMatch = prompt.match(/(?:on|about|topic:|title:)\s+([^.]+)/i);
                if (topicMatch) {
                    let newTitle = topicMatch[1].trim();
                    if (newTitle.length > 40) newTitle = newTitle.substring(0, 40) + '...';
                    setHeader(h => ({ ...h, title: newTitle }));
                }
            }
        } catch (err) {
            console.error('AI generation error:', err);
            setAiStatus('');

            // User requested no intrusive setup guide
            if (!useMock) {
                showToast(`AI Error: ${err.message}`, 'error');
                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                if (aiConfig.mode === 'local' && !isLocalhost) {
                    showToast('Local AI unreachable. Using Demo Mode.', 'info');
                    handleAiGenerate(prompt, onContentGenerated, headerTitle, setHeader, true);
                }
            }
        } finally {
            setIsAiGenerating(false);
        }
    }, [aiConfig]);

    const setOllamaUrl = (url) => {
        setAiConfig(prev => ({ ...prev, url, mode: 'local' }));
    };

    return {
        isAiGenerating,
        aiStatus,
        aiConfig,
        setAiConfig,
        handleAiGenerate,
        showSetupGuide,
        setShowSetupGuide,
        setOllamaUrl
    };
}
