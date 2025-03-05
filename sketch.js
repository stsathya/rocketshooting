// Dodging Obstacles Game in p5.js
// Move your ship to avoid falling obstacles

let player;
let obstacles = [];
let particles = [];
let stars = []; // Array to store star properties
let spawnInterval = 60; // Spawn an obstacle every 60 frames (~1 second)
let score = 0;
let gameOver = false;
let emailInput;
let submitButton;
let leaderboard = [];
let combo = 0;
let comboTimer = 0;
let level = 1;
let levelProgress = 0;
let levelThreshold = 10;
let lastHitTime = 0;
let gameOverDiv;

function setup() {
  createCanvas(600, 800);
  player = new Player(width / 2, height - 50);
  frameRate(60);
  
  // Generate stars once with a fixed seed for consistency
  randomSeed(99);
  for (let i = 0; i < 100; i++) {
    let x = random(width);
    let y = random(height);
    let brightness = random(100, 255);
    stars.push({ x: x, y: y, brightness: brightness });
  }
}

function draw() {
  background(10);
  
  // Animate the stars to move downward
  for (let star of stars) {
    star.y += 1; // Move star downward
    if (star.y > height) {
      star.y = 0; // Wrap star to the top
      star.x = random(width); // Randomize x position for variety
    }
    fill(255, star.brightness);
    noStroke();
    ellipse(star.x, star.y, 2, 2);
  }

  // Update player position to follow the mouse
  player.x = mouseX;
  player.y = mouseY;

  // Update and show the player
  player.update();
  player.show();

  // Update and display power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    powerUps[i].update();
    powerUps[i].show();

    // Remove power-ups that have left the screen
    if (powerUps[i].offscreen()) {
      powerUps.splice(i, 1);
      continue;
    }

    // Check if player collects the power-up
    if (powerUps[i].collected(player)) {
      bulletCount += 1; // Increase bullet count
      powerUps.splice(i, 1);
    }
  }

  // Update and display bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update();
    bullets[i].show();

    // Remove bullets that have left the screen
    if (bullets[i].offscreen()) {
      bullets.splice(i, 1);
      continue;
    }

    // Check collision with obstacles
    for (let j = obstacles.length - 1; j >= 0; j--) {
      if (dist(bullets[i].x, bullets[i].y, obstacles[j].x, obstacles[j].y) < obstacles[j].size) {
        // Create hit effect
        for(let k = 0; k < 10; k++) {
          particles.push(new Particle(obstacles[j].x, obstacles[j].y));
        }
        
        // Update combo system
        let currentTime = millis();
        if (currentTime - lastHitTime < 1000) { // If hit within 1 second
          combo++;
          comboTimer = 60;
        } else {
          combo = 1;
        }
        lastHitTime = currentTime;
        
        // Calculate score with combo
        score += combo;
        
        // Update level progress
        levelProgress++;
        if (levelProgress >= levelThreshold) {
          level++;
          levelProgress = 0;
          levelThreshold += 5; // Increase threshold for next level
          spawnInterval = max(20, 60 - (level * 5)); // Increase spawn rate with level
        }
        
        obstacles.splice(j, 1);
        bullets.splice(i, 1);
        break;
      }
    }
  }

  // Spawn new obstacles periodically
  if (!gameOver && frameCount % spawnInterval === 0) {
    obstacles.push(new Obstacle());
  }

  // Spawn new power-ups every 30 seconds, limit to 5
  if (!gameOver && frameCount % (60 * 30) === 0 && powerUps.length < 5) {
    powerUps.push(new PowerUp());
  }

  // Update and display obstacles
  for (let i = obstacles.length - 1; i >= 0; i--) {
    obstacles[i].update();
    obstacles[i].show();

    // Remove obstacles that have left the screen
    if (obstacles[i].offscreen()) {
      obstacles.splice(i, 1);
      continue;
    }

    // Check collision with player
    if (obstacles[i].hits(player)) {
      // Create explosion particles on collision
      for (let k = 0; k < 50; k++) {
        particles.push(new Particle(player.x, player.y));
      }
      gameOver = true;
    }
  }

  // Update and display explosion particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].finished()) {
      particles.splice(i, 1);
    }
  }

  // Display combo and level
  displayComboAndLevel();

  // Display score and Game Over message if needed
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text("Score: " + score, 10, 10);

  if (gameOver) {
    noLoop(); // Stop the draw loop

    // Create game over overlay if it doesn't exist
    if (!gameOverDiv) {
        gameOverDiv = createDiv('');
        gameOverDiv.class('game-over-overlay');
        
        // Game Over title
        let titleDiv = createDiv('GAME OVER');
        titleDiv.class('game-over-title');
        titleDiv.parent(gameOverDiv);
        
        // Final score
        let scoreDiv = createDiv(`Final Score: ${score}`);
        scoreDiv.class('final-score');
        scoreDiv.parent(gameOverDiv);
        
        // Input container
        let inputContainer = createDiv('');
        inputContainer.class('input-container');
        inputContainer.parent(gameOverDiv);
        
        // Email input
        emailInput = createInput('');
        emailInput.attribute('placeholder', 'Enter your email');
        emailInput.parent(inputContainer);
        
        // Submit button
        submitButton = createButton('Submit Score');
        submitButton.parent(inputContainer);
        submitButton.mousePressed(submitScore);
        
        // Restart text
        let restartDiv = createDiv('Press \'R\' to Restart');
        restartDiv.class('restart-text');
        restartDiv.parent(gameOverDiv);
    }
  }

  // Handle spread bullets effect
  if (spreadBullets) {
    spreadTimer--;
    if (spreadTimer <= 0) {
      spreadBullets = false;
    }
  }

  // Update combo timer
  if (comboTimer > 0) {
    comboTimer--;
  }
}

