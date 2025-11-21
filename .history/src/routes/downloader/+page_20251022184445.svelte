<script>
  import { retrieveData } from "../../lib/firebaseDB";
  import "../../app.css";

  let password = "";
  let authorized = false;
  const correctPassword = "bobaboba";

  async function exportDataAsJSON() {
    const data = await retrieveData();
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });

    // Create a link element and trigger the download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "data.json";
    link.click();
  }

  function checkPassword() {
    if (password === correctPassword) {
      authorized = true;
    } else {
      alert("Incorrect password");
    }
  }
</script>

<div class="mx-auto mt-8 max-w-sm space-y-4 text-center text-black">
  {#if !authorized}
    <input
      type="password"
      bind:value={password}
      placeholder="Enter password"
      class="w-full border border-black px-3 py-2"
    />
    <button
      on:click={checkPassword}
      class="border border-black bg-black px-4 py-2 text-white"
    >
      Submit
    </button>
  {/if}

  {#if authorized}
    <button
      on:click={exportDataAsJSON}
      class="border border-black bg-black px-4 py-2 text-white"
    >
      Download JSON
    </button>
  {/if}
</div>
