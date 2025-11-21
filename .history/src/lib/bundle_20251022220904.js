import { writable, readable, derived, get } from "svelte/store";
import {
  addAction,
  addOrder,
  updateFields,
  updateOrder,
  authenticateUser,
  createUser,
  getCounter,
  incrementCounter,
} from "./firebaseDB";

import config from "../config.json";
import { switchJob, queueNFixedOrders } from "./config";

const configModules = import.meta.glob("./configs/*.json");

// Get filenames (cleaned for display)
export const configOptions = Object.keys(configModules).map((path) => {
  const name = path.split("/").pop(); // e.g., "config1.json"
  return { name, importFn: configModules[path] };
});

let storeConfigs = {};
let orderConfigs = [];

let start;
let stopTimeInterval;
let actionCounter = 0;
export const uniqueSets = writable(0);
export const orderList = writable([]);
export const FullTimeLimit = config["timeLimit"];

export const needsAuth = config["auth"];
export const isAuthenticated = writable(false);

export const numCols = config["gridSize"];
export const companies = config["companies"] ?? [];
export const breakDuration = config["breakDuration"] ?? 5;

const roundToCents = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export const currentCompany = writable(
  companies.length === 1 ? companies[0] : null,
);
let perJobTotal = 0;
let hourlyTotal = 0;
let hourlyAccumulated = 0;
let hourlySessionStart = null;
let hourlyRateActive = 0;

const experiment = true;

export const GameOver = writable(false);
export const gameText = writable({
  selector: "None selected",
});

export const thinkTime = config["thinkTime"];
export const ordersShown = 4;
export const game = writable({
  inSelect: false,
  inStore: false,
  bundled: false,
  tip: config["tips"],
  waiting: config["waiting"],
  refresh: config["refresh"],
  companySelected: companies.length === 1,
  waitingForNextJob: false,
  breakTimer: 0,
  showCompanySwitchModal: false,
});

export const tipTimers = writable([]);

export function createTipTimer(id, initialTime) {
  tipTimers.update((t) => {
    const newTimer = {
      orderId: id,
      remainingTime: initialTime,
      intervalId: null,
    };
    return [...t, newTimer];
  });
}

export function startTipTimer(id) {
  tipTimers.update((t) => {
    const updatedTimers = t.map((timer) => {
      if (timer.id === id && timer.intervalId === null) {
        timer.intervalId = setInterval(() => {
          tipTimers.update((tipTimers) => {
            const updated = tipTimers.map((t) => {
              if (t.id === id && t.remainingTime > 0) {
                t.remainingTime -= 1;
              }
              return t;
            });
            return updated;
          });
        }, 1000);
      }
      return timer;
    });
    return updatedTimers;
  });
}

export function stopTipTimer(id) {
  tipTimers.update((t) => {
    const updatedTimers = t.map((timer) => {
      if (timer.id === id && timer.intervalId !== null) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
      }
      return timer;
    });
    return updatedTimers;
  });
}

export function removeTipTimer(id) {
  tipTimers.update((t) => {
    const updatedTimers = t.filter((timer) => timer.id !== id); // Filter out the timer with the specified id
    return updatedTimers;
  });
}

export function resetTimer() {
  start = new Date();
}

let interval;

const time = writable(new Date());

export const startTimer = () => {
  interval = setInterval(() => {
    time.set(new Date());
  }, 10);

  stopTimeInterval = () => clearInterval(interval);

  return function stop() {
    clearInterval(interval);
  };
};

let pausedAt = null;
let pauseDuration = 0;

export const timeStamp = derived(time, ($time) => {
  const now = $time.getTime();
  if (pausedAt) return pausedAt - start - pauseDuration;
  return now - start - pauseDuration;
});
export const history = writable([]);

// Send history to qualtircs
let t;

timeStamp.subscribe((v) => {
  t = v / 1000;
  if (get(GameOver)) {
    //GameOver.set(false);
  }
});

export const orders = writable([]);
export const finishedOrders = writable([]);
export const failedOrders = writable([]);
export const id = writable("");

export const earned = writable(0);
export const currLocation = writable("");

export const elapsed = derived(timeStamp, ($timeStamp, set) => {
  const elapsedSeconds = Math.round($timeStamp / 1000);
  if (elapsedSeconds >= FullTimeLimit && elapsedSeconds <= FullTimeLimit + 2) {
    updateFields(get(id), {
      earnings: get(earned),
      ordersComplete: get(finishedOrders).length,
      uniqueSetsComplete: get(uniqueSets),
      gametime: FullTimeLimit,
    });
    GameOver.set(true);
    stopTimeInterval?.();
    set(FullTimeLimit);
    console.log("game over");
    return;
  }
  set(elapsedSeconds);
});

