const mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "82793Wiki!",
  database: "typeRager"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

exports.con = con;