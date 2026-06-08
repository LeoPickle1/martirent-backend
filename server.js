const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const emailjs = require("@emailjs/nodejs");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const SERVICE_ID = "service_se557qo";
const TEMPLATE_ID = "template_ewxeb9s";
const PUBLIC_KEY = "OjiM96plxa6axVPRc";

const reminderDays = [365, 30, 7];

let maintenance = [
  {
    property: "Grenchen",
    type: "Chimney Sweep",
    company: "Felix Weber",
    nextDue: "2027-10-07",
  },
];

let sentEmails = new Set();

if (fs.existsSync("sentEmails.json")) {
  sentEmails = new Set(JSON.parse(fs.readFileSync("sentEmails.json", "utf8")));
}

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

const checkMaintenance = async () => {
  console.log("Checking maintenance reminders...");

  for (const item of maintenance) {
    const nextDue = getNextDue(item);
    const days = daysUntil(nextDue);

    if (!reminderDays.includes(days)) continue;

    const emailId = `${item.property}-${item.type}-${nextDue}-${days}`;

    if (sentEmails.has(emailId)) continue;

    try {
      await sendReminderEmail({ ...item, nextDue }, days);
      sentEmails.add(emailId);

      fs.writeFileSync(
        "sentEmails.json",
        JSON.stringify([...sentEmails], null, 2)
      );

      console.log("Email sent:", emailId);
    } catch (error) {
      console.error("Email failed:", error);
    }
  }
};

app.get("/", (req, res) => {
  res.send("MartiRent Backend Running");
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