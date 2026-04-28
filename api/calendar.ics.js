function toIsoDate(value) {
  return String(value).split("T")[0];
}

function isoToICal(dateStr) {
  return dateStr.replace(/-/g, "");
}

module.exports = async (req, res) => {
  try {
    const response = await fetch(process.env.GOOGLE_SCRIPT_URL);
    const data = await response.json();

    const events = data
      .filter(b => b.status === "confirmed")
      .map(b => {
        const start = isoToICal(toIsoDate(b.arrival));
        const end = isoToICal(toIsoDate(b.departure));

        return `
BEGIN:VEVENT
UID:${b.booking_id}@newworldapartment
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z
DTSTART;VALUE=DATE:${start}
DTEND;VALUE=DATE:${end}
SUMMARY:Blocked - New World Apartment
END:VEVENT`;
      })
      .join("");

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//New World Apartment//Booking Calendar//EN
CALSCALE:GREGORIAN
${events}
END:VCALENDAR`;

    res.setHeader("Content-Type", "text/calendar");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(ics);

  } catch (error) {
    res.status(500).send("Calendar error");
  }
};
