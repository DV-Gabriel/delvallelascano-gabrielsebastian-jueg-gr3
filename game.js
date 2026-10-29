// ============================================================
//  Tenis / Ping-Pong contra la máquina - Phaser 3
//  Controles: flechas ARRIBA / ABAJO (o W / S). ESPACIO para iniciar/reiniciar.
// ============================================================

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#14532d',
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload: preload, create: create, update: update }
};
const game = new Phaser.Game(config);

// ---------- Constantes ----------
const PLAYER_SPEED = 400;
const CPU_SPEED = 270;        // más bajo que el jugador => se le puede ganar
const BALL_START_SPEED = 350;
const BALL_MAX_SPEED = 750;
const WIN_SCORE = 7;

// ---------- Variables globales ----------
let player, cpu, ball, cursors, keyW, keyS, keySpace;
let scorePlayer = 0, scoreCpu = 0;
let scoreText, messageText;
let state = 'ready';          // 'ready' | 'playing' | 'over'

// ---------- PRELOAD ----------
function preload() {
    // Se generan las texturas por código: no se depende de archivos externos.
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(0, 0, 16, 100, 6);
    g.generateTexture('paddle', 16, 100);

    g.clear();
    g.fillStyle(0xfacc15, 1);
    g.fillCircle(10, 10, 10);
    g.generateTexture('ball', 20, 20);

    g.destroy();
}

// ---------- CREATE ----------
function create() {
    // Cancha: borde y línea central
    this.add.rectangle(400, 300, 780, 580).setStrokeStyle(4, 0xffffff, 0.8);
    for (let y = 20; y < 600; y += 40) {
        this.add.rectangle(400, y, 4, 20, 0xffffff, 0.6);
    }

    // Jugador (izquierda) y máquina (derecha)
    player = this.physics.add.image(40, 300, 'paddle');
    cpu = this.physics.add.image(760, 300, 'paddle');
    [player, cpu].forEach(p => {
        p.setImmovable(true);
        p.setCollideWorldBounds(true);
    });
    cpu.setTint(0xf87171);

    // Pelota: rebota arriba y abajo, pero puede salir por los lados (punto)
    ball = this.physics.add.image(400, 300, 'ball');
    ball.setBounce(1);
    ball.setCollideWorldBounds(true);
    this.physics.world.setBoundsCollision(false, false, true, true);

    // Colisiones pelota <-> raquetas
    this.physics.add.collider(ball, player, hitPaddle, null, this);
    this.physics.add.collider(ball, cpu, hitPaddle, null, this);

    // Controles
    cursors = this.input.keyboard.createCursorKeys();
    keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Marcador y mensajes
    scoreText = this.add.text(400, 30, '0  -  0', {
        fontFamily: 'monospace', fontSize: '48px', color: '#ffffff'
    }).setOrigin(0.5);

    messageText = this.add.text(400, 450, 'Presiona ESPACIO para jugar\n↑ / ↓ para mover tu raqueta', {
        fontFamily: 'monospace', fontSize: '24px', color: '#facc15', align: 'center'
    }).setOrigin(0.5);

    // La cámara sigue el mundo fijo; se usa para efectos al anotar
    this.cameras.main.setBackgroundColor('#14532d');
}

// ---------- UPDATE ----------
function update() {
    // Iniciar / reiniciar con ESPACIO
    if (Phaser.Input.Keyboard.JustDown(keySpace)) {
        if (state === 'ready') startMatch(this);
        else if (state === 'over') {
            scorePlayer = 0;
            scoreCpu = 0;
            updateScore();
            startMatch(this);
        }
    }

    // Movimiento del jugador (mismo patrón del taller: velocidad 0 y luego según tecla)
    player.setVelocityY(0);
    if (cursors.up.isDown || keyW.isDown) player.setVelocityY(-PLAYER_SPEED);
    else if (cursors.down.isDown || keyS.isDown) player.setVelocityY(PLAYER_SPEED);

    // IA de la máquina: sigue la pelota solo cuando viene hacia ella
    cpu.setVelocityY(0);
    if (state === 'playing') {
        const target = ball.body.velocity.x > 0 ? ball.y : 300; // si se aleja, vuelve al centro
        const diff = target - cpu.y;
        if (Math.abs(diff) > 15) {
            cpu.setVelocityY(diff > 0 ? CPU_SPEED : -CPU_SPEED);
        }
    }

    // Puntos: la pelota salió por un lado
    if (state === 'playing') {
        if (ball.x < 0) scorePoint(this, 'cpu');
        else if (ball.x > 800) scorePoint(this, 'player');
    }
}

// ---------- Funciones auxiliares ----------
function startMatch(scene) {
    state = 'playing';
    messageText.setText('');
    serveBall(scene, Math.random() < 0.5 ? 1 : -1);
}

function serveBall(scene, dir) {
    ball.setVelocity(0, 0);
    ball.setPosition(400, 300);
    scene.time.delayedCall(700, () => {
        if (state !== 'playing') return;
        const angle = Phaser.Math.FloatBetween(-0.4, 0.4);
        ball.setVelocity(
            dir * BALL_START_SPEED * Math.cos(angle),
            BALL_START_SPEED * Math.sin(angle)
        );
    });
}

// El ángulo de rebote depende de en qué parte de la raqueta pega la pelota
function hitPaddle(ballObj, paddle) {
    const offset = (ballObj.y - paddle.y) / (paddle.height / 2);   // -1 .. 1
    const angle = offset * (Math.PI / 4);                          // máx. 45°
    const speed = Math.min(ballObj.body.velocity.length() * 1.06, BALL_MAX_SPEED);
    const dir = paddle === player ? 1 : -1;
    ballObj.setVelocity(dir * speed * Math.cos(angle), speed * Math.sin(angle));
}

function scorePoint(scene, who) {
    if (who === 'player') scorePlayer++;
    else scoreCpu++;
    updateScore();
    scene.cameras.main.shake(150, 0.01);

    if (scorePlayer >= WIN_SCORE || scoreCpu >= WIN_SCORE) {
        state = 'over';
        ball.setVelocity(0, 0);
        ball.setPosition(400, 300);
        const win = scorePlayer > scoreCpu;
        messageText.setText((win ? '¡GANASTE!' : 'PERDISTE') + '\nESPACIO para jugar de nuevo');
        messageText.setColor(win ? '#4ade80' : '#f87171');
    } else {
        // Saca quien recibió el punto en contra
        serveBall(scene, who === 'player' ? -1 : 1);
    }
}

function updateScore() {
    scoreText.setText(scorePlayer + '  -  ' + scoreCpu);
}
