const { ccclass, property } = cc._decorator;

@ccclass
export default class HUDController extends cc.Component {
    @property(cc.Label)
    public lifeLabel: cc.Label = null;

    @property(cc.Label)
    public scoreLabel: cc.Label = null;

    @property(cc.Label)
    public timerLabel: cc.Label = null;

    @property
    public scoreDigits = 6;

    public setLife(life: number): void {
        if (this.lifeLabel) {
            this.lifeLabel.string = `LIFE x ${life}`;
        }
    }

    public setScore(score: number): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = `SCORE ${this.padNumber(score, this.scoreDigits)}`;
        }
    }

    public setTime(time: number): void {
        if (this.timerLabel) {
            this.timerLabel.string = `TIME ${time}`;
        }
    }

    private padNumber(value: number, digits: number): string {
        let text = `${Math.max(0, value)}`;
        while (text.length < digits) {
            text = `0${text}`;
        }
        return text;
    }
}
