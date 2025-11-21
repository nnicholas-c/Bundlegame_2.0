# Firebase Backend + Qualtrics Integration Guide

**Project**: BundleGame Research Platform
**Last Updated**: October 31, 2025

---

## Overview

The BundleGame uses a **serverless architecture** with Firebase as the backend and Qualtrics for participant recruitment/survey flow. This document explains the full integration stack, data flow, and connection patterns.

---

## Architecture Diagram

```
┌─────────────────┐
│   Qualtrics     │
│   Survey Flow   │
└────────┬────────┘
         │ 1. Generates participant ID
         │ 2. Redirects to game URL with ID & token
         ▼
┌─────────────────────────────────────────┐
│         SvelteKit Frontend              │
│  ┌──────────────────────────────────┐   │
│  │  Login Page (/login)             │   │
│  │  - Validates ID + Token          │   │
│  │  - Checks Firebase Auth          │   │
│  └──────────┬───────────────────────┘   │
│             │ authenticateUser()         │
│             ▼                            │
│  ┌──────────────────────────────────┐   │
│  │  Game Page (/+page.svelte)       │   │
│  │  - Company selection             │   │
│  │  - Round-based gameplay          │   │
│  │  - Real-time logging             │   │
│  └──────────┬───────────────────────┘   │
│             │ createUser()               │
│             │ logAction()                │
│             │ addOrder()                 │
│             ▼                            │
│  ┌──────────────────────────────────┐   │
│  │  Game Over Screen                │   │
│  │  - Generates completion code     │   │
│  │  - Shows condition assignment    │   │
│  └──────────┬───────────────────────┘   │
└─────────────┼───────────────────────────┘
              │ 3. Redirect with completion code
              ▼
┌─────────────────────────────────────────┐
│   Firebase Firestore Backend           │
│  ┌──────────────────────────────────┐   │
│  │  Collections:                    │   │
│  │  - Auth/{token}                  │   │
│  │  - Users/{userId}                │   │
│  │  - Users/{userId}/Actions/       │   │
│  │  - Users/{userId}/Orders/        │   │
│  │  - Global/totalusers             │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
              │ 4. Researcher exports data
              ▼
┌─────────────────────────────────────────┐
│   Data Analysis (Python/Jupyter)       │
│  - Download via /downloader route       │
│  - Process in notebooks                 │
└─────────────────────────────────────────┘
```

---

## Firebase Configuration

### 1. Project Setup ([firebaseConfig.js](../src/lib/firebaseConfig.js))

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk",
  authDomain: "bundling-63c10.firebaseapp.com",
  projectId: "bundling-63c10",
  storageBucket: "bundling-63c10.appspot.com",
  messagingSenderId: "201745088336",
  appId: "1:201745088336:web:c76c1f46364a8a072fb655",
  measurementId: "G-X0G5QE3TB1"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
