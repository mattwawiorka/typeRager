const Discord = require('discord.js');
const request = require('request');
const cheerio = require('cheerio');
const db = require('./db.js');
const auth = require('./auth.json');

const bot = new Discord.Client();
const token=auth.token;
bot.login(token);
module.exports = bot;

var con = db.con;

const trProfileURL='https://data.typeracer.com/pit/profile?user=';

var best, discordUser, currentBest, newBest;

const onMessage = require('./custom_modules/messageHandler');
bot.on('message', msg => onMessage.handler(msg));


// Initialize Discord Bot
bot.on('ready', ()=>{
	console.log('typeRager is online!');
});

// Begin Reporting New Records
bot.on('ready', ()=>{
	
	var channel = bot.channels.find( channel => channel.name == 'general');
	
	var interval = setInterval( function () {
		
		best = 0;
		newBest = 0;
		
		con.query("SELECT * FROM users", (err, result)=>{
			if (err) throw err;
			var wait = new Promise( (resolve,reject) => {
				result.forEach( (element, index, array) => {
				
					request({
						url: trProfileURL+element.username
					}, function (error, response, body) {
						if (!error && response.statusCode === 200) {
							
							const $ = cheerio.load(body);

							currentBest = $(":contains('Best Race') + td").text();

							currentBest = currentBest.trim();
							
							currentBest = parseInt(currentBest);
							
							if (currentBest > best) {
								best = currentBest;
							}

							if (currentBest > element.bestRace) {
								newBest = currentBest;
								discordUser = element.discordUser;				
							}
							
						}
						
					});
					
					setTimeout( () => {if (index == array.length - 1) resolve();}, 5000);
					
				});
			});
			
			wait.then(() => {
				if (newBest > 0) {
					con.query(`UPDATE users SET bestRace=? WHERE discordUser=?`, [newBest, discordUser], function (err, result) {
						if (err) throw err;
						discordUser = bot.users.find( user => user.username == discordUser);
						if (best == newBest)  {
							channel.send(`New Server PR! \n${newBest} WPM \nSet by: ${discordUser}`);
						} else {
							channel.send(`${discordUser} Hit a new PR! \n${newBest} WPM`);
						}
					});	
				}	
			});	 
		});
	}, 30000);
});