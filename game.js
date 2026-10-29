// ============================================================
//  Ping-Pong NEON contra la máquina - Phaser 3
//  Escenas: Boot -> Menú -> Juego (+ Pausa)
//  Controles: ↑/↓ o W/S mover | P o ESC pausar | ESPACIO reiniciar al terminar
// ============================================================

// ---------- Paleta neón ----------
const NEON = {
    bg:      0x07071a,
    panel:   0x0d0d2b,
    cyan:    0x00f0ff,
    magenta: 0xff2bd6,
    lime:    0x39ff14,
    yellow:  0xfff200,
    orange:  0xff6a00,
    purple:  0xb026ff,
    blue:    0x2f9bff,
    red:     0xff2a2a
};
const BG_CSS = '#07071a';
const BALL_COLOR = NEON.yellow;
const toCss = (c) => '#' + c.toString(16).padStart(6, '0');

// ---------- Constantes ----------
const PLAYER_SPEED = 400;
const BALL_START_SPEED = 350;
const BALL_MAX_SPEED = 750;
const SMASH_MIN_SPEED = 700;
const SMASH_MAX_SPEED = 1000;
const WIN_SCORE = 7;
const POWER_DURATION = 8000;      // ms que dura un efecto
const POWER_SPAWN_EVERY = 7000;   // ms entre poderes
const POWER_LIFETIME = 9000;      // ms que el poder queda en la cancha

const DIFFICULTIES = [
    { name: 'FÁCIL',   cpuSpeed: 200 },
    { name: 'NORMAL',  cpuSpeed: 270 },
    { name: 'DIFÍCIL', cpuSpeed: 340 }
];

// Tipos de poder
const POWERS = {
    big:   { label: 'G', color: NEON.lime,   text: '¡RAQUETA GRANDE!',  desc: 'Raqueta grande' },
    smash: { label: 'S', color: NEON.orange, text: '¡SMASH! Devuelve veloz', desc: 'Smash: devuelves más rápido' },
    small: { label: 'R', color: NEON.purple, text: '¡RIVAL REDUCIDO!',  desc: 'Reduce la raqueta rival' },
    ball:  { label: 'B', color: NEON.blue,   text: '',                  desc: 'Pelota grande o mini (al azar)' }
};

// ---------- Utilidades de estilo neón ----------
// Resplandor en WebGL (si el navegador solo usa Canvas, simplemente se omite)
function addGlow(obj, color, strength = 4) {
    if (obj.preFX) obj.preFX.addGlow(color, strength, 0, false, 0.1, 16);
    return obj;
}

function neonText(scene, x, y, str, size, color, extra = {}) {
    return scene.add.text(x, y, str, Object.assign({
        fontFamily: 'monospace',
        fontSize: size + 'px',
        fontStyle: 'bold',
        color: toCss(color),
        shadow: { offsetX: 0, offsetY: 0, color: toCss(color), blur: 12, stroke: true, fill: true }
    }, extra));
}

// Borde de cancha con "halo" falso (funciona sin WebGL)
function neonRect(scene, x, y, w, h, color) {
    scene.add.rectangle(x, y, w, h).setStrokeStyle(14, color, 0.12);
    scene.add.rectangle(x, y, w, h).setStrokeStyle(6, color, 0.25);
    return scene.add.rectangle(x, y, w, h).setStrokeStyle(2, color, 1);
}

function makeButton(scene, x, y, label, onClick, w = 280, h = 54, color = NEON.cyan) {
    const bg = scene.add.rectangle(x, y, w, h, NEON.panel)
        .setStrokeStyle(3, color)
        .setInteractive({ useHandCursor: true });
    const txt = neonText(scene, x, y, label, 22, color).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(color, 0.3));
    bg.on('pointerout', () => bg.setFillStyle(NEON.panel, 1));
    bg.on('pointerdown', onClick);
    return { bg, txt, setLabel: (t) => txt.setText(t) };
}

// ============================================================
//  BOOT: genera las texturas por código (sin archivos externos)
// ============================================================
class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        g.fillStyle(0xffffff, 1);
        g.fillRoundedRect(0, 0, 16, 100, 7);
        g.generateTexture('paddle', 16, 100);

        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(10, 10, 10);
        g.generateTexture('ball', 20, 20);

        g.clear();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(18, 18, 18);
        g.generateTexture('orb', 36, 36);

        g.destroy();
    }

    create() {
        if (this.registry.get('diff') === undefined) this.registry.set('diff', 1);
        this.scene.start('MenuScene');
    }
}

