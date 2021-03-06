export default {
  // Using threeJS raycaster to map our object selection attempts to something in the 3D matrix
  intersect: function() {
    // If the user is usingVR, the raycaster should only use the camera, while the 
    // non-VR version should apply both camera and mouse
    if (this.usingVR) {
      this.raycaster.set(
        this.camera.getWorldPosition(), 
        this.camera.getWorldDirection()
      );
    } else {
      this.raycaster.setFromCamera(this.mouse, this.camera); 
    }

    this.intersected = this.raycaster.intersectObjects(this.scene.children);

    if (this.intersected[0]) {
      return this.intersected[0].object;
    }
    return null;
  },
  // Adds display text to the screen to inform users of current game stage or progress
  addSign: function(stage) {
    let texture = this.textureLoader.load('images/button-text/' + stage + '.png');
    let plane = new THREE.PlaneGeometry(512, 128);
    let material = new THREE.MeshBasicMaterial({ map: texture });
    material.transparent = true;

    let sign = new THREE.Mesh(plane, material);

    sign.position.set(0, 110, 20);
    sign.name = stage;
    this.scene.add(sign);
  },
  addPlayerSign: function(person, player, position) {
    let texture = this.textureLoader.load('images/user-image/' + player + '.png');
    let plane = new THREE.PlaneGeometry(50, 50);
    let material = new THREE.MeshBasicMaterial({map: texture});
    material.transparent = true;

    let sign = new THREE.Mesh(plane, material);

    sign.position.set(position.x, position.y, position.z);
    sign.name = player;
    person.add(sign);
  },
  // Adds the relevant buttons to the screen to allow users to perform actions appropriate
  // to the game phase
  addButton: function(name, option, size, position) {
    let geometry = new THREE.BoxGeometry(size.lenx, size.leny, size.lenz);
    let material = new THREE.MeshPhongMaterial(option);
    let button = new THREE.Mesh(geometry, material);
    button.position.set(position.posx, position.posy, position.posz);
    button.name = name;

    this.scene.add(button);
  },
  addSelf: function(name) {
    let geometry = new THREE.CylinderGeometry( 10, 10, 30, 64 );
    let material = new THREE.MeshLambertMaterial({color: this.roleColors['defaultColors']});
    let cylinder = new THREE.Mesh(geometry, material);

    cylinder.position.set(0, -40, 0);
    cylinder.name = name;

    this.scene.add(cylinder);
  },
  addPlayerToken: function(name, size, position) {
    let texture = this.textureLoader.load('images/in-game/' + name + '.jpg');
    let box = new THREE.BoxGeometry(size.x, size.y, size.z);
    let material = new THREE.MeshBasicMaterial({map: texture});

    let token = new THREE.Mesh(box, material);

    token.position.set(position.x, position.y, position.z );
    token.name = name;

    this.scene.add(token);
  },
  removeObject: function(name) {
    this.scene.remove(this.scene.getObjectByName(name));
  },
  // Options may include a choices array that denotes the possible objects that should be 
  // getting clicked on. Allows for filtering of these objects. 
  addClickEventListener: function(signName, maxSelects, callback, options) {
    this.selected = [];
    this.addSign(signName);

    this.renderer.domElement.addEventListener('click', this.clickEvent = (e) => {
      // Code originally part of this click handler moved to itemSelection in order to be
      // usable by both click and VR
      console.log('click detected');
      this.itemSelection(signName, maxSelects, callback, options);
    });
  },
  removeClickEventListener: function() {
    console.log('IS THE CLICKEVENT REMOVED', this.renderer.domElement.eventListener);
    this.renderer.domElement.removeEventListener('click', this.clickEvent);
  },
  // Function that is called by either the click event listener or the VR selection 
  itemSelection: function(signName, maxSelects, callback, options) {
    
    let hitObject = this.intersected.length > 0 ? this.intersected[0].object : null;

    console.log('item selection run. hit object: ', hitObject);

    if(!hitObject) {
      return;
    }
    
    console.log('comparing choices of ', options);
    console.log('to hitobject named: ', hitObject.name);
    if (options.choices && options.choices.indexOf(hitObject.name) > -1) {
      console.log('check passed');
      this.scene.getObjectByName(hitObject.name).material.color.setHex(0xff69b4);        
      if (this.selected.indexOf(hitObject.name) < 0) {
        this.selected.push(hitObject.name);
        console.log('added to selected. new selected: ', this.selected);
      }
    } 
    if (this.selected.length >= maxSelects) {
      callback(this.selected);
      this.removeObject(signName);
      if (this.usingVR) {
        this.removeVREventListener(signName);
      }
      this.removeClickEventListener(this.clickEvent);
    }     

  },
  // At the end of the quest, reveal to players quest result and the related votes
  resolveQuest: function(result, successVotes, failVotes) {
    // this.addSign(result === 'success' ? 'questSuccess' : 'questFail');

    let renderButtonList = [];

    // Position
    let displayX = -100;
    let displayY = 10;
    let displayZ = 0;

  },
  // Takes a list of players and sets them into a circle formation. 
  // Returns the same list of players with coordinate property added
  setCircleCoordinates: function(players, radius) {

    // Interval is decided by players to render + the "self" player
    // Angle is in radians as Math.sin() works with radians instead of angles
    let angle = (2 * Math.PI) / (players.length + 1);

    // Note: As the camera begins at z of the radius on the 3D plane, the "circle" 
    // the players will make will have z "x coordinteas" and x "y coordinates"
    for (let x = 0; x < players.length; x++) {
      let position = (x + 1) * angle;
      // coords are recorded in regards to the 3D plane
      let coords = {
        x: Math.floor(Math.sin(position) * radius),
        y: 0,
        z: Math.floor(Math.cos(position) * radius)
      }
      players[x].pos = coords;
    }

    return players;

  },
  // Move players to their correct position based on the position property
  positionPlayers: function(players, scene) {

    let numPlayers = players.length;

    for (let x = 0; x < numPlayers; x++) {
      let playerObj = scene.getObjectByName(players[x].uid);
      // If scene.getObjectByName returned a falsy value, this means that it is
      // the uid is of the "self" player
      if (playerObj) {
        let moveX = playerObj.position.x > players[x].pos.x ? -1 : playerObj.position.x < players[x].pos.x ? 1 : 0;
        let moveZ = playerObj.position.z > players[x].pos.z ? -1 : playerObj.position.z < players[x].pos.z ? 1 : 0;

        playerObj.position.x += moveX;
        playerObj.position.z += moveZ;
      }
    }
  },
  // At the end of a phase, allows changes to players to be returned to normal
  resetPlayers: function(players, scene) {
    for (let x = 0; x < players.length; x++) {
      scene.getObjectByName(players[x].uid).material.color.setHex(players[x].color);
    }
  }
};