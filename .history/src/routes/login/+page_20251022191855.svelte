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

<div
  class="relative min-h-screen flex items-center justify-center bg-slate-900/70"
>
  <div
    class="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800"
  ></div>
  <div
    class="relative w-full max-w-lg mx-4 bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-slate-200/70 p-10"
  >
    <header class="mb-8 text-center">
      <h1 class="text-3xl font-semibold text-slate-900">User Access</h1>
    </header>

    {#if errorMessage}
      <div
        class="mb-6 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 px-4 py-3"
      >
        {errorMessage}
      </div>
    {/if}

    <form class="mt-8 space-y-6" onsubmit={login}>
      <div class="space-y-2">
        <label class="block text-sm font-medium text-slate-800" for="user-id">
          User ID
        </label>
        <input
          id="user-id"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          type="text"
          bind:value={userInput}
          placeholder="Enter user ID"
          autocomplete="off"
          autocapitalize="none"
          spellcheck={false}
        />
      </div>

      <div class="space-y-2">
        <label
          class="block text-sm font-medium text-slate-800"
          for="user-token"
        >
          Token (include dashes)
        </label>
        <input
          id="user-token"
          class="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
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
        class="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold tracking-wide text-white shadow-lg transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
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
      class="mt-10 block w-full rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-600 transition hover:bg-slate-100"
      href="/"
    >
      Return to overview
    </a>
  </div>
</div>
