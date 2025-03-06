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

// Add at the beginning with other global variables
let gameStarted = false;
let homeScreen;
let explosionParticles = [];
let gameOverAnimationStarted = false;
let gameOverAnimationTimer = 0;

function setup() {
  let canvas = createCanvas(600, 800);
  canvas.parent('game-container');
  
  // Initialize home screen
  homeScreen = select('#home-screen');
  
  // Initialize game state
  gameStarted = false;
  
  // Initialize player and game settings
  player = new Player(width/2, height - 50);
  frameRate(60);
  
  // Generate stars
  for (let i = 0; i < 100; i++) {
    let x = random(width);
    let y = random(height);
    let brightness = random(100, 255);
    stars.push({ x: x, y: y, brightness: brightness });
  }
  
  // Start animation loop for background only
  loop();
}

function draw() {
  background(10);
  
  // Always animate stars with a parallax effect
  for (let star of stars) {
    star.y += star.brightness / 255 * 2; // Brighter stars move faster
    if (star.y > height) {
      star.y = 0;
      star.x = random(width);
    }
    fill(255, star.brightness);
    noStroke();
    ellipse(star.x, star.y, 2, 2);
  }

  // Show some sample obstacles in the background when on home screen
  if (!gameStarted) {
    // Animate some sample obstacles in the background
    if (frameCount % 120 === 0) { // Add new obstacle every 2 seconds
      obstacles.push(new Obstacle());
    }
    
    // Update and show background obstacles
    for (let obstacle of obstacles) {
      obstacle.update();
      obstacle.show();
    }
    obstacles = obstacles.filter(obstacle => !obstacle.offscreen());
    
    // Show a non-interactive player at the bottom
    push();
    translate(width/2, height - 100);
    // Simple rocket animation
    let hover = sin(frameCount * 0.05) * 5;
    translate(0, hover);
    fill(220);
    beginShape();
    vertex(0, -30);
    vertex(-15, 20);
    vertex(15, 20);
    endShape(CLOSE);
    // Flame animation
    fill(255, 150, 0, 200);
    let flameSize = random(10, 20);
    beginShape();
    vertex(-8, 20);
    vertex(0, 40 + flameSize);
    vertex(8, 20);
    endShape(CLOSE);
    pop();
    
    return; // Don't process game logic when on home screen
  }

  // Handle mouse movement when not touching
  if (!isTouching && mouseIsPressed && mouseButton === LEFT) {
    player.x = mouseX;
    player.y = mouseY;
  }

  // Game logic here
  player.update();
  player.show();

  // Only spawn obstacles if boss is not active
  if (!boss && !bossWarningTimer && frameCount % spawnInterval === 0) {
    obstacles.push(new Obstacle());
  }

  // Update and show bullets
  for (let bullet of bullets) {
    bullet.update();
    bullet.show();
    
    // Check if enemy bullet hits player
    if (bullet.isEnemyBullet && !powerUpEffects.shield) {
      let d = dist(bullet.x, bullet.y, player.x, player.y);
      if (d < 20) { // Player hit radius
        player.destroyed = true;
        createRocketExplosion(player.x, player.y);
        gameOver = true;
        gameOverAnimationStarted = true;
        gameOverAnimationTimer = 60; // 1 second animation
        break;
      }
    }
  }
  bullets = bullets.filter(bullet => !bullet.offscreen());

  // Update and show obstacles
  for (let obstacle of obstacles) {
    obstacle.update();
    obstacle.show();
    
    // Check collision with player
    if (!powerUpEffects.shield && obstacle.hits(player)) {
      player.destroyed = true;
      createRocketExplosion(player.x, player.y);
      gameOver = true;
      gameOverAnimationStarted = true;
      gameOverAnimationTimer = 60; // 1 second animation
    }
  }
  obstacles = obstacles.filter(obstacle => !obstacle.offscreen());

  // Check bullet collisions
  for (let i = bullets.length - 1; i >= 0; i--) {
    // Check collision with boss
    if (boss && !bullets[i].isEnemyBullet) {
      let d = dist(bullets[i].x, bullets[i].y, boss.x, boss.y);
      if (d < boss.size/2) {
        // Create hit effect
        for (let k = 0; k < 10; k++) {
          particles.push(new Particle(bullets[i].x, bullets[i].y, 'explosion'));
        }
        if (boss.hit()) {
          // Boss defeated
          score += 50;
          boss = null;
          bossSpawned = false;
          level++;
          levelProgress = 0;
          levelThreshold = 10 + (level * 2); // Increase threshold with each level
          spawnInterval = max(20, 60 - (level * 5)); // Speed up obstacle spawning
        }
        bullets.splice(i, 1);
        continue;
      }
    }

    // Check collision with obstacles
    for (let j = obstacles.length - 1; j >= 0; j--) {
      if (dist(bullets[i].x, bullets[i].y, obstacles[j].x, obstacles[j].y) < obstacles[j].size) {
        // Enhanced hit effect
        for (let k = 0; k < 15; k++) { // Increased from 10 to 15 particles
          let particle = new Particle(obstacles[j].x, obstacles[j].y, 'explosion');
          particle.size = random(8, 14); // Increased size from default (6, 12)
          particle.vx = random(-10, 10); // Increased velocity spread
          particle.vy = random(-10, 10);
          particles.push(particle);
        }
        // Add some bright sparks for extra effect
        for (let k = 0; k < 8; k++) {
          let spark = new Particle(obstacles[j].x, obstacles[j].y, 'spark');
          spark.size = random(2, 4);
          particles.push(spark);
        }
        score += 1;
        levelProgress++;
        
        // Update combo
        let currentTime = millis();
        if (currentTime - lastHitTime < 1000) {
          combo++;
        } else {
          combo = 1;
        }
        lastHitTime = currentTime;
        comboTimer = 60;
        
        // Check for level completion
        if (levelProgress >= levelThreshold && !boss && !bossSpawned) {
          bossSpawned = true;
          bossWarningTimer = 180; // 3 seconds warning
          // Clear existing obstacles
          obstacles = [];
        }
        
        obstacles.splice(j, 1);
        bullets.splice(i, 1);
        break;
      }
    }
  }

  // Handle boss warning and spawning
  if (bossWarningTimer > 0) {
    bossWarningTimer--;
    // Display warning message with flashing effect
    textAlign(CENTER, CENTER);
    textSize(40);
    let warningAlpha = map(sin(frameCount * 0.2), -1, 1, 100, 255);
    fill(255, 0, 0, warningAlpha);
    text('WARNING: BOSS INCOMING!', width/2, height/2);
    
    // Spawn boss when warning timer ends
    if (bossWarningTimer === 0) {
      boss = new Boss();
      // Clear any remaining obstacles
      obstacles = [];
    }
  }

  // Update and show boss if exists
  if (boss) {
    boss.update();
    boss.show();
    
    // Boss shooting
    if (frameCount % 60 === 0) { // Shoot every second
      let bossBullets = boss.shoot();
      bullets.push(...bossBullets);
    }
  }

  // Update and show particles
  for (let particle of particles) {
    particle.update();
    particle.show();
  }
  particles = particles.filter(particle => !particle.finished());

  // Update and show explosion particles
  for (let particle of explosionParticles) {
    particle.update();
    if (particle.type === 'smoke') {
      particle.size += 0.5; // Smoke expands
      particle.alpha -= 5; // Smoke fades faster
    }
    particle.show();
  }
  explosionParticles = explosionParticles.filter(particle => !particle.finished());

  // Display score and level info
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text('Score: ' + score, 10, 10);
  
  // Display level progress
  textAlign(RIGHT, TOP);
  text('Level ' + level, width - 10, 10);
  
  // Level progress bar
  let progressWidth = map(levelProgress, 0, levelThreshold, 0, 200);
  fill(100);
  rect(width/2 - 100, 30, 200, 10);
  fill(0, 255, 0);
  rect(width/2 - 100, 30, progressWidth, 10);

  // Display combo
  if (combo > 1) {
    let alpha = map(comboTimer, 0, 60, 0, 255);
    fill(255, 255, 0, alpha);
    textSize(32);
    textAlign(CENTER, TOP);
    text(`${combo}x COMBO!`, width/2, 50);
    comboTimer--;
  }

  // Check for game over
  if (gameOver) {
    if (gameOverAnimationStarted) {
      gameOverAnimationTimer--;
      if (gameOverAnimationTimer <= 0) {
        createGameOverOverlay();
        noLoop();
      }
    }
  }
}

