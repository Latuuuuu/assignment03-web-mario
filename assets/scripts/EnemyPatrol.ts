const { ccclass, property } = cc._decorator;

const TAG_ENEMY = 3;
const TAG_WALL = 7;

@ccclass
export default class EnemyPatrol extends cc.Component {
    @property
    public speed = 80;

    @property
    public score = 100;

    @property
    public deadDelay = 0.25;

    @property([cc.SpriteFrame])
    public walkFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public deadFrame: cc.SpriteFrame = null;

    @property
    public animationFps = 6;

    private body: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private direction = -1;
    private isDead = false;
    private animationTimer = 0;
    private walkFrameIndex = 0;

    protected onLoad(): void {
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
        }

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.tag = TAG_ENEMY;
        }
    }

    protected update(): void {
        if (!this.body || this.isDead) {
            return;
        }

        this.body.linearVelocity = cc.v2(this.direction * this.speed, this.body.linearVelocity.y);
        this.updateWalkAnimation();
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        if (this.isDead) {
            return;
        }

        if (otherCollider.tag === TAG_WALL) {
            this.turnAround();
        }
    }

    public die(): void {
        if (this.isDead) {
            return;
        }

        this.isDead = true;

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.enabled = false;
        }

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.enabled = false;
        }

        if (this.sprite && this.deadFrame) {
            this.sprite.spriteFrame = this.deadFrame;
        }

        this.node.scaleY = 0.45;
        this.scheduleOnce(() => {
            this.node.destroy();
        }, this.deadDelay);
    }

    private turnAround(): void {
        this.direction *= -1;
        this.node.scaleX = Math.abs(this.node.scaleX) * (this.direction < 0 ? 1 : -1);
    }

    private updateWalkAnimation(): void {
        if (!this.sprite || this.walkFrames.length === 0) {
            return;
        }

        this.animationTimer += cc.director.getDeltaTime();
        const frameDuration = 1 / Math.max(1, this.animationFps);
        if (this.animationTimer < frameDuration) {
            return;
        }

        this.animationTimer -= frameDuration;
        this.walkFrameIndex = (this.walkFrameIndex + 1) % this.walkFrames.length;
        this.sprite.spriteFrame = this.walkFrames[this.walkFrameIndex];
    }
}
