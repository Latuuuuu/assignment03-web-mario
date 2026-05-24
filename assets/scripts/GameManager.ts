const { ccclass, property } = cc._decorator;

const STORAGE_LAST_LEVEL_SCENE = 'webMario.lastLevelScene';

@ccclass
export default class GameManager extends cc.Component {
    @property(cc.Node)
    public player: cc.Node = null;

    @property(cc.Node)
    public spawnPoint: cc.Node = null;

    @property(cc.Node)
    public gameOverPanel: cc.Node = null;

    @property(cc.Node)
    public hudNode: cc.Node = null;

    @property(cc.Label)
    public lifeLabel: cc.Label = null;

    @property(cc.Label)
    public scoreLabel: cc.Label = null;

    @property(cc.Label)
    public timerLabel: cc.Label = null;

    @property(cc.AudioClip)
    public bgm: cc.AudioClip = null;

    @property(cc.AudioClip)
    public loseLifeSfx: cc.AudioClip = null;

    @property(cc.AudioClip)
    public levelClearSfx: cc.AudioClip = null;

    @property
    public startScene = 'Start';

    @property
    public gameOverScene = 'GameOver';

    @property
    public levelClearScene = 'LevelClear';

    @property
    public initialLife = 3;

    @property
    public levelTime = 300;

    @property
    public fallY = -360;

    private life = 3;
    private score = 0;
    private timeLeft = 300;
    private elapsed = 0;
    private bgmId = -1;
    private isGameOver = false;
    private playerStartPosition: cc.Vec3 = null;

    protected onLoad(): void {
        cc.director.getPhysicsManager().enabled = true;
        cc.director.getPhysicsManager().gravity = cc.v2(0, -960);

        this.life = this.initialLife;
        this.timeLeft = this.levelTime;

        if (this.player) {
            this.playerStartPosition = this.spawnPoint ? this.spawnPoint.position.clone() : this.player.position.clone();
        }

        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }
    }

    protected start(): void {
        cc.sys.localStorage.setItem(STORAGE_LAST_LEVEL_SCENE, cc.director.getScene().name);
        this.playBgm();
        this.updateHud();
    }

    protected update(dt: number): void {
        if (this.isGameOver) {
            return;
        }

        this.elapsed += dt;
        if (this.elapsed >= 1) {
            this.elapsed -= 1;
            this.timeLeft = Math.max(0, this.timeLeft - 1);
            this.updateHud();

            if (this.timeLeft <= 0) {
                this.loseLife();
            }
        }

        if (this.player && this.player.y < this.fallY) {
            this.loseLife();
        }
    }

    protected onDestroy(): void {
        if (this.bgmId !== -1) {
            cc.audioEngine.stop(this.bgmId);
            this.bgmId = -1;
        }
    }

    public addScore(amount: number): void {
        if (this.isGameOver) {
            return;
        }

        this.score += amount;
        this.updateHud();
    }

    public loseLife(): void {
        if (this.isGameOver) {
            return;
        }

        this.life -= 1;
        this.playEffect(this.loseLifeSfx);
        this.updateHud();

        if (this.life <= 0) {
            this.loadGameOverScene();
            return;
        }

        this.respawnPlayer();
    }

    public levelClear(): void {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;
        this.playEffect(this.levelClearSfx);
        this.scheduleOnce(() => cc.director.loadScene(this.levelClearScene || this.startScene), 1);
    }

    public restartLevel(): void {
        cc.director.loadScene(cc.director.getScene().name);
    }

    public backToStart(): void {
        cc.director.loadScene(this.startScene);
    }

    private respawnPlayer(): void {
        if (!this.player || !this.playerStartPosition) {
            return;
        }

        const body = this.player.getComponent(cc.RigidBody);
        if (body) {
            body.linearVelocity = cc.v2(0, 0);
            body.angularVelocity = 0;
        }

        this.timeLeft = this.levelTime;
        this.player.position = this.playerStartPosition.clone();
        this.player.active = true;
        this.updateHud();
    }

    private loadGameOverScene(): void {
        this.isGameOver = true;
        cc.sys.localStorage.setItem(STORAGE_LAST_LEVEL_SCENE, cc.director.getScene().name);

        if (this.gameOverScene) {
            cc.director.loadScene(this.gameOverScene);
            return;
        }

        if (this.gameOverPanel) {
            this.gameOverPanel.active = true;
        }
    }

    private updateHud(): void {
        const hud = this.hudNode ? this.hudNode.getComponent('HUDController') : null;
        if (hud) {
            hud.setLife(this.life);
            hud.setScore(this.score);
            hud.setTime(this.timeLeft);
            return;
        }

        if (this.lifeLabel) {
            this.lifeLabel.string = `LIFE ${this.life}`;
        }

        if (this.scoreLabel) {
            this.scoreLabel.string = `SCORE ${this.score}`;
        }

        if (this.timerLabel) {
            this.timerLabel.string = `TIME ${this.timeLeft}`;
        }
    }

    private playBgm(): void {
        if (!this.bgm) {
            return;
        }

        this.bgmId = cc.audioEngine.playMusic(this.bgm, true);
        cc.audioEngine.setMusicVolume(0.45);
    }

    private playEffect(clip: cc.AudioClip): void {
        if (clip) {
            cc.audioEngine.playEffect(clip, false);
        }
    }
}
