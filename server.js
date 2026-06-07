const express = require("express");
const cron = require("node-cron");
const emailjs = require("@emailjs/nodejs");

const app = express();

const SERVICE_ID = "service_se557qo";
const TEMPLATE_ID = "template_ewxeb9s";
const PUBLIC_KEY = "OjiM96plxa6axVPRc";

const reminderDays = [365, 30, 7];

const maintenance = [
  {
    property: "Grenchen",
    type: "Chimney Sweep",
    company: "Felix Weber",
    nextDue: "2027-10-07",
  },
];

const sentEmails = new Set();

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
    const days = daysUntil(item.nextDue);

    if (!reminderDays.includes(days)) continue;

    const emailId = `${item.property}-${item.type}-${item.nextDue}-${days}`;

    if (sentEmails.has(emailId)) continue;

    try {
      await sendReminderEmail(item, days);
      sentEmails.add(emailId);
      console.log("Email sent:", emailId);
    } catch (error) {
      console.error("Email failed:", error);
    }
  }
};

app.get("/", (req, res) => {
  res.send("MartiRent Backend Running");
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

cron.schedule("0 8 * * *", checkMaintenance, {
  timezone: "America/Vancouver",
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});