
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request, response) {
    // Enable CORS
    response.setHeader('Access-Control-Allow-Credentials', true);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    response.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (request.method === 'OPTIONS') {
        response.status(200).end();
        return;
    }

    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt, apiKey } = request.body;

        // Use the provided key or fallback to environment variable (BYOK vs Hosted)
        const key = apiKey || process.env.GEMINI_API_KEY;

        if (!key) {
            return response.status(400).json({
                error: 'Missing API Key. Please provide a Google Gemini API Key in settings.'
            });
        }

        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return response.status(200).json({ content: responseText });

    } catch (error) {
        console.error('Gemini API Error:', error);
        return response.status(500).json({
            error: 'Failed to generate content.',
            details: error.message
        });
    }
}
