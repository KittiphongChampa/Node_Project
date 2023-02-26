
let mysql = require("mysql");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const saltRounds = 10;
let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id_login";
const randomstring = require("randomstring");
const fs = require("fs");
const nodemailer = require("nodemailer");

let dbConn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ProjectDB",
});
dbConn.connect();

let otp = 0;

let date = new Date();
let options = { timeZone: 'Asia/Bangkok' };
let bangkokTime = date.toLocaleString('en-US', options);

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
  try {
    const userId = req.user.userId;
    // console.log(userId);
    const role = req.user.role;
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [userId],
      function (error, result) {
        if (result[0].id !== userId) {
          return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
        }
        if (result[0].urs_type === undefined || result[0].urs_type !== 3) {
          console.log("เข้า no_access");
          return res.json({
            status: "no_access",
            message: "ไม่มีสิทธิเข้าถึง",
          });
        }
        if (error) {
          console.log("เข้า error");
          return res.json({ status: "error", message: error.message });
        }
        return res.json({ status: "ok", message: "isAdmin", result });
      }
    );
  } catch {
    console.log("เข้า catch");
    return res.json({ status: "error", message: error.message });
  }
};

exports.testlogin = (req, res) => {
  dbConn.query(
    "SELECT * FROM users WHERE urs_email=?",
    [req.body.email],
    function (error, users) {
      if (users[0].deleted_at !== null){
        return res.json({ status: "hasDelete", message: "User has deleted"})
      }
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
              {
                email: users[0].urs_email,
                userId: users[0].id,
                role: users[0].urs_type,
              },
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
}

exports.testfind_delete = (req, res) => {
  dbConn.query(
    "SELECT * FROM users",
    function (error, results) {
      console.log(results);
      console.log(results[2].deleted_at);
      res.json(results[2].deleted_at)
    }
  );
}

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
  const email = req.body.email;
  let OTP = parseInt(req.body.otp);
  if (OTP === otp) {
    // dbConn.query(
    //   "INSERT INTO users (urs_email) VALUES (?)",
    //   [email],
    //   function (error, results) {
    //     if (error) {
    //       console.log("เข้า error");
    //       return res.json({ status: "error", message: "เกิดข้อผิดพลาด" });
    //     } else {
    dbConn.query(
      "SELECT * FROM users WHERE urs_email=?",
      [email],
      function (error, users) {
        if (users) {
          // var token = jwt.sign(
          //   {
          //     email: users[0].urs_email,
          //     userId: users[0].id,
          //     role: users[0].urs_type,
          //   },
          //   secret_token,
          //   { expiresIn: "1h" }
          // ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 1 ชม
          return res.json({
            status: "ok",
            message: "verify email success",
            // token,
          });
        } else {
          return res.json({
            status: "error",
            message: "verify email failed",
          });
        }
      }
    );
    //     }
    //   }
    // );
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
  const email = req.body.email;
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
      dbConn.query(
        "INSERT INTO users SET urs_email=?, urs_password=?, urs_name=?, urs_token=?, urs_profile_img=?",
        [email, hash, req.body.username, urs_token_encrypted, profile],
        function (error, results) {
          if (error) {
            return res.json({ status: "error", message: error.message });
          } else {
            dbConn.query(
              "SELECT * FROM users WHERE urs_email=?",
              [email],
              function (error, users) {
                if (users) {
                  var token = jwt.sign(
                    {
                      email: users[0].urs_email,
                      userId: users[0].id,
                      role: users[0].urs_type,
                    },
                    secret_token,
                    { expiresIn: "1h" }
                  ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 1 ชม
                  return res.json({
                    status: "ok",
                    message: "Register success",
                    token,
                  });
                } else {
                  return res.json({
                    status: "error",
                    message: "Register failed",
                  });
                }
              }
            );
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
    function (error, users) {
      if (users[0].deleted_at !== null){
        return res.json({ status: "hasDelete", message: "User has deleted"})
      }
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
              {
                email: users[0].urs_email,
                userId: users[0].id,
                role: users[0].urs_type,
              },
              secret_token,
              // { expiresIn: "3h" }
            ); //กำหนดระยะเวลาในการใช้งาน มีอายุ 3 ชม
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
  // console.log(date);
  // console.log(bangkokTime);

  const userId = req.user.userId;
  // const role = req.user.role;
  try {
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [userId],
      function (error, users) {
        if (users[0].id !== userId) {
          return res.json({ status: "error", message: "ไม่พบผู้ใช้" });
        }
        const urs_token = decrypt(users[0].urs_token);
        return res.json({ status: "ok", users, urs_token });
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: err.message });
  }
};

exports.profile = (req, res) => {
  const userId = req.user.userId;
  try {
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [userId],
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

exports.add_cover_img = (req, res) => {
  const userId = req.user.userId;
  try {
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    dbConn.query(
      "SELECT * FROM users WHERE id = ?",
      [userId],
      function (error, results) {
        if (results) {
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
            [cover, userId],
            function (error, result) {
              if (error) {
                console.log("1");
                return res.json({ status: "error", message: "เข้า error" });
              }
              return res.json({
                status: "ok",
                message: "update success",
              });
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

exports.update_cover_img = (req, res) => {
  const userId = req.user.userId;
  try {
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    dbConn.query(
      "SELECT * FROM users WHERE id = ?",
      [userId],
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
          [cover, userId],
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
  const userId = req.user.userId;
  try {
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [userId],
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

exports.update_profile_img = (req, res) => {
  const userId = req.user.userId;
  try {
    if (req.files === null) {
      return res.json({ status: "error", message: "No File Uploaded" });
    }
    const file = req.files.file;
    dbConn.query(
      "SELECT * FROM users WHERE id = ?",
      [userId],
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
            [profile, userId],
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
        //   [profile, userId],
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

exports.update_profile = (req, res) => {
  const userId = req.user.userId;
  const username = req.body.name;
  const bio = req.body.bio;
  try {
    dbConn.query(
      "UPDATE users SET urs_name = ?, urs_bio=? WHERE id = ?",
      [username, bio, userId],
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

exports.add_bank = (req, res) => {
  const userId = req.user.userId;
  const bank_username = req.body.bankuser;
  const bankname = req.body.bankname;
  const banknum = req.body.banknum;
  try {
    dbConn.query(
      "UPDATE users SET urs_bank_name = ?, urs_bank_accname=?, urs_bank_number=? WHERE id = ?",
      [bank_username, bankname, banknum, userId],
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

exports.update_bank = (req, res) => {
  const userId = req.user.userId;
  const bank_username = req.body.bankuser;
  const bankname = req.body.bankname;
  const banknum = req.body.banknum;
  try {
    dbConn.query(
      "UPDATE users SET urs_bank_name = ?, urs_bank_accname=?, urs_bank_number=? WHERE id = ?",
      [bank_username, bankname, banknum, userId],
      function (error, result) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({ status: "ok", message: "update success", result });
        }
      }
    );
  } catch (error) {
    return res.json({ status: "error", message: error.message });
  }
};

exports.delete_account = (req, res) => {
  // const token = req.headers.authorization.split(" ")[1];
  // let decoded = jwt.verify(token, secret_token);
  // console.log(req.body);
  const userId = req.user.userId;
  console.log(userId);
  try {
    dbConn.query(
      "UPDATE users SET deleted_at = ? WHERE id = ?",
      [date, userId],
      function (error, results) {
        if (error) {
          console.log("1");
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          return res.json({
            status: "ok",
            message: "User successfully deleted.",
            results,
          });
        }
      }
    );
  } catch (err) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};

exports.buytoken = (req, res) => {
  const userId = req.user.userId;
  try {
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [userId],
      function (error, users) {
        if (error) {
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          dbConn.query(
            "SELECT * FROM package",
            function (error, package_token) {
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

exports.update_token = (req, res) => {
  console.log(req.body);
  try {
    const id = req.body.id;
    const id_transaction = req.body.id_transaction;
    const old_tokens = req.body.urs_token;
    const old_token = decrypt(old_tokens);
    const old_token_int = parseInt(old_token);
    const token = req.body.amount;
    // let new_token = token / 100;
    let sum_token = old_token_int + token;
    const urs_token = sum_token.toString();
    const urs_token_encrypted = encrypt(urs_token);
    dbConn.query(
      "UPDATE users SET urs_token = ? WHERE id = ?",
      [urs_token_encrypted, id],
      function (error, result) {
        if (error) {
          console.log("1");
          return res.json({ status: "error", message: "เข้า error" });
        } else {
          dbConn.query(
            "INSERT INTO transaction_history (usr_id, package_id) VALUES (?, ?)",
            [req.body.id, id_transaction]
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

exports.transaction = (req, res) => {
  const userId = req.user.userId;
  try {
    dbConn.query(
      "SELECT * FROM transaction_history JOIN users ON transaction_history.usr_id = users.id JOIN package ON transaction_history.package_id = package.id WHERE users.id=?",
      [userId],
      function (error, results) {
        if (results) {
          console.log(results);
          return res.json({ status: "ok", results });
        } else {
          return res.json({ status: "error", message: error });
        }
      }
    );
  } catch (error) {
    return res.json({ status: "error", message: "เข้า catch" });
  }
};

exports.chat = (req, res) => {};

exports.package_token = (req, res) => {
  try {
    dbConn.query("SELECT * FROM package WHERE deleted_at IS NULL", function (error, results) {
      if (results) {
        return res.json({ status: "ok", results });
      } else {
        return res.json({ status: "error", message: error });
      }
    });
  } catch {
    console.log('catch');
    return res.json({ status: "error", message: error.message });
  }
};

exports.add_package_token = (req, res) => {
  const { packageName, coins, price } = req.body;
  try{
    dbConn.query(
      "INSERT INTO package (package, p_price, p_token) VALUES (?, ?, ?)",[packageName, price, coins],
      function(error, results){
        if (results) {
          return res.json({ status: "ok", message: "เพิ่มข้อมูลแพ็คเกจการเติมเงินสำเร็จ",  results})
        }else{
          return res.json({ status: "error", message: error.message });
        }
      }
    );
  }catch{
    return res.json({ status: "error", message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" });
  }
};

exports.update_package_token = (req, res) => {
  const packageId = req.params.id;
  const {packageName, coins, price} = req.body;
  try{
    dbConn.query(
      "UPDATE package SET package = ?, p_price=?, p_token=?  WHERE id = ?", [packageName, price, coins, packageId], 
      function(error, results){
        if (results) {
          return res.json({ status: "ok", message: "แก้ไขข้อมูลแพ็คเกจการเติมเงินสำเร็จ"})
        } else {
          return res.json({ status: "error", message: error });
        }
      }
    )
  }catch{
    return res.json({ status: "error", message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" });
  }
};

exports.delete_package_token = (req, res) => {
  const packageId = req.params.id;
  try{
    dbConn.query(
      "UPDATE package SET deleted_at = ? WHERE id = ?", [date, packageId], 
      function(error, results){
        if (results) {
          return res.json({ status: "ok", message: "ลบแพ็คเกจการเติมเงินสำเร็จ"})
        } else {
          return res.json({ status: "error", message: error });
        }
      }
    )
  }catch{
    return res.json({ status: "error", message: "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง" });
  }
};

exports.testinput = (req, res) => {
  // console.log(req.params.id);
  const test = req.params.id;
  dbConn.query(
    "SELECT * FROM transaction_history JOIN users ON transaction_history.usr_id = users.id JOIN package ON transaction_history.package_id = package.id WHERE users.id=?",
    [test],
    function (error, results) {
      if (error) {
        return res.json({ status: "error", message: "เข้า error" });
      } else {
        console.log(results);
      }
    }
  );
};
