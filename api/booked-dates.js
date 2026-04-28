function toIsoDate(value) {
  return String(value).split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function datesBetween(arrival, departure) {
  const dates = [];
  let current = toIsoDate(arrival);
  const end = toIsoDate(departure);

  while (current < end) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

function icalToIso(yyyymmdd) {
  return `${yyyymmdd.slice(0,4)}-${yyyymmdd.slice(4,6)}-${yyyymmdd.slice(6,8)}`;
}

function parseICalBlockedDates(ics) {
  const dates = [];
  const blocks = ics.split("BEGIN:VEVENT");

  for (const block of blocks) {
    const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
    const endMatch = block.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);

    if (startMatch && endMatch) {
      const arrival = icalToIso(startMatch[1]);
      const departure = icalToIso(endMatch[1]);
      dates.push(...datesBetween(arrival, departure));
    }
  }

  return dates;
}

module.exports = async (req, res) => {
  try {
    const [airbnbText, bookingText, directBookings] = await Promise.all([
      fetch(process.env.AIRBNB_ICAL_URL).then(r => r.text()),
      fetch(process.env.BOOKING_ICAL_URL).then(r => r.text()),
      fetch(process.env.GOOGLE_SCRIPT_URL).then(r => r.json())
    ]);

    const externalDates = [
      ...parseICalBlockedDates(airbnbText),
      ...parseICalBlockedDates(bookingText)
    ];

    const directDates = directBookings
      .filter(b => b.status === "confirmed")
      .flatMap(b => datesBetween(b.arrival, b.departure));

    const uniqueDates = [...new Set([...externalDates, ...directDates])];

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(uniqueDates);

  } catch (error) {
    res.status(500).json({ error: "Booked dates could not be loaded" });
  }
};
