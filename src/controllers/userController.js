async function getMe(req, res) {
  res.json({ user: req.user });
}

module.exports = { getMe };
