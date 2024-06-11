document.addEventListener('DOMContentLoaded', () => {
  const { Renderer } = require('tera-mod-ui');
  let mod = new Renderer;

  let nameToMostRecentDgText = {}
  let nameToMostRecentDgStretcher = {}

  let containerDiv = document.getElementById('container');

  mod.on('newDeadlyGamble', event => {

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
    nameToMostRecentDgStretcher[event.name].className = "dgOver";
  })

  mod.on('scytheUpdate', event => {
    // check if element for name exists
    let element = nameToMostRecentDgText[event.name];
  
    if (element) element.innerHTML = makeScytheInnerHtml(event.name, event.scythe, event.aerial)
  })

  function makeScytheInnerHtml(name, scythes, aerials) {
    return `<div class="nameDiv"> ${name} </div> <img class="icon" src="icons/aerial.webp"/> ${aerials}/${scythes} <img class="icon" src="icons/scythe.webp"/>`
  }

})
