<script>
  import {
    orders,
    currLocation,
    gameText,
    orderList,
    game,
    currentCompany,
  } from "$lib/bundle.js";
  import { onMount, onDestroy } from "svelte";
  import { queueNFixedOrders, storeConfig } from "$lib/config.js";

  export let orderData;
  export let index;
  export let updateEarnings;
  let selected = false;
  let timer = 0; // Timer value
  let intervalId; // To store the interval ID for cleanup
  let taken = false;
  let config = storeConfig(orderData.store);

  function updateTimer() {
    timer += 1; // Increment timer by 1 second (or any other logic)
    //percent increase based on waiting
    if ($game.waiting) {
      let waitingIndex = Math.floor(timer / config["waitinginterval"]);
      let percentIncrease =
        waitingIndex < config["waiting"].length
          ? 1 + config["waiting"][waitingIndex] / 100
          : config["waiting"][config["waiting"].length - 1] / 100;
      orderData.earnings =
        Math.round(orderData.startingearnings * percentIncrease * 100) / 100;
      updateEarnings(index, orderData.earnings);
    }
    if ($game.refresh && orderData.demand > Math.random() * 100) {
      //order taken!

      //unselect if selected
      if (selected) {
        for (let i = 0; i < $orders.length; i++) {
          if ($orders[i].id == orderData.id) {
            $orders.splice(i, 1);
            break;
          }
        }
        selected = false;
      }
      taken = true;
      //remove from orderList and add a new one
      setTimeout(replaceOrder, config["refresh"] * 1000); // TODO: maybe make this amount of time customizable?
    }
  }

  function replaceOrder() {
    clearInterval(intervalId);
    $orderList = [
      ...$orderList,
      ...queueNFixedOrders(1, $currentCompany ? $currentCompany.id : null),
    ];

    $orderList.splice(index, 1);
  }

  onMount(() => {
    if ($game.waiting || $game.refresh) {
      timer = 0;
      config = storeConfig(orderData.store);

      intervalId = setInterval(updateTimer, 1000); // Run updateTimer every 1000ms (1 second)
    }
  });

  onDestroy(() => {
    if ($game.waiting || $game.refresh) {
      clearInterval(intervalId);
      timer = 0;
    }
  });

  function select() {
    if (!selected) {
      //selects it
      if ($orders.length >= 2) {
        return;
      }
      $orders.push(orderData);
      selected = true;
    } else {
      for (let i = 0; i < $orders.length; i++) {
        if ($orders[i].id == orderData.id) {
          $orders.splice(i, 1);
          break;
        }
      }
      selected = false;
    }
    //change text
    if ($orders.length > 0) {
      if ($orders[0].city == $currLocation) {
        $gameText.selector = "Go to store";
      } else {
        $gameText.selector =
          "Travel to " + $orders[0].city + ". Then go to store";
      }
    } else {
      $gameText.selector = "None selected";
    }
  }
</script>

<div class="my-1 flex w-full justify-center text-black">
  {#if taken}
    <div
      class="w-full max-w-sm rounded-lg border border-black/15 bg-white p-5 shadow-sm"
    >
      <p class="text-center text-xs font-medium uppercase tracking-wide">
        {orderData.store} for {orderData.name} taken! Please wait for a new order
      </p>
      <div class="mt-3 flex justify-between text-sm">
        <div class="space-y-1 text-left">
          <p class="font-semibold">${orderData.earnings}</p>
          <p class="uppercase tracking-wide text-black/60">{orderData.city}</p>
        </div>
        <div class="text-right">
          <p class="leading-relaxed">
            {#each Object.keys(orderData.items) as item}
              {orderData.items[item]} - {item}<br />
            {/each}
          </p>
        </div>
      </div>
    </div>
  {:else}
    <button
      id={index + "Selected" + selected}
      type="button"
      class="w-full max-w-sm cursor-pointer select-none rounded-lg border border-black/15 bg-white px-5 py-4 text-left shadow-sm transition hover:border-black hover:bg-black hover:text-white"
      class:bg-black={selected}
      class:text-white={selected}
      onclick={select}
    >
      <div
        class="flex items-center justify-between text-xs uppercase tracking-wide text-black/70"
        class:text-white={selected}
      >
        <span>{orderData.store}</span>
        <span>{orderData.city}</span>
      </div>
      <p class="mt-2 text-lg font-semibold">{orderData.name}</p>
      <div class="mt-3 flex justify-between text-sm">
        <div class="space-y-1">
          <p class="font-semibold">${orderData.earnings}</p>
          <p
            class="text-xs uppercase tracking-wide text-black/60"
            class:text-white={selected}
          >
            Tap to select
          </p>
        </div>
        <div class="text-right">
          <p class="leading-relaxed" class:text-white={selected}>
            {#each Object.keys(orderData.items) as item}
              {orderData.items[item]} - {item}<br />
            {/each}
          </p>
        </div>
      </div>
    </button>
  {/if}
</div>
