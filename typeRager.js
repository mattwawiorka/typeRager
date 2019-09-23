const Discord = require('discord.js');
const request = require('request');
const cheerio = require('cheerio');
const mysql = require('mysql');
const db = require('./db.js');
const auth = require('./auth.json');

const bot = new Discord.Client();
const token=auth.token;
bot.login(token);

var con = db.con;

const trDataURL='https://data.typeracer.com/users?id=tr:';
const trProfileURL='https://data.typeracer.com/pit/profile?user=';

// Initialize Discord Bot
bot.on('ready', () =>{
	console.log('typeRager is online!');
})

// Get Player Stats
bot.on('message', msg=>{
	if(msg.content.startsWith('!wpm') || msg.content.startsWith('!WPM') || msg.content.startsWith('!Wpm')) {
		var user = msg.content.slice(4, msg.content.length);
		
		user = user.split("@")[1].split(">")[0];
	
		user = bot.users.get(user).username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", function (err, result) {
			if (err) throw err;
			user = result[0].username;
		});
		
		request({
			url: trProfileURL+user
		}, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				
				const $ = cheerio.load(body);
				
				var userStats = $('#profileWpmRounded').text();
				
				userStats = userStats.trim();
				
				msg.channel.send(user + "\nWPM: " + userStats);
				
			}
		})
		
	}
	
})

