module.exports = async (req, res) => {
  try {
    const response = await fetch(process.env.GOOGLE_SCRIPT_URL);
    const data = await response.json();

    const booked = data
      .filter(b => b.status === "confirmed")
      .map(b => ({
        start: b.arrival,
        end: b.departure
      }));

    res.status(200).json(booked);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
