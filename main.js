var canvas;
var manager;
var managerCtx;
var ctx;
var inventory;
var invCtx;
var mouseState = {
  x : 0,
  y : 0,
  hover: null,
  selected : null,
  mouseDown : false,
  mouseUp : false,
};

//could be array of sprites or just a sprite
var grass;
var path1;
var goldImg;
var interface;

var cwidth;
var cheight;
var row; //how many tiles in a row, determined by level
var col; //how many tiles in a column
var widthPerTile;
var heightPerTile;
var mapData = [];
var startTile;
var startDirection = [0,0];
var gold = 100;
var hp = [100, 100]; //current, max
var enemies = [];
var turrents = [];
var projectiles = []; //keep track of current projectiles created by turrets
var units = [];

let trash1 = [];
loadFrames(trash1, "assets/chii", 13, ".png");
let ninja1 = new Image();
ninja1.src = "assets/ninja1.png";
let bullet1 = new Image();
bullet1.src = "assets/bullet1.png";

requirejs.config({
    config: {
        'turrent': {
            lookup: {
              //type of turrent: interval, power, cost, range
              ninja1: [200, 10, 40, 2, ninja1]
            }
        },
        'mob': {
            lookup: {
              //type of turrent: speed, loot, attack, defense, sprite
              tutorial: [0.01, 5, 5, 0, trash1]
            }
        },
        'projectile': {
            lookup: {
              //type of bullet: speed, frames, sprite
              basic: [0.02, 1, bullet1]
            }
        }
    }
});

/*
abstracted function to draw images to game grid
*/
function drawToGrid(img, x, y, rotation = 0, health = -Infinity) {
  if (rotation != 0) {
    ctx.save();
    ctx.translate(heightPerTile*(x + 0.5), heightPerTile*(y + 0.5));
    ctx.rotate(rotation);
    ctx.translate(-heightPerTile*(x + 0.5), -heightPerTile*(y + 0.5));
    ctx.drawImage(img, heightPerTile*x, heightPerTile*y, heightPerTile-1, heightPerTile-1);
    //ctx.drawImage(img, widthPerTile*x, heightPerTile*y, widthPerTile-1, heightPerTile-1);
    ctx.restore();
  } else {
    ctx.drawImage(img, heightPerTile*x, heightPerTile*y, heightPerTile-1, heightPerTile-1);
  }
  if (health != -Infinity) {
    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.strokeStyle = "white";
    ctx.rect(heightPerTile*x + 10, heightPerTile*y + 5, heightPerTile-21, 5);
    ctx.stroke();

    let healthpercentage = health / 100;
    if (healthpercentage > 0) {
      ctx.beginPath();
      ctx.lineWidth = "0";
      ctx.fillStyle = "red";
      ctx.fillRect(heightPerTile*x + 11, heightPerTile*y + 6, (heightPerTile-23) * healthpercentage, 3);
      ctx.stroke();
    }
  }
}

