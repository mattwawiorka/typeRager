const Discord = require('discord.js');
const request = require('request');
const cheerio = require('cheerio');
const util = require('util');
const mysql = require('mysql');
const puppeteer = require('puppeteer');
const db = require('./db.js');
const auth = require('./auth.json');

const bot = new Discord.Client();
const token=auth.token;
bot.login(token);

var con = db.con;

const trDataURL='https://data.typeracer.com/users?id=tr:';
const trProfileURL='https://data.typeracer.com/pit/profile?user=';

var userStat, statTitle, best, discordUser, userBest, currentBest, newBest, added;

const raceSelector = "#dUI > table > tbody > tr:nth-child(2) > td:nth-child(2) > div > div.mainViewport > div > table > tbody > tr:nth-child(4) > td > table > tbody > tr > td:nth-child(2) > table > tbody > tr:nth-child(1) > td > a";
const inviteSelector = ".roomSection table > tbody > tr > td:nth-child(2) > div > table > tbody > tr > td:nth-child(1) > a";
const linkSelector = "body > div.DialogBox.trPopupDialog.roomInvitePopup > div > div > div.dialogContent > div > div.bodyWidgetHolder > table > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(1) > td > input";
const emailSelector ='a.gwt-Anchor[href^="mailto:?subject=Race%20me%20on%"]';


// const onMessage = require('./custom_modules/messageHandler.js');
// bot.on('message', msg => onMessage(msg));


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
					con.query("UPDATE users SET bestRace=\""+newBest+"\" WHERE discordUser=\"" + discordUser + "\"",  function (err, result) {
						if (err) throw err;
						discordUser = bot.users.find( user => user.username == discordUser);
						if (best == newBest)  {
							channel.send("New Server PR!" + "\n" + newBest + " WPM" + "\nSet by: " + discordUser);
						} else {
							channel.send(discordUser + " Hit a new PR!" + "\n" + newBest + " WPM");
						}
					});	
				}	
			});	 
		});
	}, 30000);
});


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

/*
		C O M M A N D S
*/

// Get Player WPM
bot.on('message', msg=>{
	if(msg.content.startsWith('!wpm') || msg.content.startsWith('!WPM') || msg.content.startsWith('!Wpm')) {
		var user = msg.content.slice(4, msg.content.length);
		
		if (!user.includes("@")) return;
		
		var discordUser=user;
		
		user = user.split("@")[1].split(">")[0];
	
		user = bot.users.get(user).username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", function (err, result) {
			if (err) throw err;
			user = result[0].username;
			getUserStats(user,msg,discordUser,"wpm");
		});
	}
})

// Get Player Best Race
bot.on('message', msg=>{
	if(msg.content.startsWith('!best') || msg.content.startsWith('!BEST') || msg.content.startsWith('!Best')) {
		var user = msg.content.slice(5, msg.content.length);
		
		if (!user.includes("@")) return;
		
		var discordUser=user;
		
		user = user.split("@")[1].split(">")[0];
	
		user = bot.users.get(user).username;
		
		con.query("SELECT username FROM users WHERE discordUser =\""+user+"\"", function (err, result) {
			if (err) throw err;
			user = result[0].username;
			getUserStats(user,msg,discordUser,"best");
		});	
	}
})

// Get Group WPM
bot.on('message', msg=>{
	if(msg.content.startsWith('!wpm') || msg.content.startsWith('!WPM') || msg.content.startsWith('!Wpm')) {
		var group = msg.content.slice(4, msg.content.length).trim();
		
		group = group.toLowerCase();
		
		if (group != "all") return;
		
		con.query("SELECT * FROM users", function (err, result) {
			if (err) throw err;
			result.forEach(function(element) {
				let discordUser = bot.users.find( user => user.username == element.discordUser);
				getUserStats(element.username,msg,discordUser,"wpm");
			});
		});
	}
})

// Get Group Best Race
bot.on('message', msg=>{
	if(msg.content.startsWith('!best') || msg.content.startsWith('!BEST') || msg.content.startsWith('!Best')) {
		var group = msg.content.slice(5, msg.content.length).trim();
		
		group = group.toLowerCase();
		
		if (group != "all") return;
		
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
	}
})

// Send Race Invite
bot.on('message', msg=>{
	if(msg.content.startsWith('!race') || msg.content.startsWith('!RACE') || msg.content.startsWith('!Race') || 
		msg.content.startsWith('!rage') || msg.content.startsWith('!RAGE') || msg.content.startsWith('!Rage')) {
		
		( async	() => {
			
			const browser = await puppeteer.launch();
			const page = await browser.newPage();

			await page.goto("https://play.typeracer.com");
			
			await page.waitForSelector(raceSelector);
			
			await page.click(raceSelector);
	
			await page.waitForSelector(inviteSelector);
			
			await page.click(inviteSelector);
			
			await page.waitForSelector(emailSelector);
			
			var raceLink = await page.evaluate( () => document.querySelector('a.gwt-Anchor[href^="mailto:?subject=Race"]').href);
			
			raceLink = raceLink.split("Frt%3D");
			
			raceLink = raceLink[1];
			
			raceLink = "https://play.typeracer.com?rt=" + raceLink;

			var channel = bot.channels.find( channel => channel.name == 'general');
			
			channel.send("Let's Race! \n" + raceLink);
			
		})();
	}
});

// Add User to Database
bot.on('message', msg=>{
	if(msg.content.startsWith('!add') || msg.content.startsWith('!ADD') || msg.content.startsWith('!Add')) {
		
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
});
