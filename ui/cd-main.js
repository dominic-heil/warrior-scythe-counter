document.addEventListener('DOMContentLoaded', () => {
  const { Renderer } = require('tera-mod-ui');
  let mod = new Renderer;

  let nameToMostRecentDgText = {}
  let nameToMostRecentDgStretcher = {}
  let selfName = null;

  let containerDiv = document.getElementById('container');


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


  mod.on('newSwift1', event => {
    activateCdOfSkillDiv('swift-active-div1', event);
  })

  mod.on('newSwift2', event => {
    activateCdOfSkillDiv('swift-active-div2', event);
  })

  mod.on('newTempest2', event => {
    activateCdOfSkillDiv('tempest2-active-div', event);
  })

  mod.on('newDeadlyGamble', event => {
    activateCdOfSkillDiv('dg-active-div', event);
  })

  mod.on('deadlyGambleOver', event => {
    disableCdOfSkillDiv('dg-active-div');
  })

  mod.on('swift1Over', event => {
    disableCdOfSkillDiv('swift-active-div1');
  });

  mod.on('swift2Over', event => {
    disableCdOfSkillDiv('swift-active-div2');
  });

  mod.on('tempest2Over', event => {
    disableCdOfSkillDiv('tempest2-active-div');
  });

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

  })
  // on edict end -> delete edict

  mod.on('edictOver', event => {
    if (edictDiv != null && document.body.contains(edictDiv)) {
      edictDiv.remove();
    }
  })

  // continous interval that gets all divs with class timeDiv, and computes the remaining time between now and the end attribute, or sets it to 0:00
  setInterval(() => {
    var timeDivs = document.getElementsByClassName('timeDiv');
    for (var i = 0; i < timeDivs.length; i++) {
      var timeDiv = timeDivs[i];
      var endTime = timeDiv.getAttribute('end');
      if (endTime != null) {
        var remaining = endTime - new Date().getTime();
        if (remaining <= 0) {
            timeDiv.innerHTML = '0:00';
        } else {
            timeDiv.innerHTML = formatMilliseconds(remaining);
        }
      }
    }
  }, 20);

  function formatMilliseconds(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let remainingMilliseconds = ms % 1000;
    let firstDigitOfMilliseconds = Math.floor(remainingMilliseconds / 100);

    return `${totalSeconds}.${firstDigitOfMilliseconds}`;
  }

  function activateCdOfSkillDiv(div, event) {
    var dgActiveDiv = document.getElementById(div);
    var parent = dgActiveDiv.parentElement;
    parent.style.display = 'block';

    dgActiveDiv.style.setProperty('--animation-duration', event.duration.toString() + 'ms');
    dgActiveDiv.style.setProperty('--skillTimeStart', (Number(event.duration) / 80).toString() + 'px');

    // compute now + event.duration
    var endTime = new Date().getTime() + Number(event.duration);

    // set it as "end" parameter of the div inside children of parent where class = timeDiv
    var timeDiv = parent.getElementsByClassName('timeDiv')[0];
    timeDiv.setAttribute('end', endTime);

    dgActiveDiv.style.animation = 'none';
    dgActiveDiv.offsetHeight; /* trigger reflow */
    dgActiveDiv.style.animation = null;
  }

  function disableCdOfSkillDiv(div) {
    var dgActiveDiv = document.getElementById(div);
    var parent = dgActiveDiv.parentElement;
    // hide parent
    parent.style.display = 'none';
  }
})
