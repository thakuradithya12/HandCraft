/**
 * AI Content Generator — uses Ollama (local) to generate assignment content
 * from a simple user prompt like "Write a 5 page assignment on DSA".
 */

let OLLAMA_BASE = 'http://localhost:11434';

// Fallback to Vercel API if in Cloud Mode
let IS_CLOUD_MODE = false;
let CLOUD_API_KEY = null;

/**
 * Update the AI Configuration (Local or Cloud).
 */
export function setAIConfig(config) {
    if (config.mode === 'cloud') {
        IS_CLOUD_MODE = true;
        CLOUD_API_KEY = config.apiKey || null;
    } else {
        IS_CLOUD_MODE = false;
        if (config.url) {
            let finalUrl = config.url.trim();
            if (!finalUrl.startsWith('http')) finalUrl = `http://${finalUrl}`;
            if (!finalUrl.includes(':')) finalUrl = `${finalUrl}:11434`;
            OLLAMA_BASE = finalUrl.endsWith('/') ? finalUrl.slice(0, -1) : finalUrl;
        }
    }
}

export function getAIConfig() {
    return {
        mode: IS_CLOUD_MODE ? 'cloud' : 'local',
        url: OLLAMA_BASE,
        apiKey: CLOUD_API_KEY
    };
}

export function getOllamaBase() {
    return OLLAMA_BASE;
}

/**
 * Update the Ollama base URL (legacy support).
 */
export function setOllamaBase(url) {
    if (!url) return;
    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http')) finalUrl = `http://${finalUrl}`;
    if (!finalUrl.includes(':')) finalUrl = `${finalUrl}:11434`;
    OLLAMA_BASE = finalUrl.endsWith('/') ? finalUrl.slice(0, -1) : finalUrl;
}

async function callCloudAI(prompt, onStream) {
    if (!CLOUD_API_KEY) throw new Error("Missing Google API Key. Please add it in Settings.");

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Gemini-API-Key': CLOUD_API_KEY // Standardize header if possible
        },
        body: JSON.stringify({ prompt, apiKey: CLOUD_API_KEY, system: buildSystemPrompt(5) })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to connect to Cloud AI.');
    }

    const data = await response.json();
    if (onStream) onStream(data.content); // Cloud is currently one-shot, but simulate stream callback
    return data.content;
}

/**
 * Build the system prompt for generating assignment content.
 */
function buildSystemPrompt(pageCount) {
    const wordCount = (pageCount || 5) * 350;
    return `You are an expert academic assignment writer and researcher. Your goal is to write a highly detailed, professional, and well-researched assignment.

CORE REQUIREMENTS:
- TONE: Professional academic English. No slang, no conversational filler.
- FORMAT: Use Markdown headings (# for Main Titles, ## for Sections, ### for Sub-sections).
- LENGTH: Write approximately ${wordCount} words to fill ${pageCount || 5} pages.
- STRUCTURE: Include a Title, Introduction, Body Sections with deep analysis, and a comprehensive Conclusion.
- PARAGRAPHS: Write long, descriptive paragraphs. Do NOT use bullet points or numbered lists.
- CONTENT: Focus on depth. Explain "why" and "how", not just "what".

DIAGRAMS:
Embed 2-4 diagrams at relevant points using this EXACT format:
[DIAGRAM: type | title | description]

Valid types: flowchart, tree, table, labeled, cycle, venn, graph
Examples:
[DIAGRAM: flowchart | DNS Resolution | User -> Local DNS -> Root Server -> TLD Server -> Authoritative DNS -> IP Return]
[DIAGRAM: venn | SQL Joins | Sets: Inner Join, Left Join, Cross Join; Intersection: Data consistency]
[DIAGRAM: graph | Resource Usage | Labels: Time, CPU%; Points: (0,10), (1,30), (2,25), (3,60), (4,40)]

- Do NOT include any meta-commentary like "Sure, I can write that for you".
- Begin directly with the assignment title.`;
}

/**
 * Parse the user's prompt to extract topic and page count.
 */
export function parsePrompt(prompt) {
    const pageMatch = prompt.match(/(\d+)\s*page/i);
    const pageCount = pageMatch ? parseInt(pageMatch[1]) : 5;

    // Extract topic — remove page instructions
    let topic = prompt
        .replace(/(?:write|create|make|generate)\s+(?:a|an|me)?\s*/i, '')
        .replace(/\d+\s*page\s*(?:assignment|essay|report|paper|project)?\s*(?:on|about|regarding)?\s*/i, '')
        .replace(/\s*assignment\s*(?:on|about)?\s*/i, '')
        .replace(/\s*essay\s*(?:on|about)?\s*/i, '')
        .replace(/\s*report\s*(?:on|about)?\s*/i, '')
        .trim();

    if (!topic) topic = prompt.trim();

    return { topic, pageCount };
}

/**
 * Check if Ollama is available.
 */
