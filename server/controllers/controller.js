let mysql = require("mysql");
const bcrypt = require("bcrypt");
const saltRounds = 10;
let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id_login";

const randomstring = require("randomstring");
const fs = require("fs");
const nodemailer = require("nodemailer");

process.env.TZ = "Asia/bangkok";
let dbConn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ProjectDB",
});

dbConn.connect();

exports.test = (req, res) => {
  //   return res.send({ error: true, message: "Test project Web API" });
  let mailOptions = {
    from: "ktpyun@gmail.com",
    to: req.body.email,
    subject: "Email Verification",
    text:
      "<h3>OTP to verify your email is </h3>" +
      "<h1 style='font-weight:bold;'>" +
      otp +
      "</h1>",
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("error", error);
      return res.send({ error: true, message: "Failed" });
    } else {
      console.log("Email sent: " + info.response);
      res.render("otp");
    }
  });
};

let otp = 0;

exports.verify = (req, res) => {
  dbConn.query(
    "SELECT * FROM users WHERE email = ?",
    [req.body.email],
    function (error, result) {
      if (result.length >= 1) {
        return res.json({
          status: "error",
          message: "This user is already in use!",
        });
      } else {
        otp = Math.random();
        otp = otp * 1000000;
        otp = parseInt(otp);

        let transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "ktpyun@gmail.com",
            pass: "uzklexxuegiwcehr",
          },
        });
        let mailOptions = {
          from: "ktpyun@gmail.com",
          to: req.body.email,
          subject: "Email Verification",
          html:
            "<b>OTP to verify your email is </b>" +
            "<h1 style='font-weight:bold;'>" +
            otp +
            "</h1>",
        };
        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log("error", error);
            return res.json({ status: "error", message: "Failed" });
          } else {
            return res.json({ status: "ok", otp });
          }
        });
      }
    }
  );
};

exports.verify_email = (req, res) => {
  let OTP = parseInt(req.body.otp);
  if (OTP === otp) {
    dbConn.query(
      "INSERT INTO users (email) VALUES (?)",
      [req.body.email],
      function (error, results) {
        if (error) {
          console.log("เข้า error");
          return res.json({ status: "error", message: "เกิดข้อผืดพลาด" });
        } else {
          dbConn.query(
            "SELECT * FROM users WHERE email=?",
            [req.body.email],
            function (error, users) {
              if (results) {
                var token = jwt.sign(
                  { email: users[0].email, userId: users[0].id },
                  secret_token,
                  { expiresIn: "1h" }
                ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 1 ชม
                return res.json({
                  status: "ok",
                  message: "verify email success",
                  token,
                });
              } else {
                return res.json({
                  status: "error",
                  message: "verify email failed",
                });
              }
            }
          );
        }
      }
    );
  } else {
    res.json({ status: "error", message: "otp is incorrect" });
  }
};

exports.register = (req, res) => {
  if (req.files === null) {
    return res.json({ status: "error", message: "No File Uploaded" });
  }
  const file = req.files.file;
  var filename_random =
    __dirname.split("controllers")[0] +
    "/public/images/" +
    randomstring.generate(50) +
    ".jpg";
  if (fs.existsSync("filename_random")) {
    filename_random =
      __dirname.split("controllers")[0] +
      "/public/images/" +
      randomstring.generate(60) +
      ".jpg";
    file.mv(filename_random);
  } else {
    file.mv(filename_random);
  }
  const image = filename_random.split("/public")[1];
  const profile = `${req.protocol}://${req.get("host")}${image}`;
  bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
    if (err) {
      console.log("เข้า error 1");
      return res.json({
        status: "error",
        message: "Register failed",
      });
    } else {
      const token = req.headers.authorization.split(" ")[1];
      let decoded = jwt.verify(token, secret_token);
      dbConn.query(
        "UPDATE users SET password=?, username=?, urs_profile_img =? WHERE id = ? ",
        [hash, req.body.username, profile, decoded.userId],
        function (error, results) {
          if (error) {
            return res.json({ status: "error", message: error.message });
          } else {
            return res.json({
              status: "ok",
              message: "Register success",
              results,
              token,
            });
          }
        }
      );
    }
  });
};

