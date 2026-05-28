import { fetchLeaderboard, fetchUserBestRecord, LeaderboardEntry } from "./FirebaseManager";

const { ccclass, property } = cc._decorator;

const STORAGE_BEST_SCORE_PREFIX = 'webMario.bestScore.';
const STORAGE_BEST_TIME_PREFIX = 'webMario.bestClearTime.';

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

    @property(cc.Label)
    public selectedBestLabel: cc.Label = null;

    @property(cc.Label)
    public level1BestLabel: cc.Label = null;

    @property(cc.Label)
    public level2BestLabel: cc.Label = null;

    @property(cc.Label)
    public selectedLeaderboardLabel: cc.Label = null;

    @property(cc.Label)
    public level1LeaderboardLabel: cc.Label = null;

    @property(cc.Label)
    public level2LeaderboardLabel: cc.Label = null;

    @property
    public leaderboardLimit = 5;

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
    private leaderboardRequestId = 0;

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
        this.updateBestRecordLabels();
        this.loadCloudRecords();
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
        this.updateBestRecordLabels();
        this.loadCloudRecords();
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

    private updateBestRecordLabels(): void {
        this.setBestRecordLabel(this.level1BestLabel, 'LEVEL 1', this.level1Scene);
        this.setBestRecordLabel(this.level2BestLabel, 'LEVEL 2', this.level2Scene);

        if (this.selectedBestLabel) {
            const sceneName = this.selectedLevel === 1 ? this.level1Scene : this.level2Scene;
            const title = this.selectedLevel === 1 ? 'LEVEL 1' : 'LEVEL 2';
            this.setBestRecordLabel(this.selectedBestLabel, title, sceneName);
        }

        this.setLeaderboardLoading(this.level1LeaderboardLabel, 'LEVEL 1');
        this.setLeaderboardLoading(this.level2LeaderboardLabel, 'LEVEL 2');

        if (this.selectedLeaderboardLabel) {
            const title = this.selectedLevel === 1 ? 'LEVEL 1' : 'LEVEL 2';
            this.setLeaderboardLoading(this.selectedLeaderboardLabel, title);
        }
    }

    private setBestRecordLabel(label: cc.Label, title: string, sceneName: string): void {
        if (!label) {
            return;
        }

        const record = this.getBestRecord(sceneName);
        if (!record.hasScore && !record.hasTime) {
            label.string = `${title}\nBEST SCORE ------\nBEST TIME --`;
            return;
        }

        label.string = `${title}\nBEST SCORE ${this.padNumber(record.score, 6)}\nBEST TIME ${this.formatTime(record.clearTime)}`;
    }

    private getBestRecord(sceneName: string): { score: number; clearTime: number; hasScore: boolean; hasTime: boolean } {
        const score = this.readStoredNumber(`${STORAGE_BEST_SCORE_PREFIX}${sceneName}`, 0);
        const clearTime = this.readStoredNumber(`${STORAGE_BEST_TIME_PREFIX}${sceneName}`, -1);

        return {
            score,
            clearTime,
            hasScore: score > 0,
            hasTime: clearTime >= 0,
        };
    }

    private readStoredNumber(key: string, fallback: number): number {
        const rawValue = cc.sys.localStorage.getItem(key);
        if (rawValue === null || rawValue === undefined || rawValue === '') {
            return fallback;
        }

        const value = Number(rawValue);
        return isNaN(value) ? fallback : value;
    }

    private padNumber(value: number, digits: number): string {
        let text = String(Math.max(0, Math.floor(value)));
        while (text.length < digits) {
            text = `0${text}`;
        }
        return text;
    }

    private formatTime(seconds: number): string {
        if (seconds < 0) {
            return '--';
        }

        return `${this.padNumber(seconds, 3)}s`;
    }

    private loadCloudRecords(): void {
        const requestId = ++this.leaderboardRequestId;
        const selectedSceneName = this.selectedLevel === 1 ? this.level1Scene : this.level2Scene;
        const selectedTitle = this.selectedLevel === 1 ? 'LEVEL 1' : 'LEVEL 2';

        this.loadCloudBestRecord(this.level1BestLabel, 'LEVEL 1', this.level1Scene);
        this.loadCloudBestRecord(this.level2BestLabel, 'LEVEL 2', this.level2Scene);
        this.loadCloudBestRecord(this.selectedBestLabel, selectedTitle, selectedSceneName);
        this.loadLeaderboardLabel(this.level1LeaderboardLabel, 'LEVEL 1', this.level1Scene, requestId, false);
        this.loadLeaderboardLabel(this.level2LeaderboardLabel, 'LEVEL 2', this.level2Scene, requestId, false);
        this.loadLeaderboardLabel(this.selectedLeaderboardLabel, selectedTitle, selectedSceneName, requestId, true);
    }

    private loadCloudBestRecord(label: cc.Label, title: string, sceneName: string): void {
        if (!label || !sceneName) {
            return;
        }

        fetchUserBestRecord(sceneName)
            .then((record) => {
                if (!record) {
                    return;
                }

                this.saveBestRecordToLocal(record.levelName, record.bestScore, record.bestClearTime);
                this.setBestRecordLabel(label, title, sceneName);
            })
            .catch((error) => cc.warn(`[MenuController] Failed to load cloud best record: ${error && error.message ? error.message : error}`));
    }

    private loadLeaderboardLabel(label: cc.Label, title: string, sceneName: string, requestId: number, isSelectedLabel: boolean): void {
        if (!label || !sceneName) {
            return;
        }

        fetchLeaderboard(sceneName, this.leaderboardLimit)
            .then((entries) => {
                if (isSelectedLabel && requestId !== this.leaderboardRequestId) {
                    return;
                }

                this.setLeaderboardLabel(label, title, entries);
            })
            .catch((error) => {
                cc.warn(`[MenuController] Failed to load leaderboard: ${error && error.message ? error.message : error}`);
                label.string = `${title} RANKING\nOFFLINE`;
            });
    }

    private setLeaderboardLoading(label: cc.Label, title: string): void {
        if (label) {
            label.string = `${title} RANKING\nLOADING...`;
        }
    }

    private setLeaderboardLabel(label: cc.Label, title: string, entries: LeaderboardEntry[]): void {
        if (!label) {
            return;
        }

        if (!entries || entries.length === 0) {
            label.string = `${title} RANKING\nNO RECORDS`;
            return;
        }

        const lines = [`${title} RANKING`];
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            lines.push(`${i + 1}. ${this.trimName(entry.playerName)} ${this.padNumber(entry.bestScore, 6)} ${this.formatTime(entry.bestClearTime)}`);
        }
        label.string = lines.join('\n');
    }

    private saveBestRecordToLocal(levelName: string, score: number, clearTime: number): void {
        const bestScoreKey = `${STORAGE_BEST_SCORE_PREFIX}${levelName}`;
        const bestTimeKey = `${STORAGE_BEST_TIME_PREFIX}${levelName}`;
        const bestScore = this.readStoredNumber(bestScoreKey, 0);
        const bestTime = this.readStoredNumber(bestTimeKey, -1);

        if (score > bestScore) {
            cc.sys.localStorage.setItem(bestScoreKey, String(score));
        }

        if (bestTime < 0 || clearTime < bestTime) {
            cc.sys.localStorage.setItem(bestTimeKey, String(clearTime));
        }
    }

    private trimName(name: string): string {
        const safeName = name || 'Player';
        return safeName.length > 10 ? `${safeName.substr(0, 10)}` : safeName;
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
