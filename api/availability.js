function parseICalEvents(ics) {
  const events = [];
  const blocks = ics.split("BEGIN:VEVENT");

  for (const block of blocks) {
    const startMatch = block.match(/DTSTART(?:;VALUE=DATE)?:(\d{8})/);
    const endMatch = block.match(/DTEND(?:;VALUE=DATE)?:(\d{8})/);

    if (startMatch && endMatch) {
      events.push({
        start: startMatch[1],
        end: endMatch[1]
      });
    }
  }

  return events;
}

export default async function handler(req, res) {
  try {
    const airbnbUrl = process.env.AIRBNB_ICAL_URL;
    const bookingUrl = process.env.BOOKING_ICAL_URL;

    const [airbnbText, bookingText] = await Promise.all([
      fetch(airbnbUrl).then(r => r.text()),
      fetch(bookingUrl).then(r => r.text())
    ]);

    const events = [
      ...parseICalEvents(airbnbText),
      ...parseICalEvents(bookingText)
    ];

    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({ error: "Availability could not be loaded" });
  }
}
