<script>
  import { get } from "svelte/store";
  import { onMount, onDestroy } from "svelte";
  import {
    game,
    orders,
    finishedOrders,
    failedOrders,
    earned,
    currLocation,
    elapsed,
    uniqueSets,
    completeOrder,
    logAction,
    numCols,
  } from "$lib/tutorial.js";
  import { storeConfig } from "$lib/config.js";
  import emojis from "$lib/emojis.json";
  let config = storeConfig($orders[0].store);

  let GameState = 0;
  let curLocation = [0, 0];
  let bag1Input = "";
  let bag2Input = "";
  let wordInput = "";
  let bag1 = {};
  let bag2 = {};
  let dist = 0;
  let correct = false;
  let startTimer = $elapsed;
  let intervalId;
  let startEarnings;
  let totalEarnings;
  let curTip = 0;
  $: endTimer = $elapsed - startTimer;

  function updateTip() {
    let tipIndex = Math.floor(endTimer / config["tipinterval"]);
    let percentIncrease =
      tipIndex < config["tip"].length
        ? 1 + config["tip"][tipIndex] / 100
        : config["tip"][config["tip"].length - 1] / 100;
    curTip = Math.round(percentIncrease * 100 - 100);
    totalEarnings = Math.round(startEarnings * percentIncrease * 100) / 100;
  }

  const colClassMap = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
    7: "grid-cols-7",
    8: "grid-cols-8",
    9: "grid-cols-9",
  };

  let gridColsClass = colClassMap[numCols] || "grid-cols-1";

  onMount(() => {
    const selOrders = get(orders);
    if ($game.bundled) {
      startEarnings = selOrders[0].earnings + selOrders[1].earnings;
    } else {
      startEarnings = selOrders[0].earnings;
    }
    totalEarnings = startEarnings;
    config = storeConfig($orders[0].store);
    curLocation = config["Entrance"];
    if ($game.tip) {
      intervalId = setInterval(updateTip, 1000); // Run updateTimer every 1000ms (1 second)
    }
  });

  onDestroy(() => {
    if ($game.tip) {
      clearInterval(intervalId);
    }
  });

  function handleCell(value, row, col) {
    if (value == "") {
      return;
    }
    dist = Math.abs(row - curLocation[0]) + Math.abs(col - curLocation[1]);
    curLocation[0] = row;
    curLocation[1] = col;
    GameState = 2;
    setTimeout(() => {
      GameState = 1;
    }, dist * config["cellDistance"]);
  }

  function addBag() {
    const selOrders = get(orders);
    let item =
      config["locations"][curLocation[0]][curLocation[1]].toLowerCase();
    let bag1InputInt;
    let bag2InputInt;
    let action = {
      buttonID: "addtobag",
      buttonContent: "Add to bag",
      bagInput1: bag1Input,
      bagInput2: bag2Input,
      itemInput: wordInput,
      bag1_: bag1,
      bag2_: bag2,
      order1: selOrders[0],
    };
    if (!$game.bundled) {
      bag2Input = "0";
    } else {
      action.order2 = selOrders[1];
    }

    if (item == "" || item == "Entrance") {
      return;
    }
    try {
      bag1InputInt = parseInt(bag1Input);
      bag2InputInt = parseInt(bag2Input);
    } catch {
      alert("Error: Quantity inputs must be numbers");
      action.mistake = "numbertypo";
      bag1Input = "";
      bag2Input = "";
      wordInput = "";
      logAction(action);
      return;
    }
    if (isNaN(bag1InputInt) || isNaN(bag2InputInt)) {
      alert("Error: Quantity inputs must be numbers");
      action.mistake = "numberempty";
      bag1Input = "";
      bag2Input = "";
      wordInput = "";
      logAction(action);
      return;
    }
    if (wordInput.toLowerCase() != item.toLowerCase()) {
      alert("Incorrect! You must type the name of the item");
      action.mistake = "itemtypo";
      bag1Input = "";
      bag2Input = "";
      wordInput = "";
      logAction(action);
      return;
    }
    if (Object.keys(bag1).includes(item)) {
      bag1[item] += bag1InputInt;
    } else {
      bag1[item] = bag1InputInt;
    }
    if (Object.keys(bag2).includes(item)) {
      bag2[item] += bag2InputInt;
    } else {
      bag2[item] = bag2InputInt;
    }
    if (bag1[item] <= 0) {
      delete bag1[item];
    }
    if (bag2[item] <= 0) {
      delete bag2[item];
    }
    bag1Input = "";
    bag2Input = "";
    wordInput = "";
    logAction(action);
  }

  function start() {
    const selOrders = get(orders);
    startTimer = $elapsed;
    config = storeConfig(selOrders[0].store);
    GameState = 1;
  }
  function exit() {
    GameState = 0;
    $game.inSelect = true;
    $game.inStore = false;
  }

  function checkoutSingle() {
    //verify if it is correct
    const selOrders = get(orders);
    let c1 = true;
    Object.keys(bag1).forEach((key) => {
      console.log(selOrders[0].items[key]);
      if (selOrders[0].items[key] != bag1[key]) {
        c1 = false;
      }
    });
    if (Object.keys(bag1).length != Object.keys(selOrders[0].items).length) {
      c1 = false;
    }
    correct = c1;
    bag1 = {};
    if (correct) {
      $earned += totalEarnings;
      $uniqueSets += 1;
      completeOrder(selOrders[0].id);
      $finishedOrders.push(selOrders[0]);
      $orders.splice(0, 1);
      GameState = 3;
    } else {
      GameState = 4;
    }
  }

  function checkoutBundle() {
    const selOrders = get(orders);
    //verify if it is correct
    let c1 = true;
    let c2 = true;
    //check bag1 -> order1, bag2 -> order2
    Object.keys(bag1).forEach((key) => {
      if (selOrders[0].items[key] != bag1[key]) {
        c1 = false;
      }
    });
    if (Object.keys(bag1).length != Object.keys(selOrders[0].items).length) {
      c1 = false;
    }
    Object.keys(bag2).forEach((key) => {
      if (selOrders[1].items[key] != bag2[key]) {
        c1 = false;
      }
    });
    if (Object.keys(bag2).length != Object.keys(selOrders[1].items).length) {
      c1 = false;
    }

    //check bag1 -> order1, bag2 -> order2
    Object.keys(bag1).forEach((key) => {
      if (selOrders[1].items[key] != bag1[key]) {
        c2 = false;
      }
    });
    if (Object.keys(bag1).length != Object.keys(selOrders[1].items).length) {
      c2 = false;
    }
    Object.keys(bag2).forEach((key) => {
      if (selOrders[0].items[key] != bag2[key]) {
        c2 = false;
      }
    });
    if (Object.keys(bag2).length != Object.keys(selOrders[0].items).length) {
      c2 = false;
    }
    correct = c1 || c2;
    console.log(c1);
    console.log(c2);
    bag1 = {};
    bag2 = {};
    if (correct) {
      $earned += totalEarnings;
      $uniqueSets += 1;
      completeOrder(selOrders[0].id);
      completeOrder(selOrders[1].id);
      $finishedOrders.push(selOrders[0]);
      $finishedOrders.push(selOrders[1]);
      $orders.splice(0, 2);
      GameState = 3;
    } else {
      GameState = 4;
    }
  }
