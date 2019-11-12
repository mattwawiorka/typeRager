const request = require('request');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const bot = require('../typeRager');
const db = require('../db.js');

const trProfileURL='https://data.typeracer.com/pit/profile?user=';

const raceSelector = "#dUI > table > tbody > tr:nth-child(2) > td:nth-child(2) > div > div.mainViewport > div > table > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a";
const inviteSelector = ".roomSection table > tbody > tr > td:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a";
const emailSelector ='a.gwt-Anchor[href^="mailto:?subject=Race%20me%20on%"]';

const con = db.con;

var userStat, statTitle, best, discordUser, userBest, added;

exports.handler = (msg) => {
	if (msg.content.startsWith('!wpm<@') || msg.content.startsWith('!Wpm<@') || msg.content.startsWith('!WPM<@') ||
		msg.content.startsWith('!wpm <@') || msg.content.startsWith('!Wpm <@') || msg.content.startsWith('!WPM <@'))
	{
		commands.handleWpmCommand(msg);
	}
	else if (msg.content.startsWith('!best<@') || msg.content.startsWith('!Best<@') || msg.content.startsWith('!BEST<@') ||
		msg.content.startsWith('!best <@') || msg.content.startsWith('!Best <@') || msg.content.startsWith('!BEST <@'))
	{
		commands.handleBestCommand(msg);
	}
	else if (msg.content.startsWith('!wpmall') || msg.content.startsWith('!WpmAll') || msg.content.startsWith('!WPMALL') ||
		msg.content.startsWith('!wpm all') || msg.content.startsWith('!Wpm All') || msg.content.startsWith('!WPM ALL'))
	{
		commands.handleWpmAllCommand(msg);
	}
	else if (msg.content.startsWith('!bestall') || msg.content.startsWith('!BestAll') || msg.content.startsWith('!BESTALL') ||
		msg.content.startsWith('!best all') || msg.content.startsWith('!Best All') || msg.content.startsWith('!BEST ALL'))
	{
		commands.handleBestAllCommand(msg);
	}
	else if (msg.content.startsWith('!race') || msg.content.startsWith('!Race') || msg.content.startsWith('!RACE') ||
		msg.content.startsWith('!rage') || msg.content.startsWith('!Rage') || msg.content.startsWith('!RAGE'))
	{
		commands.handleRaceCommand(msg);
	}
	else if (msg.content.startsWith('!add') || msg.content.startsWith('!Add') || msg.content.startsWith('!ADD'))
	{
		commands.handleAddCommand(msg);
	}
}

const commands = {
	
	// Get Player WPM
	handleWpmCommand: function(msg) {
		var user = msg.content.slice(4, msg.content.length);
		
		var discordUser = user;
		
		user = user.split("@")[1].split(">")[0];
	
		user = bot.users.get(user).username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", function (err, result) {
			if (err) throw err;
			user = result[0].username;
			getUserStats(user,msg,discordUser,"wpm");
		});
	},
	
	// Get Player Best Race
	handleBestCommand: function(msg) {
		var user = msg.content.slice(5, msg.content.length);
		
		var discordUser = user;
		
		user = user.split("@")[1].split(">")[0];
	
		user = bot.users.get(user).username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", function (err, result) {
			if (err) throw err;
			user = result[0].username;
			getUserStats(user,msg,discordUser,"best");
		});	
	},
	
	// Get Group WPM
	handleWpmAllCommand: function(msg) {		
		con.query("SELECT * FROM users", function (err, result) {
			if (err) throw err;
			result.forEach(function(element) {
				let discordUser = bot.users.find( user => user.username == element.discordUser);
				getUserStats(element.username,msg,discordUser,"wpm");
			});
		});
	},
	
	// Get Group Best Race
	handleBestAllCommand: function(msg) {	
		best = 0;
		con.query("SELECT * FROM users", (err, result)=>{
			if (err) throw err;
			
			var wait = new Promise( (resolve,reject) => {
				result.forEach( (element, index,array) => {
					
					request({
						url: trProfileURL+element.username
					}, function (error, response, body) {
						if (!error && response.statusCode === 200) {
							
							const $ = cheerio.load(body);

							userBest = $(":contains('Best Race') + td").text();

							userBest = userBest.trim();
							
							userBest = parseInt(userBest);

							if (userBest > best) {
								best = userBest;
								discordUser = element.discordUser;
							}
						}
					});
					
					setTimeout( () => {if (index == array.length - 1) resolve();}, 1000);
					
				});
			});
			
			wait.then(() => {
				discordUser = bot.users.find( user => user.username == discordUser);
				msg.channel.send("Server Record:" + "\n" + best + " WPM" + "\n" + "Set by: " + discordUser);
			});		
		});
	},
	
	// Send Race Invite
	handleRaceCommand: function(msg) {
		( async	() => {
			
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
			
			await page.waitForSelector(raceSelector);
			
			await page.click(raceSelector);
	
			await page.waitForSelector(inviteSelector);
			
			await page.click(inviteSelector);
			
			await page.waitForSelector(emailSelector);
			
			var raceLink = await page.evaluate( () => document.querySelector('a.gwt-Anchor[href^="mailto:?subject=Race"]').href);
			
			raceLink = raceLink.slice(raceLink.length - 10, raceLink.length);
			
			raceLink = "https://play.typeracer.com?rt=" + raceLink;

			var channel = bot.channels.find( channel => channel.name == 'general');
			
			channel.send("Let's Race! \n" + raceLink);
			
		})();
	},
	
	// Add User to Database
	handleAddCommand: function(msg) {
		var username = msg.content.slice(4, msg.content.length).trim();
		
		if (username == "") {
			msg.reply("Tell me your TypeRacer username after !add");
			return;
		}
		
		added = false;
		
		con.query("SELECT * FROM users", function (err, result) {
			if (err) throw err;
			result.forEach(function(element) {
				if (element.discordUser == msg.member.user.username) {
					added = true;
				}
			});
			
			if (added == true) {
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
function getUserStats(user,msg,discordUser,stat) {
	request({
			url: trProfileURL+user
		}, function (error, response, body) {
			if (!error && response.statusCode === 200) {
				
				const $ = cheerio.load(body);
				
				if (stat=="wpm") {
					userStat = $("[title='Average of all races'] + td").text();
					statTitle = "\nWPM: ";
				}

				if (stat=="best") {
					userStat = $(":contains('Best Race') + td").text();
					statTitle = "\nBest Race: ";
				}
				
				userStat = userStat.trim();
				
				msg.channel.send(discordUser + statTitle + userStat);	
			}
		});
}