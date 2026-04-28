const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fetchICal(url) {
  if (!url) return "";
  const res = await fetch(url);
  return await res.text();
}

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

function dateToICal(date) {
  return date.replace(/-/g, "");
}

function isOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function getNightPrice(date) {
  const d = new Date(date + "T12:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDay();

  if (month >= 6 && month <= 8) return 120;
  if (month === 12) return 120;
  if (day === 5 || day === 6) return 95;

  return 89;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { arrival, departure, guests, guest_name, guest_email, language } = req.body;

    if (!arrival || !departure || !guest_name || !guest_email) {
      return res.status(400).json({ error: "Missing booking details" });
    }

    const start = new Date(arrival + "T12:00:00");
    const end = new Date(departure + "T12:00:00");

    if (end <= start) return res.status(400).json({ error: "Invalid dates" });

const blockedRes = await fetch(`${req.headers.origin}/api/booked-dates`);
const blockedDates = await blockedRes.json();

let current = new Date(start);

while (current < end) {
  const iso = current.toISOString().split("T")[0];

  if (blockedDates.includes(iso)) {
    return res.status(400).json({
      error: "Selected dates are not available"
    });
  }

  current.setDate(current.getDate() + 1);
}
    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const requestedArrival = dateToICal(arrival);
const requestedDeparture = dateToICal(departure);

const airbnbICal = await fetchICal(process.env.AIRBNB_ICAL_URL);
const bookingICal = await fetchICal(process.env.BOOKING_ICAL_URL);

const blockedEvents = [
  ...parseICalEvents(airbnbICal),
  ...parseICalEvents(bookingICal)
];

for (const event of blockedEvents) {
  if (isOverlap(requestedArrival, requestedDeparture, event.start, event.end)) {
    return res.status(400).json({
      error: "Selected dates are not available. Please choose another date."
    });
  }
}
    let total = 0;

    if (nights >= 28) {
      total = 1500;
    } else {
      let current = new Date(start);

      for (let i = 0; i < nights; i++) {
        const iso = current.toISOString().split("T")[0];
        total += getNightPrice(iso);
        current.setDate(current.getDate() + 1);
      }

      if (nights >= 7) total = total * 0.85;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: guest_email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "New World Apartment Downtown Zagreb",
              description: `${arrival} to ${departure} · ${nights} night(s) · ${guests} guest(s)`
            },
            unit_amount: Math.round(total * 100)
          },
          quantity: 1
        }
      ],
      metadata: {
        guest_name,
        guest_email,
        arrival,
        departure,
        guests,
        nights,
        language: language || "en",
        total: total.toFixed(2)
      },
      success_url: `${req.headers.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/cancel.html`
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
