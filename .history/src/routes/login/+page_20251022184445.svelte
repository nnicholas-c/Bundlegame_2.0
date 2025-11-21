<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authUser, needsAuth, id, isAuthenticated } from "$lib/bundle.js";
  import { get } from "svelte/store";

  let userInput = "";
  let userPass = "";
  let errorMessage = "";
  let loading = false;

  onMount(() => {
    if (!needsAuth || get(isAuthenticated)) {
      goto("/");
    }
  });

  async function login(event) {
    event.preventDefault();
    errorMessage = "";
    const idValue = userInput.trim();
    const tokenValue = userPass.trim();

    if (!idValue || !tokenValue) {
      errorMessage = "Please enter both your user ID and token.";
      return;
    }

    loading = true;
    try {
      const result = await authUser(idValue, tokenValue);
      if (result === 1) {
        id.set(idValue);
        isAuthenticated.set(true);
        goto("/");
      } else {
        errorMessage = "The user ID and token did not match our records.";
      }
    } catch (err) {
      console.error("Login error", err);
      errorMessage = "Unexpected error while signing in. Please try again.";
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen w-full bg-white">
  <div
    class="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-6"
  >
    <div class="w-full max-w-md border border-black bg-white p-10">
      <header class="mb-8 text-center">
        <h1 class="text-3xl font-semibold text-black">User Access</h1>
      </header>

      {#if errorMessage}
        <div
          class="mb-6 border border-black bg-white px-4 py-3 text-sm text-black"
        >
          {errorMessage}
        </div>
      {/if}

      <form class="space-y-6" onsubmit={login}>
        <div class="space-y-2">
          <label class="block text-sm font-medium text-black" for="user-id">
            User ID
          </label>
          <input
            id="user-id"
            class="w-full border border-black px-4 py-3 text-black focus:border-black focus:outline-none"
            type="text"
            bind:value={userInput}
            placeholder="Enter user ID"
            autocomplete="off"
            autocapitalize="none"
            spellcheck={false}
          />
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-black" for="user-token">
            Token (include dashes)
          </label>
          <input
            id="user-token"
            class="w-full border border-black px-4 py-3 text-black focus:border-black focus:outline-none"
            type="password"
            bind:value={userPass}
            placeholder="xxxx-xxxx-xxxx"
            autocomplete="off"
            autocapitalize="none"
            spellcheck={false}
          />
        </div>

        <button
          type="submit"
          class="flex w-full items-center justify-center gap-2 border border-black bg-black px-4 py-3 text-sm font-semibold tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!userInput.trim() || !userPass.trim() || loading}
        >
          {#if loading}
            <svg
              class="h-5 w-5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Verifying…
          {:else}
            Enter Simulation
          {/if}
        </button>
      </form>

      <a
        class="mt-8 block w-full border border-black px-4 py-3 text-center text-sm font-medium text-black"
        href="/"
      >
        Return to overview
      </a>
    </div>
  </div>
</div>
