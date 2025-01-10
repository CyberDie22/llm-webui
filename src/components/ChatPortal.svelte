<script>
    import UpArrow from "../assets/up-arrow.svelte"
    import StopSquare from "../assets/stop-square.svelte"

    import Message from "./chat/Message.svelte";

    let chatMessages = $state([])
    let currentMessage = $state("")
    let receivingMessage = $state(false)
    let shouldCancelMessage = $state(false)

    function handleKeydown(event) {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            submitMessage()
        }
    }

    function convertMessagesToOpenAI(messages) {
        let convertedMessages = []
        for (const message of messages) {
            let convertedMessage = {
                'role': message.role,
                'content': []
            }
            let convertedContent = []
            for (const chunk of message.content) {
                if ('text' in chunk) {
                    convertedContent.push({'type': 'text', 'text': chunk.text})
                } else if ('image' in chunk) {
                    convertedContent.push({'type': 'text', 'text': `![](${chunk.image})`})
                }
            }
            convertedMessage.content = convertedContent
            convertedMessages.push(convertedMessage)
        }
        return convertedMessages
    }

    async function recieveMessage() {
        receivingMessage = true

        const response = await fetch('/api/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: convertMessagesToOpenAI(chatMessages),
                model: 'my-thinker'
            })
        });

        chatMessages.push({'role': 'assistant', 'content': [], 'web_content': []})

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        let mode = 'assistant_response'

        while (true) {
            const { value, done } = await reader.read();
            if (shouldCancelMessage) {
                reader.cancel()
                break
            }
            if (done) break
            
            buffer += decoder.decode(value);
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            // let finished = false
            
            for (const line of lines) {
                if (line.trim()) {
                    const chunk = JSON.parse(line);
                    console.log(chunk)
                    if (chunk['start']) {
                        mode = chunk.start
                        chatMessages.at(-1).web_content.push({'text': `Starting: ${mode}`})
                        chatMessages.at(-1).web_content.push({'text': ''})
                        continue
                    }

                    if (chunk['model']) {
                        let model = chunk.model
                        chatMessages.at(-1).web_content.push({'text': `Using model: ${model}`})
                        chatMessages.at(-1).web_content.push({'text': ''})
                        continue
                    }

                    // if (chunk['finish']) {
                    //     finished = true
                    //     break
                    // }

                    function updateContent(contentArray, text) {
                        let last = contentArray.at(-1)
                        if (!last || !('text' in last)) {
                            contentArray.push({'text': ''})
                            last = contentArray.at(-1)
                        }
                        last.text += text
                        contentArray[contentArray.length - 1] = last
                    }

                    const currentMessage = chatMessages.at(-1)
                    if (chunk['text']) {
                        updateContent(currentMessage.web_content, chunk.text)
                        if (mode === 'assistant_response') {
                            updateContent(currentMessage.content, chunk.text)
                        }
                    } else {
                        if (chunk['image']) {
                            currentMessage.web_content.push({'image': chunk.image})
                            if (mode === 'assistant_response') {
                                currentMessage.content.push({'image': chunk.image})
                            }
                        }
                    }
                }
            }

            // if (finished) {
            //     break
            // }
        }

        receivingMessage = false
    }

    async function cancelMessage() {
        shouldCancelMessage = true
    }

    async function submitMessage() {
        if (currentMessage === "" || !currentMessage.trim()) return

        chatMessages.push({
            'role': 'user',
            'content': [{'text': currentMessage}]
        })
        currentMessage = ""

        await recieveMessage()
    }
</script>

<div class="w-full h-full grid grid-rows-[1fr_10rem]">
    <div class="w-full h-full flex flex-col items-center gap-4 py-4 text-gray-200">
        {#each chatMessages as message}
            <Message role={message.role} content={message['web_content'] ? message.web_content : message.content} />
        {/each}
    </div>
    <div class="w-full h-full grid grid-cols-[1fr_40rem_1fr]">
        <div class="w-full h-full"></div>

        <div class="w-full h-full flex items-center">
            <textarea bind:value={currentMessage} onkeydown={handleKeydown} class="w-[40rem] h-1/2 outline-none resize-none rounded-lg p-2 text-gray-200 bg-neutral-700 border-[1px] border-gray-500"></textarea>
        </div>

        <div class="w-full h-full flex items-center">
            <button type="button" onclick={receivingMessage ? cancelMessage : submitMessage} class="ml-4 p-2 w-min h-min rounded-xl bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-500 text-gray-200">
                {#if receivingMessage}
                    <StopSquare class="text-3xl"></StopSquare>
                {:else}
                    <UpArrow class="text-3xl"></UpArrow>
                {/if}
            </button>
        </div>
    </div>
</div>