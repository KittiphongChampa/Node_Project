let express = require("express");
let router = express.Router();
const controller = require("../controllers/controller");
const auth = require("../middleware/auth");
var omise = require("omise")({
  publicKey: "pkey_test_5po2mkzsky7484ta8n0",
  secretKey: "skey_test_5po2mluair6jdcygy04",
});

//Test
router.get("/test", auth.verifyToken, auth.adminOnly, controller.test);
router.post("/testlogin", controller.testlogin);
router.get("/testfinddelete", controller.testfind_delete);
//ยังไม่มี token
router.post("/register", controller.register);
router.post("/verify", controller.verify);
router.post("/verify/email", controller.verify_email);
router.post("/login", controller.login);
router.post("/forgot-password", controller.forgotPassword);
router.post("/check_otp", controller.check_otp); 
router.post("/reset-password", controller.resetPassword);
//มี token
router.get("/index", auth.verifyToken, controller.index);
router.get("/profile", auth.verifyToken, controller.profile);
router.post("/editprofile", auth.verifyToken, controller.editprofile);
router.get("/buytoken", auth.verifyToken, controller.buytoken);
router.get("/transaction", auth.verifyToken, controller.transaction);

router.put("/cover_img/add", auth.verifyToken, controller.add_cover_img);
router.put("/cover_img/update", auth.verifyToken, controller.update_cover_img);
router.patch("/profile/update", auth.verifyToken, controller.update_profile);
router.put("/profile_img/update", auth.verifyToken, controller.update_profile_img);
router.post("/bank/add", auth.verifyToken, controller.add_bank);
router.patch("/bank/update", auth.verifyToken, controller.update_bank);
router.put("/delete_account", auth.verifyToken, controller.delete_account);
router.put("/token/update", controller.update_token);
router.post("/chat", auth.verifyToken, controller.chat);
router.get("/testinput/:id", controller.testinput);
// router.get("/testinput", controller.testinput);

//admin
router.get("/packagetoken", auth.verifyToken, auth.adminOnly, controller.package_token);
router.get("/alluser", auth.verifyToken, auth.adminOnly, controller.alluser);
router.get("/profile/:id", auth.verifyToken, controller.viewProfile);
router.post("/packagetoken/add", controller.add_package_token);
router.patch("/packagetoken/update/:id", controller.update_package_token);
router.put("/packagetoken/delete/:id", controller.delete_package_token);
router.put("/alluser/delete/:id", controller.delete_User);
router.post("/alluser/transferCoins", controller.transferCoins);

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
