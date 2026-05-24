const { ccclass, property } = cc._decorator;

@ccclass
export default class HUDController extends cc.Component {
    @property(cc.Label)
    public lifeLabel: cc.Label = null;

    @property(cc.Label)
    public scoreLabel: cc.Label = null;

    @property(cc.Label)
    public timerLabel: cc.Label = null;

    public setLife(life: number): void {
        if (this.lifeLabel) {
            this.lifeLabel.string = `LIFE ${life}`;
        }
    }

    public setScore(score: number): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = `SCORE ${score}`;
        }
    }

    public setTime(time: number): void {
        if (this.timerLabel) {
            this.timerLabel.string = `TIME ${time}`;
        }
    }
}
