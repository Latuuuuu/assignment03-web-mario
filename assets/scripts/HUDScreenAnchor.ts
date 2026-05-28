const { ccclass, property } = cc._decorator;

@ccclass
export default class HUDScreenAnchor extends cc.Component {
    @property(cc.Node)
    public targetCamera: cc.Node = null;

    @property
    public offsetX = 0;

    @property
    public offsetY = 0;

    protected lateUpdate(): void {
        const cameraNode = this.targetCamera || cc.find('Canvas/Main Camera') || cc.find('Main Camera');
        if (!cameraNode || !this.node.parent) {
            return;
        }

        const worldPosition = cameraNode.convertToWorldSpaceAR(cc.v2(this.offsetX, this.offsetY));
        const localPosition = this.node.parent.convertToNodeSpaceAR(worldPosition);
        this.node.setPosition(localPosition.x, localPosition.y);
    }
}
