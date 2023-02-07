let express = require("express");
let router = express.Router();
const controller = require('../controllers/controller')

router.post("/test", controller.test);
router.put("/register", controller.register);
router.post("/verify", controller.verify);
router.post("/verify_email", controller.verify_email);
router.post("/login", controller.login);
router.post("/index", controller.index);
router.get("/profile", controller.profile);
router.post("/editprofile", controller.editprofile);
router.put("/updateprofile", controller.updateprofile);
router.put("/updateprofile_img", controller.updateprofile_img);
router.post("/addbank", controller.addbank);
router.put("/updatebank", controller.updatebank);
router.delete("/delete_account", controller.delete_account);
router.post("/chat", controller.chat);

module.exports = router;