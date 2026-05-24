const { ccclass, property } = cc._decorator;

const STORAGE_LAST_LEVEL_SCENE = 'webMario.lastLevelScene';

@ccclass
export default class GameOverManager extends cc.Component {
    @property
    public startScene = 'Start';

    @property
    public fallbackLevelScene = 'Level1';

    @property(cc.AudioClip)
    public gameOverSfx: cc.AudioClip = null;

    @property(cc.Node)
    public restartButton: cc.Node = null;

    @property(cc.Node)
    public backButton: cc.Node = null;

    protected start(): void {
        this.bindButton(this.restartButton, this.restartLevel);
        this.bindButton(this.backButton, this.backToStart);

        if (this.gameOverSfx) {
            cc.audioEngine.playEffect(this.gameOverSfx, false);
        }
    }

    public restartLevel(): void {
        const lastLevelScene = cc.sys.localStorage.getItem(STORAGE_LAST_LEVEL_SCENE) || this.fallbackLevelScene;
        cc.director.loadScene(lastLevelScene);
    }

    public backToStart(): void {
        cc.director.loadScene(this.startScene);
    }

    private bindButton(buttonNode: cc.Node, handler: () => void): void {
        if (!buttonNode) {
            return;
        }

        buttonNode.on(cc.Node.EventType.TOUCH_END, handler, this);
    }
}