//main loop
function draw() {
  setTimeout(function() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, cwidth, cheight);
    invCtx.fillStyle = "hsl(31,22%,60%)"
    invCtx.fillRect(0, 0,  inventory.width, inventory.height);

    //draw right side interface
    managerCtx.fillStyle = "hsl(31,22%,60%)"
    managerCtx.fillRect(0, 0,  manager.width, manager.height);
    //managerCtx.drawImage(interface, 0, 0,  manager.width, manager.height);
    for (let i = units.length - 1; i >= 0; --i) {
      managerCtx.drawImage(units[i].sprite, units[i].pos[1], units[i].pos[0], heightPerTile, heightPerTile);
    }
    managerCtx.beginPath();
    managerCtx.lineWidth = "1";
    managerCtx.strokeStyle = "white";
    managerCtx.rect(20, manager.height - 52, Math.min(0.5*hp[1], 250), 15);
    managerCtx.stroke();
    let healthpercentage = hp[0] / hp[1];
    managerCtx.beginPath();
    managerCtx.lineWidth = "0";
    managerCtx.fillStyle = "red";
    managerCtx.fillRect(21, manager.height - 51, Math.min(0.5*hp[1], 250) * healthpercentage - 2, 13);
    managerCtx.stroke();

    managerCtx.font = "15px Arial";
    managerCtx.fillStyle = "gold";
    managerCtx.fillText(gold, 320, manager.height - 40);
    managerCtx.drawImage(goldImg, 290, manager.height - 60, 30, 30);
    if (mouseState.selected != null) {
      managerCtx.fillStyle = "white";
      managerCtx.fillText("ATK:", 20, manager.height - 80);
      managerCtx.fillText(mouseState.selected.power, 55, manager.height - 80);
      managerCtx.fillText("SPD:", 155, manager.height - 80);
      managerCtx.fillText(1000/mouseState.selected.interval, 192, manager.height - 80);
      managerCtx.fillText("COST:", 290, manager.height - 80);
      managerCtx.fillText(mouseState.selected.cost, 340, manager.height - 80);
    }

    for (let i = 0; i < row; i++) {
      for (let j = 0; j < col; j++) {
        if (mapData[i][j] == '0' || mapData[i][j] == '0\r') {
          drawToGrid(grass, j, i);
        } else if (typeof mapData[i][j] == "string") {
          drawToGrid(path1, j, i);
        } else {
          drawToGrid(grass, j, i);
          drawToGrid(mapData[i][j].sprite, j, i, mapData[i][j].rotation);
        }
      }
    }
    for (let i = enemies.length - 1; i >= 0; --i) {
      //draw to canvas and update positions
      drawFrames(enemies[i].sprite, enemies[i].pos[1], enemies[i].pos[0], 50, 0, enemies[i].health);
      enemies[i].pos[0] += (enemies[i].dir[0] * enemies[i].speed);
      enemies[i].pos[1] += (enemies[i].dir[1] * enemies[i].speed);
      enemies[i].pos[0] = Number(enemies[i].pos[0].toFixed(2));
      enemies[i].pos[1] = Number(enemies[i].pos[1].toFixed(2));

      //check if mob needs to be removed
      let ycord = Math.floor(enemies[i].pos[0]);
      let xcord = Math.floor(enemies[i].pos[1]);
      if (ycord >= row || ycord < 0 || xcord >= col || xcord < 0) {
        hp[0] -= enemies[i].attack;
        gold -= enemies[i].attack;
        enemies.splice(i,1);
      }
      else if (enemies[i].health <= 0 ) {
        gold += enemies[i].loot;
        enemies.splice(i,1);
      } else {
        let dir = mapData[ycord][xcord].match(/[udlr]/);
        if (dir != null) {
          enemies[i].dir = mapDirection(dir[0]);
        }
      }
    }
    let curTime = Date.now();
    for (let i = turrents.length - 1; i >= 0; --i) {
      if (curTime - turrents[i].timer >= turrents[i].interval) {
        turrents[i].attack(projectiles);
        turrents[i].timer = curTime;
      }
    }
    for (let i = projectiles.length - 1; i >= 0; --i) {
      ctx.save();
      ctx.translate(heightPerTile*projectiles[i].pos[1], heightPerTile*projectiles[i].pos[0]);
      ctx.rotate(projectiles[i].rotation);
      ctx.translate(-heightPerTile*projectiles[i].pos[1], -heightPerTile*projectiles[i].pos[0]);
      ctx.drawImage(projectiles[i].sprite, heightPerTile*projectiles[i].pos[1]-10,
        heightPerTile*projectiles[i].pos[0]-10, 20, 20);
      ctx.restore();
      projectiles[i].chase(heightPerTile);
      if (projectiles[i].explode) {
        projectiles.splice(i,1);
      }
    }
    //handle user interactions
    if (mouseState.hover == 'manager') {
      if (mouseState.mouseUp == true) {
        mouseState.mouseUp = false;
      }
    }
    if (mouseState.selected != null) {
      if (mouseState.hover == 'canvas') ctx.drawImage(mouseState.selected.sprite, mouseState.x - heightPerTile/2, mouseState.y - heightPerTile/2, heightPerTile, heightPerTile);
      else if (mouseState.hover == 'manager') managerCtx.drawImage(mouseState.selected.sprite, mouseState.x - heightPerTile/2, mouseState.y - heightPerTile/2, heightPerTile, heightPerTile);
      else invCtx.drawImage(mouseState.selected.sprite, mouseState.x - heightPerTile/2, mouseState.y - heightPerTile/2, heightPerTile, heightPerTile);
    }
    requestAnimationFrame(draw);
  }, 1000 / 60); //can change 60 to whatever new fps
}

function loadFrames(images, filename, frames, extension) {
  for (let c = 1; c <= frames; ++c) {
    let temp = new Image();
    temp.src = filename + c.toString() + extension;
    images.push(temp);
  }
}

/*
animate sprite array according to number of frames and duration (ms)
*/
function drawFrames(sprite, x, y, duration, rotation = 0, health = -Infinity) {
  let mod = duration * sprite.length;
  let idx = Math.floor((Date.now() % mod) / duration);
  drawToGrid(sprite[idx], x, y, rotation, health);
}

//get file from same source directory for stageNum
function loadLevel(stageNum)
{
  var request = new XMLHttpRequest();
  request.addEventListener("load", parseMapData);
  request.open("GET", `assets/s${stageNum}.txt`);
  request.send();
}

function parseMapData() {
  mapData = [];
  let data = this.responseText.split("\n");
  row = parseInt(data[0].split(/[ ,]+/)[0]);
  col = parseInt(data[0].split(/[ ,]+/)[1]);
  widthPerTile = (cwidth / col); //vestigial parameter since canvas width now includes sidebars
  heightPerTile = (cheight / row);
  require(['reIndexOf', 'turrent'], function(reIndexOf, turrent) {
    for (let i = 1; i <= row; ++i) {
      mapData.push(data[i].split(/[ ,]+/));
      let startTileInd = reIndexOf(mapData[i-1], /s./);
      if (startTileInd != -1) {
        startTile = [i-1, startTileInd];
        let dir = mapData[i-1][startTileInd][1];
        startDirection = mapDirection(dir);
      }
    }

    //setup mobs and shop here before going into draw loop
    spawnEnemies(startTile, startDirection, 5)

    //setup available units to pick in manager
    units.push(new turrent("ninja1", enemies, [150, 150]));
    draw();
  });
}

