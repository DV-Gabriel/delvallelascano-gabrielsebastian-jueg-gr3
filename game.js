// ============================================================
//  Ping-Pong contra la máquina - Phaser 3
//  Escenas: Boot -> Menú -> Juego (+ Pausa)
//  Controles: ↑/↓ o W/S mover | P o ESC pausar | ESPACIO reiniciar al terminar
// ============================================================

// ---------- Constantes ----------
const PLAYER_SPEED = 400;
const BALL_START_SPEED = 350;
const BALL_MAX_SPEED = 750;
const SMASH_MIN_SPEED = 700;
const SMASH_MAX_SPEED = 1000;
const WIN_SCORE = 7;
const POWER_DURATION = 8000;      // ms que dura "grande" / "reducir"
const POWER_SPAWN_EVERY = 7000;   // ms entre poderes
const POWER_LIFETIME = 9000;      // ms que el poder queda en la cancha

const DIFFICULTIES = [
    { name: 'FÁCIL',   cpuSpeed: 200 },
    { name: 'NORMAL',  cpuSpeed: 270 },
    { name: 'DIFÍCIL', cpuSpeed: 340 }
];

// Tipos de poder
const POWERS = {
    big:   { label: 'G', color: 0x22c55e, text: '¡RAQUETA GRANDE!' },
    smash: { label: 'S', color: 0xf97316, text: '¡SMASH! Próxima devolución veloz' },
    small: { label: 'R', color: 0xa855f7, text: '¡RIVAL REDUCIDO!' }
};

