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
const TEMPTEST_2_ABNORMALS = [103104];
const SWIFT_ABNORMALS = [21010, 21070];

const SCYTHE_IDS = [300900, 300930, 380100, 380130];
const AERIAL_IDS = [410131];


exports.NetworkMod = function warriorScytheCounter(mod) {
    mod.game.initialize(['me', 'me.abnormalities', 'inventory', 'contract']);

	let ui = new Host(mod, 'index.html', {
		title: 'scythe-counter UI',
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


	let cdUi = new Host(mod, 'warrior-cd-ui.html', {
		title: 'warrior cd UI',
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
		width: 360,
		height: 84,
		resizable: true,
		center: true,
		x: mod.settings.windowCdPos[0],
		y: mod.settings.windowCdPos[1],
		autoHideMenuBar: true,
		titleBarStyle: 'hidden',
		webPreferences: { nodeIntegration: true, devTools: false }
	}, false, path.join(__dirname, 'ui'))

	let opened = false,
		cdOpened = false,
		focused = null,
		focusChange = true,
		moving = false,
		cdMoving = false,
		justMoved = true,
		cdJustMoved = true;


	mod.game.on('enter_game', () => { 
		if (mod.settings.enabled == null) { mod.settings.enabled = true; }
		if (mod.settings.onlySelf == null) { mod.settings.onlySelf = true; }
		if (mod.settings.displayPriestBuffs == null) { mod.settings.displayPriestBuffs = true; }
		mod.settings.enabled ? enableUi() : disableUi()
	})
	mod.game.on('leave_game', () => { ui.close(); cdUi.close(); mod.clearAllIntervals();  })

	ui.on('back', event => {
	})

	ui.on('settingsBack', event => {
		mod.settings.onlySelf = event.onlySelf;
		mod.settings.displayPriestBuffs = event.displayPriestBuffs;
		mod.settings.displayMessage = event.displayMessage
		if (mod.settings.cdUiEnabled !== event.warriorUiEnabled) {
			mod.settings.cdUiEnabled = event.warriorUiEnabled
			event.warriorUiEnabled ? enableCdUi() : disableCdUi()
		}
		if (mod.settings.enabled !== event.enabled) {
			event.enabled ? enableUi() : disableUi();
		}
	})

	ui.on('requestSettings', event => {
		// mod.log({enabled: mod.settings.enabled, onlySelf: mod.settings.onlySelf, displayPriestBuffs: mod.settings.displayPriestBuffs, displayMessage: mod.settings.displayMessage, warriorUiEnabled: mod.settings.cdUiEnabled})
		ui.send('settings',  {enabled: mod.settings.enabled, onlySelf: mod.settings.onlySelf, displayPriestBuffs: mod.settings.displayPriestBuffs, displayMessage: mod.settings.displayMessage, warriorUiEnabled: mod.settings.cdUiEnabled})
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
		if (gameId === mod.game.me.gameId) {
			cdUi.send('scytheUpdate', {name: name, aerial: aerial, scythe: scythe} )
		}
    }

    function sendNewDeadlyGambleToUi(gameId, event) {
		let name = teamMemberNameMap[gameId];
		let duration = event.duration;
		ui.send('newDeadlyGamble', {name: name, duration: duration} )
		if (gameId === mod.game.me.gameId) {
			cdUi.send('newDeadlyGamble', {name: name, duration: duration} )
		}
    }


    function sendDeadlyGabmeOverToUi(gameId) {
		let name = teamMemberNameMap[gameId];
        ui.send('deadlyGambleOver', {name: name, isSelf: (gameId === mod.game.me.gameId)} )
		if (gameId === mod.game.me.gameId) {
			cdUi.send('deadlyGambleOver', {name: name, isSelf: (gameId === mod.game.me.gameId)} )
		}
    }

	function sendNewEdict(gameId, event) {
		let name = teamMemberNameMap[gameId];
		let duration = event.duration;
		ui.send('newEdict', {name: name, duration: duration} )
		cdUi.send('newEdict', {name: name, duration: duration} )
	}

	function sendEdictOverToUi() {
		ui.send('edictOver', {} )
		cdUi.send('edictOver', {} )
	}

	function sendNewSwift(gameId, event) {
		let name = teamMemberNameMap[gameId];
		let duration = event.duration;
		cdUi.send('newSwift', {name: name, duration: duration} )
	}

	function sendSwiftOverToUi() {
		cdUi.send('swiftOver', {} )
	}

	function sendNewTempest2(gameId, event) {
		let name = teamMemberNameMap[gameId];
		let duration = event.duration;
		cdUi.send('newTempest2', {name: name, duration: duration} )
	}

	function sendTempest2OverToUi() {
		cdUi.send('tempest2Over', {} )
	}



    mod.hook('S_ABNORMALITY_BEGIN', 4, {order: -Infinity}, event => {
      	if (!teamMemberList.includes(event.target) || mod.settings.enabled === false) { return; }

        if (event.id === DEADLY_GAMBLE_ABNORMAL) {
        	if (mod.settings.onlySelf === true && event.target !== mod.game.me.gameId) {
        		return;
        	}
            // mod.log("DG START")
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

		if (mod.settings.cdUiEnabled === true && event.target === mod.game.me.gameId) {
			if (SWIFT_ABNORMALS.includes(event.id)) {
				mod.log("SWIFT START", event)
				sendNewSwift(event.target, event)
			}

			if (TEMPTEST_2_ABNORMALS.includes(event.id)) {
				sendNewTempest2(event.target, event)
			}
		}

    })

	mod.hook('S_ABNORMALITY_REFRESH', 2, {order: -Infinity}, event => {
		if (mod.settings.enabled === false) { return; }

		if (mod.settings.cdUiEnabled && event.target === mod.game.me.gameId) {
			if (SWIFT_ABNORMALS.includes(event.id)) {
				mod.log("SWIFT REFRESH", event)
				sendNewSwift(event.target, event)
			}
			if (TEMPTEST_2_ABNORMALS.includes(event.id)) {
				sendNewTempest2(event.target, event)
			}
		}

		if (event.id === DEADLY_GAMBLE_ABNORMAL) {
			if (mod.settings.onlySelf === true && event.target !== mod.game.me.gameId) {
				return;
			}
			if (timeoutMap[event.target] != null) {
				mod.clearTimeout(timeoutMap[event.target]);
				timeoutMap[event.target] = mod.setTimeout(() => {
					sendDeadlyGabmeOverToUi(event.target);
					timeoutMap[event.target] = null;
				}, Number(event.duration));
			}
		}

	})

	mod.hook('S_ABNORMALITY_END', 1, {order: -Infinity}, (event) => {
		if (mod.settings.enabled === false) { return; }

	    if (event.id === DEADLY_GAMBLE_ABNORMAL) {
	    	if (mod.settings.onlySelf === true && event.target !== mod.game.me.gameId) {
	    		return;
	    	}
	        sendDeadlyGabmeOverToUi(event.target)
	        if (event.target === mod.game.me.gameId) {
	        	let message = "AERIAL: " + aerialCounterMap[event.target]  + " / SCYTHE: " + scytheCounterMap[event.target] 
	        	mod.send('S_DUNGEON_EVENT_MESSAGE', 2, { type: 33, chat: false, channel: 0, message: message });
	        }
            timeoutMap[event.target] = null;	
	    }

		if (EDICT_ABNORMALS.includes(event.id) && mod.settings.displayPriestBuffs === true) {
	    	sendEdictOverToUi()
	    }

		if (mod.settings.cdUiEnabled && event.target === mod.game.me.gameId) {
			if (SWIFT_ABNORMALS.includes(event.id)) {
				// mod.log("SWIFT END", event)
				sendSwiftOverToUi()
			}
			if (TEMPTEST_2_ABNORMALS.includes(event.id)) {
				sendTempest2OverToUi()
			}
		}

	});

    mod.hook('S_ACTION_STAGE', 9, {order: -Infinity}, event => {
		if (mod.settings.enabled === false) { return; }

    	if (teamMemberList.includes(event.gameId) && timeoutMap[event.gameId] != null) {
            if (SCYTHE_IDS.includes(event.skill.id)) {
                scytheCounterMap[event.gameId]++;
				sendStatUpdateToUi(event.gameId);
            }
            if (AERIAL_IDS.includes(event.skill.id)) {
                aerialCounterMap[event.gameId]++;
				sendStatUpdateToUi(event.gameId);
            }
    	}
    })



	mod.hook('S_LEAVE_PARTY_MEMBER', 2, {order: -Infinity}, event => {
    	var gameId = playerIdToGameId[event.playerId];
    	// remove teammeber id from list
    	var index = teamMemberList.indexOf(gameId);
		if (index !== -1) {
		  teamMemberList.splice(index, 1);
		}
    })   

    // S_LEAVE_PARTY 1: -
    mod.hook('S_LEAVE_PARTY', 1, {order: -Infinity}, event => {
        teamMemberList = [mod.game.me.gameId];
    })

    // S_LOGOUT_PARTY_MEMBER: 1, playerId, serverId 



    // S_PARTY_MEMBER_LIST: 9
    mod.hook('S_PARTY_MEMBER_LIST', 8, {order: -Infinity}, event => {
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


	async function moveCdUiTop() {
		let focused = await mod.clientInterface.hasFocus()
		let uiShown = await cdUi.window.isVisible()

		if (!cdOpened) {
			if (uiShown) { ui.hide() }
			return;
		}

		if (!focused && uiShown && !cdMoving) {
			cdUi.hide();
		}

		if (focused && !uiShown) {
			cdUi.hide();
			cdUi.show();
		}

		if (focused) { cdUi.window.moveTop();}
	}

    // UI

    let uiRefreshInterval = null;
    let cdUiRefreshInterval = null;

    mod.command.add('scythe', {
        $default() {
            mod.command.exec('scythe ui')
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
        	// mod.log(teamMemberList);
        },
        me() {
        	// mod.log("me:" , mod.game.me.gameId)
        	mod.command.message("me: ", mod.game.me.gameId)
        },
        names() {
        	// mod.log("names", teamMemberNameMap)
        }
    });

    function enableUi() {
		enableCdUi()

        mod.settings.enabled = true;

    	opened = true;
		ui.show();
		cdUi.show();
		cdUi.window.setPosition(mod.settings.windowCdPos[0], mod.settings.windowCdPos[1]);
		cdUi.window.setIgnoreMouseEvents(false);
		cdUi.window.setVisibleOnAllWorkspaces(true);
		cdUi.window.setAlwaysOnTop(true, 'screen-saver', 1);

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
		disableCdUi()
        mod.settings.enabled = false;

		ui.hide();
		opened = false;
		if (uiRefreshInterval != null) {
			clearInterval(uiRefreshInterval);
			uiRefreshInterval = null;
		}
    	mod.command.message("scythe-counter UI disabled. Type \"scyhte on\" to turn it back on.")

    }

	function enableCdUi() {
		mod.settings.cdUiEnabled = true;

		cdUi.show();

		cdOpened = true;
		cdUi.window.setPosition(mod.settings.windowCdPos[0], mod.settings.windowCdPos[1]);
		cdUi.window.setIgnoreMouseEvents(false);
		cdUi.window.setVisibleOnAllWorkspaces(true);
		cdUi.window.setAlwaysOnTop(true, 'screen-saver', 1);

		if (!cdUiRefreshInterval) {
			cdUiRefreshInterval = mod.setInterval(() => { moveCdUiTop() }, 500);
		}

		cdUi.window.on('move', () => { moving = true; })
		cdUi.window.on('moved', () => { mod.settings.windowCdPos = cdUi.window.getPosition(); mod.setTimeout(() => { cdMoving = false; cdUi.window.blur(); cdJustMoved = true; }, 500) })
		cdUi.window.on('close', () => { mod.log("close"); mod.settings.windowCdPos = cdUi.window.getPosition(); mod.clearAllIntervals(); cdOpened = false });
		cdUi.window.webContents.openDevTools();
	}

	function disableCdUi() {
		mod.settings.cdUiEnabled = false;

		cdUi.hide();
		cdOpened = false;
		if (cdUiRefreshInterval != null) {
			clearInterval(cdUiRefreshInterval);
			cdUiRefreshInterval = null;
		}
		cdUi.hide();
	}

}