function submitScore() {
  const email = emailInput.value();
  leaderboard.push({ email: email, score: score });
  leaderboard.sort((a, b) => b.score - a.score); // Sort leaderboard by score
  updateLeaderboardDisplay();
  if (gameOverDiv) {
    gameOverDiv.remove();
    gameOverDiv = null;
  }
  resetGame();
}

function updateLeaderboardDisplay() {
  const leaderboardList = document.getElementById('leaderboard-list');
  leaderboardList.innerHTML = ''; // Clear existing entries
  leaderboard.forEach(entry => {
    const li = document.createElement('li');
    li.textContent = `${entry.email}: ${entry.score}`;
    leaderboardList.appendChild(li);
  });
}

// ===== Player Class =====
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.hspeed = 0;
    this.vspeed = 0;
    this.speed = 5;
  }

  update() {
    this.x += this.hspeed * this.speed;
    this.y += this.vspeed * this.speed;
    // Constrain player within the canvas
    this.x = constrain(this.x, 20, width - 20);
    this.y = constrain(this.y, 20, height - 20);
  }

  show() {
    push();
    translate(this.x, this.y);
    
    // Rocket flames (animated)
    let flameSize = random(10, 15);
    // Main flame
    fill(255, 150, 0, 200);
    beginShape();
    vertex(-8, 20);
    vertex(0, 40 + flameSize);
    vertex(8, 20);
    endShape(CLOSE);
    
    // Inner flame
    fill(255, 255, 0, 150);
    beginShape();
    vertex(-4, 20);
    vertex(0, 30 + flameSize/2);
    vertex(4, 20);
    endShape(CLOSE);
    
    // Rocket body
    // Main body (metallic silver)
    fill(220, 220, 230);
    noStroke();
    // Sleek body shape
    beginShape();
    vertex(0, -30); // Nose tip
    vertex(-8, -20);
    vertex(-10, 0);
    vertex(-8, 20);
    vertex(8, 20);
    vertex(10, 0);
    vertex(8, -20);
    endShape(CLOSE);
    
    // Cockpit window
    fill(100, 200, 255, 200);
    ellipse(0, -5, 12, 18);
    
    // Wing details
    fill(180, 180, 190);
    // Left wing
    beginShape();
    vertex(-10, 0);
    vertex(-20, 15);
    vertex(-8, 20);
    endShape(CLOSE);
    // Right wing
    beginShape();
    vertex(10, 0);
    vertex(20, 15);
    vertex(8, 20);
    endShape(CLOSE);
    
    // Nose cone detail
    fill(200, 0, 0);
    triangle(-8, -20, 8, -20, 0, -30);
    
    // Engine details
    fill(50);
    rect(-6, 15, 4, 8);
    rect(2, 15, 4, 8);
    
    pop();
  }

  setDir(direction) {
    this.hspeed = direction;
  }
  
  setVerticalDir(direction) {
    this.vspeed = direction;
  }
}

// ===== Obstacle Class =====
class Obstacle {
  constructor() {
    // Random spawn position across the width
    this.x = random(width);
    this.y = -20; // Start just above the screen

    // Random size for the obstacle
    this.size = random(20, 40);

    // Random angle and speed for varied directions
    let angle = random(45, 135); // Angles in degrees: 90° is straight down
    let speed = random(2, 5);
    this.hspeed = speed * cos(radians(angle));
    this.vspeed = speed * sin(radians(angle));
  }

  update() {
    this.x += this.hspeed;
    this.y += this.vspeed;
  }

  show() {
    push();
    translate(this.x, this.y);
    
    // Draw the main body of the enemy ship
    fill(150, 0, 0); // Dark red color
    noStroke();
    
    // Main body
    beginShape();
    vertex(-20, -20);
    vertex(20, -20);
    vertex(25, 0);
    vertex(20, 20);
    vertex(-20, 20);
    vertex(-25, 0);
    endShape(CLOSE);
    
    // Cockpit
    fill(50, 50, 200, 150); // Blue transparent glass
    ellipse(0, 0, 20, 20);
    
    // Wing details
    fill(200, 0, 0); // Brighter red
    triangle(-25, 0, -40, -15, -40, 15); // Left wing
    triangle(25, 0, 40, -15, 40, 15);    // Right wing
    
    // Engine glow effect
    for(let i = 0; i < 3; i++) {
      fill(255, 100 + i * 50, 0, 150 - i * 40); // Orange/yellow glow
      ellipse(-10, 25 + i * 5, 8 - i * 2, 15 - i * 3); // Left engine
      ellipse(10, 25 + i * 5, 8 - i * 2, 15 - i * 3);  // Right engine
    }
    
    pop();
  }

