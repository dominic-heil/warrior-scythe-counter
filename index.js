if (global.TeraProxy.DiscordUrl.includes('YjUnmbgV')) global.TeraProxy.GUIMode = true
//have a very autistic fix for menma not setting GUIMode to true when he ripped toolbox to his launcher
//the below line could just be removed, but this keeps error handling when ran in cli mode
if (!global.TeraProxy.GUIMode) throw new Error('Proxy GUI is not running!');
const { Host } = require('tera-mod-ui');
const path = require("path");

const SettingsUI = require('tera-mod-ui').Settings;
// https://github.com/tera-toolbox/tera-data/tree/master/definitions
const DEADLY_GAMBLE_ABNORMAL = 100801;

const SCYTHE_IDS = [300900, 300930, 380100, 380130];
const AERIAL_IDS = [410131];

const x_pos = 3300;
const y_pos = 802;

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
		focusable: true,
		width: 300,
		height: 182,
		resizable: true,
		center: true,
		x: x_pos,
		y: y_pos,
		autoHideMenuBar: true,
		titleBarStyle: 'hidden',
		webPreferences: { nodeIntegration: true, devTools: false }
	}, false, path.join(__dirname, 'ui'))

	let opened = false,
		focused = null,
		focusChange = true,
		moving = false;


	mod.game.on('enter_game', () => { if (!opened) { mod.command.exec('scythe ui') } })
	mod.game.on('leave_game', () => { ui.close(); mod.clearAllIntervals() })

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
        ui.send('deadlyGambleOver', {name: name} )
    }

    mod.hook('S_ABNORMALITY_BEGIN', 4, {order: -Infinity}, event => {
      
        if (event.id === DEADLY_GAMBLE_ABNORMAL) {
    		if (teamMemberList.includes(event.target)) {
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
    	}
    })

	mod.hook('S_ABNORMALITY_END', 1, {order: -Infinity}, (event) => {
	    if (event.id === DEADLY_GAMBLE_ABNORMAL) {
	        sendDeadlyGabmeOverToUi(event.target)
            timeoutMap[event.target] = null;	
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
    	mod.log("S_LOGIN: ");
    	mod.log(event);
    	teamMemberNameMap = {};
		teamMemberNameMap[event.gameId] = event.name;
		teamMemberList = [event.gameId];
    })

    // on logout set team member list to nothing



	async function moveTop() {
		let gameFocused = await mod.clientInterface.hasFocus() 
		let uiFocused = await ui.window.isFocused()
		let uiShown = await ui.window.isVisible()
		if ((gameFocused && !uiShown) || (uiFocused && !uiShown)) {
			ui.show()
		}

		if (!gameFocused && !uiFocused && uiShown) {
			ui.hide()
		}

		if (gameFocused) { ui.window.moveTop();}
	}

    // UI

    mod.command.add('scythe', {
        $default() {
            if (uii) {
                uii.show();
                if (uii.ui.window) {
                    uii.ui.window.webContents.on("did-finish-load", () => {
                        uii.ui.window.webContents.executeJavaScript(
                          "!function(){var e=document.getElementById('close-btn');e.style.cursor='default',e.onclick=function(){window.parent.close()}}();"
                        );
                    });
                }
            } else {
                mod.settings.enabled = !mod.settings.enabled;
                mod.command.message(mod.settings.enabled ? 'enabled' : 'disabled');
            }
        },
        ui() {
        	mod.log("ui:", opened)
        	if (!opened) {
        		opened = true;
				ui.show();
				ui.window.setPosition(x_pos, y_pos);
				ui.window.setIgnoreMouseEvents(false);
				mod.setInterval(() => { moveTop() }, 500);
				ui.window.on('move', () => { moving = true; })
				ui.window.on('moved', () => { mod.setTimeout(() => { moving = false; }, 500) })
				ui.window.on('close', () => { mod.clearAllIntervals(); opened = false });
	//			ui.window.addEventListener("click", (event) => {mod.log("asdasdasd")});
				ui.window.webContents.openDevTools();
        	} else {
        		ui.hide();
        		opened = false;
        	}
        	mod.command.message(opened ? "scythe UI started": "scythe UI stopped")
        },
        on() {
            mod.settings.enabled = true;
            mod.command.message('enabled');
        },
        off() {
            mod.settings.enabled = false;
            mod.command.message('disabled');
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

    let uii = null;
    if (global.TeraProxy.GUIMode) {
        uii = new SettingsUI(mod, require('./settings_structure'), mod.settings, {
            width: 750,
            height: 280,
            resizable: false
        });
        uii.on('update', settings => {
            mod.settings = settings;
        });

        this.destructor = () => {
            if (uii) {
                uii.close();
                uii = null;
            }
        };
    }
}