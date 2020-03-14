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
		con.query("SELECT * FROM users", (err, result) => {
			if (err) throw err;
			result.map( (user) => {
				// For each user check their current best race on TR
				axios.get(TR_PROFILE + user.username)
				.then( response => {
					const $ = cheerio.load(response.data);

					let currentBest = $(":contains('Best Race') + td").text(); // current best from TR

					currentBest = parseInt(currentBest.trim());

					// If the current best is higher than the stored value the user has a PR
					if (currentBest > user.bestRace) {
						con.query(`UPDATE users SET bestRace=? WHERE discordUser=?`, [currentBest, user.discordUser], (err) => {
							if (err) throw err;
							let discordUser = bot.users.find( u => u.username == user.discordUser);
							// If the PR was the server best then its a server PR, otherwise just a personal PR
							
							if (result.some( u => { return u.bestRace > currentBest }))  {
								channel.send(`${discordUser} Hit a new PR! \n${currentBest} WPM`);
							} else {
								channel.send(`New Server PR! \n${currentBest} WPM \nSet by: ${discordUser}`);
							}
						});	
					}
				})		
			});
		});	
	}, 5000);
});
