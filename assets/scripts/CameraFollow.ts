const { ccclass, property } = cc._decorator;

@ccclass
export default class CameraFollow extends cc.Component {
    @property(cc.Node)
    public target: cc.Node = null;

    @property
    public minX = 0;

    @property
    public maxX = 2400;

    @property
    public followY = false;

    @property
    public offsetX = 180;

    @property
    public offsetY = 0;

    protected lateUpdate(): void {
        if (!this.target) {
            return;
        }

        const nextX = cc.misc.clampf(this.target.x + this.offsetX, this.minX, this.maxX);
        const nextY = this.followY ? this.target.y + this.offsetY : this.node.y;
        this.node.setPosition(nextX, nextY);
    }
}
