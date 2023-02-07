let express = require("express");
let app = express();
const cors = require("cors");
const Router = require('./routes/router')
const  bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs');
const fileUpload  = require('express-fileupload');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(
    express.urlencoded({
        extended: true,
    })
);
app.use(
    fileUpload()
);

app.use(Router)

//set port
app.listen(3333, function () {
    console.log("Node app is running on port 3333");
});

module.exports = root_dir = __dirname+"/public/"
module.exports = app;