const { Router } = require("express");

const router = new Router();

var usuario = "";

router.get("/", (req, res) => {
  res.render("login");
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (!err) res.render("logout", { usuario });
    else res.send({ status: "Logout error", body: err });
  });
});
router.get("/api", (req, res) => {
  console.log(req.session.user);
  if (req.session.user) {
    res.render("index", { usuario: req.session.user });
  } else return res.redirect("/");
});

router.post("/api", (req, res) => {
  req.session.user = req.body.name;
  usuario = req.session.user;
  res.redirect("/api");
});

module.exports = router;
