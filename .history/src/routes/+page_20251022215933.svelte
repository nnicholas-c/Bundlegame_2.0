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
    orderList,
    ordersShown,
    startTimer,
    finishedOrders,
    createNewUser,
    needsAuth,
    loadGame,
    currentCompany,
    companies,
    switchCompany,
    openCompanySwitchModal,
    closeCompanySwitchModal,
    updateHourlyEarned,
    hourlyEarnings,
    resetEarningsState,
    finalizeCompanySession,
    isAuthenticated,
  } from "$lib/bundle.js";
  import { generateCompleteId } from "$lib/firebaseDB.js";
  import Home from "./home.svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import { goto } from "$app/navigation";
  import { queueNFixedOrders, getDistances } from "$lib/config.js";
  import "../app.css";

  $: inSelect = $game.inSelect;
  $: inStore = $game.inStore;
  $: bundled = $game.bundled;
  $: companySelected = $game.companySelected;
  $: waitingForNextJob = $game.waitingForNextJob;
  $: breakTimer = $game.breakTimer;
  $: showCompanySwitchModal = $game.showCompanySwitchModal;
  let started = false;
  let completed = "";
  let completed2 = "";
  let hourlyUpdateInterval;
  function selectCompany(companyId) {
    const selected = companies.find((company) => company.id === companyId);
    if (!selected) {
      return;
    }
    currentCompany.set(selected);
    $game.companySelected = true;
    if (!started) {
      resetEarningsState();
    }
    updateHourlyEarned();
  }

  async function start() {
    if (!$currentCompany) {
      alert("Please choose a company before starting.");
      return;
    }
    if (needsAuth && !get(isAuthenticated)) {
      goto("/login");
      return;
    }

    const userId = get(id);
    if (needsAuth && !userId) {
      alert("Please sign in before starting the game.");
      goto("/login");
      return;
    }

    resetEarningsState();
    const user = await createNewUser(userId, $currentCompany.id);
    if (user != -1) {
      startTimer();
      resetTimer();
      $game.inSelect = true;
      started = true;
      $orderList = queueNFixedOrders(ordersShown, $currentCompany.id);
      completed = generateCompleteId(userId);
      completed2 = user;
      updateHourlyEarned();
    }
  }

  async function startNoAuth(companyId) {
    if (!companyId) {
      alert("Please choose a company before starting.");
      return;
    }
    const user = await loadGame();
    if (user != -1) {
      resetEarningsState();
      startTimer();
      resetTimer();
      $game.inSelect = true;
      started = true;
      $orderList = queueNFixedOrders(ordersShown, companyId);
      updateHourlyEarned();
    }
  }

  function handleClick(event) {
    if (needsAuth && !get(isAuthenticated)) {
      return;
    }
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
    if (needsAuth && !get(isAuthenticated)) {
      goto("/login");
      return;
    }

    window.addEventListener("click", handleClick);
    hourlyUpdateInterval = setInterval(() => {
      updateHourlyEarned();
    }, 1000);
    return () => {
      console.log("listener removed");
      window.removeEventListener("click", handleClick);
      clearInterval(hourlyUpdateInterval);
      finalizeCompanySession();
    };
  });

  $: if ($GameOver) {
    finalizeCompanySession();
  }
</script>