```

**⚠️ Security Note**: API key is publicly exposed (standard for client-side Firebase). Security is enforced via **Firestore Security Rules** (not shown in code).

### 2. Firebase Services Used

| Service | Purpose | Implementation |
|---------|---------|----------------|
| **Firestore** | NoSQL database for all participant data | `getFirestore(app)` |
| **Analytics** | (Optional) Track app events | `getAnalytics(app)` |
| **Storage** | (Not currently used) | Future: Store generated configs |
| **Authentication** | (Custom implementation) | Token-based, not Firebase Auth SDK |

---

## Data Model (Firestore)

### Collection Structure

```
Firestore Root
├── Auth/                              # Authentication tokens
│   └── {token}                        # Document per token
│       ├── userid: string             # Participant ID
│       └── status: number             # 1=authenticated, 2=completed
│
├── Global/                            # Shared counters
│   └── totalusers                     # Document
│       └── count: number              # Increments for condition assignment
│
└── Users/                             # Main participant data
    └── {userId}                       # Document per participant
        ├── earnings: number           # Total earnings ($)
        ├── ordersComplete: number     # Total orders finished
        ├── uniqueSetsComplete: number # Bundled sets count
        ├── createdAt: Timestamp
        ├── updatedAt: Timestamp
        ├── configuration: number      # 0, 2, 4... (condition assignment)
        ├── company: string            # "uber" | "lyft" | null
        │
        ├── Actions/                   # Subcollection: All interactions
        │   ├── start                  # Initial action
        │   ├── action_0               # Company selection
        │   ├── action_1               # Order click
        │   ├── action_2               # Bundle decision
        │   ├── ...                    # All button clicks
        │   └── {actionId}
        │       ├── buttonID: string
        │       ├── buttonContent: string
        │       ├── earnings: number
        │       ├── ordersComplete: number
        │       ├── gametime: number   # Milliseconds elapsed
        │       ├── uniqueSetsComplete: number
        │       ├── createdAt: Timestamp
        │       └── updatedAt: Timestamp
        │
        └── Orders/                    # Subcollection: Order-level data
            └── {orderId}              # E.g., "order0"
                ├── status: number     # 0=started, 1=completed
                ├── startgametime: number
                ├── endgametime: number
                ├── bundled: boolean
                ├── bundledWith: string | null
                ├── options: array     # All orders available at selection
                ├── name: string       # Customer name
                ├── store: string
                ├── city: string
                ├── earnings: number
                ├── items: object      # {item: quantity}
                ├── amount: number     # Total items
                ├── createdAt: Timestamp
                └── updatedAt: Timestamp
```

### Key Design Patterns

#### 1. **Hierarchical Subcollections** (Actions & Orders)
- **Why**: Allows unbounded growth without hitting document size limits (1MB max)
- **Trade-off**: Requires recursive queries for full user data
- **Query cost**: Higher (1 read per document + 1 per subcollection doc)

#### 2. **Denormalized Snapshots** (e.g., `options` array in Orders)
- **Why**: Captures full context at moment of decision
- **Trade-off**: Data duplication (same order appears in multiple users' `options`)
- **Benefit**: Complete historical record even if configs change

#### 3. **Global Counter for Condition Assignment**
- **Why**: Ensures balanced distribution across experimental conditions
- **How**:
  ```javascript
  counter = await getCounter();
  condition = counter % numConditions;  // Round-robin
  await incrementCounter();
  ```
- **Race condition**: Low risk (pilot scale); use transactions for production

---

## Authentication Flow

### Token Generation Algorithm ([firebaseDB.js:151-159](../src/lib/firebaseDB.js#L151-L159))

The game uses a **custom token-based auth** (not Firebase Authentication SDK):

#### Step 1: Qualtrics Generates Participant ID
```
Qualtrics assigns ID: "P001"
```

#### Step 2: Generate Deterministic Token
```javascript
function generateToken(id) {
  const seed = hashSeed(id);           // Hash ID to number
  const random = seededRandom(seed);   // Seeded PRNG
  let first = generateNumber(random, 11);   // 4-digit hex with checksum
  let second = generateNumber(random, 0);
  let third = generateNumber(random, 11);
  let fourth = generateNumber(random, 10);
  return first + "-" + second + "-" + third + "-" + fourth;
}
// Example output: "A7B3-05C1-D2F4-8A6E"
```

**Key properties**:
- **Deterministic**: Same ID always produces same token
- **Checksum**: Each 4-digit block has Luhn-like validation
- **Collision resistance**: ~281 trillion combinations (16^16)

#### Step 3: Qualtrics URL Redirect
```
https://bundlegame.app/?id=P001&token=A7B3-05C1-D2F4-8A6E
```

#### Step 4: Frontend Validation ([firebaseDB.js:168-200](../src/lib/firebaseDB.js#L168-L200))

```javascript
export const authenticateUser = async (id, token) => {
  // Check if token already exists in Auth collection
  const authDoc = await getDoc(doc(firestore, "Auth", token));

  if (authDoc.exists()) {
    if (authDoc.data().status == 2) {
      return 1;  // Already completed
    }
    return 0;  // Token exists but not valid
  }

  // Token not in DB → validate by regenerating
  let generatedToken = generateToken(id);

  if (generatedToken == token) {
    // Valid! Create auth record
    await setDoc(doc(firestore, "Auth", token), {
      userid: id,
      status: 1  // Authenticated
    });
    return 1;
  }

  return 0;  // Invalid token
};
```

**Security Model**:
- ✅ Prevents replay attacks (token stored after first use)
- ✅ Prevents guessing (checksum validation)
- ⚠️ No expiration (tokens valid forever)
- ⚠️ No rate limiting (vulnerable to brute force)
- ❌ Client-side validation (not true authentication)

### Completion Flow

#### On Game Over ([+page.svelte:88-89](../src/routes/+page.svelte#L88-L89)):

```javascript
completed = generateCompleteId(userId);  // Add "qq" suffix + token
completed2 = user;                        // Condition number (0, 2, ...)
```

**Completion codes**:
1. **Code #1**: `generateCompleteId("P001")` → Token with "P001qq" seed
   - Purpose: Verify participant actually played
   - Qualtrics validates this code matches expected value

2. **Code #2**: Configuration number (e.g., "0" or "2")
   - Purpose: Track which experimental condition participant received
   - Used for blocking in analysis

#### Redirect to Qualtrics:
```html
<a href="https://qualtrics.survey.url/?code={completed}&condition={completed2}">
  Return to Survey
