let express = require("express");
let router = express.Router();
const controller = require("../controllers/controller");
const auth = require("../middleware/auth");
var omise = require("omise")({
  publicKey: "pkey_test_5po2mkzsky7484ta8n0",
  secretKey: "skey_test_5po2mluair6jdcygy04",
});

//ยังไม่มี token
router.put("/register", controller.register);
router.post("/verify", controller.verify);
router.post("/verify/email", controller.verify_email);
router.post("/login", controller.login);

//มี token
router.get("/index", auth.verifyToken, controller.index);
router.get("/profile", auth.verifyToken, controller.profile);
router.post("/editprofile", auth.verifyToken, controller.editprofile);
router.get("/buytoken", auth.verifyToken, controller.buytoken);
router.get("/transaction", auth.verifyToken, controller.transaction);

router.put("/cover_img/add", auth.verifyToken, controller.add_cover_img);
router.put("/cover_img/update", auth.verifyToken, controller.update_cover_img);
router.put("/profile/update", auth.verifyToken, controller.update_profile);
router.put("/profile_img/update", auth.verifyToken, controller.update_profile_img);
router.post("/bank/add", auth.verifyToken, controller.add_bank);
router.put("/bank/update", auth.verifyToken, controller.update_bank);
router.delete("/delete_account", auth.verifyToken, controller.delete_account);
router.put("/token/update", controller.update_token);
router.post("/chat", auth.verifyToken, controller.chat);
router.get("/testinput/:id", controller.testinput);
// router.get("/testinput", controller.testinput);

//admin
router.get("/test", auth.verifyToken, auth.adminOnly, controller.test);
router.get("/packagetoken", auth.verifyToken, auth.adminOnly, controller.package_token);
router.post("/packagetoken/add", auth.verifyToken, auth.adminOnly, controller.add_package_token);
router.put("/packagetoken/update", auth.verifyToken, auth.adminOnly, controller.update_package_token);
router.put("/packagetoken/delete", auth.verifyToken, auth.adminOnly, controller.delete_package_token);

router.post("/omiseAPI", async (req, res, next) => {
  const { email, name, amount, token } = req.body;
  try {
    const customer = await omise.customers.create({
      email,
      description: name,
      card: token,
    });

    const charge = await omise.charges.create({
      amount: amount,
      currency: "thb",
      customer: customer.id,
    });
    res.json({ amount: charge.amount, status: charge.status });
  } catch (error) {
    console.log(error);
  }
  next();
});

module.exports = router;