<div class="container mx-auto px-4 py-6">
  {#if $globalError}
    <div class="text-red-600 font-bold bg-red-100 p-4 rounded">
      ⚠️ Error: {$globalError}
    </div>
  {:else if $GameOver}
    <div
      class="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md text-center space-y-6"
    >
      <h3 class="text-2xl font-bold text-red-600">Game Over!</h3>

      <div>
        <h4 class="text-xl font-semibold text-gray-800">Your Stats:</h4>
        <ul
          class="list-disc list-inside text-left text-gray-700 mt-2 space-y-1"
        >
          <li><span class="font-medium">Earnings:</span> ${$earned}</li>
          <li>
            <span class="font-medium">Finished Orders:</span>
            {$finishedOrders.length}
          </li>
        </ul>
      </div>
      {#if needsAuth}
        <div class="bg-yellow-100 p-4 rounded border border-yellow-400">
          <h3 class="text-lg font-semibold text-yellow-800 mb-2">
            Please copy the following two codes back into the Qualtrics survey:
          </h3>
          <p class="text-gray-800">
            <span class="font-semibold">Code #1:</span><span
              class="text-blue-600 font-mono">{completed}</span
            >
          </p>
          <p class="text-gray-800">
            <span class="font-semibold">Code #2:</span><span
              class="text-blue-600 font-mono">{completed2}</span
            >
          </p>
        </div>

        <h5 class="text-sm text-gray-600">
          You may close this page once you have successfully continued to the
          next step in the survey.
        </h5>
      {/if}
    </div>
  {:else if needsAuth && !$isAuthenticated}
    <div
      class="max-w-md mx-auto bg-yellow-100 border border-yellow-300 text-yellow-900 rounded-md p-4 mt-6 text-center"
    >
      <p class="font-medium">You must sign in before playing.</p>
      <p>
        <a class="text-blue-600 underline" href="/login">Go to the login page</a
        >.
      </p>
    </div>
  {:else}
    <h4 class="font-bold py-2">Please do not refresh or close the page!</h4>
    {#if started}
      <div
        class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-800"
      >
        <span class="font-medium">Time:</span>
        <span class="mr-4">{$elapsed}s</span>
        <span class="font-medium">Earned:</span>
        <span class="mr-4">${$earned}</span>
        {#if $currentCompany && $currentCompany.payment_type === "hourly"}
          <span class="font-medium">Hourly:</span>
          <span class="mr-4">${$hourlyEarnings}</span>
        {/if}
        <span class="font-medium">Location:</span>
        <span class="mr-4">{$currLocation}</span>
        <span class="font-medium">Company:</span>
        <span>{$currentCompany ? $currentCompany.name : "None selected"}</span>
      </div>
    {:else if companies.length > 0}
      <div class="flex flex-col gap-4 items-center my-4">
        <h3 class="text-xl font-bold">Choose a company to work for:</h3>
        {#each companies as company}
          <button
            class="w-1/2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium rounded-md shadow-lg transition"
            class:bg-blue-800={$currentCompany &&
              $currentCompany.id === company.id}
            onclick={() => selectCompany(company.id)}
          >
            {company.name} — {company.description}
          </button>
        {/each}
      </div>
    {/if}

    {#if waitingForNextJob && started}
      <div
        class="flex flex-col items-center mt-4 bg-yellow-100 border border-yellow-300 rounded p-4"
      >
        <p class="text-lg font-semibold">Next job arrives in {breakTimer}s</p>
        <p class="text-sm text-gray-700">
          Use this break to switch companies if you want to chase a different
          incentive.
        </p>
        <button
          class="mt-3 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md shadow-sm transition"
          onclick={openCompanySwitchModal}
        >
          Switch Company
        </button>
      </div>
    {/if}

    {#if !started}
      {#if needsAuth}
        <div class="flex flex-col gap-2 items-start">
          <p class="text-sm text-gray-700">
            Signed in as <span class="font-semibold">{$id}</span>
          </p>
          <button
            class="w-1/4 px-4 py-2 bg-green-600 hover:bg-green-700 text-sm font-medium rounded-md shadow-sm transition disabled:opacity-50"
            id="start"
            disabled={!$currentCompany || !$isAuthenticated}
            onclick={start}>Start</button
          >
        </div>
      {:else}
        <button
          class="w-1/4 px-4 py-2 bg-green-600 hover:bg-green-700 text-sm font-medium rounded-md shadow-sm transition disabled:opacity-50"
          id="start"
          disabled={!$currentCompany}
          onclick={() => startNoAuth($currentCompany?.id)}>Start</button
        >
      {/if}
    {:else if inSelect}
      <Home />
    {:else if inStore}
      <Bundlegame />
    {/if}
  {/if}
</div>

{#if showCompanySwitchModal}
  <div
    class="fixed inset-0 bg-gray-700 bg-opacity-60 flex justify-center items-center z-50"
  >
    <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
      <h3 class="text-xl font-bold mb-4 text-center">Switch companies</h3>
      <div class="flex flex-col gap-3">
        {#each companies as company}
          <button
            class="px-4 py-2 rounded-md border border-gray-200 hover:bg-blue-600 hover:text-white transition"
            onclick={() => switchCompany(company.id)}
          >
            {company.name} — {company.description}
          </button>
        {/each}
        <button
          class="mt-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
          onclick={closeCompanySwitchModal}>Cancel</button
        >
      </div>
    </div>
  </div>
{/if}
