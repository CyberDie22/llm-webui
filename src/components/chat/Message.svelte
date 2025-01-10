<script>
    let { role, content } = $props();

    let displayRole = $state("")
    switch (role) {
        case "user":
            displayRole = "User"
            break;
        case "assistant":
            displayRole = "AI"
            break;
    
        default:
            break;
    }
</script>

<div class="py-2 px-4 rounded-lg bg-neutral-700 w-6/12">
    <h6 class="font-bold text-lg">{displayRole}</h6>
    <div class="flex flex-col gap-2">
        {#each content as chunk}
            {#if 'text' in chunk && chunk.text !== ""}
                <p class='whitespace-pre-wrap'>{chunk.text}</p>
            {:else if 'image' in chunk}
                <img src={chunk.image} alt="unknown" class="max-w-[25%]" />
            {/if}
        {/each}
    </div>
</div>