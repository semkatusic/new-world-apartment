const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getNightPrice(date) {
  const d = new Date(date + "T12:00:00");
  const month = d.getMonth() + 1;
  const day = d.getDay(); // 0 Sun, 5 Fri, 6 Sat

  if (month >= 6 && month <= 8) return 120;
  if (month === 12) return 120;
  if (day === 5 || day === 6) return 95;

  return 89;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { arrival, departure, guests } = req.body;

    if (!arrival || !departure) {
      return res.status(400).json({ error: "Missing dates" });
    }

    const start = new Date(arrival + "T12:00:00");
    const end = new Date(departure + "T12:00:00");

    if (end <= start) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      return res.status(400).json({ error: "Minimum stay is 1 night" });
    }

    if (Number(guests) > 2) {
      return res.status(400).json({ error: "Maximum 2 guests allowed" });
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

      if (nights >= 7) {
        total = total * 0.85;
      }
    }

    total = Math.round(total * 100); // cents

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "New World Apartment Downtown Zagreb",
              description: `${arrival} to ${departure} · ${nights} night(s) · ${guests || 2} guest(s)`
            },
            unit_amount: total
          },
          quantity: 1
        }
      ],
      metadata: {
        arrival,
        departure,
        nights,
        guests: guests || 2
      },
      success_url: `${req.headers.origin}/success.html`,
      cancel_url: `${req.headers.origin}/cancel.html`
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Stripe checkout failed" });
  }
};
