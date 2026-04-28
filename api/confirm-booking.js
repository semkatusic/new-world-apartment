const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const m = session.metadata;

    const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        secret: process.env.GOOGLE_SCRIPT_SECRET,
        booking_id: "BKG-" + Date.now(),
        status: "confirmed",
        guest_name: m.guest_name,
        guest_email: m.guest_email,
        arrival: m.arrival,
        departure: m.departure,
        guests: m.guests,
        total: m.total,
        stripe_session_id: session.id,
        language: m.language || "en"
      })
    });

    const text = await response.text();

    res.status(200).json({ success: true, response: text });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
