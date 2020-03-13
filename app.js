const Discord = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

require('dotenv').config(); // this must run before db connection is established 

const con = require('./db.js').con;

const bot = new Discord.Client();
bot.login(process.env.TOKEN);

module.exports = bot;

TR_PROFILE = 'https://data.typeracer.com/pit/profile?user=';

// Initialize Discord Bot
bot.on('ready', () => {
	console.log('typeRager is online!');
});

const commands = require('./lib/messageHandler');
bot.on('message', msg => commands.handler(msg));

// Begin Reporting New Records
bot.on('ready', () => {
	const channel = bot.channels.find( channel => channel.name == process.env.MAIN_CHANNEL);

	// Check for server and/or user PRs every 30 seconds
	setInterval( () => {
		let best = 0; // best race for this interval
		let newBest = 0; // set this above 0 if a new best is found
		let discordUser; // set this as the new bests user
		
		con.query("SELECT * FROM users", (err, result) => {
			if (err) throw err;
			Promise.all(result.map( (user) => {
				axios.get(TR_PROFILE + user.username)
				.then( response => {
					if (response.statusCode === 200) {
						const $ = cheerio.load(body);

						let currentBest = $(":contains('Best Race') + td").text(); // current best from TR

						currentBest = currentBest.trim();
						
						currentBest = parseInt(currentBest);
						
						// Set the higest race for this interval
						if (currentBest > best) {
							best = currentBest;
						}

						// If the current best is higher than the stored value the user has a PR
						if (currentBest > user.bestRace) {
							newBest = currentBest;
							discordUser = user.discordUser;				
						}
					}
				})		
			}))
			.then(() => {
				// If we have a PR update the database and send a message to the server
				if (newBest > 0) {
					con.query(`UPDATE users SET bestRace=? WHERE discordUser=?`, [newBest, discordUser], (err, result) => {
						if (err) throw err;
						discordUser = bot.users.find( user => user.username == discordUser);
						// If the PR was the server best then its a server PR, otherwise just a personal PR
						if (best === newBest)  {
							channel.send(`New Server PR! \n${newBest} WPM \nSet by: ${discordUser}`);
						} else {
							channel.send(`${discordUser} Hit a new PR! \n${newBest} WPM`);
						}
					});	
				}
			})	
		});	
	}, 30000);
});

