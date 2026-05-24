const { ccclass, property } = cc._decorator;

@ccclass
export default class LevelClearManager extends cc.Component {
    @property
    public startScene = 'Start';

    @property
    public nextLevelScene = '';

    @property(cc.AudioClip)
    public clearSfx: cc.AudioClip = null;

    @property(cc.Node)
    public nextButton: cc.Node = null;

    @property(cc.Node)
    public retryButton: cc.Node = null;

    @property(cc.Node)
    public backButton: cc.Node = null;

    @property
    public fallbackRetryScene = 'Level1';

    protected start(): void {
        this.bindButton(this.nextButton, this.goNext);
        this.bindButton(this.retryButton, this.retry);
        this.bindButton(this.backButton, this.backToStart);

        if (this.clearSfx) {
            cc.audioEngine.playEffect(this.clearSfx, false);
        }
    }

    public goNext(): void {
        cc.director.loadScene(this.nextLevelScene || this.startScene);
    }

    public retry(): void {
        cc.director.loadScene(this.fallbackRetryScene);
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