// ============================================================
//  MENÚ PRINCIPAL
// ============================================================
class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        this.cameras.main.setBackgroundColor(BG_CSS);
        neonRect(this, 400, 300, 780, 580, NEON.cyan);

        // Pelota decorativa
        const deco = this.add.image(130, 110, 'ball').setScale(1.4).setTint(BALL_COLOR);
        addGlow(deco, BALL_COLOR, 6);
        this.tweens.add({ targets: deco, x: 670, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: deco, y: 80, duration: 350, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });

        neonText(this, 400, 150, 'PING-PONG', 72, NEON.cyan).setOrigin(0.5);
        neonText(this, 400, 210, 'NEON  vs  MÁQUINA', 24, NEON.magenta).setOrigin(0.5);

        makeButton(this, 400, 275, 'JUGAR', () => this.startGame(), 280, 54, NEON.lime);

        const diffBtn = makeButton(this, 400, 340, '', () => {
            const next = (this.registry.get('diff') + 1) % DIFFICULTIES.length;
            this.registry.set('diff', next);
            diffBtn.setLabel('Dificultad: ' + DIFFICULTIES[next].name);
        }, 340, 54, NEON.magenta);
        diffBtn.setLabel('Dificultad: ' + DIFFICULTIES[this.registry.get('diff')].name);

        // Leyenda de poderes
        neonText(this, 400, 400, 'PODERES (los gana quien golpeó la pelota al final)', 15, NEON.cyan,
            { fontStyle: 'normal' }).setOrigin(0.5);

        Object.values(POWERS).forEach((p, i) => {
            const y = 432 + i * 30;
            const c = this.add.circle(170, y, 12, p.color);
            addGlow(c, p.color, 4);
            this.add.text(170, y, p.label, {
                fontFamily: 'monospace', fontSize: '15px', color: '#000000', fontStyle: 'bold'
            }).setOrigin(0.5);
            neonText(this, 195, y, p.desc, 18, p.color, { fontStyle: 'normal' }).setOrigin(0, 0.5);
        });

        neonText(this, 400, 568, '↑ / ↓ o W / S para mover  |  P o ESC para pausar', 14, NEON.cyan,
            { fontStyle: 'normal' }).setOrigin(0.5);

        // Teclado
        this.input.keyboard.once('keydown-ENTER', () => this.startGame());
        this.input.keyboard.once('keydown-SPACE', () => this.startGame());
    }

    startGame() {
        this.scene.start('GameScene');
    }
}

