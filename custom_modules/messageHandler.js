
module.exports = function (msg) {
	switch (msg) {
		 case msg.content.startsWith('!wpm@'):
		 case msg.content.startsWith('!Wpm@'):
		 case msg.content.startsWith('!WPM@'):
		 case msg.content.startsWith('!wpm @'):
		 case msg.content.startsWith('!Wpm @'):
		 case msg.content.startsWith('!WPM @'):
		   commands.handleWpmCommand(msg);
		   break;
		 case msg.content.startsWith('!best@'):
		 case msg.content.startsWith('!Best@'):
		 case msg.content.startsWith('!BEST@'):
		 case msg.content.startsWith('!best @'):
		 case msg.content.startsWith('!Best @'):
		 case msg.content.startsWith('!BEST @'):
		   commands.handleBestCommand(msg);
		   break;  
		 case msg.content.startsWith('!wpmall'):
		 case msg.content.startsWith('!WpmAll'):
		 case msg.content.startsWith('!WPMALL'):
		 case msg.content.startsWith('!wpm all'):
		 case msg.content.startsWith('!Wpm All'):
		 case msg.content.startsWith('!WPM ALL'):
		   commands.handleWpmAllCommand(msg);
		   break;
		 case msg.content.startsWith('!bestall'):
		 case msg.content.startsWith('!BestAll'):
		 case msg.content.startsWith('!BESTALL'):
		 case msg.content.startsWith('!best all'):
		 case msg.content.startsWith('!Best All'):
		 case msg.content.startsWith('!BEST ALL'):
		   commands.handleBestAllCommand(msg);
		   break;  
		 case msg.content.startsWith('!race'):
		 case msg.content.startsWith('!Race'):
		 case msg.content.startsWith('!RACE'):
		   commands.handleRaceCommand(msg);
		   break;  
		 case msg.content.startsWith('!add'):
		 case msg.content.startsWith('!Add'):
		 case msg.content.startsWith('!ADD'):
		   commands.handleAddCommand(msg);
		   break; 
	}
}

const commands = {
	
	// Get Player WPM
	handleWpmCommand: function(msg) {
		var user = msg.content.slice(4, msg.content.length);
		
		var discordUser = user;
		
		user = user.split("@")[1].split(">")[0];
	
		user = bot.users.get(user).username;
		
		console.log("in wpm");
		
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
			
			const browser = await puppeteer.launch();
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

//export handleCommands