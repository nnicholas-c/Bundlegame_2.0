<script>
  import { get } from "svelte/store";
  import {
    game,
    orders,
    gameText,
    currLocation,
    logOrder,
    logBundledOrder,
    orderList,
    ordersShown,
    thinkTime,
    toggleTime,
  } from "$lib/tutorial.js";
  import { queueNFixedOrders, getDistances } from "$lib/config.js";
  import Order from "./order.svelte";
  import { onMount } from "svelte";

  let waiting = false;
  $: distances = getDistances($currLocation);
  let duration = 0;
  let travelingTo = "";
  let thinking = false;

  function start() {
    const selOrders = get(orders);
    const curGame = get(game);
    const curLoc = get(currLocation);
    if (selOrders.length < 1) {
      alert("Please select 1 or 2 orders!");
      return;
    }
    if (selOrders.length > 1) {
      if (
        selOrders[0].store != selOrders[1].store ||
        selOrders[0].city != selOrders[1].city
      ) {
        alert("Cannot bundle different stores/cities!");
        return;
      }
      curGame.bundled = true;
    } else {
      curGame.bundled = false;
    }

    const selOrderIds = selOrders.map((order) => order["id"]);
    let temp = $orderList.filter((order) => !selOrderIds.includes(order["id"]));
    temp = temp.map((order) => {
      return { ...order, expire: order["expire"] - 1 };
    });
    temp = temp.filter((order) => order.expire > 0);
    console.log(temp);
    $orderList = [...temp, ...queueNFixedOrders(ordersShown - temp.length)];

    if (selOrders[0].city != curLoc) {
      travel(selOrders[0].city, true);
    } else {
      gameWindow();
    }
  }

  function travel(city, visitStore) {
    //find index of city
    let index = distances["destinations"].indexOf(city);
    if (index == -1) {
      return;
    }
    duration = distances["distances"][index];
    waiting = true;
    travelingTo = city;
    setTimeout(() => {
      waiting = false;
      currLocation.set(city);
      if (visitStore) {
        gameWindow();
      } else {
        $orders.splice(0, 2);
        distances = getDistances(city);
        $gameText.selector = "None selected";
      }
    }, duration * 1000);
  }

  function gameWindow() {
    const selOrders = get(orders);
    if (get(game).bundled) {
      logBundledOrder(selOrders[0], selOrders[1], selOrders);
    } else {
      logOrder(selOrders[0], selOrders);
    }
    $game.inStore = true;
    $game.inSelect = false;
  }
  function updateEarnings(index, newEarnings) {
    console.log("updated: " + index + " " + newEarnings);
    orderList.update((list) => {
      list[index].earnings = newEarnings;
      return list;
    });
  }

  onMount(() => {
    thinking = true;
    toggleTime();
    setTimeout(() => {
      thinking = false;
      toggleTime();
    }, thinkTime * 1000); //ten second wait time
  });
</script>

{#if $game.inSelect}
  {#if waiting}
    <div
      class="my-6 rounded-lg border border-black/20 bg-white p-6 text-center shadow-sm"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.2em]">En Route</p>
      <p class="mt-2 text-lg font-semibold">{travelingTo}</p>
      <p class="mt-4 text-sm text-black/70">Arriving in {duration}s</p>
    </div>
  {:else}
    <div
      class="space-y-5 rounded-lg border border-black/15 bg-white p-6 shadow-sm"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-xs font-semibold uppercase tracking-[0.2em]">
          Available Orders
        </h3>
        {#if thinking}
          <p class="text-xs font-medium uppercase tracking-wide">
            Timer paused · Review the options
          </p>
        {/if}
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {#each $orderList as order, i (order.id)}
          <Order orderData={order} index={i} {updateEarnings} />
        {/each}
      </div>
      <div class="flex flex-row items-center justify-center">
        {#if !thinking}
          <button
            class="rounded-md border border-black px-6 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
            id="startorder"
            on:click={start}>{$gameText.selector}</button
          >
        {/if}
      </div>
      {#if !thinking}
        {#if distances}
          <div class="flex flex-col items-center gap-3">
            <p class="text-xs font-semibold uppercase tracking-[0.2em]">
              Quick Travel
            </p>
            <div
              class="flex flex-row flex-wrap items-center justify-center gap-3"
            >
              {#each distances["destinations"] as dest}
                <button
                  class="rounded-md border border-black px-5 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
                  id="travel"
                  on:click={() => travel(dest, false)}>{dest}</button
                >
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
{/if}

<style>
</style>
