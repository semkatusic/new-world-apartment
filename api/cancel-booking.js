module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { booking_id, token } = req.body;

    if (!booking_id || !token) {
      return res.status(400).json({ error: "Missing booking data" });
    }

    const response = await fetch(process.env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        secret: process.env.GOOGLE_SCRIPT_SECRET,
        action: "cancel",
        booking_id,
        cancel_token: token
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Cancellation failed" });
  }
};