// Update startGame function
function startGame() {
  // Start game regardless of input type
  gameStarted = true;
  homeScreen.style('display', 'none');
  resetGame();
  loop();
}

// Update returnToHome function
function returnToHome() {
  gameStarted = false;
  homeScreen.style('display', 'flex');
  if (gameOverDiv) {
    gameOverDiv.remove();
    gameOverDiv = null;
  }
  resetGame();
}

// Update submitScore function to remove leaderboard functionality
async function submitScore() {
  const email = emailInput.value();
  
  if (!email || !email.includes('@')) {
    alert('Please enter a valid email address');
    return;
  }

  try {
    // Show loading state
    const submitButton = select('.game-over-button');
    submitButton.html('Submitting...');
    submitButton.attribute('disabled', '');

    // Insert score into Supabase
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([
        { email: email, score: score }
      ]);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    // Show success message
    alert('Score submitted successfully!');
    
    // Clean up and reset
    if (gameOverDiv) {
      gameOverDiv.remove();
      gameOverDiv = null;
    }
    resetGame();

  } catch (error) {
    console.error('Error submitting score:', error);
    alert('Failed to submit score. Please try again. Error: ' + error.message);
    
    // Reset submit button
    const submitButton = select('.game-over-button');
    submitButton.html('Submit');
    submitButton.removeAttribute('disabled');
  }
}