export const hourlyEarnings = derived(elapsed, ($elapsed) => {
  if (!Number.isFinite($elapsed)) {
    return roundToCents(hourlyAccumulated);
  }
  if (hourlySessionStart !== null && hourlyRateActive > 0) {
    const sessionSeconds = Math.max(0, $elapsed - hourlySessionStart);
    const activeEarned = (sessionSeconds / 3600) * hourlyRateActive;
    return roundToCents(hourlyAccumulated + activeEarned);
  }
  return roundToCents(hourlyAccumulated);
});

const logSystemEvent = (action) => {
  if (!needsAuth) {
    return;
  }
  const userId = get(id);
  if (!userId) {
    return;
  }
  const payload = {
    buttonID: action.buttonID ?? action.actionType ?? "system_event",
    ...action,
  };
  payload.earnings = get(earned);
  payload.ordersComplete = get(finishedOrders).length;
  payload.gametime = get(elapsed);
  payload.uniqueSetsComplete = get(uniqueSets);
  addAction(userId, payload, actionCounter + "_" + payload.buttonID);
  actionCounter += 1;
};

export const toggleTime = () => {
  if (pausedAt) {
    const resumeTime = new Date();
    pauseDuration += resumeTime - pausedAt; // add pause time
    pausedAt = null;

    // resume the interval
    interval = setInterval(() => {
      time.set(new Date());
    }, 10);
  } else {
    pausedAt = new Date();
    clearInterval(interval);
  }
};

export const logAction = (action) => {
  if (!needsAuth) {
    return;
  }
  const userId = get(id);
  if (!userId) {
    return;
  }
  action.earnings = get(earned);
  action.ordersComplete = get(finishedOrders).length;
  action.gametime = get(elapsed);
  action.uniqueSetsComplete = get(uniqueSets);
  console.log(action);
  addAction(userId, action, actionCounter + "_" + action.buttonID);
  actionCounter += 1;
};

export const logOrder = (order, options) => {
  if (!needsAuth) {
    return;
  }
  order.startgametime = get(elapsed);
  order.status = 0;
  order.bundled = false;
  let optionslst = [];
  for (let i = 0; i < options.length; i++) {
    optionslst.push(options[i].id);
  }
  order.options = optionslst;
  addOrder(get(id), order, order.id);
};
export const logBundledOrder = (order1, order2, options) => {
  if (!needsAuth) {
    return;
  }
  order1.startgametime = get(elapsed);
  order1.status = 0;
  order1.bundled = true;
  order1.bundledWith = order2.id;
  order2.startgametime = get(elapsed);
  order2.status = 0;
  order2.bundled = true;
  order2.bundledWith = order1.id;
  let optionslst = [];
  for (let i = 0; i < options.length; i++) {
    optionslst.push(options[i].id);
  }
  order1.options = optionslst;
  order2.options = optionslst;
  addOrder(get(id), order1, order1.id);
  addOrder(get(id), order2, order2.id);
};

//state should contain info such as:
//whether the order was completed succesfully or not
//how many tries it took, etc
export const completeOrder = (orderID, metadata = {}) => {
  if (!needsAuth) {
    return;
  }
  let state = {
    status: 1,
    endgametime: get(elapsed),
  };
  updateOrder(get(id), state, orderID);
  updateFields(get(id), {
    earnings: get(earned),
    ordersComplete: get(finishedOrders).length,
    uniqueSetsComplete: get(uniqueSets),
    gametime: FullTimeLimit,
  });
  if (metadata && Object.keys(metadata).length > 0) {
    logSystemEvent({
      actionType: "job_completed",
      orderId: orderID,
      ...metadata,
    });
  }
};

export const authUser = (id, pass) => {
  return authenticateUser(id, pass);
};

export async function loadConfigByName(fileName) {
  const matchPath = Object.keys(configModules).find((path) =>
    path.endsWith(fileName),
  );

  if (!matchPath) {
    console.error(`Config file "${fileName}" not found in ../configs/`);
    return null;
  }

  const module = await configModules[matchPath](); // dynamic import
  return module.default; // get JSON content
}

export async function loadGame() {
  let n = 0;
  if (config["conditions"].length > 1) {
    let value = await getCounter();
    await incrementCounter();
    n = value % config["conditions"].length;
  }
  try {
    let orderFile = await loadConfigByName(
      config["conditions"][n]["order_file"],
    );
    let storeFile = await loadConfigByName(
      config["conditions"][n]["store_file"],
    );

    if (!orderFile || !storeFile) {
      console.error("Could not find files specified in configuration");
    } else {
      storeConfigs = storeFile;
      orderConfigs = orderFile;
    }
  } catch (err) {
    console.error("Error creating conditions", err);
    return -1;
  }
  currLocation.set(storeConfigs["startinglocation"]);

  switchJob(orderConfigs, storeConfigs, companies);
  return n;
}

