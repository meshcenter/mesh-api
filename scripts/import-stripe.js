require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const { performQuery } = require("./db.js");

importStripe();

async function importStripe() {
  const customers = await getCustomers();
  const customersById = {};
  for (customer of customers) {
    customersById[customer.id] = customer;
    await setStripeId(customer.email, customer.id);
  }

  const subscriptions = await getSubscriptions();
  const validSubs = subscriptions.filter((s) =>
    ["active", "trialing"].includes(s.status)
  );

  for (sub of validSubs) {
    const customer = customersById[sub.customer];
    if (!customer) {
      console.log("missing customer", sub);
    } else {
      await setMemberAsDonor(customer.email);
      // console.log(customer.email);
    }
  }
}

async function getSubscriptions() {
  const allSubscriptions = [];
  let hasMore = true;
  let startingAfter = null;
  while (hasMore) {
    console.log("Fetching subscriptions...");
    const params = {
      limit: 100,
    };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }
    const subscriptions = await stripe.subscriptions.list(params);
    allSubscriptions.push(...subscriptions.data);
    hasMore = subscriptions.has_more;
    startingAfter = subscriptions.data[subscriptions.data.length - 1].id;
  }
  return allSubscriptions;
}

async function getCustomers() {
  const allCustomers = [];
  let hasMore = true;
  let startingAfter = null;
  while (hasMore) {
    console.log("Fetching customers...");
    const params = {
      limit: 100,
    };
    if (startingAfter) {
      params.starting_after = startingAfter;
    }
    const customers = await stripe.customers.list(params);
    allCustomers.push(...customers.data);
    hasMore = customers.has_more;
    startingAfter = customers.data[customers.data.length - 1].id;
  }
  return allCustomers;
}

async function setStripeId(email, id) {
  await performQuery(
    "UPDATE members SET stripe_customer_id = $2 WHERE email = $1",
    [email, id]
  );
}

async function setMemberAsDonor(email) {
  await performQuery("UPDATE members SET donor = true WHERE email = $1", [
    email,
  ]);
}
