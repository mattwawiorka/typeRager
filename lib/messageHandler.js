const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const con = require('../db.js').con;

TR_PROFILE='https://data.typeracer.com/pit/profile?user=';

TR_RACE = "#dUI > table > tbody > tr:nth-child(2) > td:nth-child(2) > div > div.mainViewport > div > table > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a";
TR_INVITE = ".roomSection table > tbody > tr > td:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a";
TR_EMAIL ='a.gwt-Anchor[href^="mailto:?subject=Race%20me%20on%"]';

exports.handler = (msg, bot) => {
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
	else if (msg.content.startsWith('!wpm') || msg.content.startsWith('!Wpm') || msg.content.startsWith('!WPM'))
	{
		commands.getServerWPM(msg);
	}
	else if (msg.content.startsWith('!best') || msg.content.startsWith('!Best') || msg.content.startsWith('!BEST'))
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
	else if (msg.isMentioned(bot.user)) {
		commands.listCommands(msg);
	}
}

const commands = {
	
	// Get Player WPM
	getPlayerWPM: (msg) => {
		let user = msg.mentions.users.first().username;
			
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", (err, result) => {
			if (err) throw err;
			getUserStats(result[0].username, msg, user, "wpm");
		});
	},
	
	// Get Player Best Race
	getPlayerBest: (msg) => {
		let user = msg.mentions.users.first().username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", (err, result) => {
			if (err) throw err;
			getUserStats(result[0].username, msg, user, "best");
		});	
	},
	
	// Get Group WPM
	getServerWPM: (msg) => {		
		con.query("SELECT * FROM users", (err, result) => {
			if (err) throw err;
			result.map( (user) => {
				getUserStats(user.username, msg, user.discordUser, "wpm");
			});
		});
	},
	
	// Get Group Best Race
	getServerBest: (msg) => {	
		con.query("SELECT * FROM users WHERE bestRace=(SELECT MAX(bestRace) FROM users)", (err, result) => {
			if (err) throw err;
			msg.channel.send("Server Record:" + "\n" + result[0].bestRace + " WPM" + "\n" + "Set by: " + result[0].discordUser);
		});
	},
	
	// Send Race Invite
	startRace: async (msg) => {
		msg.channel.send("Finding you a racetrack...");
		setInterval(() => msg.channel.send("\n."), 1000)

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
		
		msg.channel.send("Let's Race! \n" + raceLink);
	},
	
	// Add User to Database
	addUser: (msg) => {
		let username = msg.content.slice(4).trim();
		
		if (username === "") {
			msg.reply("Tell me your TypeRacer username after !add");
			return;
		}
		
		con.query(`SELECT * FROM users WHERE discordUser="${msg.member.user.username}"`, (err, result) => {
			if (err) throw err;
			if (result.length > 0) {
				msg.reply("You're already a member!");
			} else {
				con.query("INSERT INTO users (username, discordUser) values (\"" + username + "\", \"" + msg.member.user.username + "\")");
				msg.reply("You've been added!");
			}
		});
	},

	// List typeRagers commands
	listCommands: (msg) => {
		msg.reply(
			`My commands are:
			\n!race - gets a TypeRacer racetrack for users to join
			\n!best - gets the current server record for fastest race
			\n!wpm - lists the average words per minute of each participating server member
			\n!best @user - get the mentioned users best race
			\n!wpm @user - get the mentioned users average words per minute
			\n!add - adds a user as a racer, provider your TypeRacer username`
		);
	}
}

// Get User Stats Helper Function
const getUserStats = (user, msg, discordUser, stat) => {
	let userStat, statTitle;

	axios.get(TR_PROFILE + user)
	.then( (response) => {
		const $ = cheerio.load(response.data);

		if (stat === "wpm") {
			userStat = $("[title='Average of all races'] + td").text();
			statTitle = "\nWPM: ";
		} else if (stat === "best") {
			userStat = $(":contains('Best Race') + td").text();
			statTitle = "\nBest Race: ";
		}
		
		userStat = userStat.trim();
		
		msg.channel.send(discordUser + statTitle + userStat);	
	});
}