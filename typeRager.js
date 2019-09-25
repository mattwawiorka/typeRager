const Discord = require('discord.js');
const request = require('request');
const cheerio = require('cheerio');
const util = require('util');
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

// Get User Stats
function getUserStats(user,msg,discordUser,stat) {
	var userStat;
	var statTitle;
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
		})
}

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
		
		var best = 0;
		var discordUser;
		var userBest;
	
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

// Set New PR
bot.on('ready', ()=>{
	
	var channel = bot.channels.find( channel => channel.name == 'general');
	var newBest;
	var best = 0;
	
	var interval = setInterval( function () {
		
		con.query("SELECT * FROM users", (err, result)=>{
			if (err) throw err;
			var wait = new Promise( (resolve,reject) => {
				result.forEach( (element, index,array) => {
					
					//oldBest = element.bestRace;
					//console.log(element.discordUser + " Old Best: " + oldBest);
				
					request({
						url: trProfileURL+element.username
					}, function (error, response, body) {
						if (!error && response.statusCode === 200) {
							
							const $ = cheerio.load(body);

							newBest = $(":contains('Best Race') + td").text();

							newBest = newBest.trim();
							
							newBest = parseInt(newBest);
							
							//oldBest = element.bestRace;
							
							console.log(element.discordUser + " New Best: " + newBest);
							
							if (newBest > best) {
								best = newBest;
							}

							if (newBest > element.bestRace) {
								console.log("PR");
								let discordUser = bot.users.find( user => user.username == element.discordUser);
								con.query("UPDATE users SET bestRace=\""+newBest+"\" WHERE username=\""+element.username + "\"",  function (err, result) {
									if (err) throw err;
									if (best != newBest) channel.send(discordUser + " Hit a new PR!" + "\n" + newBest + " WPM");
								});	
								
								if (best = newBest) { 
									channel.send("New Server PR!" + "\n" + newBest + " WPM" + "\n Set by: " + discordUser);
								}
								
							}
							
						}
						
					});
					
					setTimeout( () => {if (index == array.length - 1) resolve();}, 5000);
					
				});
			});
			
			wait.then(() => {
				//discordUser = bot.users.find( user => user.username == discordUser);
				//msg.channel.send("Server Record:" + "\n" + best + " WPM" + "\n" + "Set by: " + discordUser);
			});	
			
		});
	
	
		
	}, 30000);
	
	//clearInterval(interval);
	
});