const { ccclass, property } = cc._decorator;

@ccclass
export default class PrefabArrayBuilder extends cc.Component {
    @property(cc.Prefab)
    public prefab: cc.Prefab = null;

    @property
    public count = 10;

    @property
    public spacingX = 48;

    @property
    public spacingY = 0;

    @property
    public startX = 0;

    @property
    public startY = 0;

    @property
    public clearExistingChildren = true;

    @property
    public rebuildOnLoad = true;

    @property
    public reverseEveryOther = false;

    protected onLoad(): void {
        if (this.rebuildOnLoad) {
            this.rebuild();
        }
    }

    public rebuild(): void {
        if (!this.prefab) {
            cc.warn(`[PrefabArrayBuilder:${this.node.name}] Prefab is not assigned.`);
            return;
        }

        cc.director.getPhysicsManager().enabled = true;

        if (this.clearExistingChildren) {
            this.node.destroyAllChildren();
        }

        const total = Math.max(0, Math.floor(this.count));
        for (let i = 0; i < total; i++) {
            const item = cc.instantiate(this.prefab);
            item.name = `${this.prefab.name}_${i + 1}`;
            item.parent = this.node;
            item.setPosition(
                this.startX + i * this.spacingX,
                this.startY + i * this.spacingY
            );

            if (this.reverseEveryOther && i % 2 === 1) {
                item.scaleX = -Math.abs(item.scaleX);
            }

            this.syncPhysics(item);
        }
    }

    private syncPhysics(root: cc.Node): void {
        const colliders = root.getComponentsInChildren(cc.PhysicsCollider);
        for (let i = 0; i < colliders.length; i++) {
            colliders[i].apply();
        }

        const bodies = root.getComponentsInChildren(cc.RigidBody);
        for (let i = 0; i < bodies.length; i++) {
            bodies[i].syncPosition(false);
            bodies[i].syncRotation(false);
        }
    }
}
