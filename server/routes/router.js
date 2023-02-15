let express = require("express");
let router = express.Router();
const controller = require("../controllers/controller");
var omise = require("omise")({
  publicKey: "pkey_test_5po2mkzsky7484ta8n0",
  secretKey: "skey_test_5po2mluair6jdcygy04",
});

router.post("/test", controller.test);
router.put("/register", controller.register);
router.post("/verify", controller.verify);
router.post("/verify_email", controller.verify_email);
router.post("/login", controller.login);
router.get("/index", controller.index);
router.get("/profile", controller.profile);
router.put("/addcover_img", controller.addcover_img);
router.put("/updatecover_img", controller.updatecover_img);
router.post("/editprofile", controller.editprofile);
router.put("/updateprofile", controller.updateprofile);
router.put("/updateprofile_img", controller.updateprofile_img);
router.post("/addbank", controller.addbank);
router.put("/updatebank", controller.updatebank);
router.delete("/delete_account", controller.delete_account);
router.get("/buytoken", controller.buytoken);
router.put("/updatetoken", controller.updatetoken);

router.post("/testinput", controller.testinput);

router.post("/chat", controller.chat);

router.post("/addtoken", async (req, res, next) => {
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
    // res.send({
    //   amount: charge.amount,
    //   status: charge.status,
    // });
  } catch (error) {
    console.log(error);
  }
  next();
});

module.exports = router;