</a>
```

---

## Database Operations

### Core Functions ([firebaseDB.js](../src/lib/firebaseDB.js))

#### 1. Create User ([firebaseDB.js:42-81](../src/lib/firebaseDB.js#L42-L81))

```javascript
export const createUser = async (id, n, companyId) => {
  // Main user document
  const userData = {
    earnings: 0,
    ordersComplete: 0,
    uniqueSetsComplete: 0,
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
    configuration: n,        // Condition assignment
    company: companyId       // Initial company choice
  };
  await setDoc(doc(firestore, "Users", id), userData);

  // Initial action (baseline)
  const actionData = { /* same fields */ };
  await setDoc(doc(firestore, "Users", id, "Actions", "start"), actionData);

  return id;
};
```

**Called**: Once at game start after company selection

#### 2. Log Action ([bundle.js](../src/lib/bundle.js) + [+page.svelte:111-133](../src/routes/+page.svelte#L111-L133))

```javascript
// Global click listener
window.addEventListener("click", handleClick);

function handleClick(event) {
  if (event.target.tagName == "BUTTON" ||
      event.target.classList.contains("order-content")) {
    let action = {
      buttonID: event.target.id,
      buttonContent: event.target.textContent.trim()
    };
    logAction(action);  // → addAction() in firebaseDB
  }
}

export const addAction = async (id, gamestate, name) => {
  gamestate.createdAt = Timestamp.fromDate(new Date());
  gamestate.gametime = get(elapsed);  // Milliseconds since start
  await setDoc(doc(firestore, "Users", id, "Actions", name), gamestate);
};
```

**Logged events**:
- Company selection
- Order card clicks
- Bundle selection
- Company switches
- Navigation actions (store entrance, checkout)
- Break screen interactions

**Action names**: `action_0`, `action_1`, `action_2`, ... (sequential counter)

#### 3. Track Order ([bundle.js](../src/lib/bundle.js) via [firebaseDB.js:219-249](../src/lib/firebaseDB.js#L219-L249))

```javascript
// On order selection
export const addOrder = async (id, gamestate, orderID) => {
  gamestate.status = 0;            // Started
  gamestate.startgametime = get(elapsed);
  gamestate.bundled = /* true if bundle */;
  gamestate.bundledWith = /* other order ID */;
  gamestate.options = get(orderList);  // All visible orders
  await setDoc(doc(firestore, "Users", id, "Orders", orderID), gamestate);
};

