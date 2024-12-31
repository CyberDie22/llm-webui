import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: "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", // TODO: shouldn't be hard coded
    defaultHeaders: {
        // 'HTTP-Referer': process.env.APP_URL, // Required for OpenRouter
        // 'X-Title': process.env.APP_NAME // Optional, but recommended
    }
});

export async function POST({ request }) {
    try {
        const { messages, model } = await request.json();

        // Validate messages array
        if (!Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Messages must be an array' }),
                { status: 400 }
            );
        }

        // Create stream response
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    if (model === "my-thinker") {
                        const response = await fetch('http://localhost:8282/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                messages: messages
                            })
                        });
                
                        const reader = response.body.getReader();
                        const decoder = new TextDecoder();
                        let buffer = '';
                
                        while (true) {
                            const { value, done } = await reader.read();
                            if (done) break;
                            
                            buffer += decoder.decode(value);
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';
                            
                            for (const line of lines) {
                                if (line.trim()) {
                                    const chunk = JSON.parse(line);
                                    controller.enqueue(
                                        new TextEncoder().encode(
                                            JSON.stringify(chunk) + '\n'
                                        )
                                    )
                                }
                            }
                        }
                    } else {
                        const completion = await openai.chat.completions.create({
                            model,
                            messages,
                            stream: true
                        });

                        for await (const chunk of completion) {
                            const content = chunk.choices[0]?.delta?.content || '';
                            if (content) {
                                // Send each chunk without newlines
                                controller.enqueue(
                                    new TextEncoder().encode(
                                        JSON.stringify({ text: content }) + '\n'
                                    )
                                );
                            }
                        }
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500 }
        );
    }
}