</script>

<div
  class="bundlegame mx-auto max-w-4xl space-y-5 rounded-lg border border-black/15 bg-white px-6 py-6 text-black shadow-sm"
>
  <div class="space-y-3 rounded border border-black/10 bg-white p-4 shadow-sm">
    <h5 class="text-xs font-semibold uppercase tracking-[0.2em]">
      In-Store Picking
    </h5>
    <p class="text-lg font-semibold">{$orders[0].store}</p>
    {#if $game.tip}
      <div class="text-sm font-medium uppercase tracking-wide text-black/70">
        Total Earnings: ${totalEarnings} (${startEarnings} + {curTip}% tip)
      </div>
    {:else}
      <div class="text-sm font-medium uppercase tracking-wide text-black/70">
        Total Earnings: ${totalEarnings}
      </div>
    {/if}
    <div class="flex flex-col gap-3 text-sm font-medium md:flex-row">
      {#each $orders as order}
        <div
          class="w-full rounded border border-black/15 bg-white p-3 shadow-sm md:w-1/2"
        >
          <p class="text-sm font-semibold">Order for {order.name}</p>
          <p class="text-sm text-black/70">Earnings: {order.earnings}</p>
          <ul class="mt-2 space-y-1 text-sm leading-relaxed">
            {#each Object.keys(order.items) as item}
              <li>{order.items[item]} - {item}</li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
    {#if GameState == 1 || GameState == 2}
      <p>Time spent: {endTimer}</p>
    {/if}
  </div>
  {#if GameState == 0}
    <!-- shop/browse -->
    {#if $game.bundled}
      <button
        class="rounded-md border border-black px-5 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
        id="startbundle"
        on:click={start}>Begin Picking</button
      >
    {:else}
      <button
        class="rounded-md border border-black px-5 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
        id="startsingle"
        on:click={start}>Begin Picking</button
      >
    {/if}
  {:else if GameState == 1}
    <h3 class="font-bold">
      Current Location: {config["locations"][curLocation[0]][curLocation[1]]}
    </h3>
    <div class="space-y-4">
      <div class="flex flex-wrap items-center gap-3">
        <span class="text-sm font-medium uppercase tracking-wide">Item</span>
        <input
          class="w-32 border border-black/30 px-2 py-1"
          bind:value={wordInput}
        />
        <span class="text-sm font-medium uppercase tracking-wide">Qty</span>
        <input
          class="w-16 border border-black/30 px-2 py-1"
          bind:value={bag1Input}
        />
        {#if $game.bundled}
          <input
            class="w-16 border border-black/30 px-2 py-1"
            bind:value={bag2Input}
          />
        {/if}
        <button
          id="addtobag"
          class="rounded-md border border-black px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
          on:click={addBag}>Add to bag</button
        >
      </div>
      <div class={`my-4 grid gap-3 ${gridColsClass}`}>
        {#each config["locations"] as row, rowIndex}
          {#each row as cell, colIndex}
            <button
              id="moveinstore"
              class="cell border border-black/20 bg-white p-3 text-sm transition hover:border-black"
              class:bg-black={rowIndex == curLocation[0] &&
                colIndex == curLocation[1]}
              class:text-white={rowIndex == curLocation[0] &&
                colIndex == curLocation[1]}
              on:click={() => handleCell(cell, rowIndex, colIndex)}
            >
              {cell}
              <p class="text-base">{emojis[cell]}</p>
            </button>
          {/each}
        {/each}
      </div>
    </div>
    {#if $game.bundled}
      <button
        class="mt-4 rounded-md border border-black px-5 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
        id="checkout"
        on:click={checkoutBundle}>Checkout and exit</button
      >
    {:else}
      <button
        class="mt-4 rounded-md border border-black px-5 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
        id="checkout"
        on:click={checkoutSingle}>Checkout and exit</button
      >
    {/if}
  {:else if GameState == 2}
    <h3 class="text-sm font-semibold uppercase tracking-wide">
      Walking to {config["locations"][curLocation[0]][curLocation[1]]}
    </h3>
    <h5 class="text-sm text-black/70">
      Travel time: {(dist * config["cellDistance"]) / 1000} seconds
    </h5>
  {:else if GameState == 3}
    <p class="font-semibold">Correct!</p>
    <button
      class="mt-4 rounded-md border border-black px-5 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
      id="ordersuccess"
      on:click={exit}>Go back</button
    >
  {:else}
    <p class="font-semibold">Incorrect</p>
    <button
      class="mt-4 rounded-md border border-black px-5 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
      id="orderretry"
      on:click={start}>Try again</button
    >
  {/if}
  <div class="mt-6 flex gap-6">
    <div class="text-sm">
      {#if $game.bundled}
        <h5 class="font-bold">Bag 1</h5>
      {:else}
        <h5 class="font-bold">Bag</h5>
      {/if}
      <ul class="list-disc pl-5 text-sm text-black/70">
        {#each Object.keys(bag1) as key}
          <li>{key}: {bag1[key]}</li>
        {/each}
      </ul>
    </div>
    {#if $game.bundled}
      <div class="text-sm">
        <h5 class="font-bold">Bag2</h5>
        <ul class="list-disc pl-5 text-sm text-black/70">
          {#each Object.keys(bag2) as key}
            <li>{key}: {bag2[key]}</li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</div>