// ===== Player Class =====
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.hspeed = 0;
    this.vspeed = 0;
    this.speed = 5;
    this.targetX = x;
    this.targetY = y;
    this.destroyed = false;
  }

  update() {
    // Update position based on keyboard input
    if (this.hspeed !== 0 || this.vspeed !== 0) {
      this.x += this.hspeed * this.speed;
      this.y += this.vspeed * this.speed;
      this.targetX = this.x;
      this.targetY = this.y;
    }

    // Update position based on mouse/touch if touching
    if (isTouching) {
      this.x = mouseX;
      this.y = mouseY;
      this.targetX = this.x;
      this.targetY = this.y;
    }
    
    // Constrain player within the canvas
    this.x = constrain(this.x, 20, width - 20);
    this.y = constrain(this.y, 20, height - 20);
    this.targetX = constrain(this.targetX, 20, width - 20);
    this.targetY = constrain(this.targetY, 20, height - 20);
  }

  show() {
    if (this.destroyed) return;
    
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
    fill(220, 220, 230);
    noStroke();
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
    
    // Enhanced hit effect for boss
    // Main explosion particles
    for(let k = 0; k < 25; k++) {
      let particle = new Particle(this.x + random(-30, 30), this.y + random(-30, 30), 'explosion');
      particle.size = random(10, 16);
      particle.vx = random(-12, 12);
      particle.vy = random(-12, 12);
      particle.color = color(255, random(150, 255), 0);
      particle.decay = random(8, 12);
      particles.push(particle);
    }
    
    // Add bright sparks
    for(let k = 0; k < 15; k++) {
      let spark = new Particle(this.x + random(-20, 20), this.y + random(-20, 20), 'spark');
      spark.size = random(2, 5);
      spark.vx = random(-15, 15);
      spark.vy = random(-15, 15);
      spark.color = color(255, 255, random(180, 255));
      spark.decay = random(10, 15);
      particles.push(spark);
    }
    
    // Add shockwave effect
    let shockwave = new Particle(this.x, this.y, 'shockwave');
    shockwave.maxSize = 100;
    shockwave.growthRate = 6;
    particles.push(shockwave);
    
    this.hitCount++;
    this.invulnerable = true;
    this.invulnerableTimer = 30; // Half second of invulnerability
    
    // If this is the final hit, create an even bigger explosion
    if (this.hitCount >= this.maxHits) {
      // Final explosion particles
      for(let k = 0; k < 40; k++) {
        let particle = new Particle(this.x + random(-50, 50), this.y + random(-50, 50), 'explosion');
        particle.size = random(12, 20);
        particle.vx = random(-15, 15);
        particle.vy = random(-15, 15);
        particle.color = color(255, random(180, 255), 0);
        particle.decay = random(10, 15);
        particles.push(particle);
      }
      
      // Extra sparks for final explosion
      for(let k = 0; k < 25; k++) {
        let spark = new Particle(this.x + random(-40, 40), this.y + random(-40, 40), 'spark');
        spark.size = random(3, 6);
        spark.vx = random(-20, 20);
        spark.vy = random(-20, 20);
        spark.color = color(255, 255, random(200, 255));
        spark.decay = random(12, 18);
        particles.push(spark);
      }
      
      // Multiple shockwaves for final explosion
      for(let i = 0; i < 3; i++) {
        let finalShockwave = new Particle(this.x, this.y, 'shockwave');
        finalShockwave.maxSize = 150;
        finalShockwave.growthRate = 8;
        particles.push(finalShockwave);
      }
    }
    
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
    this.rotation = 0;
    this.rotationSpeed = 0;
    
    if (type === 'shield') {
      this.vx = random(-5, 5);
      this.vy = random(-5, 5);
      this.alpha = 255;
      this.color = color(100, 200, 255);
      this.size = random(4, 8);
    } else if (type === 'shockwave') {
      this.vx = 0;
      this.vy = 0;
      this.alpha = 255;
      this.color = color(255, 200, 0, 150);
      this.size = 1;
      this.maxSize = 80;
      this.growthRate = 4;
    } else if (type === 'core') {
      this.vx = 0;
      this.vy = 0;
      this.alpha = 255;
      this.color = color(255, 50, 0);
      this.size = 8;
    } else if (type === 'debris') {
      this.vx = 0;
      this.vy = 0;
      this.alpha = 255;
      this.color = color(200, 200, 200);
      this.size = random(4, 8);
    } else if (type === 'explosion') {
      this.vx = random(-8, 8);
      this.vy = random(-8, 8);
      this.alpha = 255;
      this.color = color(255, random(100, 200), 0);
      this.size = random(6, 12);
    } else if (type === 'spark') {
      this.vx = random(-10, 10);
      this.vy = random(-10, 10);
      this.alpha = 255;
      this.color = color(255, 255, random(100, 255));
      this.size = random(2, 4);
    } else if (type === 'smoke') {
      this.vx = random(-2, 2);
      this.vy = random(-2, 0);
      this.alpha = 200;
      this.color = color(100, 100, 100);
      this.size = random(15, 30);
    } else if (type === 'powerup') {
      this.vx = random(-3, 3);
      this.vy = random(-3, 3);
      this.alpha = 255;
      this.color = color(255, 255, 100);
      this.size = random(4, 8);
    } else if (type === 'flash') {
      this.vx = 0;
      this.vy = 0;
      this.alpha = 255;
      this.color = color(255, 255, 200);
      this.size = 60;
    } else if (type === 'flame') {
      this.vx = random(-3, 3);
      this.vy = random(-3, 0);
      this.alpha = 255;
      this.color = color(255, 100, 0);
      this.size = random(6, 10);
      this.rotation = random(TWO_PI);
      this.rotationSpeed = 0;
    } else if (type === 'ember') {
      this.vx = random(-4, 4);
      this.vy = random(-4, -1);
      this.alpha = 255;
      this.color = color(255, 200, 50);
      this.size = random(2, 4);
      this.decay = random(8, 12);
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
    
    if (this.type === 'shockwave') {
      this.size += this.growthRate;
      this.alpha = map(this.size, 0, this.maxSize, 255, 0);
      this.growthRate *= 0.95; // Slow down expansion
    } else if (this.type === 'core') {
      this.size *= 0.9;
      this.alpha -= 15;
    } else if (this.type === 'debris') {
      this.rotation += this.rotationSpeed;
      this.vy += 0.1; // Add gravity
      this.alpha -= 5;
    } else if (this.type === 'flash') {
      this.alpha -= 25; // Quick fade for flash
      this.size *= 0.9; // Shrink the flash
    } else if (this.type === 'explosion') {
      this.alpha -= this.decay;
      this.size *= 0.95;
      this.vx *= 0.95;
      this.vy *= 0.95;
    } else if (this.type === 'spark') {
      this.alpha -= this.decay;
      this.vy += 0.2; // Add slight gravity to sparks
    } else {
      this.alpha -= this.type === 'explosion' ? 8 : 5;
      if (this.type === 'shield') {
        this.vx *= 0.95;
        this.vy *= 0.95;
      }
    }
  }

  show() {
    noStroke();
    this.color.setAlpha(this.alpha);
    fill(this.color);
    
    push();
    translate(this.x, this.y);
    
    if (this.type === 'shockwave') {
      // Draw expanding ring
      noFill();
      stroke(this.color);
      strokeWeight(2);
      ellipse(0, 0, this.size);
    } else if (this.type === 'debris') {
      // Draw rotating debris pieces
      rotate(this.rotation);
      rect(-this.size/2, -this.size/4, this.size, this.size/2);
    } else if (this.type === 'flash') {
      // Draw flash with blur effect
      for (let i = 0; i < 3; i++) {
        let a = this.alpha * (1 - i * 0.2);
        fill(255, 255, 200, a);
        ellipse(0, 0, this.size * (1 + i * 0.5));
      }
    } else if (this.type === 'spark') {
      // Draw elongated spark
      let len = this.size * 2;
      let angle = atan2(this.vy, this.vx);
      push();
      rotate(angle);
      fill(255, 255, 200, this.alpha);
      rect(-len/2, -1, len, 2);
      pop();
    } else if (this.type === 'flame') {
      // Draw flame-like shape
      push();
      translate(this.x, this.y);
      rotate(this.rotation);
      this.rotation += this.rotationSpeed;
      
      // Draw multiple layers for fire effect
      for (let i = 0; i < 3; i++) {
        let flameSize = this.size * (1 - i * 0.2);
        let flameAlpha = this.alpha * (1 - i * 0.3);
        fill(red(this.color), green(this.color), blue(this.color), flameAlpha);
        beginShape();
        vertex(0, -flameSize);
        bezierVertex(-flameSize/2, 0, -flameSize/3, flameSize/2, 0, flameSize);
        bezierVertex(flameSize/3, flameSize/2, flameSize/2, 0, 0, -flameSize);
        endShape();
      }
      pop();
    } else if (this.type === 'ember') {
      // Draw glowing ember
      push();
      translate(this.x, this.y);
      // Inner bright core
      fill(255, 255, 200, this.alpha);
      ellipse(0, 0, this.size * 0.6);
      // Outer glow
      fill(red(this.color), green(this.color), blue(this.color), this.alpha * 0.7);
      ellipse(0, 0, this.size);
      pop();
    } else {
      // Draw regular particles
      ellipse(0, 0, this.size);
    }
    
    pop();
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
  bulletCount = 1;
  player = new Player(width / 2, height - 50);
  player.destroyed = false;
  loop();
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

function touchStarted(event) {
  // Prevent default touch behavior
  event.preventDefault();
  
  if (!gameStarted) {
    // If on home screen, check if touch is on play button
    // The play button handling is in the HTML/CSS
    return false;
  }
  
  if (!gameOver) {
    isTouching = true;
    touchStartX = touches[0].x;
    touchStartY = touches[0].y;
    
    // Shoot when touch starts
    let currentTime = millis();
    if (currentTime - lastTouchShootTime > touchShootDelay) {
      for (let i = 0; i < bulletCount; i++) {
        let offset = (i - (bulletCount - 1) / 2) * 0.1;
        bullets.push(new Bullet(player.x, player.y, -PI/2 + offset));
      }
      lastTouchShootTime = currentTime;
    }
  }
  return false;
}

function touchMoved(event) {
  // Prevent default touch behavior
  event.preventDefault();
  
  if (!gameOver && isTouching && touches.length > 0) {
    // Update player position based on touch position
    player.x = constrain(touches[0].x, 20, width - 20);
    player.y = constrain(touches[0].y, 20, height - 20);
    
    // Continue shooting while touching
    let currentTime = millis();
    if (currentTime - lastTouchShootTime > touchShootDelay) {
      for (let i = 0; i < bulletCount; i++) {
        let offset = (i - (bulletCount - 1) / 2) * 0.1;
        bullets.push(new Bullet(player.x, player.y, -PI/2 + offset));
      }
      lastTouchShootTime = currentTime;
    }
  }
  return false;
}

function touchEnded(event) {
  // Prevent default touch behavior
  event.preventDefault();
  isTouching = false;
  return false;
}

// Update mouseMoved function to handle mouse movement
function mouseMoved() {
  if (gameStarted && !gameOver && !isTouching) {
    player.x = mouseX;
    player.y = mouseY;
  }
}

// Add createGameOverOverlay function if missing
function createGameOverOverlay() {
  gameOverDiv = createDiv('');
  gameOverDiv.class('game-over-overlay');
  gameOverDiv.style('display', 'flex');
  
  let content = createDiv('');
  content.parent(gameOverDiv);
  content.style('text-align', 'center');
  content.style('color', 'white');
  
  let gameOverTitle = createElement('h1', 'GAME OVER');
  gameOverTitle.class('game-over-title');
  gameOverTitle.parent(content);
  
  let finalScore = createElement('p', 'Final Score: ' + score);
  finalScore.class('final-score');
  finalScore.parent(content);
  
  let inputContainer = createDiv('');
  inputContainer.class('input-container');
  inputContainer.parent(content);
  
  emailInput = createInput('');
  emailInput.attribute('placeholder', 'Enter your email');
  emailInput.parent(inputContainer);
  
  let submitButton = createButton('Submit');
  submitButton.class('game-over-button');
  submitButton.mousePressed(submitScore);
  submitButton.parent(inputContainer);
  
  let buttonContainer = createDiv('');
  buttonContainer.class('button-container');
  buttonContainer.parent(content);
  
  let homeButton = createButton('Home');
  homeButton.class('game-over-button');
  homeButton.mousePressed(returnToHome);
  homeButton.parent(buttonContainer);
  
  let restartButton = createButton('Play Again');
  restartButton.class('game-over-button');
  restartButton.mousePressed(resetGame);
  restartButton.parent(buttonContainer);
}

// Add new function for rocket explosion
function createRocketExplosion(x, y) {
  // Initial bright flash
  let flash = new Particle(x, y, 'flash');
  flash.size = 40;
  flash.alpha = 255;
  flash.color = color(255, 220, 150);
  explosionParticles.push(flash);

  // Main explosion particles
  for (let i = 0; i < 20; i++) {
    let angle = random(TWO_PI);
    let speed = random(3, 6);
    let particle = new Particle(x, y, 'explosion');
    particle.vx = cos(angle) * speed;
    particle.vy = sin(angle) * speed;
    particle.size = random(6, 10);
    particle.color = color(255, random(150, 200), 0);
    particle.decay = random(8, 12);
    explosionParticles.push(particle);
  }

  // Bright sparks
  for (let i = 0; i < 12; i++) {
    let angle = random(TWO_PI);
    let speed = random(4, 8);
    let spark = new Particle(x, y, 'spark');
    spark.vx = cos(angle) * speed;
    spark.vy = sin(angle) * speed;
    spark.size = random(2, 4);
    spark.color = color(255, 255, random(180, 255));
    spark.decay = random(10, 15);
    explosionParticles.push(spark);
  }

  // Simple shockwave
  let shockwave = new Particle(x, y, 'shockwave');
  shockwave.maxSize = 60;
  shockwave.growthRate = 3;
  explosionParticles.push(shockwave);
}