function spawnEnemies(startTile, direction, amount, types = ["tutorial", "tutorial"]) {
  require(['mob'], function(mob) {
    let startTileCopy = startTile.slice();
    enemies.push(new mob("tutorial", startTileCopy, startDirection));
    if (amount > 1) {
      setTimeout(function() {
        spawnEnemies(startTile, direction, --amount, types);
      }, 500);
    }
  });
}

function mapDirection(dir)
{
  if (dir == 'd') {
    return [1, 0];
  } else if (dir == 'u') {
    return [-1, 0];
  } else if (dir == 'l') {
    return [0, -1];
  } else if (dir == 'r') {
    return [0, 1];
  }
}

window.onload = function()
{
  canvas = document.getElementById('canvas');
  //TODO convert to css
  canvas.style = "position: absolute; top: 0px; left: 0px; right: 0px; bottom: 0px; margin: auto;";
  canvas.height = window.innerHeight - 2;
  canvas.width = window.innerWidth - 741;
  manager = document.getElementById('manager');
  manager.style="position: absolute; top:0; right:0; bottom:0;"
  manager.width = 741 / 2;
  manager.height = window.innerHeight - 2;
  inventory = document.getElementById('inventory');
  inventory.style="position: absolute; top:0; left:0; bottom:0;"
  inventory.width = 741 / 2;
  inventory.height = window.innerHeight - 2;
  ctx = canvas.getContext('2d');
  managerCtx = manager.getContext('2d');
  invCtx = inventory.getContext('2d');
  canvas.addEventListener('mousedown', function(e) {
    /*
    let temp = mapData[Math.floor(mouseState.y / heightPerTile)][Math.floor(mouseState.x / heightPerTile)];
    if (typeof temp == "object" && temp != null) {
      mouseState.selected = temp;
    }
    */
  });
  canvas.addEventListener('mouseup', function(e) {
    if (typeof mouseState.selected == "object" && mouseState.selected != null) {
      let targetTile = mapData[Math.floor(mouseState.y / heightPerTile)][Math.floor(mouseState.x / heightPerTile)];
      if ((targetTile == '0' || targetTile == '0\r') && gold >= mouseState.selected.cost) {
        mapData[Math.floor(mouseState.y / heightPerTile)][Math.floor(mouseState.x / heightPerTile)] = mouseState.selected;
        turrents.push(mouseState.selected);
        gold -= mouseState.selected.cost;
        mouseState.selected.onDrop([Math.floor(mouseState.y / heightPerTile), Math.floor(mouseState.x / heightPerTile)]);
      }
      mouseState.selected = null;
    }
  });
  canvas.addEventListener('mousemove', function(e) {
    let rect = canvas.getBoundingClientRect();
    mouseState.x = e.clientX - rect.left;
    mouseState.y = e.clientY - rect.top;
    mouseState.hover = 'canvas';
  });
  inventory.addEventListener('mousemove', function(e) {
    let rect = inventory.getBoundingClientRect();
    mouseState.x = e.clientX - rect.left;
    mouseState.y = e.clientY - rect.top;
    mouseState.hover = 'inv';
  });
  inventory.addEventListener('mousedown', function(e) { mouseState.mouseDown = true; });
  inventory.addEventListener('mouseup', function(e) { mouseState.mouseUp = true; });
  manager.addEventListener('mousemove', function(e) {
    let rect = manager.getBoundingClientRect();
    mouseState.x = e.clientX - rect.left;
    mouseState.y = e.clientY - rect.top;
    mouseState.hover = 'manager';
  });
  manager.addEventListener('mousedown', function(e) {
    for (let i = units.length - 1; i >= 0; --i) {
      if (mouseState.x > units[i].pos[1] && mouseState.y > units[i].pos[0] && mouseState.x <= (units[i].pos[1] + heightPerTile) &&
      mouseState.y <= (units[i].pos[0] + heightPerTile)) {
        mouseState.selected = units[i];
        let posCopy = units[i].pos.slice();
        require(['turrent'], function(turrent) {
          units[i] = new turrent("ninja1", enemies, posCopy);
        });
      }
    }
  });
  manager.addEventListener('mouseup', function(e) {
    mouseState.selected = null;
  });

  //preload images here
  grass = new Image();
  grass.src = "assets/grass.png"
  path1 = new Image();
  path1.src = "assets/path.jpg";
  goldImg = new Image();
  goldImg.src = "assets/gold.png";
  bullet1 = new Image();
  bullet1.src = "assets/bullet1.png";
  interface = new Image();
  interface.src = "assets/b.png";
  cwidth = canvas.offsetWidth;
  cheight = canvas.offsetHeight;
  loadLevel(1);
}

function printMap(map)
{
  for (let i = 0; i < map.length; ++i) {
    let output = "";
    for (let j = 0; j < map[i].length; ++j) {
      output += map[i][j];
    }
    console.log(output);
  }
}