exports.login = (req, res) => {
  dbConn.query(
    "SELECT * FROM users WHERE email=?",
    [req.body.email],
    function (error, users, fields) {
      if (error) {
        return res.json({ status: "error", message: error });
      }
      if (users.length == 0) {
        return res.json({ status: "error", message: "no user found" });
      }
      bcrypt.compare(
        req.body.password,
        users[0].password,
        function (error, islogin) {
          if (islogin) {
            var token = jwt.sign(
              { email: users[0].email, userId: users[0].id },
              secret_token,
              { expiresIn: "3h" }
            ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 1 ชม
            return res.json({ status: "ok", message: "login success", token });
          } else {
            return res.json({ status: "error", message: "login failed" });
          }
        }
      );
    }
  );
};

exports.index = (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    // console.log(decoded.userId);
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [decoded.userId],
      function (error, users, fields) {
        // console.log(users[0]);
        return res.json({ status: "ok", users });
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: err.message });
  }
};

exports.profile = (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    // const test = req.params.id;
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [decoded.userId],
      // [test],
      function (error, users) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          // console.log(users);
          return res.json({ status: "ok", users });
        }
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};

exports.editprofile = (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    // const test = req.params.id;
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [decoded.userId],
      // [test],
      function (error, users) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          console.log(users);
          return res.json({ status: "ok", users });
        }
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};

exports.updateprofile_img = (req, res) => {
  try {
    if(req.files === null){
      return res.json({status: "error", message: "No File Uploaded"});
    }
    const file = req.files.file;
    console.log(file);

    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.userId],
      function (error, result) {
        const new_profile = result[0].urs_profile_img .split("images/")[1];
        var file_path = __dirname.split("controllers")[0] + "/public/images/" + new_profile;
        file.mv(file_path);
        return res.json({status: "ok", message: "update success" });
        // const image = file_path.split("/public")[1];
        // const profile = `${req.protocol}://${req.get("host")}${image}`;
        // dbConn.query(
        //   "UPDATE users SET urs_profile_img = ? WHERE id = ?",
        //   [profile, decoded.userId],
        //   function (error, result) {
        //     if (error) {
        //       console.log("1");
        //       return res.json({ status: "error", message: "เข้า error" });
        //     } else {
        //       return res.json({
        //         status: "ok",
        //         message: "update success",
        //       });
        //     }
        //   }
        // );
      }
    );
  } catch (error) {
    console.log("2");
    return res.json({ status: "error", message: error.message });
  }
};

exports.updateprofile = (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "UPDATE users SET username = ?, urs_bio=? WHERE id = ?",
      [req.body.username, req.body.bio, decoded.userId],
      function (error, result) {
        if (error) {
          console.log("1");
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({
            status: "ok",
            message: "update success",
            result,
          });
        }
      }
    );
  } catch (error) {
    console.log("2");
    return res.json({ status: "error", message: error.message });
  }
};

exports.addbank = (req, res) => {
  console.log(req.body);
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "UPDATE users SET urs_bank_name = ?, urs_bank_accname=?, urs_bank_number=? WHERE id = ?",
      [req.body.bankuser, req.body.bankname, req.body.banknum, decoded.userId],
      function (error, result) {
        if (error) {
          console.log("1");
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({ status: "ok", message: "update success", result });
        }
      }
    );
  } catch (error) {
    console.log("2");
    return res.json({ status: "error", message: error.message });
  }
};

exports.updatebank = (req, res) => {
  console.log(req.body);
}

exports.delete_account = (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    // const user_id = req.params.id;
    dbConn.query(
      "DELETE FROM users WHERE id = ?",
      [decoded.userId],
      // [user_id],
      function (error, results) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({
            status: "ok",
            results,
            message: "User successfully deleted.",
          });
        }
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};

exports.chat = (req, res) => {};
