const Discord = require('discord.js');
const request = require('request');
const db = require('./db.js');
const auth = require('./auth.json');

const bot = new Discord.Client();
const token=auth.token;
bot.login(token);

const trDataURL='https://data.typeracer.com/users?id=tr:';

// Initialize Discord Bot
bot.on('ready', () =>{
	console.log('typeRager is online!');
})

// Get Player Stats
bot.on('message', msg=>{
	if(msg.content.startsWith('!wpm') || msg.content.startsWith('!WPM') || msg.content.startsWith('!Wpm')) {
		var user = msg.content.slice(4, msg.content.length);
		user = user.trim();
		request({
			url: trDataURL+user,
			json: true
		}, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				msg.reply(body.tstats.wpm);
			}
		})
		
	}
	
})