// On order completion
export const updateOrder = async (id, gamestate, orderID) => {
  gamestate.status = 1;            // Completed
  gamestate.endgametime = get(elapsed);
  await updateDoc(doc(firestore, "Users", id, "Orders", orderID), gamestate);
};
```

**Metrics computed later**:
- Time per order: `endgametime - startgametime`
- Bundling rate: `count(bundled=true) / count(total)`
- Choice set at decision: `options` array

#### 4. Update User Stats ([firebaseDB.js:251-261](../src/lib/firebaseDB.js#L251-L261))

```javascript
export const updateFields = async (id, gamestate) => {
  gamestate.updatedAt = Timestamp.fromDate(new Date());
  await updateDoc(doc(firestore, "Users", id), gamestate);
};
```

**Updated on**:
- Order completion: `{ earnings: +$X, ordersComplete: +1 }`
- Bundle completion: `{ uniqueSetsComplete: +1 }`
- Company switch: `{ company: newCompanyId }`

#### 5. Retrieve All Data (Researcher Export) ([firebaseDB.js:274-300](../src/lib/firebaseDB.js#L274-L300))

```javascript
export const retrieveData = async () => {
  const querySnapshot = await getDocs(collection(firestore, "Users"));
  const data = [];

  for (const docSnapshot of querySnapshot.docs) {
    const docData = docSnapshot.data();
    const docId = docSnapshot.id;

    // Fetch subcollections
    const orders = await getSubcollections(docId, "/Orders");
    const actions = await getSubcollections(docId, "/Actions");

    data.push({
      id: docId,
      ...docData,
      orders,
      actions
    });
  }

  return data;  // Full nested data structure
};
```

**Used by**: [/downloader](../src/routes/downloader/+page.svelte) route
**Output**: JSON array of all users with nested collections
**Query cost**: `N users + N*M actions + N*K orders` reads

---

## Qualtrics Integration

### Survey Flow Setup

#### 1. Embedded Data Fields (Set at Start of Survey)

```
Embedded Data:
- ParticipantID (auto-generated or researcher-assigned)
- GameURL = "https://bundlegame.app"
- CompletionCode1 (piped from return URL)
- CompletionCode2 (piped from return URL)
- ConditionAssignment (piped from Code2)
```

#### 2. Pre-Game Block

**Purpose**: Generate participant ID and token

**Option A: Use Qualtrics Contact ID**
```
Set ParticipantID = ${e://Field/ResponseID}
```

**Option B: Use Custom Sequential ID** (recommended)
```javascript
// JavaScript in Qualtrics question
Qualtrics.SurveyEngine.setEmbeddedData('ParticipantID', 'P' + Math.random().toString(36).substr(2, 9));
```

**Generate Token** (JavaScript):
```javascript
// Copy generateToken() function from firebaseDB.js
// (Needs to be duplicated in Qualtrics)

function generateTokenForQualtrics(id) {
  // ... [same implementation] ...
  return token;
}

var pid = "${e://Field/ParticipantID}";
var token = generateTokenForQualtrics(pid);
Qualtrics.SurveyEngine.setEmbeddedData('GameToken', token);
```

**⚠️ Issue**: Qualtrics JS doesn't support ES6 modules
**Solution**: Inline entire token generation code or use pre-generated CSV

#### 3. Redirect to Game

**End of Survey URL**:
```
https://bundlegame.app/?id=${e://Field/ParticipantID}&token=${e://Field/GameToken}
```

**Settings**:
- ✅ "Anonymize Response" = OFF (need to track IDs)
- ✅ "End of Survey Message" = Custom (with redirect link)
- ✅ "Survey Options" → "Back Button" = OFF (prevent re-entry)

#### 4. Game Plays (External)

Participant completes game, sees completion screen:
```
Your completion codes:
Code 1: A7B3-05C1-D2F4-8A6E-qq
Code 2: 0

Return to survey: [Click here]
```

#### 5. Return to Qualtrics

**Return URL**:
```
https://qualtrics.survey.url/?code1=${code1}&code2=${code2}
```

**Validation Block** (JavaScript):
```javascript
// Retrieve codes from URL parameters
var returnedCode1 = "${e://Field/code1}";
var expectedCode1 = generateCompleteId("${e://Field/ParticipantID}");

if (returnedCode1 === expectedCode1) {
  Qualtrics.SurveyEngine.setEmbeddedData('ValidationStatus', 'PASS');
} else {
  Qualtrics.SurveyEngine.setEmbeddedData('ValidationStatus', 'FAIL');
}
```

**Branch logic**:
- If `ValidationStatus = PASS`: Continue to post-game questions
- If `ValidationStatus = FAIL`: Show error message, allow retry

#### 6. Post-Game Questionnaire

Example questions:
- "What strategy did you use to choose orders?"
- "Did you prefer Company X or Company Y? Why?"
- "How often did you follow the platform's recommendations?"
- Attention checks
- Demographics

---

## Connection Patterns

### Frontend ↔ Firebase

#### Pattern 1: One-time Writes (Actions, Orders)

```javascript
// Optimistic: No need to wait for confirmation
logAction({ buttonID: "order1", buttonContent: "Select Order 1" });
// → Fire-and-forget, continues immediately
```

**Trade-offs**:
- ✅ Fast (no blocking)
- ✅ Simple error handling
- ⚠️ No confirmation of success
- ⚠️ Data loss if network fails (silently)

**Improvement** (not currently implemented):
```javascript
await logAction(...);  // Wait for confirmation
// Or use offline persistence:
enableIndexedDbPersistence(firestore);
```

#### Pattern 2: Read-then-Write (Authentication, Counter)

```javascript
// Read first
const counter = await getCounter();
const condition = counter % numConditions;

// Then write
await createUser(userId, condition, companyId);
await incrementCounter();
```

**Race condition risk**:
- Two users starting simultaneously might get same condition
- **Mitigation**: Use Firestore transactions (not currently implemented)

```javascript
// Better approach:
await runTransaction(firestore, async (transaction) => {
  const counterDoc = await transaction.get(doc(firestore, "Global", "totalusers"));
  const newCount = counterDoc.data().count + 1;
  transaction.update(counterDoc.ref, { count: newCount });
  return newCount;
});
```

#### Pattern 3: Batch Writes (Game Over)

```javascript
// Multiple updates at end
await finalizeCompanySession();  // Updates hourly earnings
await updateOrder(id, { status: 1 }, orderId);
await updateFields(id, { ordersComplete: +1, earnings: +X });
// Potential: Use Firestore batch writes
```

**Current cost**: 3 separate writes
**Optimization**:
```javascript
const batch = writeBatch(firestore);
batch.update(orderRef, { status: 1 });
batch.update(userRef, { earnings: increment(X) });
await batch.commit();  // Single round-trip
```

---

## Data Export & Analysis

### Method 1: In-App Downloader ([/downloader](../src/routes/downloader/+page.svelte))

**UI**:
```html
<button on:click={downloadData}>Download All Data (JSON)</button>
<button on:click={downloadCSV}>Download as CSV</button>
```

**Implementation**:
```javascript
async function downloadData() {
  const data = await retrieveData();  // Fetches all users + subcollections
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bundlegame_data_${Date.now()}.json`;
  a.click();
}
```

**Output format** (JSON):
```json
[
  {
    "id": "P001",
    "earnings": 145.50,
    "ordersComplete": 12,
    "configuration": 0,
    "company": "uber",
    "createdAt": { "seconds": 1698765432 },
    "actions": [
      {
        "id": "start",
        "gametime": 0,
        "buttonID": "start",
        "earnings": 0,
        ...
      },
      ...
    ],
    "orders": [
      {
        "id": "order0",
        "status": 1,
        "startgametime": 5230,
        "endgametime": 18450,
        "bundled": true,
        "bundledWith": "order1",
        ...
      },
      ...
    ]
  },
  ...
]
```

### Method 2: Firebase Console Export

**Steps**:
1. Go to Firebase Console → Firestore → Users collection
2. Click "Export" → Cloud Storage
3. Download from Storage bucket as JSON/CSV
4. **Limitation**: Only exports top-level documents (no subcollections)

### Method 3: Cloud Functions (Scheduled Export)

**Not currently implemented**, but recommended for production:

```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.dailyExport = functions.pubsub.schedule('every 24 hours').onRun(async () => {
  const data = await fetchAllData();
  await admin.storage().bucket().file('exports/data.json').save(JSON.stringify(data));
});
```

---

## Security Considerations

### Current Implementation

| Aspect | Current State | Risk Level |
|--------|--------------|-----------|
| **Firestore Rules** | Not shown in code | 🔴 **CRITICAL** — Likely too permissive |
| **API Key Exposure** | Public (normal for client-side) | 🟡 **LOW** — Standard practice |
| **Token Validation** | Client-side only | 🔴 **HIGH** — Can be bypassed |
| **Rate Limiting** | None | 🔴 **MEDIUM** — Vulnerable to abuse |
| **Data Privacy** | No PII masking | 🟡 **MEDIUM** — Consider GDPR |
| **CORS** | Default (all origins) | 🟡 **LOW** — Consider restricting |

### Recommended Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Auth collection: Read only for validation
    match /Auth/{token} {
      allow read: if request.auth != null || true;  // Allow anonymous reads
      allow write: if request.time < timestamp.date(2025, 12, 31);  // Expire after study
    }

    // Users collection
    match /Users/{userId} {
      // Allow create only if authenticated
      allow create: if request.auth != null ||
                       (request.resource.data.keys().hasAll(['earnings', 'configuration']));

      // Allow update only own user
      allow update: if request.auth.uid == userId ||
                       userId == request.resource.data.id;

      // Allow read for researchers (TODO: Add researcher UIDs)
      allow read: if request.auth.uid in ['researcher1_uid', 'researcher2_uid'];

      // Subcollections
      match /Actions/{actionId} {
        allow create: if true;  // Allow action logging
        allow read: if request.auth.uid in ['researcher1_uid'];
      }

      match /Orders/{orderId} {
        allow create, update: if true;
        allow read: if request.auth.uid in ['researcher1_uid'];
      }
    }

    // Global counter
    match /Global/totalusers {
      allow read: if true;
      allow update: if request.resource.data.count == resource.data.count + 1;  // Only increment by 1
    }
  }
}
```

**⚠️ Important**: The current code doesn't use Firebase Authentication SDK, so `request.auth` will be `null`. Rules need adjustment or migration to proper auth.

---

## Performance Optimization

### Current Bottlenecks

1. **Action Logging**: Every click = 1 write
   - **Cost**: 500 clicks × $0.18/100k writes = $0.0009 per user
   - **Solution**: Batch writes every 5 seconds

2. **Data Export**: Sequential subcollection fetches
   - **Cost**: 100 users × 500 actions = 50,000 reads
   - **Solution**: Use Firestore export API or Cloud Functions

3. **Hourly Earnings Updates**: Every 1 second
   - **Cost**: 1200 seconds × 1 update = 1200 writes per user
   - **Solution**: Update only on state change (company switch, game over)

### Optimization Recommendations

#### 1. Batch Action Logging

```javascript
let actionQueue = [];
setInterval(() => {
  if (actionQueue.length > 0) {
    const batch = writeBatch(firestore);
    actionQueue.forEach(action => {
      batch.set(doc(firestore, `Users/${userId}/Actions/${action.id}`), action);
    });
    await batch.commit();
    actionQueue = [];
  }
}, 5000);  // Every 5 seconds
```

**Savings**: 500 writes → 40 batches = **92% reduction**

#### 2. Use Firestore Offline Persistence

```javascript
import { enableIndexedDbPersistence } from 'firebase/firestore';

