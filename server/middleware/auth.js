let jwt = require("jsonwebtoken");
const secret_token = "mysecret_id_login";
let mysql = require("mysql");

let dbConn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ProjectDB",
});
dbConn.connect();
// const config = process.env;

exports.verifyToken = (req, res, next) => {
  const token =
    req.body.token ||
    req.query.token ||
    req.headers["x-access-token"] ||
    req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(403).json({ message: "กรุณาเข้าสู่ระบบ" });
  }
  try {
    let decoded = jwt.verify(token, secret_token);
    const user = decoded;
    req.user = user;
    next();
  } catch {
    return res.status(401).send("Invalid Token");
  }
};

exports.adminOnly = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    let decoded = jwt.verify(token, secret_token);
    dbConn.query(
      "SELECT * FROM users WHERE id=?",
      [decoded.userId],
      function (error, result) {
        if (result[0].id !== decoded.userId) {
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
        // const user = decoded;
        // req.user = user;
        next();
      }
    );
  } catch {
    return res.status(401).send("Invalid Token");
  }
};