// ============================================================
//  JUEGO
// ============================================================
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        this.cameras.main.setBackgroundColor(BG_CSS);
        this.cpuSpeed = DIFFICULTIES[this.registry.get('diff')].cpuSpeed;

        // Estado
        this.scorePlayer = 0;
        this.scoreCpu = 0;
        this.state = 'serving';        // 'serving' | 'playing' | 'over'
        this.lastHitter = 'player';
        this.fx = {
            player: { big: null, small: null, smash: false },
            cpu:    { big: null, small: null, smash: false }
        };
        this.ballFx = { timer: null, label: '' };

        // Cancha
        neonRect(this, 400, 300, 780, 580, NEON.cyan);
        for (let y = 20; y < 600; y += 40) {
            this.add.rectangle(400, y, 4, 20, NEON.magenta, 0.55);
        }

        // Raquetas
        this.player = this.physics.add.image(40, 300, 'paddle').setTint(NEON.cyan);
        this.cpu = this.physics.add.image(760, 300, 'paddle').setTint(NEON.magenta);
        [this.player, this.cpu].forEach(p => {
            p.setImmovable(true);
            p.setCollideWorldBounds(true);
        });
        addGlow(this.player, NEON.cyan, 5);
        addGlow(this.cpu, NEON.magenta, 5);

        // Pelota
        this.ball = this.physics.add.image(400, 300, 'ball').setTint(BALL_COLOR);
        this.ball.setBounce(1);
        this.ball.setCollideWorldBounds(true);
        addGlow(this.ball, BALL_COLOR, 6);
        this.physics.world.setBoundsCollision(false, false, true, true);

        this.physics.add.collider(this.ball, this.player, this.hitPaddle, null, this);
        this.physics.add.collider(this.ball, this.cpu, this.hitPaddle, null, this);

        // Grupo de poderes
        this.powerGroup = this.physics.add.group();
        this.physics.add.overlap(this.ball, this.powerGroup, this.collectPower, null, this);
        this.time.addEvent({
            delay: POWER_SPAWN_EVERY, loop: true,
            callback: () => {
                if (this.state === 'playing' && this.powerGroup.countActive(true) < 1) this.spawnPower();
            }
        });

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        const K = Phaser.Input.Keyboard.KeyCodes;
        this.keyW = this.input.keyboard.addKey(K.W);
        this.keyS = this.input.keyboard.addKey(K.S);
        this.keyP = this.input.keyboard.addKey(K.P);
        this.keyEsc = this.input.keyboard.addKey(K.ESC);
        this.keySpace = this.input.keyboard.addKey(K.SPACE);

        // HUD
        this.scoreText = neonText(this, 400, 32, '0  -  0', 46, NEON.cyan).setOrigin(0.5);

        const small = { fontStyle: 'normal', shadow: { offsetX: 0, offsetY: 0, color: '#000000', blur: 0, stroke: false, fill: false } };
        this.statusPlayer = neonText(this, 25, 565, '', 15, NEON.cyan, small).setOrigin(0, 1);
        this.statusCpu = neonText(this, 775, 565, '', 15, NEON.magenta, Object.assign({ align: 'right' }, small)).setOrigin(1, 1);
        this.statusBall = neonText(this, 400, 565, '', 15, NEON.blue, Object.assign({ align: 'center' }, small)).setOrigin(0.5, 1);

        // Botón de pausa (arriba a la derecha)
        const pauseBg = this.add.rectangle(755, 32, 44, 44, NEON.panel)
            .setStrokeStyle(2, NEON.cyan)
            .setInteractive({ useHandCursor: true })
            .setDepth(20);
        this.add.rectangle(747, 32, 6, 20, NEON.cyan).setDepth(21);
        this.add.rectangle(763, 32, 6, 20, NEON.cyan).setDepth(21);
        pauseBg.on('pointerdown', () => this.pauseGame());

        this.serveBall(Math.random() < 0.5 ? 1 : -1);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.keyP) || Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            if (this.state !== 'over') this.pauseGame();
        }
        if (this.state === 'over' && Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            this.scene.restart();
            return;
        }

        // Jugador
        this.player.setVelocityY(0);
        if (this.cursors.up.isDown || this.keyW.isDown) this.player.setVelocityY(-PLAYER_SPEED);
        else if (this.cursors.down.isDown || this.keyS.isDown) this.player.setVelocityY(PLAYER_SPEED);

        // Máquina: sigue la pelota solo si viene hacia ella
        this.cpu.setVelocityY(0);
        if (this.state !== 'over') {
            const target = this.ball.body.velocity.x > 0 ? this.ball.y : 300;
            const diff = target - this.cpu.y;
            if (Math.abs(diff) > 15) {
                this.cpu.setVelocityY(diff > 0 ? this.cpuSpeed : -this.cpuSpeed);
            }
        }

        // Puntos
        if (this.state === 'playing') {
            if (this.ball.x < 0) this.scorePoint('cpu');
            else if (this.ball.x > 800) this.scorePoint('player');
        }

        this.updateStatus();
    }

    // ---------- Saque ----------
    serveBall(dir) {
        this.state = 'serving';
        this.ball.setVelocity(0, 0);
        this.ball.setPosition(400, 300);
        this.time.delayedCall(700, () => {
            if (this.state !== 'serving') return;
            const angle = Phaser.Math.FloatBetween(-0.4, 0.4);
            this.ball.setVelocity(
                dir * BALL_START_SPEED * Math.cos(angle),
                BALL_START_SPEED * Math.sin(angle)
            );
            this.lastHitter = dir > 0 ? 'player' : 'cpu';
            this.state = 'playing';
        });
    }

    // ---------- Golpe a la pelota ----------
    hitPaddle(ball, paddle) {
        const who = paddle === this.player ? 'player' : 'cpu';
        const offset = (ball.y - paddle.y) / (paddle.displayHeight / 2);   // -1 .. 1
        const angle = Phaser.Math.Clamp(offset, -1, 1) * (Math.PI / 4);    // máx. 45°
        let speed = Math.min(ball.body.velocity.length() * 1.06, BALL_MAX_SPEED);

        if (this.fx[who].smash) {
            speed = Phaser.Math.Clamp(speed * 1.6, SMASH_MIN_SPEED, SMASH_MAX_SPEED);
            this.fx[who].smash = false;
            this.cameras.main.shake(120, 0.008);
            ball.setTint(BALL_COLOR);
        }

        const dir = who === 'player' ? 1 : -1;
        ball.setVelocity(dir * speed * Math.cos(angle), speed * Math.sin(angle));
        this.lastHitter = who;
    }

    // ---------- Poderes ----------
    spawnPower() {
        const type = Phaser.Utils.Array.GetRandom(Object.keys(POWERS));
        const def = POWERS[type];
        const x = Phaser.Math.Between(250, 550);
        const y = Phaser.Math.Between(90, 510);

        const orb = this.powerGroup.create(x, y, 'orb');
        orb.body.setAllowGravity(false);
        orb.setTint(def.color);
        addGlow(orb, def.color, 6);
        orb.powerType = type;
        orb.label = this.add.text(x, y, def.label, {
            fontFamily: 'monospace', fontSize: '20px', color: '#000000', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Efecto de latido y desaparición con el tiempo
        this.tweens.add({ targets: orb, scale: 1.25, duration: 450, yoyo: true, repeat: -1 });
        orb.expire = this.time.delayedCall(POWER_LIFETIME, () => this.removeOrb(orb));
    }

    removeOrb(orb) {
        if (!orb.active) return;
        if (orb.expire) orb.expire.remove(false);
        this.tweens.killTweensOf(orb);
        orb.label.destroy();
        orb.destroy();
    }

    collectPower(ball, orb) {
        if (this.state !== 'playing') return;
        const type = orb.powerType;
        const def = POWERS[type];
        const who = this.lastHitter;
        const rival = who === 'player' ? 'cpu' : 'player';
        let msg = def.text;

        if (type === 'big') this.setTimedEffect(who, 'big');
        else if (type === 'small') this.setTimedEffect(rival, 'small');
        else if (type === 'smash') {
            this.fx[who].smash = true;
            ball.setTint(NEON.red);
        } else if (type === 'ball') {
            const grow = Math.random() < 0.5;
            this.setBallSize(grow ? 2 : 0.5);
            msg = grow ? '¡PELOTA GRANDE!' : '¡PELOTA MINI!';
        }

        this.showPopup(orb.x, orb.y, msg, def.color);
        this.removeOrb(orb);
    }

    setTimedEffect(who, kind) {
        const fx = this.fx[who];
        if (fx[kind]) fx[kind].remove(false);
        fx[kind] = this.time.delayedCall(POWER_DURATION, () => {
            fx[kind] = null;
            this.applyPaddleSize(who);
        });
        this.applyPaddleSize(who);
    }

    applyPaddleSize(who) {
        const fx = this.fx[who];
        let scale = 1;
        if (fx.big && !fx.small) scale = 1.6;
        else if (fx.small && !fx.big) scale = 0.6;
        const paddle = who === 'player' ? this.player : this.cpu;
        this.tweens.add({ targets: paddle, scaleY: scale, duration: 200 });
    }

    // Poder de la pelota: cambia su tamaño un rato
    setBallSize(scale) {
        if (this.ballFx.timer) this.ballFx.timer.remove(false);
        this.ballFx.label = scale > 1 ? 'PELOTA GRANDE' : 'PELOTA MINI';
        this.tweens.killTweensOf(this.ball);
        this.tweens.add({ targets: this.ball, scale: scale, duration: 200 });
        this.ballFx.timer = this.time.delayedCall(POWER_DURATION, () => this.resetBallSize(false));
    }

    resetBallSize(instant) {
        if (this.ballFx.timer) this.ballFx.timer.remove(false);
        this.ballFx.timer = null;
        this.tweens.killTweensOf(this.ball);
        if (instant) this.ball.setScale(1);
        else this.tweens.add({ targets: this.ball, scale: 1, duration: 200 });
    }

    showPopup(x, y, msg, color) {
        const t = neonText(this, x, y, msg, 22, color).setOrigin(0.5).setDepth(15);
        this.tweens.add({
            targets: t, y: y - 60, alpha: 0, duration: 1400,
            onComplete: () => t.destroy()
        });
    }

    updateStatus() {
        const fmt = (fx) => {
            const parts = [];
            if (fx.big) parts.push('GRANDE ' + Math.ceil(fx.big.getRemainingSeconds()) + 's');
            if (fx.small) parts.push('REDUCIDO ' + Math.ceil(fx.small.getRemainingSeconds()) + 's');
            if (fx.smash) parts.push('SMASH LISTO');
            return parts.join('\n');
        };
        this.statusPlayer.setText(fmt(this.fx.player));
        this.statusCpu.setText(fmt(this.fx.cpu));
        this.statusBall.setText(this.ballFx.timer
            ? this.ballFx.label + ' ' + Math.ceil(this.ballFx.timer.getRemainingSeconds()) + 's'
            : '');
    }

    // ---------- Puntos y fin de partida ----------
    scorePoint(who) {
        if (who === 'player') this.scorePlayer++;
        else this.scoreCpu++;
        this.scoreText.setText(this.scorePlayer + '  -  ' + this.scoreCpu);
        this.cameras.main.shake(150, 0.01);
        this.ball.setTint(BALL_COLOR);
        this.resetBallSize(true);
        this.fx.player.smash = false;
        this.fx.cpu.smash = false;

        if (this.scorePlayer >= WIN_SCORE || this.scoreCpu >= WIN_SCORE) {
            this.endMatch();
        } else {
            this.serveBall(who === 'player' ? -1 : 1);   // saca quien recibió el punto
        }
    }

    endMatch() {
        this.state = 'over';
        this.ball.setVelocity(0, 0);
        this.ball.setPosition(400, 300);
        const win = this.scorePlayer > this.scoreCpu;

        const items = [];
        items.push(this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7));
        items.push(neonText(this, 400, 190, win ? '¡GANASTE!' : 'PERDISTE', 64,
            win ? NEON.lime : NEON.red).setOrigin(0.5));
        items.push(neonText(this, 400, 250, this.scorePlayer + '  -  ' + this.scoreCpu, 36,
            NEON.cyan).setOrigin(0.5));

        const b1 = makeButton(this, 400, 330, 'JUGAR DE NUEVO', () => this.scene.restart(), 300, 54, NEON.lime);
        const b2 = makeButton(this, 400, 400, 'MENÚ PRINCIPAL', () => this.scene.start('MenuScene'), 300, 54, NEON.magenta);
        items.push(b1.bg, b1.txt, b2.bg, b2.txt);
        items.forEach(o => o.setDepth(31));
    }

    // ---------- Pausa ----------
    pauseGame() {
        this.scene.launch('PauseScene');
        this.scene.pause();   // congela física, temporizadores y animaciones
    }
}

