const mysql = require('mysql');
const db = require('./db.json');

var con = mysql.createConnection({
  host: db.host,
  user: db.user,
  password: db.password,
  database: db.database
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

exports.con = con;