const { ccclass, property } = cc._decorator;

@ccclass
export default class MenuController extends cc.Component {
    @property({
        tooltip: 'Scene loaded when Level 1 is selected and Start is pressed.',
    })
    public level1Scene = 'Level1';

    @property({
        tooltip: 'Scene loaded when Level 2 is selected and Start is pressed.',
    })
    public level2Scene = 'Level2';

    @property(cc.AudioClip)
    public bgm: cc.AudioClip = null;

    @property(cc.AudioClip)
    public confirmSfx: cc.AudioClip = null;

    @property(cc.Node)
    public startButton: cc.Node = null;

    @property(cc.Node)
    public level1Button: cc.Node = null;

    @property(cc.Node)
    public level2Button: cc.Node = null;

    @property(cc.Node)
    public titleNode: cc.Node = null;

    @property(cc.Node)
    public level1SelectedFrame: cc.Node = null;

    @property(cc.Node)
    public level2SelectedFrame: cc.Node = null;

    @property(cc.Color)
    public normalButtonColor: cc.Color = cc.Color.WHITE;

    @property(cc.Color)
    public selectedButtonColor: cc.Color = new cc.Color(255, 224, 96);

    private bgmId = -1;
    private isTransitioning = false;
    private selectedLevel = 1;

    protected onLoad(): void {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    protected start(): void {
        this.bindButton(this.startButton, this.onStartClicked);
        this.bindButton(this.level1Button, this.onLevel1Clicked);
        this.bindButton(this.level2Button, this.onLevel2Clicked);
        this.playBgm();
        this.playTitleIdleAnimation();
        this.updateLevelSelection();
    }

    protected onDestroy(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);

        if (this.bgmId !== -1) {
            cc.audioEngine.stop(this.bgmId);
            this.bgmId = -1;
        }
    }

    public onStartClicked(): void {
        this.loadScene(this.selectedLevel === 1 ? this.level1Scene : this.level2Scene);
    }

    public onLevel1Clicked(): void {
        this.selectLevel(1);
    }

    public onLevel2Clicked(): void {
        this.selectLevel(2);
    }

    private bindButton(buttonNode: cc.Node, handler: () => void): void {
        if (!buttonNode) {
            return;
        }

        buttonNode.on(cc.Node.EventType.TOUCH_END, handler, this);
    }

    private onKeyDown(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.enter || event.keyCode === cc.macro.KEY.space) {
            this.onStartClicked();
            return;
        }

        if (event.keyCode === cc.macro.KEY.num1) {
            this.selectLevel(1);
            return;
        }

        if (event.keyCode === cc.macro.KEY.num2) {
            this.selectLevel(2);
        }
    }

    private selectLevel(level: number): void {
        if (this.selectedLevel === level) {
            return;
        }

        this.selectedLevel = level;
        this.playConfirmSfx();
        this.updateLevelSelection();
    }

    private updateLevelSelection(): void {
        this.setButtonSelected(this.level1Button, this.level1SelectedFrame, this.selectedLevel === 1);
        this.setButtonSelected(this.level2Button, this.level2SelectedFrame, this.selectedLevel === 2);
    }

    private setButtonSelected(buttonNode: cc.Node, selectedFrame: cc.Node, selected: boolean): void {
        if (buttonNode) {
            buttonNode.color = selected ? this.selectedButtonColor : this.normalButtonColor;
            buttonNode.scale = selected ? 1.06 : 1;
        }

        if (selectedFrame) {
            selectedFrame.active = selected;
            cc.tween(selectedFrame).stop();

            if (selected) {
                cc.tween(selectedFrame)
                    .repeatForever(
                        cc.tween()
                            .to(0.45, { opacity: 150 })
                            .to(0.45, { opacity: 255 })
                    )
                    .start();
            }
        }
    }

    private playBgm(): void {
        if (!this.bgm) {
            return;
        }

        this.bgmId = cc.audioEngine.playMusic(this.bgm, true);
        cc.audioEngine.setMusicVolume(0.45);
    }

    private playConfirmSfx(): void {
        if (this.confirmSfx) {
            cc.audioEngine.playEffect(this.confirmSfx, false);
        }
    }

    private playTitleIdleAnimation(): void {
        if (!this.titleNode) {
            return;
        }

        cc.tween(this.titleNode)
            .repeatForever(
                cc.tween()
                    .to(0.55, { scale: 1.04 }, { easing: 'sineInOut' })
                    .to(0.55, { scale: 1 }, { easing: 'sineInOut' })
            )
            .start();
    }

    private loadScene(sceneName: string): void {
        if (!sceneName || this.isTransitioning) {
            return;
        }

        this.isTransitioning = true;
        this.playConfirmSfx();
        cc.director.loadScene(sceneName);
    }
}