// ============================================================
//  PAUSA (se dibuja encima del juego)
// ============================================================
class PauseScene extends Phaser.Scene {
    constructor() { super('PauseScene'); }

    create() {
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.72);
        neonText(this, 400, 150, 'PAUSA', 72, NEON.cyan).setOrigin(0.5);

        makeButton(this, 400, 260, 'CONTINUAR', () => this.resumeGame(), 300, 54, NEON.lime);
        makeButton(this, 400, 330, 'REINICIAR', () => {
            this.scene.stop('GameScene');
            this.scene.start('GameScene');
            this.scene.stop();
        }, 300, 54, NEON.orange);
        makeButton(this, 400, 400, 'MENÚ PRINCIPAL', () => {
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
            this.scene.stop();
        }, 300, 54, NEON.magenta);

        neonText(this, 400, 470, 'P o ESC para continuar', 18, NEON.cyan, { fontStyle: 'normal' }).setOrigin(0.5);

        const K = Phaser.Input.Keyboard.KeyCodes;
        this.keyP = this.input.keyboard.addKey(K.P);
        this.keyEsc = this.input.keyboard.addKey(K.ESC);
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.keyP) || Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            this.resumeGame();
        }
    }

    resumeGame() {
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}

// ============================================================
//  CONFIGURACIÓN
// ============================================================
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: BG_CSS,
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, MenuScene, GameScene, PauseScene]
};
const game = new Phaser.Game(config);
