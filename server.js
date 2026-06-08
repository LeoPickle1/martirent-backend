const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const emailjs = require("@emailjs/nodejs");

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
[{"property":"Sempach","type":"SiNa Inspection","company":"Elektro-Team Eich","lastDone":"2024-10-10","intervalYears":"20","warningDays":"365"},{"property":"Langnau","type":"Chimney Sweep","company":"Kaminfeger Hiltbrunner","lastDone":"2025-05-14","intervalYears":1,"warningDays":30},{"property":"Langnau","type":"Tank Revision","company":"Unknown","lastDone":"2026-02-27","intervalYears":10,"warningDays":180},{"property":"Hilterfingen","type":"Floor Heating Flush","company":"Frutiger-Zbinden","lastDone":"2026-06-26","intervalYears":6,"warningDays":180},{"property":"Hilterfingen","type":"Magnet Separator Cleaning","company":"Frutiger-Zbinden","lastDone":"2025-12-05","intervalYears":1,"warningDays":60},{"property":"Aeschlen","type":"Heating Service","company":"Meier-Tobler","lastDone":"2024-12-10","intervalYears":1,"warningDays":60},{"property":"Traube","type":"Chimney Sweep","company":"Fürst Kaminfeger","lastDone":"2024-09-11","intervalYears":1,"warningDays":60},{"property":"Traube","type":"Boiler Descaling","company":"A. Borer Alexander","lastDone":"2025-02-01","intervalYears":5,"warningDays":180},{"property":"Kundmatt","type":"Tree / Garden Maintenance","company":"Nussbaum","lastDone":"2025-03-01","intervalYears":2,"warningDays":90},{"property":"Grenchen","type":"Chimney Sweep","company":"Felix Weber","lastDone":"2024-10-07","intervalYears":1,"warningDays":60},{"property":"Grenchen","type":"Linden Tree Check","company":"Mosimann","lastDone":"2026-02-17","intervalYears":2,"warningDays":180},{"property":"Eich","type":"Heat Pump Service","company":"GT Estermann","lastDone":"2026-04-13","intervalYears":1,"warningDays":60},{"property":"Eich","type":"Boiler Heat Pump Check","company":"GT Estermann","lastDone":"2026-04-13","intervalYears":5,"warningDays":180},{"property":"idk","type":"idk","company":"idk","lastDone":"2000-01-09","intervalYears":"1","warningDays":"2"}]
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
      console.log("Email sent:", emailId);
    } catch (error) {
      console.error("Email failed:", error);
    }
  }
};

app.get("/", (req, res) => {
  res.send("MartiRent Backend Running");
});

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

cron.schedule("0 8 * * *", checkMaintenance, {
  timezone: "America/Vancouver",
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});