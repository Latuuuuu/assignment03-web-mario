const { ccclass, property } = cc._decorator;

@ccclass
export default class BreakableBlock extends cc.Component {
    @property
    public breakDelay = 0;

    private isBroken = false;

    public breakBlock(): void {
        if (this.isBroken) {
            return;
        }

        this.isBroken = true;

        const colliders = this.node.getComponents(cc.PhysicsCollider);
        for (let i = 0; i < colliders.length; i++) {
            colliders[i].enabled = false;
        }

        const body = this.node.getComponent(cc.RigidBody);
        if (body) {
            body.enabled = false;
        }

        cc.tween(this.node)
            .to(0.08, { scaleX: 1.15, scaleY: 1.15, opacity: 180 })
            .to(0.08, { scaleX: 0.1, scaleY: 0.1, opacity: 0 })
            .delay(Math.max(0, this.breakDelay))
            .call(() => this.node.destroy())
            .start();
    }
}