enableIndexedDbPersistence(firestore)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open
    } else if (err.code == 'unimplemented') {
      // Browser doesn't support
    }
  });
```

**Benefits**:
- ✅ Works offline (network issues)
- ✅ Faster writes (local-first)
- ✅ Auto-sync when back online

#### 3. Use Cloud Functions for Complex Queries

```javascript
// Instead of client-side aggregation:
const hourlyRate = data.reduce((sum, order) => sum + order.earnings, 0) / totalTime;

// Use server-side function:
const calculateStats = httpsCallable(functions, 'calculateStats');
const { data: stats } = await calculateStats({ userId });
```

---

## Debugging & Monitoring

### Firebase Console

**Navigate to**: https://console.firebase.google.com/project/bundling-63c10

#### Useful Views:

1. **Firestore → Data Tab**
   - Browse collections manually
   - Check document counts
   - Verify data structure

2. **Firestore → Usage Tab**
   - Monitor read/write counts
   - Check storage size
   - Estimate costs

3. **Firestore → Rules Tab**
   - Test security rules
   - View rule evaluation logs

4. **Firestore → Indexes Tab**
   - Create composite indexes for complex queries

### Browser DevTools

#### Network Tab:
- Filter: `firestore.googleapis.com`
- Look for:
  - `beginTransaction` (batch writes)
  - `commit` (write completion)
  - `runQuery` (reads)
- Check response times and errors

#### Console Logs:
```javascript
// Existing logs in code:
console.log("Document written with ID: ", id);
console.log("Count incremented");
console.error("Error adding document: ", error);
```

#### Application Tab → IndexedDB:
- Check `firebaseLocalStorageDb` for offline persistence
- View pending writes

### Custom Analytics

**Current implementation** (minimal):
```javascript
import { getAnalytics } from "firebase/analytics";
const analytics = getAnalytics(app);
// Note: Not actively used for custom events
```

**Recommended additions**:
```javascript
import { logEvent } from "firebase/analytics";