export async function checkOllamaStatus() {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`);
        if (!res.ok) return { available: false, models: [] };
        const data = await res.json();
        const models = (data.models || []).map(m => m.name);
        return { available: true, models };
    } catch {
        return { available: false, models: [] };
    }
}

/**
 * Get the best available model from Ollama.
 */
export async function getBestModel() {
    const { available, models } = await checkOllamaStatus();
    if (!available || models.length === 0) return null;

    // Prefer larger models for better content
    const preferred = ['llama3:8b', 'llama3', 'llama2', 'mistral', 'gemma3:1b', 'gemma3', 'gemma2', 'phi3', 'qwen'];
    for (const p of preferred) {
        const found = models.find(m => m.includes(p));
        if (found) return found;
    }
    return models[0];
}

/**
 * Generate assignment content using Ollama.
 * @param {string} userPrompt - The user's natural language prompt
 * @param {function} onProgress - Callback for streaming progress (receives partial text)
 * @returns {Promise<string>} - Generated markdown content
 */
export async function generateContent(userPrompt, onProgress = null) {
    const { topic, pageCount } = parsePrompt(userPrompt);
    const model = await getBestModel();

    if (!model) {
        throw new Error(`Ollama is not running at ${OLLAMA_BASE} or has no models. If using on mobile, enter your computer's IP address in AI Settings.`);
    }

    const systemPrompt = buildSystemPrompt(pageCount);
    const fullPrompt = `Write a complete ${pageCount}-page academic assignment on the topic: "${topic}".\n\nInclude relevant diagrams using the [DIAGRAM: ...] format. Make the content detailed, informative, and well-organized with clear headings.`;

    const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model,
            system: systemPrompt,
            prompt: fullPrompt,
            stream: true,
            options: {
                temperature: 0.7,
                top_p: 0.9,
                num_predict: Math.max(pageCount * 500, 2000),
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    // Stream the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
            try {
                const json = JSON.parse(line);
                if (json.response) {
                    fullText += json.response;
                    if (onProgress) onProgress(fullText);
                }
            } catch {
                // Skip malformed JSON
            }
        }
    }

    return fullText.trim();
}

/**
 * Mock content for demonstration when Ollama is unavailable.
 */
function getMockContent(topic) {
    return `# Assignment: ${topic || 'Advanced Computing Concepts'}

## Introduction
The field of ${topic || 'computing'} has evolved rapidly over the last several decades, transforming from niche academic interests into the very backbone of modern global infrastructure. Understanding the core principles of ${topic || 'this subject'} is essential for any professional looking to navigate the complexities of today's technological landscape.

[DIAGRAM: flowchart | Evolution Process | Research -> Development -> Testing -> Deployment -> Optimization]

## Core Methodologies
When examining ${topic || 'these concepts'}, we must consider the various methodologies used by practitioners to ensure efficiency and reliability. These approaches provide a structured framework for solving problems and implementing solutions at scale. Historically, these methodologies have shifted from rigid, sequential processes to more fluid and adaptive systems.

[DIAGRAM: table | Comparison of Approaches | Headers: Approach, Efficiency, Scalability; Row1: Traditional, Medium, Low; Row2: Modern, High, High; Row3: AI-Driven, Ultra, Dynamic]

## Emerging Trends
Recent advancements have introduced novel ways of interacting with ${topic || 'information systems'}. The integration of artificial intelligence and machine learning is not just a trend but a paradigm shift that affects every layer of the stack, from low-level data processing to high-level decision making.

[DIAGRAM: labeled | System Architecture | Components: Frontend, API Layer, Database, AI Engine, Monitoring]

## Conclusion
In conclusion, the study of ${topic || 'this topic'} is a continuous journey of learning and adaptation. As technologies emerge and mature, our understanding and methodologies must also evolve to keep pace. The future holds immense promise for further innovation and integration across all domains.`;
}

/**
 * Generate content with a friendly conversational wrapper.
 */

/**
 * Generate content with a friendly conversational wrapper.
 */
export async function generateAssignment(prompt, onProgress = null, onStatus = null, useMock = false) {
    if (useMock) {
        if (onStatus) onStatus('Generating Demo content...');
        const { topic } = parsePrompt(prompt);
        const content = getMockContent(topic);

        // Simulate streaming
        for (let i = 1; i <= content.length; i += 15) {
            if (onProgress) onProgress(content.slice(0, i));
            await new Promise(r => setTimeout(r, 10));
        }

        if (onStatus) onStatus('Demo Done!');
        return content;
    }

    if (IS_CLOUD_MODE) {
        if (onStatus) onStatus('Contacting Cloud AI (Gemini)...');
        try {
            const content = await callCloudAI(prompt, onProgress);
            if (onStatus) onStatus('Done!');
            return content;
        } catch (err) {
            throw new Error(`Cloud AI Error: ${err.message}`);
        }
    }

    if (onStatus) onStatus('Connecting to Local Ollama...');

    const status = await checkOllamaStatus();
    if (!status.available) {
        throw new Error(`Cannot connect to Ollama at ${OLLAMA_BASE}. Tip: If you are using this site on a phone, make sure your computer and phone are on the same WiFi, and use your computer's IP address (e.g. 192.168.x.x) in AI Settings.`);
    }

    if (onStatus) onStatus('Generating your assignment...');

    const content = await generateContent(prompt, onProgress);

    if (onStatus) onStatus('Done!');

    return content;
}