export async function createNewUser(id, companyId) {
  let n = await loadGame();
  await createUser(id, n, companyId);
  return n;
}

const finalizeHourlySession = () => {
  if (hourlySessionStart !== null && hourlyRateActive > 0) {
    const sessionSeconds = Math.max(0, get(elapsed) - hourlySessionStart);
    const earnedSegment = (sessionSeconds / 3600) * hourlyRateActive;
    hourlyAccumulated = roundToCents(hourlyAccumulated + earnedSegment);
    hourlySessionStart = null;
    hourlyRateActive = 0;
  }
};

const activateHourlySession = (company) => {
  hourlyRateActive = Number(company?.hourlyRate ?? 0);
  hourlySessionStart = get(elapsed);
};

let lastLoggedHourly = 0;

export const recordPerJobPayout = (amount, orderId) => {
  if (!amount || Number.isNaN(amount)) {
    return;
  }
  perJobTotal = roundToCents(perJobTotal + Number(amount));
  hourlyTotal = get(hourlyEarnings);
  const updatedTotal = roundToCents(perJobTotal + hourlyTotal);
  earned.set(updatedTotal);
  logSystemEvent({
    actionType: "job_completed_per_job",
    orderId,
    payoutAmount: roundToCents(amount),
    companyId: get(currentCompany)?.id,
  });
};

export const updateHourlyEarned = () => {
  const company = get(currentCompany);
  if (!company || company.payment_type !== "hourly") {
    hourlyTotal = roundToCents(hourlyAccumulated);
    earned.set(roundToCents(perJobTotal + hourlyTotal));
    return;
  }
  if (hourlySessionStart === null) {
    activateHourlySession(company);
  }
  const newHourlyTotal = get(hourlyEarnings);
  hourlyTotal = newHourlyTotal;
  const updatedTotal = roundToCents(perJobTotal + hourlyTotal);
  earned.set(updatedTotal);
  if (Math.abs(newHourlyTotal - lastLoggedHourly) >= 0.01) {
    logSystemEvent({
      actionType: "hourly_pay_update",
      hourlyRate: company.hourlyRate ?? 0,
      durationOnlineSeconds:
        hourlySessionStart !== null
          ? Math.max(0, get(elapsed) - hourlySessionStart)
          : 0,
      companyId: company.id,
      currentHourlyTotal: newHourlyTotal,
    });
    lastLoggedHourly = newHourlyTotal;
  }
};

let breakInterval;

export const startBreakTimer = () => {
  clearInterval(breakInterval);
  game.update((state) => ({
    ...state,
    waitingForNextJob: true,
    breakTimer: breakDuration,
  }));
  breakInterval = setInterval(() => {
    let shouldClear = false;
    game.update((state) => {
      const nextValue = (state.breakTimer ?? 0) - 1;
      if (nextValue <= 0) {
        shouldClear = true;
        return {
          ...state,
          waitingForNextJob: false,
          breakTimer: 0,
        };
      }
      return {
        ...state,
        breakTimer: nextValue,
      };
    });
    if (shouldClear) {
      clearInterval(breakInterval);
    }
  }, 1000);
};

export const openCompanySwitchModal = () => {
  game.update((state) => ({ ...state, showCompanySwitchModal: true }));
};

export const closeCompanySwitchModal = () => {
  game.update((state) => ({ ...state, showCompanySwitchModal: false }));
};

export const switchCompany = (newCompanyId) => {
  const selected = companies.find((company) => company.id === newCompanyId);
  if (!selected) {
    return;
  }
  const previous = get(currentCompany);
  if (
    previous &&
    previous.payment_type === "hourly" &&
    previous.id !== selected.id
  ) {
    finalizeHourlySession();
  }
  if (!previous || previous.id !== selected.id) {
    if (selected.payment_type === "hourly") {
      activateHourlySession(selected);
    } else {
      finalizeHourlySession();
    }
  }
  currentCompany.set(selected);
  clearInterval(breakInterval);
  game.update((state) => ({
    ...state,
    companySelected: true,
    showCompanySwitchModal: false,
    waitingForNextJob: false,
    breakTimer: 0,
  }));
  orderList.set(queueNFixedOrders(ordersShown, selected.id));
  updateHourlyEarned();
  logSystemEvent({
    actionType: "company_switch",
    previousCompanyId: previous ? previous.id : null,
    newCompanyId: selected.id,
  });
};

export const resetEarningsState = () => {
  perJobTotal = 0;
  hourlyTotal = 0;
  hourlyAccumulated = 0;
  hourlySessionStart = null;
  hourlyRateActive = 0;
  lastLoggedHourly = 0;
  earned.set(0);
};

export const finalizeCompanySession = () => {
  finalizeHourlySession();
  updateHourlyEarned();
};