  offscreen() {
    return (this.x < -this.size || this.x > width + this.size || 
            this.y < -this.size || this.y > height + this.size);
  }

  // Simple collision check using distance
  hits(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < this.size + 20; // 20 approximates half the player's width
  }
}

// ===== Particle Class for Explosions =====
class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-3, 3);
    this.vy = random(-3, 3);
    this.alpha = 255;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 5;
  }

  finished() {
    return this.alpha < 0;
  }

  show() {
    noStroke();
    fill(255, this.alpha);
    ellipse(this.x, this.y, 4);
  }
}

// ===== Bullet Class =====
class Bullet {
  constructor(x, y, angle = 0) {
    this.x = x;
    this.y = y;
    this.r = 5;
    this.speed = 10;
    this.angle = angle; // Angle for spread effect
  }

  update() {
    this.x += this.speed * cos(this.angle);
    this.y += this.speed * sin(this.angle);
  }

  show() {
    fill(50, 150, 255);
    noStroke();
    ellipse(this.x, this.y, this.r * 2);
  }

  offscreen() {
    return this.y < 0 || this.x < 0 || this.x > width;
  }
}

// Add bullets array to store active bullets
let bullets = [];

// ===== Enhanced PowerUp Class =====
class PowerUp {
  constructor() {
    this.x = random(width);
    this.y = random(height / 2); // Spawn in the upper half
    this.size = 15;
    this.angle = 0; // For rotation animation
  }

  update() {
    this.y += 2; // Move downward
    this.angle += 0.1; // Rotate for animation
  }

  show() {
    fill(0, 255, 255);
    noStroke();
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    beginShape();
    for (let i = 0; i < 6; i++) { // Draw a hexagon
      let angle = TWO_PI / 6 * i;
      let sx = cos(angle) * this.size;
      let sy = sin(angle) * this.size;
      vertex(sx, sy);
    }
    endShape(CLOSE);
    pop();
  }

  offscreen() {
    return this.y > height;
  }

  collected(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < this.size + 20; // 20 approximates half the player's width
  }
}

// Add power-ups array to store active power-ups
let powerUps = [];
let spreadBullets = false;
let spreadDuration = 300; // Duration of spread bullets effect
let spreadTimer = 0;
let bulletCount = 1; // Number of bullets fired

// Modify keyPressed function to shoot multiple bullets with spread
function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    player.setDir(-1);
  } else if (keyCode === RIGHT_ARROW) {
    player.setDir(1);
  } else if (keyCode === UP_ARROW) {
    player.setVerticalDir(-1);
  } else if (keyCode === DOWN_ARROW) {
    player.setVerticalDir(1);
  } else if (key === ' ') { // Spacebar to shoot
    for (let i = 0; i < bulletCount; i++) {
      let offset = (i - (bulletCount - 1) / 2) * 0.1; // Spread angle
      bullets.push(new Bullet(player.x, player.y, -PI/2 + offset));
    }
  } else if (key === 'r' || key === 'R') { // Restart the game
    if (gameOver) {
      resetGame();
    }
  }
}

function keyReleased() {
  if (keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW) {
    player.setDir(0);
  }
  if (keyCode === UP_ARROW || keyCode === DOWN_ARROW) {
    player.setVerticalDir(0);
  }
}

function mousePressed() {
  if (mouseButton === LEFT) { // Check if the left mouse button is pressed
    for (let i = 0; i < bulletCount; i++) {
      let offset = (i - (bulletCount - 1) / 2) * 0.1; // Spread angle
      bullets.push(new Bullet(player.x, player.y, -PI/2 + offset));
    }
  }
}

function displayComboAndLevel() {
  // Display level
  fill(255);
  textSize(20);
  textAlign(RIGHT, TOP);
  text(`Level ${level}`, width - 10, 10);
  
  // Display combo if active
  if (combo > 1) {
    let alpha = map(comboTimer, 0, 60, 0, 255);
    fill(255, 255, 0, alpha);
    textSize(32);
    textAlign(CENTER, TOP);
    text(`${combo}x COMBO!`, width/2, 50);
  }
  
  // Level progress bar
  fill(100);
  rect(width/2 - 100, 30, 200, 10);
  fill(0, 255, 0);
  rect(width/2 - 100, 30, map(levelProgress, 0, levelThreshold, 0, 200), 10);
}

function resetGame() {
  if (gameOverDiv) {
    gameOverDiv.remove();
    gameOverDiv = null;
  }
  score = 0;
  gameOver = false;
  obstacles = [];
  particles = [];
  bullets = [];
  powerUps = [];
  spreadBullets = false;
  bulletCount = 1; // Reset bullet count to 1
  player = new Player(width / 2, height - 50); // Reset player position
  loop(); // Restart the draw loop
  combo = 0;
  comboTimer = 0;
  level = 1;
  levelProgress = 0;
  levelThreshold = 10;
  lastHitTime = 0;
  spawnInterval = 60;
}