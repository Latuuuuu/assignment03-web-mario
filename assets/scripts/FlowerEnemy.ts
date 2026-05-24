const { ccclass, property } = cc._decorator;

const TAG_ENEMY = 3;

@ccclass
export default class FlowerEnemy extends cc.Component {
    @property([cc.SpriteFrame])
    public idleFrames: cc.SpriteFrame[] = [];

    @property
    public animationFps = 5;

    @property
    public riseDistance = 72;

    @property
    public riseDuration = 0.7;

    @property
    public waitDuration = 0.8;

    @property
    public hiddenDuration = 0.8;

    @property
    public startHidden = true;

    private sprite: cc.Sprite = null;
    private baseY = 0;
    private frameIndex = 0;
    private animationTimer = 0;

    protected onLoad(): void {
        this.sprite = this.getComponent(cc.Sprite);
        this.baseY = this.node.y;

        const body = this.getComponent(cc.RigidBody);
        if (body) {
            body.enabledContactListener = true;
            body.gravityScale = 0;
            body.linearVelocity = cc.v2(0, 0);
        }

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.tag = TAG_ENEMY;
        }

        if (this.startHidden) {
            this.node.y = this.baseY - this.riseDistance;
        }
    }

    protected start(): void {
        this.playCycle();
    }

    protected update(dt: number): void {
        this.updateAnimation(dt);
    }

    public canBeStomped(): boolean {
        return false;
    }

    public die(): void {
        this.node.destroy();
    }

    private playCycle(): void {
        const hiddenY = this.baseY - this.riseDistance;
        const visibleY = this.baseY;

        cc.tween(this.node)
            .delay(this.hiddenDuration)
            .to(this.riseDuration, { y: visibleY })
            .delay(this.waitDuration)
            .to(this.riseDuration, { y: hiddenY })
            .call(() => this.playCycle())
            .start();
    }

    private updateAnimation(dt: number): void {
        if (!this.sprite || this.idleFrames.length === 0) {
            return;
        }

        this.animationTimer += dt;
        const frameDuration = 1 / Math.max(1, this.animationFps);
        if (this.animationTimer < frameDuration) {
            return;
        }

        this.animationTimer -= frameDuration;
        this.frameIndex = (this.frameIndex + 1) % this.idleFrames.length;
        this.sprite.spriteFrame = this.idleFrames[this.frameIndex];
    }
}
