document.addEventListener('DOMContentLoaded', () => {
  const { Renderer } = require('tera-mod-ui');
  let mod = new Renderer;

  let nameToMostRecentDgText = {}
  let nameToMostRecentDgStretcher = {}
  let selfName = null;

  let containerDiv = document.getElementById('container');



  document.getElementById('settings-icon').addEventListener('click', function() {      
    if (document.getElementById('settings-overlay').style.display === 'block') {
      document.getElementById('settings-overlay').style.display = 'none';
    } 
    else {
      mod.send('requestSettings', {})

      document.getElementById('settings-overlay').style.display = 'block';
    }
  });

  document.getElementById('close-button').addEventListener('click', function() {
    document.getElementById('settings-overlay').style.display = 'none';
  });

  document.getElementById('save-button').addEventListener('click', function() {
    const enabled = document.getElementById('enabled-checkbox').checked;
    const onlySelf = document.getElementById('self-checkbox').checked;
    const displayPriestBuffs = document.getElementById('priest-buffs-checkbox').checked;
    const displayMessage = document.getElementById('self-displayMessage-checkbox').checked;

    console.log('Enabled', enabled)
    console.log('Only Self:', onlySelf);
    console.log('Display Priest Buffs:', displayPriestBuffs);
    console.log('Display Priest Buffs:', displayMessage);

    document.getElementById('settings-overlay').style.display = 'none';
    console.log({enabled: enabled, onlySelf:onlySelf, displayPriestBuffs:displayPriestBuffs, displayMessage:displayMessage})
    mod.send('settingsBack', {enabled: enabled, onlySelf: onlySelf, displayPriestBuffs: displayPriestBuffs, displayMessage: displayMessage})
  });

  mod.on('settings', event => {
    document.getElementById('enabled-checkbox').checked = event.enabled;
    document.getElementById('self-checkbox').checked = event.onlySelf;
    document.getElementById('priest-buffs-checkbox').checked = event.displayPriestBuffs;
  })



  window.addEventListener('click', event => {
    if (document.getElementById('mainBody').contains(event.target)) {
      mod.send('back', {text: "INSIDE"})
    } else {
      mod.send('back', {text: "OUTSIDE"})
    }
  }) 

  mod.on('newDeadlyGamble', event => {

    mod.send('back', {text: "back"})

    var newDiv = document.createElement('div');
    newDiv.className = 'background';


    var stretchDiv = document.createElement('div');
    stretchDiv.className = 'dgActive';
    stretchDiv.style.setProperty('--animation-duration', event.duration.toString() + 'ms');
    newDiv.appendChild(stretchDiv);

    var textDiv = document.createElement('div');
    textDiv.className = 'textDiv';
    textDiv.innerHTML = makeScytheInnerHtml(event.name, 10, 10)
    newDiv.appendChild(textDiv);

    document.getElementById('container').prepend(newDiv);

    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    nameToMostRecentDgText[event.name] = textDiv
    nameToMostRecentDgStretcher[event.name] = stretchDiv

  })


  mod.on('deadlyGambleOver', event => {
      mod.send('back', {text: "stuff" + selfName})
    nameToMostRecentDgStretcher[event.name].className = "dgOver";
    if (event.isSelf) {
      nameToMostRecentDgStretcher[event.name].className = "dgOver dgOverSelf";
    }
  })

  mod.on('scytheUpdate', event => {
    // check if element for name exists
    let element = nameToMostRecentDgText[event.name];
  
    if (element) element.innerHTML = makeScytheInnerHtml(event.name, event.scythe, event.aerial)
  })

  function makeScytheInnerHtml(name, scythes, aerials) {
    return `<img class="classIcon" src="icons/warrior.webp"> <div class="nameDiv"> ${name} </div> <img class="icon" src="icons/aerial.webp"/> ${aerials}/${scythes} <img class="icon" src="icons/scythe.webp"/>`
  }

  let edictDiv = null;

  mod.on('newEdict', event => {
    if (edictDiv != null && document.body.contains(edictDiv)) {
      edictDiv.remove();
    }

    var newDiv = document.createElement('div');
    newDiv.className = 'background';


    var stretchDiv = document.createElement('div');
    stretchDiv.className = 'dgActive';
    stretchDiv.style.setProperty('--animation-duration', event.duration.toString() + 'ms');
    newDiv.appendChild(stretchDiv);

    var textDiv = document.createElement('div');
    textDiv.className = 'textDiv';
    textDiv.innerHTML = `<img class="classIcon" src="icons/priest.webp"> <div class="nameDiv"> ${event.name} </div> <img class="icon" src="icons/edict.webp"/> `
    newDiv.appendChild(textDiv);

    document.getElementById('container').prepend(newDiv);

    edictDiv = newDiv
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    // on edict start -> if previous edict exists -> delete
    // add new at start with duration with new name and id edictDiv

  })
  // on edict end -> delete edict

  mod.on('edictOver', event => {
    if (edictDiv != null && document.body.contains(edictDiv)) {
      edictDiv.remove();
    }
  })
})
