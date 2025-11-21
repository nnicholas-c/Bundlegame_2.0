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
  {:else if needsAuth && !$isAuthenticated}
    <div
      class="mx-auto mt-6 max-w-md rounded-lg border border-black/15 bg-white p-4 text-center shadow-sm"
    >
      <p class="font-medium">You must sign in before playing.</p>
      <p>
        <a class="underline" href="/login">Go to the login page</a>.
      </p>
    </div>
  {:else}
    <h4 class="font-bold py-2">Please do not refresh or close the page!</h4>
    {#if started}
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium"
      >
        <span>Time: {$elapsed}s</span>
        <span aria-hidden="true">|</span>
        <span>Earned: ${$earned}</span>
        {#if $currentCompany && $currentCompany.payment_type === "hourly"}
          <span aria-hidden="true">|</span>
          <span>Hourly Accrued: ${$hourlyEarnings}</span>
        {/if}
        <span aria-hidden="true">|</span>
        <span>Location: {$currLocation}</span>
        <span aria-hidden="true">|</span>
        <span
          >Company: {$currentCompany
            ? $currentCompany.name
            : "None selected"}</span
        >
      </div>
    {:else if companies.length > 0}
      <div class="my-4 flex flex-col items-center gap-4">
        <h3 class="text-xl font-bold">Choose a company to work for:</h3>
        {#each companies as company}
          <button
            class="w-full max-w-xl rounded-md border border-black/20 px-6 py-3 text-left text-lg font-medium transition hover:border-black hover:bg-black hover:text-white"
            class:bg-black={$currentCompany &&
              $currentCompany.id === company.id}
            class:text-white={$currentCompany &&
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
        class="mt-6 flex flex-col items-center gap-3 rounded-lg border border-black/15 bg-white p-5 text-center shadow-sm"
      >
        <p class="text-lg font-semibold">Next job arrives in {breakTimer}s</p>
        <p class="text-sm">
          Use this break to switch companies if you want to chase a different
          incentive.
        </p>
        <button
          class="rounded-md border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
          onclick={openCompanySwitchModal}
        >
          Switch Company
        </button>
      </div>
    {/if}

    {#if !started}
      {#if needsAuth}
        <div
          class="flex flex-col items-start gap-3 rounded-lg border border-black/15 bg-white p-6 shadow-sm"
        >
          <p class="text-sm">
            Signed in as <span class="font-semibold">{$id}</span>
          </p>
          <button
            class="w-full border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/20 disabled:text-black/40"
            id="start"
            disabled={!$currentCompany || !$isAuthenticated}
            onclick={start}>Start Session</button
          >
        </div>
      {:else}
        <button
          class="rounded-md border border-black px-6 py-2 text-sm font-medium transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-black/20 disabled:text-black/40"
          id="start"
          disabled={!$currentCompany}
          onclick={() => startNoAuth($currentCompany?.id)}>Start Session</button
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div
      class="w-full max-w-md rounded-lg border border-black/15 bg-white p-6 shadow-lg"
    >
      <h3 class="mb-4 text-center text-xl font-bold">Switch companies</h3>
      <div class="flex flex-col gap-3">
        {#each companies as company}
          <button
            class="rounded-md border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
            class:bg-black={$currentCompany &&
              $currentCompany.id === company.id}
            class:text-white={$currentCompany &&
              $currentCompany.id === company.id}
            onclick={() => switchCompany(company.id)}
          >
            {company.name} — {company.description}
          </button>
        {/each}
        <button
          class="mt-2 rounded-md border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
          onclick={closeCompanySwitchModal}>Cancel</button
        >
      </div>
    </div>
  </div>
{/if}
