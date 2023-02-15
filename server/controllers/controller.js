let mysql = require("mysql");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
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

const algorithm = "aes-256-ctr";
const password = "d6F3Efeq";
function encrypt(urs_token) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    algorithm,
    crypto.createHash("sha256").update(password).digest(),
    iv
  );
  let encrypted = cipher.update(urs_token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}
function decrypt(text) {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encrypted = parts.join(":");
  const decipher = crypto.createDecipheriv(
    algorithm,
    crypto.createHash("sha256").update(password).digest(),
    iv
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

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
    "SELECT * FROM users WHERE urs_email = ?",
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
      "INSERT INTO users (urs_email) VALUES (?)",
      [req.body.email],
      function (error, results) {
        if (error) {
          console.log("เข้า error");
          return res.json({ status: "error", message: "เกิดข้อผืดพลาด" });
        } else {
          dbConn.query(
            "SELECT * FROM users WHERE urs_email=?",
            [req.body.email],
            function (error, users) {
              if (results) {
                var token = jwt.sign(
                  { email: users[0].urs_email, userId: users[0].id },
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
  const sum_token = 0;
  const urs_token = sum_token.toString();
  const urs_token_encrypted = encrypt(urs_token);

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
        "UPDATE users SET urs_password=?, urs_name=?, urs_token=?, urs_profile_img =? WHERE id = ? ",
        [hash, req.body.username, urs_token_encrypted, profile, decoded.userId],
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
    "SELECT * FROM users WHERE urs_email=?",
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
        users[0].urs_password,
        function (error, islogin) {
          if (islogin) {
            var token = jwt.sign(
              { email: users[0].urs_email, userId: users[0].id },
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
      function (error, users) {
        const urs_token = decrypt(users[0].urs_token);
        return res.json({ status: "ok", users, urs_token });
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

exports.addcover_img = (req, res) => {
  try {
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.userId],
      function (error, result) {
        if (result) {
          var file_path =
            __dirname.split("controllers")[0] +
            "/public/images_cover/" +
            randomstring.generate(50) +
            ".jpg";
          file.mv(file_path);
          const image = file_path.split("/public")[1];
          const cover = `${req.protocol}://${req.get("host")}${image}`;
          dbConn.query(
            "UPDATE users SET usr_cover_img = ? WHERE id = ?",
            [cover, decoded.userId],
            function (error, result) {
              if (error) {
                console.log("1");
                return res.json({ status: "error", message: "เข้า error" });
              } else {
                return res.json({
                  status: "ok",
                  message: "update success",
                });
              }
            }
          );
        }
      }
    );
  } catch (error) {
    console.log("2");
    return res.json({ status: "error", message: error.message });
  }
};

exports.updatecover_img = (req, res) => {
  try {
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.userId],
      function (error, result) {
        const new_cover = result[0].usr_cover_img.split("images_cover/")[1];
        var file_path =
          __dirname.split("controllers")[0] +
          "/public/images_cover/" +
          new_cover;
        file.mv(file_path);
        const image = file_path.split("/public")[1];
        const cover = `${req.protocol}://${req.get("host")}${image}`;
        dbConn.query(
          "UPDATE users SET usr_cover_img = ? WHERE id = ?",
          [cover, decoded.userId],
          function (error, result) {
            if (error) {
              console.log("1");
              return res.json({ status: "error", message: "เข้า error" });
            } else {
              return res.json({
                status: "ok",
                message: "update success",
              });
            }
          }
        );
      }
    );
  } catch (error) {
    console.log("2");
    return res.json({ status: "error", message: error.message });
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
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.userId],
      function (error, result) {
        if (result[0].urs_profile_img === "") {
          var filename_random =
            __dirname.split("controllers")[0] +
            "/public/images/" +
            randomstring.generate(50) +
            ".jpg";
          file.mv(filename_random);
          const image = filename_random.split("/public")[1];
          const profile = `${req.protocol}://${req.get("host")}${image}`;
          dbConn.query(
            "UPDATE users SET urs_profile_img =? WHERE id = ? ",
            [profile, decoded.userId],
            function (error, results) {
              if (error) {
                return res.json({ status: "error", message: error.message });
              } else {
                return res.json({
                  status: "ok",
                  message: "add profile success",
                });
              }
            }
          );
        } else {
          const new_profile = result[0].urs_profile_img.split("images/")[1];
          var file_path =
            __dirname.split("controllers")[0] + "/public/images/" + new_profile;
          file.mv(file_path);
          return res.json({ status: "ok", message: "update success" });
        }

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
      "UPDATE users SET urs_name = ?, urs_bio=? WHERE id = ?",
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
};

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

exports.buytoken = (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [decoded.userId],
      function (error, users) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          dbConn.query(
            "SELECT * FROM package",
            function (error, package_token) {
              // console.log(package_token);
              if (error) {
                return res.json({ status: "error", message: "เข้า error" });
              } else {
                return res.json({ status: "ok", package_token, users });
              }
            }
          );
        }
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};

exports.updatetoken = (req, res) => {
  console.log(req.body);
  try {
    const id = req.body.id;
    const id_transaction = req.body.id_transaction;
    const old_tokens = req.body.urs_token;
    const old_token = decrypt(old_tokens);
    const old_token_int = parseInt(old_token);
    const token = req.body.amount;
    let new_token = token / 100;
    let sum_token = old_token_int + new_token;
    const urs_token = sum_token.toString();
    const urs_token_encrypted = encrypt(urs_token);
    // console.log("เข้า try");
    dbConn.query(
      "UPDATE users SET urs_token = ? WHERE id = ?",
      [urs_token_encrypted, id],
      function (error, result) {
        if (error) {
          console.log("1");
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          dbConn.query(
            "INSERT INTO transaction_history (usr_id, package_id) VALUES (?, ?)",[req.body.id, id_transaction]
          );
          return res.json({
            status: "ok",
            message: "ซื้อเหรียญ สำเร็จ",
            result,
          });
        }
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};

exports.chat = (req, res) => {};

exports.testinput = (req, res) => {
  const algorithm = "aes-256-ctr";
  const password = "d6F3Efeq";
  // console.log(req.body.inputtext);
  const text = req.body.inputtext;

  function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      algorithm,
      crypto.createHash("sha256").update(password).digest(),
      iv
    );
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  }

  function decrypt(text) {
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encrypted = parts.join(":");
    const decipher = crypto.createDecipheriv(
      algorithm,
      crypto.createHash("sha256").update(password).digest(),
      iv
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  const encrypted = encrypt(text);
  console.log("Encrypted text: ", encrypted);
  const decrypted = decrypt(encrypted);
  console.log("Decrypted text: ", decrypted);
};
