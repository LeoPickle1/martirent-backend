const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const emailjs = require("@emailjs/nodejs");
const fs = require("fs");
const webpush = require("web-push");

const app = express();

app.use(cors());
app.use(express.json());

const SERVICE_ID = "service_se557qo";
const TEMPLATE_ID = "template_ewxeb9s";
const PUBLIC_KEY = "OjiM96plxa6axVPRc";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:martirent2026@gmail.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.log("Missing VAPID keys. Push notifications will not work yet.");
}

const reminderDays = [365, 30, 7];

let maintenance = [];
let contacts = [];
let sentEmails = new Set();
let sentPushes = new Set();
let pushSubscriptions = [];

if (fs.existsSync("sentEmails.json")) {
  sentEmails = new Set(JSON.parse(fs.readFileSync("sentEmails.json", "utf8")));
}

if (fs.existsSync("sentPushes.json")) {
  sentPushes = new Set(JSON.parse(fs.readFileSync("sentPushes.json", "utf8")));
}

if (fs.existsSync("pushSubscriptions.json")) {
  pushSubscriptions = JSON.parse(fs.readFileSync("pushSubscriptions.json", "utf8"));
}

const saveJson = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + Number(years));
  return d.toISOString().split("T")[0];
};

const getNextDue = (item) => {
  if (item.nextDue) return item.nextDue;
  return addYears(item.lastDone, item.intervalYears);
};

const daysUntil = (date) => {
  const today = new Date();
  const target = new Date(date);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
};

const sendReminderEmail = async (item, days) => {
  await emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_email: "martirent2026@gmail.com",
      property: item.property,
      maintenance: item.type,
      company: item.company,
      due_date: item.nextDue,
      days_remaining: days,
    },
    { publicKey: PUBLIC_KEY }
  );
};

const sendPushToAll = async (title, body) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.log("Push skipped. Missing VAPID keys.");
    return;
  }

  const payload = JSON.stringify({
    title,
    body,
    url: "/",
  });

  const failedEndpoints = [];

  for (const subscription of pushSubscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
      console.log("Push sent");
    } catch (error) {
      console.error("Push failed:", error.statusCode || error.message);

      if (error.statusCode === 404 || error.statusCode === 410) {
        failedEndpoints.push(subscription.endpoint);
      }
    }
  }

  if (failedEndpoints.length > 0) {
    pushSubscriptions = pushSubscriptions.filter(
      (sub) => !failedEndpoints.includes(sub.endpoint)
    );

    saveJson("pushSubscriptions.json", pushSubscriptions);
  }
};

const checkMaintenance = async () => {
  console.log("Checking maintenance reminders...");

  for (const item of maintenance) {
    const nextDue = getNextDue(item);
    const days = daysUntil(nextDue);

    if (!reminderDays.includes(days) && days >= 0) continue;

    const itemWithDate = { ...item, nextDue };

    const emailId = `${item.property}-${item.type}-${nextDue}-${days}-email`;
    const pushId = `${item.property}-${item.type}-${nextDue}-${days}-push`;

    if (!sentEmails.has(emailId) && reminderDays.includes(days)) {
      try {
        await sendReminderEmail(itemWithDate, days);
        sentEmails.add(emailId);
        saveJson("sentEmails.json", [...sentEmails]);
        console.log("Email sent:", emailId);
      } catch (error) {
        console.error("Email failed:", error);
      }
    }

    if (!sentPushes.has(pushId)) {
      try {
        const title =
          days < 0
            ? "🚨 Maintenance overdue"
            : "🔧 Maintenance reminder";

        const body =
          days < 0
            ? `${item.property}: ${item.type} is ${Math.abs(days)} days overdue.`
            : `${item.property}: ${item.type} is due in ${days} days.`;

        await sendPushToAll(title, body);

        sentPushes.add(pushId);
        saveJson("sentPushes.json", [...sentPushes]);

        console.log("Push reminder sent:", pushId);
      } catch (error) {
        console.error("Push reminder failed:", error);
      }
    }
  }
};

app.get("/", (req, res) => {
  res.send("MartiRent Backend Running");
});

app.get("/vapid-public-key", (req, res) => {
  res.json({
    publicKey: VAPID_PUBLIC_KEY,
  });
});

app.post("/subscribe", (req, res) => {
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({
      success: false,
      error: "Invalid subscription",
    });
  }

  const alreadySaved = pushSubscriptions.some(
    (sub) => sub.endpoint === subscription.endpoint
  );

  if (!alreadySaved) {
    pushSubscriptions.push(subscription);
    saveJson("pushSubscriptions.json", pushSubscriptions);
  }

  res.json({
    success: true,
    subscriptions: pushSubscriptions.length,
  });
});

app.get("/test-push", async (req, res) => {
  try {
    await sendPushToAll(
      "✅ MartiRent notifications work",
      "Your phone can now receive MartiRent reminders."
    );

    res.send("Test push sent");
  } catch (error) {
    console.error(error);
    res.status(500).send("Test push failed");
  }
});

app.post("/maintenance", (req, res) => {
  maintenance = req.body;

  console.log("Maintenance data updated:", maintenance.length);

  res.json({
    success: true,
    count: maintenance.length,
  });
});

app.get("/maintenance", (req, res) => {
  res.json(maintenance);
});
app.get("/contacts", (req, res) => {
  res.json(contacts);
});

app.post("/contacts", (req, res) => {
  contacts = req.body;
  res.json({ success: true });
});
app.get("/test-email", async (req, res) => {
  try {
    await sendReminderEmail(
      {
        property: "Grenchen",
        type: "Chimney Sweep",
        company: "Felix Weber",
        nextDue: "2027-10-07",
      },
      30
    );

    res.send("Test email sent");
  } catch (error) {
    console.error(error);
    res.status(500).send("Email failed");
  }
});

app.get("/run-check", async (req, res) => {
  try {
    await checkMaintenance();
    res.send("Reminder check completed");
  } catch (error) {
    console.error(error);
    res.status(500).send("Reminder check failed");
  }
});

cron.schedule("0 8 * * *", checkMaintenance, {
  timezone: "America/Vancouver",
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});