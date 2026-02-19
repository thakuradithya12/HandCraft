/**
 * AI Content Generator — uses Ollama (local) to generate assignment content
 * from a simple user prompt like "Write a 5 page assignment on DSA".
 */

const OLLAMA_BASE = 'http://localhost:11434';

/**
 * Build the system prompt for generating assignment content.
 */
function buildSystemPrompt(pageCount) {
    return `You are an expert academic assignment writer. Write detailed, well-structured assignment content.

RULES:
- Write in clear academic English suitable for college/university assignments
- Use markdown headings (# for main headings, ## for sub-headings)
- Write ${pageCount || 5} pages worth of content (approximately ${(pageCount || 5) * 350} words)
- Include an introduction and conclusion
- Break content into logical sections with headings
- Write complete, detailed paragraphs (not bullet points)
- After key concepts, include a diagram marker on its own line in this EXACT format:
  [DIAGRAM: type | title | description]
  
  Where type is one of: flowchart, tree, table, labeled, cycle
  Examples:
  [DIAGRAM: flowchart | Algorithm Steps | Start -> Input -> Process -> Output -> End]
  [DIAGRAM: tree | Binary Search Tree | Root:50, Left:30(Left:20,Right:40), Right:70(Left:60,Right:80)]
  [DIAGRAM: table | Comparison | Headers: Feature,Array,LinkedList; Row1: Access,O(1),O(n); Row2: Insert,O(n),O(1)]
  [DIAGRAM: labeled | CPU Architecture | Components: ALU, Control Unit, Registers, Cache with arrows between them]
  [DIAGRAM: cycle | Software Development | Requirements -> Design -> Implementation -> Testing -> Deployment -> Maintenance -> Requirements]

- Include 2-4 diagrams spread throughout the content
- Do NOT use bullet points or numbered lists — write in paragraph form
- Do NOT include any meta-commentary about the assignment itself`;
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
        throw new Error('Ollama is not running or has no models. Please start Ollama and pull a model (e.g., "ollama pull gemma3:1b").');
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
 * Generate content with a friendly conversational wrapper.
 */
export async function generateAssignment(prompt, onProgress = null, onStatus = null) {
    if (onStatus) onStatus('Connecting to Ollama...');

    const status = await checkOllamaStatus();
    if (!status.available) {
        throw new Error('Cannot connect to Ollama. Make sure Ollama is running on localhost:11434.');
    }

    if (onStatus) onStatus('Generating your assignment...');

    const content = await generateContent(prompt, onProgress);

    if (onStatus) onStatus('Done!');

    return content;
}
