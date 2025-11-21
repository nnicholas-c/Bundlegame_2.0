let default_job = {};
let order_list = [];

let id = 0;
let orderid = 0;
let orderPools = {};
let orderIndices = {};
let activeCompanies = [];

function gaussianRandom(mean, stdDev) {
  // Using the Box-Muller transform to generate a Gaussian-distributed random number
  let u1 = Math.random();
  let u2 = Math.random();
  let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

  // Scale and shift to match the desired mean and standard deviation
  let randomFloat = z0 * stdDev + mean;

  // Round to the nearest integer
  let randomInt = Math.round(randomFloat);

  return randomInt;
}

export function switchJob(orders, stores, companies = []) {
  order_list = orders;
  default_job = stores;
  orderPools = {};
  orderIndices = {};
  activeCompanies = Array.isArray(companies) ? companies : [];
  orderid = 0;

  if (activeCompanies.length > 0) {
    const hasCompanyAssignments = orders.some((order) =>
      Object.prototype.hasOwnProperty.call(order, "companyId"),
    );
    activeCompanies.forEach((company, index) => {
      const companyId = company.id;
      if (!companyId) {
        return;
      }
      let pool;
      if (hasCompanyAssignments) {
        pool = orders
          .filter((order) => order.companyId === companyId)
          .map((order) => ({
            ...order,
            companyId,
            payout: order.payout ?? order.earnings ?? 0,
          }));
      } else {
        pool = orders
          .filter(
            (_, orderIndex) => orderIndex % activeCompanies.length === index,
          )
          .map((order) => ({
            ...order,
            companyId,
            payout: order.payout ?? order.earnings ?? 0,
          }));
      }
      if (pool.length > 0) {
        orderPools[companyId] = pool;
        orderIndices[companyId] = 0;
      }
    });
  }
}

// TODO add way to pull from different JSON here
export function queueNFixedOrders(n, companyId = null) {
  console.log("queuing " + n + " orders");

  if (companyId && orderPools[companyId] && orderPools[companyId].length > 0) {
    const pool = orderPools[companyId];
    const results = [];
    for (let i = 0; i < n; i++) {
      const pointer = orderIndices[companyId] % pool.length;
      const baseOrder = pool[pointer];
      orderIndices[companyId] = pointer + 1;
      results.push({ ...baseOrder });
    }
    return results;
  }

  const next_orders = [];
  for (let i = 0; i < n; i++) {
    if (!order_list[orderid]) {
      orderid = 0;
    }
    const order = order_list[orderid];
    if (!order) {
      break;
    }
    next_orders.push({ ...order });
    orderid += 1;
  }
  return next_orders;
}

/* Returns the configuration for a store */
export function storeConfig(store) {
  let r = "";
  default_job["stores"].forEach((e) => {
    if (e["store"] === store) {
      r = e;
    }
  });
  return r;
}

export function getDistances(location) {
  return default_job["distances"][location];
}
