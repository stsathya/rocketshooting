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
let boss = null;
let bossSpawned = false;
let bossWarningTimer = 0;

// Add new global variables for power-up effects
let powerUpEffects = {
  spreadShot: false,
  rapidFire: false,
  shield: false,
  speedBoost: false
};

let powerUpTimers = {
  spreadShot: 0,
  rapidFire: 0,
  shield: 0,
  speedBoost: 0
};

// Add touch control variables
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;
let lastTouchShootTime = 0;
let touchShootDelay = 250; // Minimum delay between touch shots in milliseconds

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
    star.y += 1;
    if (star.y > height) {
      star.y = 0;
      star.x = random(width);
    }
    fill(255, star.brightness);
    noStroke();
    ellipse(star.x, star.y, 2, 2);
  }

  // Handle player movement
  if (!gameOver) {
    if (isTouching) {
      // Touch controls
      player.x = mouseX;
      player.y = mouseY;
    } else {
      // Mouse movement (direct, no lag)
      player.x = mouseX;
      player.y = mouseY;
    }
  }

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
    if (powerUps[i].hits(player)) {
      powerUps[i].applyEffect();
      // Create collection effect
      for(let j = 0; j < 10; j++) {
        particles.push(new Particle(powerUps[i].x, powerUps[i].y, 'powerup'));
      }
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

    if (!bullets[i].isEnemyBullet) {
      // Player bullets can hit obstacles and boss
      // Check collision with obstacles
      for (let j = obstacles.length - 1; j >= 0; j--) {
        if (dist(bullets[i].x, bullets[i].y, obstacles[j].x, obstacles[j].y) < obstacles[j].size) {
          // Enhanced hit effects
          for(let k = 0; k < 15; k++) {
            particles.push(new Particle(obstacles[j].x, obstacles[j].y, 'shield'));
          }
          for(let k = 0; k < 8; k++) {
            particles.push(new Particle(obstacles[j].x, obstacles[j].y, 'explosion'));
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

  // Boss spawning
  if (!bossSpawned && score > 0 && score % 10 === 0) {
    bossWarningTimer = 60; // 1 second warning (reduced from 3 seconds)
  }

  // Boss warning animation
  if (bossWarningTimer > 0) {
    bossWarningTimer--;
    // Warning text
    textSize(40);
    textAlign(CENTER, CENTER);
    let warningAlpha = map(sin(frameCount * 0.2), -1, 1, 100, 255);
    fill(255, 0, 0, warningAlpha);
    text("WARNING: BOSS APPROACHING!", width/2, height/2);
    
    // Warning effects
    if (bossWarningTimer === 0) {
      boss = new Boss();
      bossSpawned = true;
      // Create dramatic entrance effects
      for(let i = 0; i < 30; i++) {
        particles.push(new Particle(random(width), 0, 'explosion'));
      }
    }
  }

  // Boss update and display
  if (boss) {
    boss.update();
    boss.show();

    // Boss shooting - frequency increases with difficulty
    let shootingInterval = Math.max(60 - boss.difficultyLevel * 5, 30);
    if (frameCount % shootingInterval === 0) {
      let bossBullets = boss.shoot();
      bullets.push(...bossBullets);
    }

    // Check bullet collisions with boss and player
    for (let i = bullets.length - 1; i >= 0; i--) {
      if (bullets[i].isEnemyBullet) {
        // Enemy bullets can only hit player
        if (dist(bullets[i].x, bullets[i].y, player.x, player.y) < 20) {
          if (powerUpEffects.shield) {
            // Create shield hit effect
            for (let k = 0; k < 20; k++) {
              particles.push(new Particle(player.x, player.y, 'shield'));
            }
            bullets.splice(i, 1);
            powerUpEffects.shield = false;
            powerUpTimers.shield = 0;
          } else {
            // Create explosion effect
            for (let k = 0; k < 50; k++) {
              particles.push(new Particle(player.x, player.y));
            }
            gameOver = true;
          }
          break;
        }
      } else if (boss) { // Only check boss hits if boss exists
        // Player bullets can only hit boss
        if (dist(bullets[i].x, bullets[i].y, boss.x, boss.y) < boss.size/2) {
          if (boss.hit()) {
            // Boss defeated effects
            for(let k = 0; k < 50; k++) {
              particles.push(new Particle(boss.x, boss.y, 'explosion'));
            }
            score += 50;
            boss = null;
            bossSpawned = false;
          }
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  // Update power-up timers and effects
  for (let effect in powerUpTimers) {
    if (powerUpEffects[effect]) {
      powerUpTimers[effect]--;
      if (powerUpTimers[effect] <= 0) {
        powerUpEffects[effect] = false;
        // Reset affected properties
        switch(effect) {
          case 'spreadShot':
            bulletCount = 1;
            break;
          case 'speedBoost':
            player.speed = 5;
            break;
        }
      }
    }
  }

  // Modify shooting logic for rapid fire
  if (mouseIsPressed && mouseButton === LEFT) {
    if (powerUpEffects.rapidFire && frameCount % 5 === 0) { // Shoot every 5 frames when rapid fire is active
      for (let i = 0; i < bulletCount; i++) {
        let offset = (i - (bulletCount - 1) / 2) * 0.1;
        bullets.push(new Bullet(player.x, player.y, -PI/2 + offset));
      }
    }
  }

  // Update collision detection to account for shield
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].hits(player)) {
      if (powerUpEffects.shield) {
        // Create shield hit effect
        for (let k = 0; k < 20; k++) {
          particles.push(new Particle(player.x, player.y, 'shield'));
        }
        // Remove the obstacle that hit the shield
        obstacles.splice(i, 1);
        // Remove shield after blocking one hit
        powerUpEffects.shield = false;
        powerUpTimers.shield = 0;
      } else {
        // Normal collision handling
        for (let k = 0; k < 50; k++) {
          particles.push(new Particle(player.x, player.y));
        }
        gameOver = true;
      }
    }
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
    // Constrain player within the canvas
    this.x = constrain(this.x, 20, width - 20);
    this.y = constrain(this.y, 20, height - 20);
  }

  show() {
    push();
    translate(this.x, this.y);
    
    // Shield effect
    if (powerUpEffects.shield) {
      noFill();
      strokeWeight(2);
      let shieldPulse = sin(frameCount * 0.1) * 5;
      for(let i = 0; i < 3; i++) {
        let alpha = map(i, 0, 2, 200, 50);
        stroke(100, 200, 255, alpha);
        ellipse(0, 0, 50 + i * 5 + shieldPulse);
      }
    }
    
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
    this.x = random(width);
    this.y = -20;
    this.size = random(20, 40);
    let angle = random(45, 135);
    let speed = random(2, 5);
    this.hspeed = speed * cos(radians(angle));
    this.vspeed = speed * sin(radians(angle));
    this.rotationAngle = 0;
    this.pulsePhase = random(TWO_PI); // For energy field pulsing effect
  }

  update() {
    this.x += this.hspeed;
    this.y += this.vspeed;
    this.rotationAngle += 0.02;
    this.pulsePhase += 0.1;
  }

  show() {
    push();
    translate(this.x, this.y);
    rotate(this.rotationAngle);
    
    // Energy field effect
    let pulseSize = sin(this.pulsePhase) * 5;
    for(let i = 0; i < 3; i++) {
      fill(100, 200, 255, 50 - i * 15);
      ellipse(0, 0, this.size + 20 + i * 10 + pulseSize, (this.size + 20 + i * 10 + pulseSize) * 0.4);
    }
    
    // Main saucer body
    fill(180, 190, 200);
    ellipse(0, 0, this.size * 1.8, this.size * 0.5);
    
    // Upper dome
    fill(100, 150, 200, 200);
    arc(0, 0, this.size, this.size, -PI, 0, CHORD);
    
    // Lower hull details
    fill(70, 80, 90);
    arc(0, 0, this.size * 1.6, this.size * 0.4, 0, PI, CHORD);
    
    // Engine glow
    let engineGlow = abs(sin(frameCount * 0.1)) * 255;
    for(let i = 0; i < 3; i++) {
      let glowSize = this.size * 0.2 * (1 - i * 0.2);
      fill(255, engineGlow, 0, 150 - i * 40);
      ellipse(-this.size * 0.5, this.size * 0.1, glowSize, glowSize);
      ellipse(0, this.size * 0.1, glowSize, glowSize);
      ellipse(this.size * 0.5, this.size * 0.1, glowSize, glowSize);
    }
    
    // Window lights
    for(let i = 0; i < 5; i++) {
      let windowX = map(i, 0, 4, -this.size * 0.6, this.size * 0.6);
      fill(255, 255, 100, 200 + sin(frameCount * 0.1 + i) * 55);
      ellipse(windowX, 0, this.size * 0.15, this.size * 0.1);
    }
    
    pop();
  }

  offscreen() {
    return (this.x < -this.size || this.x > width + this.size || 
            this.y < -this.size || this.y > height + this.size);
  }

  hits(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < this.size + 20;
  }
}

// ===== Boss Class =====
class Boss {
  constructor() {
    this.x = width / 2;
    this.y = -100;
    this.targetY = 100;
    this.size = 120;
    this.rotationAngle = 0;
    this.pulsePhase = 0;
    this.entranceEffectTimer = 30;
    this.hitCount = 0;
    this.maxHits = 10;
    this.invulnerable = false;
    this.invulnerableTimer = 0;
    this.attackPhase = 0;
    this.attackTimer = 0;
    this.wingAngle = 0;
    this.difficultyLevel = Math.floor(score / 50); // Increases every 50 points
  }

  update() {
    // Entry animation
    if (this.y < this.targetY) {
      this.y = lerp(this.y, this.targetY, 0.05);
      if (this.entranceEffectTimer > 0) {
        this.entranceEffectTimer--;
        if (frameCount % 3 === 0) {
          particles.push(new Particle(this.x + random(-50, 50), 
                                    this.y + random(-25, 25), 
                                    'explosion'));
        }
      }
    } else {
      // More aggressive movement pattern
      let t = frameCount * 0.03; // Faster movement
      if (this.hitCount < 2) {
        // Phase 1: Figure-8 pattern
        this.x = width/2 + sin(t) * 200;
        this.y = this.targetY + sin(2 * t) * 60;
      } else if (this.hitCount < 4) {
        // Phase 2: Circular pattern
        this.x = width/2 + cos(t) * 150;
        this.y = this.targetY + sin(t) * 150;
      } else {
        // Phase 3: Erratic zigzag
        this.x = width/2 + sin(t * 2) * 250;
        this.y = this.targetY + cos(t * 3) * 100;
      }
    }
    
    // Update invulnerability
    if (this.invulnerable) {
      this.invulnerableTimer--;
      if (this.invulnerableTimer <= 0) {
        this.invulnerable = false;
      }
    }
    
    this.rotationAngle += 0.05; // Faster rotation
    this.pulsePhase += 0.15;
    
    // Update attack phase
    this.attackTimer++;
    if (this.attackTimer >= 60) { // Change attack pattern every second
      this.attackPhase = (this.attackPhase + 1) % 3;
      this.attackTimer = 0;
    }
  }

  show() {
    push();
    translate(this.x, this.y);
    
    // Flash effect when hit
    let baseColor = this.invulnerable && frameCount % 4 < 2 ? 
                   color(255, 0, 0) : color(100, 0, 0);

    // Main body
    fill(baseColor);
    noStroke();
    
    // Bottom thrusters
    for(let i = -2; i <= 2; i++) {
      let thrusterX = i * 25;
      fill(255, 150 + sin(frameCount * 0.1) * 100, 0, 200);
      beginShape();
      vertex(thrusterX - 10, 40);
      vertex(thrusterX + 10, 40);
      vertex(thrusterX, 60 + sin(frameCount * 0.2) * 10);
      endShape(CLOSE);
    }

    // Main hull (menacing shape)
    fill(baseColor);
    beginShape();
    vertex(-60, 40); // Bottom left
    vertex(-40, -20); // Mid left
    vertex(-20, -40); // Upper left
    vertex(0, -60); // Top point
    vertex(20, -40); // Upper right
    vertex(40, -20); // Mid right
    vertex(60, 40); // Bottom right
    endShape(CLOSE);

    // Armor plates
    fill(150, 0, 0);
    beginShape();
    vertex(-50, 30);
    vertex(-30, -15);
    vertex(-10, -30);
    vertex(-20, 20);
    endShape(CLOSE);

    beginShape();
    vertex(50, 30);
    vertex(30, -15);
    vertex(10, -30);
    vertex(20, 20);
    endShape(CLOSE);

    // Moving wings
    this.wingAngle = sin(frameCount * 0.05) * PI/6;
    
    push();
    translate(-40, 0);
    rotate(this.wingAngle);
    fill(150, 0, 0);
    rect(-40, -10, 40, 20);
    // Wing cannon
    fill(200);
    rect(-35, -5, 20, 10);
    pop();

    push();
    translate(40, 0);
    rotate(-this.wingAngle);
    fill(150, 0, 0);
    rect(0, -10, 40, 20);
    // Wing cannon
    fill(200);
    rect(15, -5, 20, 10);
    pop();

    // Core section
    let coreGlow = abs(sin(frameCount * 0.1)) * 255;
    fill(255, coreGlow, 0, 200);
    ellipse(0, 0, 40, 40);
    
    // Weapon ports
    for(let i = 0; i < 3; i++) {
      fill(200, 0, 0);
      rect(-30 + i * 30 - 5, 20, 10, 15);
    }

    // Hit count indicator
    for (let i = 0; i < this.maxHits; i++) {
      fill(i < this.hitCount ? 'gray' : 'red');
      rect(-45 + i * 10, -50, 8, 3);
    }

    pop();
  }

  hit() {
    if (this.invulnerable) return false;
    
    // Create hit effect
    for(let k = 0; k < 20; k++) {
      particles.push(new Particle(this.x, this.y, 'explosion'));
    }
    
    this.hitCount++;
    this.invulnerable = true;
    this.invulnerableTimer = 30; // Half second of invulnerability
    
    return this.hitCount >= this.maxHits;
  }

  shoot() {
    let bullets = [];
    let bulletSpeed = 6 + Math.min(this.difficultyLevel, 4); // Speed increases with difficulty, max +4
    
    // Calculate number of bullets based on difficulty
    let bulletCount = 1 + Math.min(this.difficultyLevel, 3); // Max 4 bullets per shot
    
    switch(this.attackPhase) {
      case 0: // Wing cannons - starts with one side, adds second side at higher difficulty
        if (this.difficultyLevel >= 1) {
          bullets.push(
            new Bullet(this.x - 75, this.y, PI/2 + this.wingAngle, true, bulletSpeed)
          );
        }
        if (this.difficultyLevel >= 2) {
          bullets.push(
            new Bullet(this.x + 75, this.y, PI/2 - this.wingAngle, true, bulletSpeed)
          );
        }
        break;
        
      case 1: // Bottom cannons - starts with one, adds more with difficulty
        let activeBottomCannons = Math.min(this.difficultyLevel + 1, 3);
        for(let i = 0; i < activeBottomCannons; i++) {
          let spacing = map(i, 0, activeBottomCannons - 1, -30, 30);
          bullets.push(new Bullet(this.x + spacing, this.y + 30, PI/2, true, bulletSpeed));
        }
        break;
        
      case 2: // Aimed shots - starts with single shot, adds spread with difficulty
        let angleToPlayer = atan2(player.y - this.y, player.x - this.x);
        let spreadAngle = PI/12;
        
        if (this.difficultyLevel === 0) {
          // Single aimed shot
          bullets.push(new Bullet(this.x, this.y, angleToPlayer, true, bulletSpeed));
        } else {
          // Add spread based on difficulty
          let numSpreadShots = Math.min(this.difficultyLevel + 1, 3);
          for(let i = 0; i < numSpreadShots; i++) {
            let angle = angleToPlayer + map(i, 0, numSpreadShots - 1, -spreadAngle, spreadAngle);
            bullets.push(new Bullet(this.x, this.y, angle, true, bulletSpeed));
          }
        }
        break;
    }
    
    return bullets;
  }
}

// ===== Particle Class for Explosions =====
class Particle {
  constructor(x, y, type = 'normal') {
    this.x = x;
    this.y = y;
    this.type = type;
    
    if (type === 'shield') {
      this.vx = random(-5, 5);
      this.vy = random(-5, 5);
      this.alpha = 255;
      this.color = color(100, 200, 255);
      this.size = random(4, 8);
    } else if (type === 'explosion') {
      this.vx = random(-8, 8);
      this.vy = random(-8, 8);
      this.alpha = 255;
      this.color = color(255, random(100, 200), 0);
      this.size = random(6, 12);
    } else if (type === 'powerup') {
      this.vx = random(-3, 3);
      this.vy = random(-3, 3);
      this.alpha = 255;
      this.color = color(255, 255, 100);
      this.size = random(4, 8);
    } else {
      this.vx = random(-3, 3);
      this.vy = random(-3, 3);
      this.alpha = 255;
      this.color = color(255);
      this.size = 4;
    }
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.type === 'explosion' ? 8 : 5;
    if (this.type === 'shield') {
      this.vx *= 0.95;
      this.vy *= 0.95;
    }
  }

  show() {
    noStroke();
    this.color.setAlpha(this.alpha);
    fill(this.color);
    ellipse(this.x, this.y, this.size);
  }

  finished() {
    return this.alpha < 0;
  }
}

// ===== Bullet Class =====
class Bullet {
  constructor(x, y, angle = 0, isEnemyBullet = false, speed = null) {
    this.x = x;
    this.y = y;
    this.r = isEnemyBullet ? 6 : 5;
    this.speed = speed || (isEnemyBullet ? 7 : 10);
    this.angle = angle;
    this.isEnemyBullet = isEnemyBullet;
  }

  update() {
    this.x += this.speed * cos(this.angle);
    this.y += this.speed * sin(this.angle);
  }

  show() {
    if (this.isEnemyBullet) {
      // Enemy bullets are larger and more menacing
      fill(255, 50, 50);
      noStroke();
      push();
      translate(this.x, this.y);
      rotate(this.angle);
      beginShape();
      vertex(-this.r, -this.r/2);
      vertex(this.r, 0);
      vertex(-this.r, this.r/2);
      endShape(CLOSE);
      pop();
    } else {
      // Player bullets remain the same
      fill(50, 150, 255);
      noStroke();
      ellipse(this.x, this.y, this.r * 2);
    }
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
    this.y = random(height / 2);
    this.size = 30; // Increased base size
    this.angle = 0;
    this.type = this.getRandomType();
    this.pulsePhase = 0;
    this.collected = false;
    this.duration = 600; // Increased to 10 seconds
    this.innerRotation = 0;
  }

  getRandomType() {
    const types = ['spreadShot', 'rapidFire', 'shield', 'speedBoost'];
    return random(types);
  }

  update() {
    this.y += 1.5; // Slower downward movement
    this.angle += 0.05;
    this.pulsePhase += 0.1;
  }

  show() {
    push();
    translate(this.x, this.y);
    rotate(this.angle);
    
    // Outer glow effect
    let pulseSize = sin(this.pulsePhase) * 8;
    noStroke();
    
    // Common outer ring for all power-ups
    fill(255, 255, 255, 50);
    ellipse(0, 0, this.size + pulseSize + 20);
    
    this.innerRotation += 0.03; // Rotate inner elements
    
    // Different designs for different power-up types
    switch(this.type) {
      case 'spreadShot':
        // Energy orb with multiple arrows
        fill(50, 150, 255, 100);
        ellipse(0, 0, this.size + pulseSize);
        
        // Rotating energy ring
        push();
        rotate(this.innerRotation);
        for(let i = 0; i < 8; i++) {
          push();
          rotate(i * PI/4);
          fill(100, 200, 255);
          rect(-2, -this.size/4, 4, this.size/2);
          pop();
        }
        pop();
        
        // Central arrows
        fill(255);
        for(let i = -1; i <= 1; i++) {
          push();
          translate(i * 8, 0);
          beginShape();
          vertex(0, -8);
          vertex(-4, 0);
          vertex(-2, 0);
          vertex(-2, 6);
          vertex(2, 6);
          vertex(2, 0);
          vertex(4, 0);
          endShape(CLOSE);
          pop();
        }
        break;

      case 'rapidFire':
        // Lightning orb with energy discharge
        fill(255, 255, 0, 100);
        ellipse(0, 0, this.size + pulseSize);
        
        // Rotating lightning bolts
        push();
        rotate(this.innerRotation);
        for(let i = 0; i < 6; i++) {
          push();
          rotate(i * PI/3);
          stroke(255, 255, 0);
          strokeWeight(2);
          line(0, -this.size/4, 0, this.size/4);
          line(0, -this.size/4, 4, -this.size/8);
          line(0, this.size/4, -4, this.size/8);
          pop();
        }
        pop();
        
        // Center lightning symbol
        noStroke();
        fill(255);
        beginShape();
        vertex(0, -10);
        vertex(-4, -2);
        vertex(0, 0);
        vertex(-4, 8);
        vertex(2, 2);
        vertex(6, 4);
        vertex(2, -4);
        endShape(CLOSE);
        break;

      case 'shield':
        // Shield bubble with energy field
        fill(200, 100, 255, 100);
        ellipse(0, 0, this.size + pulseSize);
        
        // Rotating shield segments
        push();
        rotate(this.innerRotation);
        for(let i = 0; i < 6; i++) {
          push();
          rotate(i * PI/3);
          noFill();
          strokeWeight(2);
          stroke(220, 150, 255);
          arc(0, 0, this.size * 0.8, this.size * 0.8, -PI/4, PI/4);
          pop();
        }
        pop();
        
        // Center shield emblem
        fill(255);
        beginShape();
        vertex(0, -12);
        vertex(-8, -4);
        vertex(-8, 8);
        vertex(0, 12);
        vertex(8, 8);
        vertex(8, -4);
        endShape(CLOSE);
        break;

      case 'speedBoost':
        // Speed trails with motion blur effect
        fill(100, 255, 100, 100);
        ellipse(0, 0, this.size + pulseSize);
        
        // Rotating speed lines
        push();
        rotate(this.innerRotation);
        for(let i = 0; i < 8; i++) {
          push();
          rotate(i * PI/4);
          stroke(150, 255, 150);
          strokeWeight(2);
          line(this.size/4, 0, this.size/2, 0);
          pop();
        }
        pop();
        
        // Center arrow design
        noStroke();
        fill(255);
        beginShape();
        vertex(0, -12);
        vertex(-8, 0);
        vertex(-4, 0);
        vertex(-4, 12);
        vertex(4, 12);
        vertex(4, 0);
        vertex(8, 0);
        endShape(CLOSE);
        break;
    }
    
    pop();
  }

  offscreen() {
    return this.y > height;
  }

  hits(player) {
    let d = dist(this.x, this.y, player.x, player.y);
    return d < this.size + 20;
  }

  applyEffect() {
    switch(this.type) {
      case 'spreadShot':
        powerUpEffects.spreadShot = true;
        powerUpTimers.spreadShot = this.duration;
        bulletCount = 3;
        break;
        
      case 'rapidFire':
        powerUpEffects.rapidFire = true;
        powerUpTimers.rapidFire = this.duration;
        // Rapid fire effect will be handled in shooting logic
        break;
        
      case 'shield':
        powerUpEffects.shield = true;
        powerUpTimers.shield = this.duration;
        // Add shield particles
        for(let i = 0; i < 20; i++) {
          particles.push(new Particle(player.x, player.y, 'shield'));
        }
        break;
        
      case 'speedBoost':
        powerUpEffects.speedBoost = true;
        powerUpTimers.speedBoost = this.duration;
        player.speed = 8; // Increased from 5
        break;
    }
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
  boss = null;
  bossSpawned = false;
  bossWarningTimer = 0;
}

function touchStarted() {
  if (!gameOver) {
    touchStartX = mouseX;
    touchStartY = mouseY;
    isTouching = true;
    
    // Always shoot when touching
    let currentTime = millis();
    if (currentTime - lastTouchShootTime > touchShootDelay) {
      for (let i = 0; i < bulletCount; i++) {
        let offset = (i - (bulletCount - 1) / 2) * 0.1;
        bullets.push(new Bullet(player.x, player.y, -PI/2 + offset));
      }
      lastTouchShootTime = currentTime;
    }
    return false;
  }
}

function touchMoved() {
  if (!gameOver && isTouching) {
    // Direct position control
    player.x = mouseX;
    player.y = mouseY;
    
    // Always shoot while touching
    let currentTime = millis();
    if (currentTime - lastTouchShootTime > touchShootDelay) {
      for (let i = 0; i < bulletCount; i++) {
        let offset = (i - (bulletCount - 1) / 2) * 0.1;
        bullets.push(new Bullet(player.x, player.y, -PI/2 + offset));
      }
      lastTouchShootTime = currentTime;
    }
    return false;
  }
}

function touchEnded() {
  if (!gameOver) {
    isTouching = false;
    return false;
  }
}