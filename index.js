if (global.TeraProxy.DiscordUrl.includes('YjUnmbgV')) global.TeraProxy.GUIMode = true
//have a very autistic fix for menma not setting GUIMode to true when he ripped toolbox to his launcher
//the below line could just be removed, but this keeps error handling when ran in cli mode
if (!global.TeraProxy.GUIMode) throw new Error('Proxy GUI is not running!');
const { Host } = require('tera-mod-ui');
const path = require("path");

const SettingsUI = require('tera-mod-ui').Settings;
// https://github.com/tera-toolbox/tera-data/tree/master/definitions
const DEADLY_GAMBLE_ABNORMAL = 100801;
const EDICT_ABNORMALS = [805800, 805803];

const SCYTHE_IDS = [300900, 300930, 380100, 380130];
const AERIAL_IDS = [410131];


exports.NetworkMod = function warriorScytheCounter(mod) {
    mod.game.initialize(['me', 'me.abnormalities', 'inventory', 'contract']);

	let ui = new Host(mod, 'index.html', {
		title: 'scytheui',
		transparent: true,
		frame: false,
		alwaysOnTop: true,
		maximizable: false,
		minimizable: false,
		closeable: false,
		fullscreen: false,
		fullscreenable: false,
		skipTaskBar: true,
		focusable: false,
		width: 300,
		height: 182,
		resizable: false,
		center: true,
		x: mod.settings.windowPos[0],
		y: mod.settings.windowPos[1],
		autoHideMenuBar: true,
		titleBarStyle: 'hidden',
		webPreferences: { nodeIntegration: true, devTools: false }
	}, false, path.join(__dirname, 'ui'))

	let opened = false,
		focused = null,
		focusChange = true,
		moving = false,
		justMoved = true;


	mod.game.on('enter_game', () => { 
		if (mod.settings.enabled == null) { mod.settings.enabled = true; }
		if (mod.settings.onlySelf == null) { mod.settings.onlySelf = true; }
		if (mod.settings.displayPriestBuffs == null) { mod.settings.displayPriestBuffs = true; }
		mod.settings.enabled ? enableUi() : disableUi()

	})
	mod.game.on('leave_game', () => { ui.close(); mod.clearAllIntervals() })

	ui.on('back', event => {
		mod.log('back', event.text)
	})

	ui.on('settingsBack', event => {
		if (mod.settings.enabled !== event.enabled) {
			event.enabled ? enableUi() : disableUi();
		}
		mod.settings.onlySelf = event.onlySelf;
		mod.settings.displayPriestBuffs = event.displayPriestBuffs;
		mod.log(event)
	})

	ui.on('requestSettings', event => {
		ui.send('settings',  {enabled: mod.settings.enabled, onlySelf: mod.settings.onlySelf, displayPriestBuffs: mod.settings.displayPriestBuffs})
	})

    let teamMemberList = [];
    let teamMemberNameMap = {};
    let scytheCounterMap ={};
    let aerialCounterMap = {};
    let timeoutMap = {}
    let playerIdToGameId = {}


    function sendStatUpdateToUi(gameId) {
		let name = teamMemberNameMap[gameId];
		let aerial = aerialCounterMap[gameId] || 0;
		let scythe = scytheCounterMap[gameId] || 0;
        ui.send('scytheUpdate', {name: name, aerial: aerial, scythe: scythe} )
    }

    function sendNewDeadlyGambleToUi(gameId, event) {
		let name = teamMemberNameMap[gameId];
		let duration = event.duration;
        ui.send('newDeadlyGamble', {name: name, duration: duration} )
    }


    function sendDeadlyGabmeOverToUi(gameId) {
		let name = teamMemberNameMap[gameId];
        ui.send('deadlyGambleOver', {name: name, isSelf: (gameId === mod.game.me.gameId)} )
    }

    function sendNewEdict(gameId, event) {
		let name = teamMemberNameMap[gameId];
		let duration = event.duration;
        ui.send('newEdict', {name: name, duration: duration} )
    }

    function sendEdictOverToUi() {
        ui.send('edictOver', {} )
    }

    mod.hook('S_ABNORMALITY_BEGIN', 4, {order: -Infinity}, event => {
    	mod.log(event)
      	if (!teamMemberList.includes(event.target)) {
      		return;
      	}


        if (event.id === DEADLY_GAMBLE_ABNORMAL) {
        	if (mod.settings.onlySelf === true && event.target != mod.game.me.gameId) {
        		return;
        	}
            mod.log("DG START") 
			scytheCounterMap[event.target] = 0;
            aerialCounterMap[event.target] = 0;
        	sendNewDeadlyGambleToUi(event.target, event)
			sendStatUpdateToUi(event.target);	
			timeoutMap[event.target] = mod.setTimeout(() => {
                sendDeadlyGabmeOverToUi(event.target);
                timeoutMap[event.target] = null;
            }, Number(event.duration));
    	}

    	if (EDICT_ABNORMALS.includes(event.id) && event.target === mod.game.me.gameId && mod.settings.displayPriestBuffs === true) {
    		sendNewEdict(event.target, event)
    	}
    })

	mod.hook('S_ABNORMALITY_END', 1, {order: -Infinity}, (event) => {
	    if (event.id === DEADLY_GAMBLE_ABNORMAL) {
	    	if (mod.settings.onlySelf === true && event.target != mod.game.me.gameId) {
	    		return;
	    	}
	        sendDeadlyGabmeOverToUi(event.target)
            timeoutMap[event.target] = null;	
	    }
	    if (EDICT_ABNORMALS.includes(event.id) && mod.settings.displayPriestBuffs === true) {
	    	sendEdictOverToUi()
	    }
	});

    mod.hook('S_ACTION_STAGE', 9, {order: -Infinity}, event => {
    	if (teamMemberList.includes(event.gameId) && timeoutMap[event.gameId] != null) {
            if (SCYTHE_IDS.includes(event.skill.id)) {
            	mod.log
                scytheCounterMap[event.gameId]++;
                mod.log("scythe: " + event.skill.id)
                mod.log({name: teamMemberNameMap[event.gameId], aerial: aerialCounterMap[event.gameId]  || 0, scythe: scytheCounterMap[event.gameId]  || 0})
				sendStatUpdateToUi(event.gameId);
            }
            if (AERIAL_IDS.includes(event.skill.id)) {
                aerialCounterMap[event.gameId]++;
                mod.log("aerial: " + event.skill.id)
                mod.log({name: teamMemberNameMap[event.gameId], aerial: aerialCounterMap[event.gameId]  || 0, scythe: scytheCounterMap[event.gameId]  || 0})
				sendStatUpdateToUi(event.gameId);
            }
    	}
    })



    // S_LEAVE_PARTY_MEMBER 2, serverId, playerId, name
	mod.hook('S_LEAVE_PARTY_MEMBER', 2, {order: -Infinity}, event => {
    	mod.log("S_LEAVE_PARTY_MEMBER: ");
    	mod.log(event);

    	var gameId = playerIdToGameId[event.playerId];
    	// remove teammeber id from list
    	var index = teamMemberList.indexOf(gameId);
		if (index !== -1) {
		  teamMemberList.splice(index, 1);
		}
    })   

    // S_LEAVE_PARTY 1: -
    mod.hook('S_LEAVE_PARTY', 1, {order: -Infinity}, event => {
    	mod.log("S_LEAVE_PARTY: ");
    	mod.log(event);
        teamMemberList = [mod.game.me.gameId];
    })

    // S_LOGOUT_PARTY_MEMBER: 1, playerId, serverId 



    // S_PARTY_MEMBER_LIST: 9
    mod.hook('S_PARTY_MEMBER_LIST', 8, {order: -Infinity}, event => {
    	mod.log("S_PARTY_MEMBER_LIST: ");
    	mod.log(event);
        teamMemberList = [];
        for (let member of event.members) {
			teamMemberList.push(member.gameId)
			teamMemberNameMap[member.gameId] = member.name
			playerIdToGameId[member.playerId] = member.gameId
        }
    })


    // on login, set team member list to empty
    mod.hook('S_LOGIN', 14, {order: -Infinity}, event => {
    	teamMemberNameMap = {};
		teamMemberNameMap[event.gameId] = event.name;
		teamMemberList = [event.gameId];
    })

    // on logout set team member list to nothing


    let lastFocus = null;

	async function moveTop() {
		let gameFocused = await mod.clientInterface.hasFocus() 
		let uiFocused = await ui.window.isFocused()
		let uiShown = await ui.window.isVisible()

		if (!opened) {
			if (uiShown) { ui.hide() }
			return;
		}

		if (gameFocused && justMoved) {
			justMoved = false;
		}

		let now = Date.now()
		if (uiFocused || (gameFocused && !uiFocused)) {
			lastFocus = now;
		}

		let lastFocusMoreThan10SecondsAgo = (now - lastFocus) > 200;


		// mod.log(uiShown, uiFocused, gameFocused, (now - lastFocus), lastFocusMoreThan10SecondsAgo)
		if ((gameFocused && !uiShown) || (uiFocused && !uiShown) || (!lastFocusMoreThan10SecondsAgo && !uiShown)) {
			ui.show()
		}

		if (!gameFocused && !uiFocused && uiShown && lastFocusMoreThan10SecondsAgo && !justMoved) {
			ui.hide()
		}
		else if (uiShown && gameFocused) { ui.window.moveTop();}
	}

    // UI

    let uiRefreshInterval = null;

    mod.command.add('scythe', {
        $default() {
            ui()
        },
        ui() {
        	if (!opened) {
        		enableUi();
        	} else {
        		disableUi();
        	}
        	mod.command.message(opened ? "scythe-counter UI started": "scythe-counter UI stopped")
        },
        on() {
        	enableUi()
            mod.command.message('scythe-counter UI started');
        },
        off() {
            disableUi();
            mod.command.message('scythe-counter UI disabled');
        },
        team() {
        	mod.command.message("team: ", teamMemberList);
        	mod.log(teamMemberList);
        },
        me() {
        	mod.log("me:" , mod.game.me.gameId)
        	mod.command.message("me: ", mod.game.me.gameId)
        },
        names() {
        	mod.log("names", teamMemberNameMap)
        }
    });

    function enableUi() {
        mod.settings.enabled = true;

    	opened = true;
		ui.show();
		ui.window.setPosition(mod.settings.windowPos[0], mod.settings.windowPos[1]);
		ui.window.setIgnoreMouseEvents(false);
		ui.window.setVisibleOnAllWorkspaces(true);
		ui.window.setAlwaysOnTop(true, 'screen-saver', 1);
	
		if (!uiRefreshInterval) {
			uiRefreshInterval = mod.setInterval(() => { moveTop() }, 500);
		}

		ui.window.on('move', () => { moving = true; })
		ui.window.on('moved', () => { mod.settings.windowPos = ui.window.getPosition(); mod.setTimeout(() => { moving = false; ui.window.blur(); justMoved = true; }, 500) })
		ui.window.on('close', () => { mod.log("close"); mod.settings.windowPos = ui.window.getPosition(); mod.clearAllIntervals(); opened = false });
		ui.window.webContents.openDevTools();
    }

    function disableUi() {
        mod.settings.enabled = false;

		ui.hide();
		opened = false;
		if (uiRefreshInterval != null) {
			clearInterval(uiRefreshInterval);
			uiRefreshInterval = null;
		}
    	mod.command.message("scytheui disabled. Type \"scyhte on\" to turn it back on.")

    }


}