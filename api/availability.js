function parseICalEvents(ics) {
  const events = [];
  const blocks = ics.split("BEGIN:VEVENT");

  for (const block of blocks) {
    const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
    const endMatch = block.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);

    if (startMatch && endMatch) {
      events.push({
        from: toIso(startMatch[1]),
        to: subtractOneDay(toIso(endMatch[1]))
      });
    }
  }

  return events;
}

function toIso(yyyymmdd) {
  return `${yyyymmdd.slice(0,4)}-${yyyymmdd.slice(4,6)}-${yyyymmdd.slice(6,8)}`;
}

function normalizeDate(value) {
  return String(value).split("T")[0];
}

function subtractOneDay(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

module.exports = async (req, res) => {
  try {
    const [airbnbText, bookingText, directBookings] = await Promise.all([
      fetch(process.env.AIRBNB_ICAL_URL).then(r => r.text()),
      fetch(process.env.BOOKING_ICAL_URL).then(r => r.text()),
      fetch(process.env.GOOGLE_SCRIPT_URL).then(r => r.json())
    ]);

    const externalEvents = [
      ...parseICalEvents(airbnbText),
      ...parseICalEvents(bookingText)
    ];

    const directEvents = directBookings
      .filter(b => b.status === "confirmed")
      .map(b => ({
        from: normalizeDate(b.arrival),
        to: subtractOneDay(normalizeDate(b.departure))
      }));

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json([...externalEvents, ...directEvents]);

  } catch (error) {
    res.status(500).json({ error: "Availability could not be loaded" });
  }
};