// Track key events
logEvent(analytics, 'company_selected', { companyId });
logEvent(analytics, 'bundle_created', { size: 2 });
logEvent(analytics, 'game_completed', { earnings, duration });
```

---

## Common Issues & Solutions

### Issue 1: "Missing or insufficient permissions"

**Cause**: Firestore rules too restrictive or not deployed

**Solution**:
1. Check Firestore rules in Firebase Console
2. Temporarily set to test mode (all reads/writes allowed):
   ```
   allow read, write: if true;
   ```
3. Redeploy proper rules before production

### Issue 2: Participant sees old data after refresh

**Cause**: Browser cache or Firestore local persistence

**Solution**:
```javascript
// Clear cache on auth
await clearIndexedDbPersistence(firestore);
// Or disable persistence:
await disableNetwork(firestore);
await enableNetwork(firestore);
```

### Issue 3: Completion code doesn't match

**Cause**: Token generation mismatch between Qualtrics and game

**Solution**:
- Ensure exact same algorithm in both places
- Check for whitespace in participant ID
- Log both tokens for debugging:
  ```javascript
  console.log("Expected:", expectedToken);
  console.log("Received:", receivedToken);
  ```

### Issue 4: Condition assignment imbalanced

**Cause**: Race conditions in counter increment

**Solution**: Use transactions (see "Connection Patterns" above)

### Issue 5: High Firebase costs

**Cause**: Excessive writes (action logging, hourly updates)

**Solution**: Implement batching and reduce update frequency (see "Performance Optimization")

---

## Migration to Round-Based Structure

### Database Schema Changes

#### New Fields in Users Collection:

```javascript
{
  earnings: number,
  ordersComplete: number,
  configuration: number,
  company: string,
  game_mode: "continuous" | "round_based",  // NEW
  current_round: number,                     // NEW
  rounds_completed: number,                  // NEW
  total_regret: number,                      // NEW (cumulative)
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### New Subcollection: Rounds/

```javascript
Users/{userId}/Rounds/{roundId}
{
  round_id: string,              // "W1", "B2", etc.
  round_number: number,          // 1-8
  game_type: string,             // "wage_choice" | "bundling_optimization"
  options: array,                // All options shown
  recommendation: object | null, // Platform recommendation
  choice: object,                // User's selection
  reaction_time_ms: number,      // Time to make choice
  expected_hourly_rate: number,  // Computed before choice
  realized_hourly_rate: number,  // Simulated outcome
  optimal_hourly_rate: number,   // Best possible choice
  regret: number,                // optimal - realized
  rec_accepted: boolean,         // NEW
  rec_overridden: boolean,       // NEW
  createdAt: Timestamp,
  completedAt: Timestamp
}
```

### Updated Logging Functions

```javascript
export const logRoundStart = async (userId, roundConfig) => {
  await setDoc(doc(firestore, `Users/${userId}/Rounds`, roundConfig.round_id), {
    ...roundConfig,
    reaction_time_start: Date.now(),
    createdAt: Timestamp.fromDate(new Date())
  });
};

export const logRoundComplete = async (userId, roundId, outcome) => {
  await updateDoc(doc(firestore, `Users/${userId}/Rounds`, roundId), {
    ...outcome,
    reaction_time_ms: Date.now() - outcome.reaction_time_start,
    rec_accepted: checkIfRecommendationAccepted(outcome.choice, outcome.recommendation),
    rec_overridden: !checkIfRecommendationAccepted(outcome.choice, outcome.recommendation),
    completedAt: Timestamp.fromDate(new Date())
  });

  // Update user-level aggregates
  await updateFields(userId, {
    rounds_completed: increment(1),
    total_regret: increment(outcome.regret)
  });
};
```

---

## Deployment & Hosting

### Current Hosting

**Assumed**: SvelteKit adapter-auto (detects platform)

**Likely platform**: Vercel, Netlify, or Firebase Hosting

### Firebase Hosting Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize hosting
firebase init hosting

# Select options:
# - Use existing project: bundling-63c10
# - Public directory: build (SvelteKit output)
# - Single-page app: Yes
# - GitHub auto-deploy: Optional

# Build and deploy
npm run build
firebase deploy --only hosting
```

**URL**: https://bundling-63c10.web.app or custom domain

### Environment Variables

**Problem**: Firebase config is hardcoded in [firebaseConfig.js](../src/lib/firebaseConfig.js)

**Solution**: Use environment variables

```javascript
// .env
VITE_FIREBASE_API_KEY=AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk
VITE_FIREBASE_PROJECT_ID=bundling-63c10
// ... other config values

// firebaseConfig.js
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ...
};
```

**⚠️ Note**: `VITE_` prefix required for Vite to expose to client

---

## Summary: How It All Connects

```
Qualtrics                   Frontend                Firebase                Analysis
────────                    ────────                ────────                ────────

1. Generate ID    →    2. Validate token    →   3. Check Auth/        →   [Wait]
   & Token             3. Create user           4. Write to Users/
                       4. Log interactions      5. Store in Actions/
                                                6. Track in Orders/

                  ←    7. Game completes    ←   8. Finalize data      →   9. Export data
                       8. Show codes            9. Update status=2        10. Analyze in
                                                                               Python/R

11. Receive codes →   [Game closed]        ←   [Data persisted]      →   11. Generate
12. Validate                                                                  insights
13. Continue survey                                                       12. Publish
```

**Key handoffs**:
- Qualtrics → Frontend: URL parameters (`id`, `token`)
- Frontend → Firebase: Firestore SDK writes
- Firebase → Frontend: Real-time listeners (if used) or one-time reads
- Frontend → Qualtrics: Redirect with completion codes
- Firebase → Analysis: Export via `/downloader` or Cloud Functions

---

**End of Integration Guide**
