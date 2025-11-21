<script>
  import { globalError } from "$lib/globalError.js";
  import Bundlegame from "./bundlegame.svelte";
  import {
    game,
    elapsed,
    resetTimer,
    earned,
    currLocation,
    id,
    logAction,
    GameOver,
    authUser,
    orderList,
    ordersShown,
    startTimer,
    finishedOrders,
    createNewUser,
    needsAuth,
    loadGame,
  } from "$lib/tutorial.js";
  import { generateCompleteId } from "$lib/firebaseDB.js";
  import Home from "./home.svelte";
  import { onMount } from "svelte";
  import { queueNFixedOrders, getDistances } from "$lib/config.js";
  import "../../app.css";

  $: inSelect = $game.inSelect;
  $: inStore = $game.inStore;
  $: bundled = $game.bundled;
  let userInput = "";
  let userPass = "";

  let started = false;
  let completed = "";
  let completed2 = "";
  async function start() {
    const auth = await authUser(userInput, userPass);
    if (auth === 1) {
      const user = await createNewUser(userInput);
      if (user != -1) {
        startTimer();
        resetTimer();
        $game.inSelect = true;
        $id = userInput;
        started = true;
        $orderList = queueNFixedOrders(ordersShown);
        completed = generateCompleteId(userInput);
        completed2 = user;
      }
    } else {
      alert("id and token do not match");
    }
  }

  async function startNoAuth() {
    const user = await loadGame();
    if (user != -1) {
      startTimer();
      resetTimer();
      $game.inSelect = true;
      started = true;
      $orderList = queueNFixedOrders(ordersShown);
    }
  }

  function handleClick(event) {
    if (needsAuth) {
      if (event.target.id === "start" || event.target.id === "addtobag") {
        return;
      }
      if (event.target.tagName == "BUTTON") {
        let action = {
          buttonID: event.target.id,
          buttonContent: event.target.textContent.trim(),
        };
        logAction(action);
      } else if (event.target.classList.contains("order-content")) {
        let action = {
          buttonID: event.target.id,
          buttonContent: event.target.textContent.trim(),
        };
        logAction(action);
      }
    }
  }

  onMount(() => {
    window.addEventListener("click", handleClick);
    return () => {
      console.log("listener removed");
      window.removeEventListener("click", handleClick);
    };
  });
</script>

<div class="mx-auto max-w-5xl space-y-8 px-4 py-8 text-black">
  {#if $globalError}
    <div
      class="rounded-lg border border-black/15 bg-white p-4 font-semibold shadow-sm"
    >
      ⚠️ Error: {$globalError}
    </div>
  {:else if $GameOver}
    <div
      class="mx-auto max-w-xl space-y-6 rounded-lg border border-black/15 bg-white p-6 text-center shadow-sm"
    >
      <h3 class="text-2xl font-bold">Game Over!</h3>

      <div>
        <h4 class="text-xl font-semibold">Your Stats:</h4>
        <ul class="mt-2 list-disc list-inside space-y-1 text-left">
          <li><span class="font-medium">Earnings:</span> ${$earned}</li>
          <li>
            <span class="font-medium">Finished Orders:</span>
            {$finishedOrders.length}
          </li>
        </ul>
      </div>
      {#if needsAuth}
        <div class="rounded border border-black/10 bg-white p-4 text-left">
          <h3 class="mb-2 text-lg font-semibold">
            Please copy the following two codes back into the Qualtrics survey:
          </h3>
          <p>
            <span class="font-semibold">Code #1:</span><span class="font-mono"
              >{completed}</span
            >
          </p>
          <p>
            <span class="font-semibold">Code #2:</span><span class="font-mono"
              >{completed2}</span
            >
          </p>
        </div>

        <h5 class="text-sm">
          You may close this page once you have successfully continued to the
          next step in the survey.
        </h5>
      {/if}
    </div>
  {:else}
    <h4 class="font-bold py-2">Please do not refresh or close the page!</h4>
    {#if started}
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium"
      >
        <span>Time: {$elapsed ? $elapsed : 0}s</span>
        <span aria-hidden="true">|</span>
        <span>Earned: ${$earned}</span>
        <span aria-hidden="true">|</span>
        <span>Location: {$currLocation}</span>
      </div>
    {/if}
    {#if !started}
      {#if needsAuth}
        <div
          class="flex flex-col items-start gap-3 rounded-lg border border-black/15 bg-white p-6 shadow-sm"
        >
          <p>Input your ID</p>
          <input
            class="w-full border border-black/30 px-3 py-2"
            type="text"
            bind:value={userInput}
            placeholder="Enter"
          />
          <p>Input your token (include dashes)</p>
          <input
            class="w-full border border-black/30 px-3 py-2"
            type="password"
            bind:value={userPass}
            placeholder="Enter"
          />
          <button
            class="w-full rounded-md border border-black px-6 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
            id="start"
            onclick={start}>Start Session</button
          >
        </div>
      {:else}
        <button
          class="rounded-md border border-black px-6 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
          id="start"
          onclick={startNoAuth}>Start Session</button
        >
      {/if}
    {:else if inSelect}
      <Home />
    {:else if inStore}
      <Bundlegame />
    {/if}
  {/if}
</div>
