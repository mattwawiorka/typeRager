const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const bot = require('../app');
const con = require('../db.js').con;

TR_PROFILE='https://data.typeracer.com/pit/profile?user=';

TR_RACE = "#dUI > table > tbody > tr:nth-child(2) > td:nth-child(2) > div > div.mainViewport > div > table > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a";
TR_INVITE = ".roomSection table > tbody > tr > td:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a";
TR_EMAIL ='a.gwt-Anchor[href^="mailto:?subject=Race%20me%20on%"]';

exports.handler = (msg) => {
	if (msg.content.startsWith('!wpm<@') || msg.content.startsWith('!Wpm<@') || msg.content.startsWith('!WPM<@') ||
		msg.content.startsWith('!wpm <@') || msg.content.startsWith('!Wpm <@') || msg.content.startsWith('!WPM <@'))
	{
		commands.getPlayerWPM(msg);
	}
	else if (msg.content.startsWith('!best<@') || msg.content.startsWith('!Best<@') || msg.content.startsWith('!BEST<@') ||
		msg.content.startsWith('!best <@') || msg.content.startsWith('!Best <@') || msg.content.startsWith('!BEST <@'))
	{
		commands.getPlayerBest(msg);
	}
	else if (msg.content.startsWith('!wpmall') || msg.content.startsWith('!WpmAll') || msg.content.startsWith('!WPMALL') ||
		msg.content.startsWith('!wpm all') || msg.content.startsWith('!Wpm All') || msg.content.startsWith('!WPM ALL'))
	{
		commands.getServerWPM(msg);
	}
	else if (msg.content.startsWith('!bestall') || msg.content.startsWith('!BestAll') || msg.content.startsWith('!BESTALL') ||
		msg.content.startsWith('!best all') || msg.content.startsWith('!Best All') || msg.content.startsWith('!BEST ALL'))
	{
		commands.getServerBest(msg);
	}
	else if (msg.content.startsWith('!race') || msg.content.startsWith('!Race') || msg.content.startsWith('!RACE') ||
		msg.content.startsWith('!rage') || msg.content.startsWith('!Rage') || msg.content.startsWith('!RAGE'))
	{
		commands.startRace(msg);
	}
	else if (msg.content.startsWith('!add') || msg.content.startsWith('!Add') || msg.content.startsWith('!ADD'))
	{
		commands.addUser(msg);
	}
}

const commands = {
	
	// Get Player WPM
	getPlayerWPM: (msg) => {
		let user = msg.content.slice(4, msg.content.length);
		
		let discordUser = user;
		
		user = user.split("@")[1].split(">")[0];

		console.log(bot)
	
		user = bot.users.get(user).username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", (err, result) => {
			if (err) throw err;
			user = result[0].username;
			getUserStats(user, msg, discordUser, "wpm");
		});
	},
	
	// Get Player Best Race
	getPlayerBest: (msg) => {
		let user = msg.content.slice(5, msg.content.length);
		
		let discordUser = user;
		
		user = user.split("@")[1].split(">")[0];
	
		user = bot.users.get(user).username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", (err, result) => {
			if (err) throw err;
			user = result[0].username;
			getUserStats(user, msg, discordUser, "best");
		});	
	},
	
	// Get Group WPM
	getServerWPM: (msg) => {		
		con.query("SELECT * FROM users", (err, result) => {
			if (err) throw err;
			result.map( (user) => {
				let discordUser = bot.users.find( user => user.username == user.discordUser);
				getUserStats(user.username, msg, discordUser, "wpm");
			});
		});
	},
	
	// Get Group Best Race
	getServerBest: (msg) => {	
		let best = 0;
		con.query("SELECT * FROM users", (err, result) => {
			if (err) throw err;

			Promise.all(result.map( (user) => {
				axios.get(trProfileURL + user.username)
				.then((error, response, body) => {
					if (!error && response.statusCode === 200) {
						
						const $ = cheerio.load(body);

						userBest = $(":contains('Best Race') + td").text();

						userBest = userBest.trim();
						
						userBest = parseInt(userBest);

						if (userBest > best) {
							best = userBest;
							discordUser = user.discordUser;
						}
					}
				});
			}))
			.then(() => {
				discordUser = bot.users.find( user => user.username == discordUser);
				msg.channel.send("Server Record:" + "\n" + best + " WPM" + "\n" + "Set by: " + discordUser);
			});		
		});
	},
	
	// Send Race Invite
	startRace: async () => {
		const browser = await puppeteer.launch({
			headless: true,
			args: [
				'--disable-setuid-sandbox',
				// '--disable-gpu',
				'--no-first-run',
				'--no-sandbox',
			]
		});

		const page = await browser.newPage();

		await page.goto("https://play.typeracer.com");
		
		await page.waitForSelector(TR_RACE);
		
		await page.click(TR_RACE);

		await page.waitForSelector(TR_INVITE);
		
		await page.click(TR_INVITE);
		
		await page.waitForSelector(TR_EMAIL);
		
		let raceLink = await page.evaluate( () => document.querySelector('a.gwt-Anchor[href^="mailto:?subject=Race"]').href);
		
		raceLink = raceLink.slice(raceLink.length - 10, raceLink.length);
		
		raceLink = "https://play.typeracer.com?rt=" + raceLink;

		const channel = bot.channels.find( channel => channel.name == process.env.MAIN_CHANNEL);
		
		channel.send("Let's Race! \n" + raceLink);
	},
	
	// Add User to Database
	addUser: (msg) => {
		let username = msg.content.slice(4, msg.content.length).trim();
		
		if (username === "") {
			msg.reply("Tell me your TypeRacer username after !add");
			return;
		}
		
		let added = false;
		
		con.query("SELECT * FROM users", (err, result) => {
			if (err) throw err;
			result.map( (user) => {
				if (user.discordUser === msg.member.user.username) {
					added = true;
				}
			});
			
			if (added) {
				msg.reply("You're already a member!");
				return;
			} else {
				con.query("INSERT INTO users (username, discordUser) values (\"" + username + "\", \"" + msg.member.user.username + "\")");
				msg.reply("You've been added!");
			}
		});
	}
}

// Get User Stats Helper Function
const getUserStats = (user, msg,discordUser,stat) => {
	let userStat, statTitle;

	axios.get(TR_PROFILE + user)
	.then( (response) => {
		if (!error && response.statusCode === 200) {
			const $ = cheerio.load(body);

			if (stat === "wpm") {
				userStat = $("[title='Average of all races'] + td").text();
				statTitle = "\nWPM: ";
			} else if (stat === "best") {
				userStat = $(":contains('Best Race') + td").text();
				statTitle = "\nBest Race: ";
			}
			
			userStat = userStat.trim();
			
			msg.channel.send(discordUser + statTitle + userStat);	
		}
	});
}