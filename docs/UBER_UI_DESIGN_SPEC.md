# Uber-like UI Design Specification

**Project**: BundleGame Research Platform
**Target**: Uber.com aesthetic + gig economy familiarity
**Last Updated**: October 31, 2025

---

## Overview

This document specifies how to adapt BundleGame's UI to match Uber's design language while maintaining research validity. The goal is to create a **realistic gig work simulation** that feels familiar to users with gig economy experience.

---

## Uber Design System Analysis

### Core Principles

Based on uber.com (2025):

1. **Clean & Spacious**: Generous whitespace, uncluttered layouts
2. **Card-Based**: Information grouped in elevated cards with shadows
3. **Bold Typography**: Large headings (24-48px), clear hierarchy
4. **Limited Color Palette**: Black (#000), white (#FFF), green (#06C167), grey (#EEE)
5. **Iconography**: Simple, line-based icons for actions
6. **Mobile-First**: Responsive, touch-friendly targets (44px minimum)
7. **Micro-animations**: Subtle transitions, hover states, loading indicators

### Visual Hierarchy

```
┌─────────────────────────────────────────┐
│  Header (Fixed)                         │  ← 64px height, white background
│  Logo | Earnings: $142.50 | Timer      │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│                                         │
│  [Main Content Area]                    │  ← Max width 1200px, centered
│  - Order Cards (Game B)                 │
│  - Platform Options (Game A)            │
│  - Results/Feedback                     │
│                                         │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Footer                                 │  ← Legal links, support
└─────────────────────────────────────────┘
```

---

## Color Palette

### Primary Colors

```css
/* Uber Green (primary action) */
--uber-green: #06C167;
--uber-green-hover: #05A357;
--uber-green-active: #048C47;

/* Black (text, headers) */
--uber-black: #000000;

/* White (backgrounds) */
--uber-white: #FFFFFF;

/* Greys (secondary elements) */
--uber-grey-50: #FAFAFA;
--uber-grey-100: #F6F6F6;
--uber-grey-200: #EEEEEE;
--uber-grey-300: #E0E0E0;
--uber-grey-500: #9E9E9E;
--uber-grey-700: #5E5E5E;
--uber-grey-900: #212121;
```

### Semantic Colors

```css
/* Company A (per-job, Uber-like) */
--company-a-primary: #000000;     /* Black */
--company-a-accent: #06C167;      /* Green */

/* Company B (hourly, Lyft-like) */
--company-b-primary: #FF00BF;     /* Lyft pink */
--company-b-accent: #352384;      /* Lyft purple */

/* Status Colors */
--success: #06C167;
--warning: #FFC043;
--error: #CD0000;
--info: #276EF1;
```

---

## Typography

### Font Stack

```css
/* Uber uses "Uber Move" (proprietary) - fallback to similar fonts */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
```

### Type Scale

```css
/* Headings */
--font-size-h1: 48px;    /* Page title */
--font-size-h2: 36px;    /* Section headers */
--font-size-h3: 24px;    /* Card headers */
--font-size-h4: 20px;    /* Subheaders */

/* Body */
--font-size-base: 16px;  /* Default body text */
--font-size-small: 14px; /* Secondary info */
--font-size-xs: 12px;    /* Labels, captions */

/* Weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
```

### Text Styles

```css
.heading-1 {
  font-size: 48px;
  font-weight: 700;
  line-height: 56px;
  letter-spacing: -0.02em;
  color: var(--uber-black);
}

.heading-2 {
  font-size: 36px;
  font-weight: 600;
  line-height: 44px;
  letter-spacing: -0.01em;
}

.body-large {
  font-size: 18px;
  font-weight: 400;
  line-height: 26px;
}

.body {
  font-size: 16px;
  font-weight: 400;
  line-height: 24px;
}

.caption {
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  color: var(--uber-grey-700);
}
```

---

## Component Library

### 1. Order Card (Game B - Bundling)

#### Visual Design

```
┌────────────────────────────────────────────┐
│  🏪 Sprouts Farmers Market                │ ← Store name (bold, 20px)
│  📍 Oakland • 5 items                     │ ← Location (14px, grey)
│                                            │
│  🍇 Grape (4), 🍊 Orange (1)              │ ← Items preview (16px)
│                                            │
│  ─────────────────────────────────────────│ ← Divider
│                                            │
│  💵 $20.00    ⏱️ ~15 min                  │ ← Earnings + time estimate
│                                            │
│  [✓ RECOMMENDED]                          │ ← Badge (if recommended)
└────────────────────────────────────────────┘
 ↑ Hover: Shadow lifts, border highlights
```

#### Code (Svelte Component)

```svelte
<!-- src/lib/ui/OrderCard.svelte -->
<script>
  export let order;
  export let recommended = false;
  export let selected = false;
  export let onSelect;
</script>

<button
  class="order-card"
  class:recommended
  class:selected
  on:click={() => onSelect(order)}
>
  <!-- Store Header -->
  <div class="card-header">
    <span class="store-icon">🏪</span>
    <h3 class="store-name">{order.store}</h3>
  </div>

  <!-- Location & Metadata -->
  <div class="card-meta">
    <span class="location">📍 {order.city}</span>
    <span class="separator">•</span>
    <span class="item-count">{order.amount} items</span>
  </div>

  <!-- Items Preview -->
  <div class="items-preview">
    {#each Object.entries(order.items).slice(0, 3) as [item, qty]}
      <span class="item-tag">{item} ({qty})</span>
    {/each}
    {#if Object.keys(order.items).length > 3}
      <span class="item-more">+{Object.keys(order.items).length - 3} more</span>
    {/if}
  </div>

  <hr class="divider" />

  <!-- Earnings & Time -->
  <div class="card-footer">
    <div class="earnings">
      <span class="earnings-icon">💵</span>
      <span class="earnings-value">${order.earnings.toFixed(2)}</span>
    </div>
    <div class="time-estimate">
      <span class="time-icon">⏱️</span>
      <span class="time-value">~{order.estimatedTime || 15} min</span>
    </div>
  </div>

  <!-- Recommendation Badge -->
  {#if recommended}
    <div class="rec-badge">
      <span class="check-icon">✓</span>
      RECOMMENDED
    </div>
  {/if}

  <!-- Selection Indicator -->
  {#if selected}
    <div class="selected-indicator">
      <span class="check-circle">✓</span>
    </div>
  {/if}
</button>

<style>
  .order-card {
    background: white;
    border: 2px solid #E0E0E0;
    border-radius: 12px;
    padding: 20px;
    width: 100%;
    max-width: 360px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    text-align: left;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .order-card:hover {
    border-color: #06C167;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    transform: translateY(-2px);
  }

  .order-card.recommended {
    border-color: #06C167;
    border-width: 3px;
  }

  .order-card.selected {
    background: #F0FFF4;
    border-color: #06C167;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .store-icon {
    font-size: 24px;
  }

  .store-name {
    font-size: 20px;
    font-weight: 600;
    color: #000;
    margin: 0;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #5E5E5E;
    margin-bottom: 16px;
  }

  .separator {
    color: #9E9E9E;
  }

  .items-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  }

  .item-tag {
    background: #F6F6F6;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 14px;
    color: #212121;
  }

  .item-more {
    color: #5E5E5E;
    font-size: 14px;
  }

  .divider {
    border: none;
    border-top: 1px solid #EEEEEE;
    margin: 16px 0;
  }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .earnings,
  .time-estimate {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .earnings-value {
    font-size: 24px;
    font-weight: 700;
    color: #000;
  }

  .time-value {
    font-size: 16px;
    color: #5E5E5E;
  }

  .rec-badge {
    position: absolute;
    top: -12px;
    right: 20px;
    background: #06C167;
    color: white;
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .selected-indicator {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 32px;
    height: 32px;
    background: #06C167;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    font-weight: bold;
  }
</style>
```

---

### 2. Platform Option Card (Game A - Wage Choice)

#### Visual Design

```
┌────────────────────────────────────────────┐
│  🚗 Company X                              │ ← Company name + icon
│                                            │
│  Per-Job Payment                           │ ← Payment type (bold)
│  Earn per completed task with variable    │ ← Description
│  payouts based on demand.                  │
│                                            │
│  Expected Hourly Rate:                     │
│  $32–$36 / hour                           │ ← Large, bold
│                                            │
│  Based on:                                 │
│  • 4 orders/hour                          │ ← Breakdown
│  • $6 + $2 tip average                    │
│  • 15 min service time                    │
│                                            │
│  [ SELECT COMPANY X ]                     │ ← CTA button
└────────────────────────────────────────────┘
```

#### Code

```svelte
<!-- src/lib/ui/PlatformCard.svelte -->
<script>
  export let platform;
  export let expectedRate;
  export let rateRange;
  export let onSelect;
  export let selected = false;
</script>

<div class="platform-card" class:selected>
  <!-- Company Header -->
  <div class="platform-header">
    <span class="platform-icon">
      {platform.id === 'uber' ? '🚗' : '🚙'}
    </span>
    <h3 class="platform-name">{platform.name}</h3>
  </div>

  <!-- Payment Type -->
  <div class="payment-type">{platform.payment_type === 'per_job' ? 'Per-Job Payment' : 'Hourly Payment'}</div>

  <!-- Description -->
  <p class="platform-description">{platform.description}</p>

  <!-- Expected Rate -->
  <div class="rate-section">
    <div class="rate-label">Expected Hourly Rate:</div>
    <div class="rate-value">
      {#if rateRange}
        ${rateRange.min}–${rateRange.max} / hour
      {:else}
        ${expectedRate.toFixed(2)} / hour
      {/if}
    </div>
  </div>

  <!-- Rate Breakdown (if per-job) -->
  {#if platform.payment_type === 'per_job' && platform.breakdown}
    <div class="rate-breakdown">
      <div class="breakdown-label">Based on:</div>
      <ul class="breakdown-list">
        <li>• {platform.breakdown.arrival_rate} orders/hour</li>
        <li>• ${platform.breakdown.pay_per_order} + ${platform.breakdown.tip_avg} tip average</li>
        <li>• {platform.breakdown.service_time} min service time</li>
      </ul>
    </div>
  {/if}

  <!-- CTA Button -->
  <button
    class="select-btn"
    class:selected
    on:click={() => onSelect(platform)}
  >
    {selected ? '✓ SELECTED' : `SELECT ${platform.name.toUpperCase()}`}
  </button>
</div>

<style>
  .platform-card {
    background: white;
    border: 2px solid #E0E0E0;
    border-radius: 12px;
    padding: 24px;
    width: 100%;
    max-width: 420px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .platform-card:hover {
    border-color: #06C167;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }

  .platform-card.selected {
    border-color: #06C167;
    border-width: 3px;
    background: #F0FFF4;
  }

  .platform-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .platform-icon {
    font-size: 32px;
  }

  .platform-name {
    font-size: 24px;
    font-weight: 700;
    color: #000;
    margin: 0;
  }

  .payment-type {
    font-size: 18px;
    font-weight: 600;
    color: #212121;
    margin-bottom: 8px;
  }

  .platform-description {
    font-size: 16px;
    color: #5E5E5E;
    line-height: 24px;
    margin-bottom: 24px;
  }

  .rate-section {
    background: #FAFAFA;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .rate-label {
    font-size: 14px;
    color: #5E5E5E;
    margin-bottom: 8px;
  }

  .rate-value {
    font-size: 32px;
    font-weight: 700;
    color: #06C167;
  }

  .rate-breakdown {
    margin-bottom: 24px;
  }

  .breakdown-label {
    font-size: 14px;
    color: #5E5E5E;
    margin-bottom: 8px;
  }

  .breakdown-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .breakdown-list li {
    font-size: 14px;
    color: #212121;
    line-height: 22px;
  }

  .select-btn {
    width: 100%;
    background: #000;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 16px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .select-btn:hover {
    background: #212121;
  }

  .select-btn.selected {
    background: #06C167;
  }

  .select-btn.selected:hover {
    background: #05A357;
  }
</style>
```

---

### 3. Header Component

```svelte
<!-- src/lib/ui/Header.svelte -->
<script>
  export let earnings = 0;
  export let timeRemaining = null;
  export let currentCompany = null;
</script>

<header class="uber-header">
  <div class="header-content">
    <!-- Logo -->
    <div class="logo">
      <span class="logo-icon">🎮</span>
      <span class="logo-text">BundleGame</span>
    </div>

    <!-- Center Info -->
    <div class="header-center">
      {#if currentCompany}
        <div class="current-company">
          <span class="company-icon">
            {currentCompany.id === 'uber' ? '🚗' : '🚙'}
          </span>
          <span class="company-name">{currentCompany.name}</span>
        </div>
      {/if}
    </div>

    <!-- Right Info -->
    <div class="header-right">
      <!-- Earnings -->
      <div class="earnings-display">
        <span class="earnings-label">Total Earned</span>
        <span class="earnings-value">${earnings.toFixed(2)}</span>
      </div>

      <!-- Timer (if applicable) -->
      {#if timeRemaining !== null}
        <div class="timer-display">
          <span class="timer-icon">⏱️</span>
          <span class="timer-value">{formatTime(timeRemaining)}</span>
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  .uber-header {
    background: white;
    border-bottom: 1px solid #EEEEEE;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .logo-icon {
    font-size: 24px;
  }

  .logo-text {
    font-size: 20px;
    font-weight: 700;
    color: #000;
  }

  .header-center {
    flex: 1;
    display: flex;
    justify-content: center;
  }

  .current-company {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #F6F6F6;
    padding: 8px 16px;
    border-radius: 24px;
  }

  .company-icon {
    font-size: 20px;
  }

  .company-name {
    font-size: 16px;
    font-weight: 600;
    color: #000;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .earnings-display {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .earnings-label {
    font-size: 12px;
    color: #5E5E5E;
  }

  .earnings-value {
    font-size: 24px;
    font-weight: 700;
    color: #06C167;
  }

  .timer-display {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #FFF8E1;
    border-radius: 8px;
  }

  .timer-icon {
    font-size: 18px;
  }

  .timer-value {
    font-size: 18px;
    font-weight: 600;
    color: #212121;
  }
</style>
```

---

### 4. Round Feedback Screen

```svelte
<!-- src/lib/ui/RoundFeedback.svelte -->
<script>
  export let roundNumber;
  export let choice;
  export let outcome;
  export let optimal;
  export let onContinue;
</script>

<div class="feedback-overlay">
  <div class="feedback-card">
    <!-- Header -->
    <div class="feedback-header">
      <h2>Round {roundNumber} Complete</h2>
    </div>

    <!-- Your Choice -->
    <div class="section">
      <h3>Your Choice</h3>
      <div class="choice-summary">
        {choice.description}
      </div>
    </div>

    <!-- Outcome -->
    <div class="section outcome-section">
      <div class="outcome-grid">
        <div class="outcome-item">
          <div class="outcome-label">Earnings</div>
          <div class="outcome-value earnings">${outcome.earnings.toFixed(2)}</div>
        </div>
        <div class="outcome-item">
          <div class="outcome-label">Time Spent</div>
          <div class="outcome-value">{outcome.time_spent} min</div>
        </div>
        <div class="outcome-item">
          <div class="outcome-label">Your Hourly Rate</div>
          <div class="outcome-value rate">${outcome.hourly_rate.toFixed(2)}/hr</div>
        </div>
      </div>
    </div>

    <!-- Comparison to Optimal -->
    <div class="section comparison-section">
      <h3>Performance</h3>
      <div class="comparison-bar">
        <div class="bar-bg">
          <div
            class="bar-fill"
            style="width: {(outcome.hourly_rate / optimal.hourly_rate) * 100}%"
          ></div>
        </div>
        <div class="comparison-labels">
          <span class="your-rate">You: ${outcome.hourly_rate.toFixed(2)}/hr</span>
          <span class="optimal-rate">Optimal: ${optimal.hourly_rate.toFixed(2)}/hr</span>
        </div>
      </div>

      {#if outcome.hourly_rate === optimal.hourly_rate}
        <div class="feedback-message success">
          🎉 Perfect! You found the optimal choice.
        </div>
      {:else}
        <div class="feedback-message">
          {optimal.description} would have earned ${optimal.hourly_rate.toFixed(2)}/hr.
        </div>
      {/if}
    </div>

    <!-- Continue Button -->
    <button class="continue-btn" on:click={onContinue}>
      Continue to Next Round →
    </button>
  </div>
</div>

<style>
  .feedback-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .feedback-card {
    background: white;
    border-radius: 16px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    padding: 32px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .feedback-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .feedback-header h2 {
    font-size: 32px;
    font-weight: 700;
    color: #000;
    margin: 0;
  }

  .section {
    margin-bottom: 24px;
  }

  .section h3 {
    font-size: 18px;
    font-weight: 600;
    color: #212121;
    margin-bottom: 12px;
  }

  .choice-summary {
    background: #F6F6F6;
    padding: 16px;
    border-radius: 8px;
    font-size: 16px;
    color: #212121;
  }

  .outcome-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .outcome-item {
    text-align: center;
    padding: 16px;
    background: #FAFAFA;
    border-radius: 8px;
  }

  .outcome-label {
    font-size: 14px;
    color: #5E5E5E;
    margin-bottom: 8px;
  }

  .outcome-value {
    font-size: 24px;
    font-weight: 700;
    color: #000;
  }

  .outcome-value.earnings,
  .outcome-value.rate {
    color: #06C167;
  }

  .comparison-bar {
    margin-bottom: 16px;
  }

  .bar-bg {
    background: #EEEEEE;
    height: 12px;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .bar-fill {
    background: linear-gradient(90deg, #06C167 0%, #05A357 100%);
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s ease;
  }

  .comparison-labels {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
  }

  .your-rate {
    color: #06C167;
    font-weight: 600;
  }

  .optimal-rate {
    color: #5E5E5E;
  }

  .feedback-message {
    background: #FFF8E1;
    border-left: 4px solid #FFC043;
    padding: 12px 16px;
    border-radius: 4px;
    font-size: 14px;
    color: #212121;
  }

  .feedback-message.success {
    background: #F0FFF4;
    border-left-color: #06C167;
  }

  .continue-btn {
    width: 100%;
    background: #000;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 16px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
    margin-top: 24px;
  }

  .continue-btn:hover {
    background: #212121;
  }
</style>
```

---

## Layout Patterns

### Game B - Order Selection (≤4 cards)

```svelte
<!-- src/routes/experiment/game-b.svelte -->
<script>
  import OrderCard from '$lib/ui/OrderCard.svelte';
  import Header from '$lib/ui/Header.svelte';

  let orders = [...];  // Max 4 orders
  let recommendation = { type: 'bundle', size: 2, order_ids: ['order1', 'order2'] };
  let selectedOrders = [];
</script>

<div class="game-container">
  <Header earnings={$earned} currentCompany={$currentCompany} />

  <main class="game-content">
    <!-- Round Header -->
    <div class="round-header">
      <h1>Round {currentRound} of 8</h1>
      <p class="round-description">
        Select 1-4 orders to bundle. The platform recommends bundling 2 orders.
      </p>
    </div>

    <!-- Order Grid -->
    <div class="order-grid">
      {#each orders as order}
        <OrderCard
          {order}
          recommended={recommendation.order_ids.includes(order.id)}
          selected={selectedOrders.includes(order.id)}
          onSelect={handleSelectOrder}
        />
      {/each}
    </div>

    <!-- Action Bar -->
    <div class="action-bar">
      <div class="selection-summary">
        {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
      </div>
      <button
        class="submit-btn"
        disabled={selectedOrders.length === 0}
        on:click={handleSubmit}
      >
        Accept Orders →
      </button>
    </div>
  </main>
</div>

<style>
  .game-container {
    min-height: 100vh;
    background: #FAFAFA;
  }

  .game-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 24px;
  }

  .round-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .round-header h1 {
    font-size: 48px;
    font-weight: 700;
    color: #000;
    margin: 0 0 16px 0;
  }

  .round-description {
    font-size: 18px;
    color: #5E5E5E;
    max-width: 600px;
    margin: 0 auto;
  }

  .order-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 24px;
    margin-bottom: 40px;
  }

  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    position: sticky;
    bottom: 24px;
  }

  .selection-summary {
    font-size: 18px;
    font-weight: 600;
    color: #212121;
  }

  .submit-btn {
    background: #06C167;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 16px 32px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    background: #05A357;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(6, 193, 103, 0.3);
  }

  .submit-btn:disabled {
    background: #E0E0E0;
    color: #9E9E9E;
    cursor: not-allowed;
  }
</style>
```

---

## Responsive Breakpoints

```css
/* Mobile First Approach */

/* Small phones */
@media (max-width: 375px) {
  .order-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .order-card {
    max-width: 100%;
  }
}

/* Phones */
@media (min-width: 376px) and (max-width: 768px) {
  .order-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .round-header h1 {
    font-size: 36px;
  }
}

/* Tablets */
@media (min-width: 769px) and (max-width: 1024px) {
  .order-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .order-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Animation & Interactions

### Micro-animations

```css
/* Card Hover */
.order-card {
  transition:
    transform 200ms cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1),
    border-color 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.order-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* Button Click */
.submit-btn {
  transition:
    background 150ms ease,
    transform 100ms ease,
    box-shadow 150ms ease;
}

.submit-btn:active {
  transform: translateY(1px);
}

/* Selection Animation */
.order-card.selected {
  animation: selectPulse 0.3s ease;
}

@keyframes selectPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* Loading State */
.loading-spinner {
  border: 3px solid #EEEEEE;
  border-top: 3px solid #06C167;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## Accessibility (WCAG 2.1 AA)

### Requirements

```css
/* Color Contrast */
/* Text on white: Must be ≥4.5:1 */
--text-primary: #000000;     /* 21:1 ✓ */
--text-secondary: #5E5E5E;   /* 7.4:1 ✓ */

/* Interactive Elements */
/* Touch targets: ≥44×44px */
.order-card {
  min-height: 44px;
  min-width: 44px;
}

/* Focus States */
.order-card:focus-visible {
  outline: 3px solid #06C167;
  outline-offset: 2px;
}
```

### ARIA Labels

```html
<!-- Order Card -->
<button
  class="order-card"
  role="button"
  aria-label="Order from {order.store} in {order.city}, ${order.earnings}, {order.amount} items"
  aria-pressed={selected}
>
  ...
</button>

<!-- Recommendation Badge -->
<div
  class="rec-badge"
  role="status"
  aria-live="polite"
  aria-label="This order is recommended by the platform"
>
  ✓ RECOMMENDED
</div>
```

---

## Dark Mode Support (Future)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --uber-black: #FFFFFF;
    --uber-white: #121212;
    --uber-grey-50: #1E1E1E;
    --uber-grey-100: #2A2A2A;
    --uber-grey-200: #3A3A3A;
    --uber-grey-700: #B0B0B0;
  }

  .order-card {
    background: var(--uber-grey-50);
    border-color: var(--uber-grey-200);
  }

  .order-card:hover {
    background: var(--uber-grey-100);
  }
}
```

---

## Implementation Checklist

### Phase 1: Design System Setup
- [ ] Install Tailwind CSS (already done)
- [ ] Create CSS variables for Uber color palette
- [ ] Set up typography scale
- [ ] Create base component library

### Phase 2: Core Components
- [ ] Build `OrderCard.svelte`
- [ ] Build `PlatformCard.svelte`
- [ ] Build `Header.svelte`
- [ ] Build `RoundFeedback.svelte`

### Phase 3: Layout Pages
- [ ] Create Game A layout (platform choice)
- [ ] Create Game B layout (order bundling)
- [ ] Create feedback/results screens
- [ ] Create company selection screen

### Phase 4: Interactions
- [ ] Add hover states and animations
- [ ] Implement selection logic
- [ ] Add loading states
- [ ] Add error states

### Phase 5: Responsive Design
- [ ] Test on mobile (375px-768px)
- [ ] Test on tablet (769px-1024px)
- [ ] Test on desktop (1025px+)
- [ ] Fix any layout issues

### Phase 6: Accessibility
- [ ] Add ARIA labels
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify color contrast ratios

---

## Comparison: Current vs Uber-like UI

| Aspect | Current BundleGame | Uber-like Design |
|--------|-------------------|------------------|
| **Complexity** | Grid navigation, typing items | Card selection only |
| **Visual Style** | Game-like, tutorial prompts | Professional, minimal |
| **Colors** | Multiple colors, emojis | Black/white/green palette |
| **Typography** | Standard web fonts | Bold hierarchy, large sizes |
| **Layout** | Full-screen game views | Centered cards, max 1200px |
| **Interactions** | Complex (navigate + type) | Simple (click cards) |
| **Mobile Support** | Limited | Mobile-first responsive |
| **Feedback** | In-game prompts | Clean modal overlays |

---

## Summary: Key Uber Design Elements

1. **Minimal Color**: Black, white, green only
2. **Bold Typography**: 48px headings, 24px values
3. **Card-Based**: Everything in elevated cards with shadows
4. **Generous Spacing**: 24px+ padding, 40px+ margins
5. **Clear Hierarchy**: Visual weight guides attention
6. **Green CTAs**: Primary actions always green
7. **Simple Interactions**: Tap/click only, no typing
8. **Feedback Overlays**: Modal results screens

**Result**: Participants feel like they're using a real gig work platform, enhancing ecological validity while maintaining experimental control.

---

**End of UI Specification**