// ---------- Utilidad: botón ----------
function makeButton(scene, x, y, label, onClick, w = 280, h = 54, color = 0x16a34a) {
    const bg = scene.add.rectangle(x, y, w, h, color)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive({ useHandCursor: true });
    const txt = scene.add.text(x, y, label, {
        fontFamily: 'monospace', fontSize: '24px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout', () => bg.setAlpha(1));
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
        g.fillRoundedRect(0, 0, 16, 100, 6);
        g.generateTexture('paddle', 16, 100);

        g.clear();
        g.fillStyle(0xfacc15, 1);
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
        this.cameras.main.setBackgroundColor('#14532d');
        this.add.rectangle(400, 300, 780, 580).setStrokeStyle(4, 0xffffff, 0.8);

        // Pelota decorativa
        const deco = this.add.image(130, 120, 'ball').setScale(1.4);
        this.tweens.add({ targets: deco, x: 670, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: deco, y: 90, duration: 350, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });

        this.add.text(400, 150, 'PING-PONG', {
            fontFamily: 'monospace', fontSize: '72px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add.text(400, 210, 'contra la máquina', {
            fontFamily: 'monospace', fontSize: '26px', color: '#facc15'
        }).setOrigin(0.5);

        // Botones
        makeButton(this, 400, 290, 'JUGAR', () => this.startGame());

        const diffBtn = makeButton(this, 400, 355, '', () => {
            const next = (this.registry.get('diff') + 1) % DIFFICULTIES.length;
            this.registry.set('diff', next);
            diffBtn.setLabel('Dificultad: ' + DIFFICULTIES[next].name);
        }, 280, 54, 0x1d4ed8);
        diffBtn.setLabel('Dificultad: ' + DIFFICULTIES[this.registry.get('diff')].name);

        // Leyenda de poderes
        this.add.text(400, 425, 'PODERES (los gana quien golpeó la pelota por última vez)', {
            fontFamily: 'monospace', fontSize: '15px', color: '#d1fae5'
        }).setOrigin(0.5);

        const legend = [
            { key: 'big',   desc: 'Raqueta grande' },
            { key: 'smash', desc: 'Smash: devuelves más rápido' },
            { key: 'small', desc: 'Reduce la raqueta rival' }
        ];
        legend.forEach((item, i) => {
            const y = 458 + i * 30;
            const p = POWERS[item.key];
            this.add.circle(190, y, 12, p.color).setStrokeStyle(2, 0xffffff);
            this.add.text(190, y, p.label, {
                fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.add.text(215, y, item.desc, {
                fontFamily: 'monospace', fontSize: '18px', color: '#ffffff'
            }).setOrigin(0, 0.5);
        });

        this.add.text(400, 565, '↑ / ↓ o W / S para mover  |  P o ESC para pausar', {
            fontFamily: 'monospace', fontSize: '14px', color: '#a7f3d0'
        }).setOrigin(0.5);

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
        this.cameras.main.setBackgroundColor('#14532d');
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

        // Cancha
        this.add.rectangle(400, 300, 780, 580).setStrokeStyle(4, 0xffffff, 0.8);
        for (let y = 20; y < 600; y += 40) {
            this.add.rectangle(400, y, 4, 20, 0xffffff, 0.6);
        }

        // Raquetas
        this.player = this.physics.add.image(40, 300, 'paddle');
        this.cpu = this.physics.add.image(760, 300, 'paddle');
        [this.player, this.cpu].forEach(p => {
            p.setImmovable(true);
            p.setCollideWorldBounds(true);
        });
        this.cpu.setTint(0xf87171);

        // Pelota
        this.ball = this.physics.add.image(400, 300, 'ball');
        this.ball.setBounce(1);
        this.ball.setCollideWorldBounds(true);
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
        this.scoreText = this.add.text(400, 30, '0  -  0', {
            fontFamily: 'monospace', fontSize: '48px', color: '#ffffff'
        }).setOrigin(0.5);

        this.statusPlayer = this.add.text(25, 565, '', {
            fontFamily: 'monospace', fontSize: '15px', color: '#fde68a'
        }).setOrigin(0, 1);
        this.statusCpu = this.add.text(775, 565, '', {
            fontFamily: 'monospace', fontSize: '15px', color: '#fecaca'
        }).setOrigin(1, 1);

        this.messageText = this.add.text(400, 450, '', {
            fontFamily: 'monospace', fontSize: '28px', color: '#facc15', align: 'center'
        }).setOrigin(0.5).setDepth(10);

        // Botón de pausa (arriba a la derecha)
        const pauseBg = this.add.rectangle(755, 32, 44, 44, 0x000000, 0.45)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setDepth(20);
        this.add.rectangle(747, 32, 6, 20, 0xffffff).setDepth(21);
        this.add.rectangle(763, 32, 6, 20, 0xffffff).setDepth(21);
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
        }
        ball.clearTint();

        const dir = who === 'player' ? 1 : -1;
        ball.setVelocity(dir * speed * Math.cos(angle), speed * Math.sin(angle));
        this.lastHitter = who;
        if (this.fx[who].smash) ball.setTint(0xff4444);
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
        orb.powerType = type;
        orb.label = this.add.text(x, y, def.label, {
            fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', fontStyle: 'bold'
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

        this.showPopup(orb.x, orb.y, def.text, def.color);
        this.removeOrb(orb);

        if (type === 'big') this.setTimedEffect(who, 'big');
        else if (type === 'small') this.setTimedEffect(rival, 'small');
        else if (type === 'smash') {
            this.fx[who].smash = true;
            ball.setTint(0xff4444);
        }
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

    showPopup(x, y, msg, color) {
        const t = this.add.text(x, y, msg, {
            fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(15);
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
    }

    // ---------- Puntos y fin de partida ----------
    scorePoint(who) {
        if (who === 'player') this.scorePlayer++;
        else this.scoreCpu++;
        this.scoreText.setText(this.scorePlayer + '  -  ' + this.scoreCpu);
        this.cameras.main.shake(150, 0.01);
        this.ball.clearTint();
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

        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.55).setDepth(30);
        this.add.text(400, 190, win ? '¡GANASTE!' : 'PERDISTE', {
            fontFamily: 'monospace', fontSize: '64px', fontStyle: 'bold',
            color: win ? '#4ade80' : '#f87171'
        }).setOrigin(0.5).setDepth(31);
        this.add.text(400, 250, this.scorePlayer + '  -  ' + this.scoreCpu, {
            fontFamily: 'monospace', fontSize: '36px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(31);

        const b1 = makeButton(this, 400, 330, 'JUGAR DE NUEVO', () => this.scene.restart());
        const b2 = makeButton(this, 400, 400, 'MENÚ PRINCIPAL', () => this.scene.start('MenuScene'), 280, 54, 0x1d4ed8);
        [b1.bg, b1.txt, b2.bg, b2.txt].forEach(o => o.setDepth(31));
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
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.65);
        this.add.text(400, 150, 'PAUSA', {
            fontFamily: 'monospace', fontSize: '72px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        makeButton(this, 400, 260, 'CONTINUAR', () => this.resumeGame());
        makeButton(this, 400, 330, 'REINICIAR', () => {
            this.scene.stop('GameScene');
            this.scene.start('GameScene');
            this.scene.stop();
        }, 280, 54, 0xb45309);
        makeButton(this, 400, 400, 'MENÚ PRINCIPAL', () => {
            this.scene.stop('GameScene');
            this.scene.start('MenuScene');
            this.scene.stop();
        }, 280, 54, 0x1d4ed8);

        this.add.text(400, 470, 'P o ESC para continuar', {
            fontFamily: 'monospace', fontSize: '18px', color: '#a7f3d0'
        }).setOrigin(0.5);

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
    backgroundColor: '#14532d',
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, MenuScene, GameScene, PauseScene]
};
const game = new Phaser.Game(config);
