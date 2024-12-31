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
    <p class="whitespace-pre-line">{content}</p>
</div>