const { ccclass, property } = cc._decorator;

const TAG_POWERUP = 8;
const TAG_PLAYER = 2;
const TAG_WALL = 7;

@ccclass
export default class SuperMushroom extends cc.Component {
    @property
    public moveSpeed = 90;

    @property
    public riseDistance = 48;

    @property
    public riseDuration = 0.35;

    private body: cc.RigidBody = null;
    private direction = 1;
    private isRising = true;
    private isConsumed = false;

    protected onLoad(): void {
        this.body = this.getComponent(cc.RigidBody);

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.gravityScale = 0;
            this.body.linearVelocity = cc.v2(0, 0);
        }

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.tag = TAG_POWERUP;
            collider.sensor = false;
        }
    }

    protected start(): void {
        const startY = this.node.y;
        cc.tween(this.node)
            .to(this.riseDuration, { y: startY + this.riseDistance })
            .call(() => {
                this.isRising = false;
                if (this.body) {
                    this.body.gravityScale = 1;
                }
            })
            .start();
    }

    protected update(): void {
        if (!this.body || this.isRising || this.isConsumed) {
            return;
        }

        this.body.linearVelocity = cc.v2(this.direction * this.moveSpeed, this.body.linearVelocity.y);
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        if (this.isConsumed) {
            return;
        }

        if (otherCollider.tag === TAG_PLAYER) {
            this.consumeByPlayer(otherCollider.node);
            return;
        }

        if (otherCollider.tag === TAG_WALL) {
            this.direction *= -1;
        }
    }

    public consumeByPlayer(playerNode: cc.Node): void {
        this.isConsumed = true;
        cc.Tween.stopAllByTarget(this.node);
        this.unscheduleAllCallbacks();

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.enabled = false;
        }

        if (this.body) {
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.gravityScale = 0;
            this.body.enabled = false;
        }

        this.node.active = false;

        const player = playerNode.getComponent('PlayerController');
        if (player && player.becomeBig) {
            player.becomeBig();
        }

        this.node.destroy();
    }
}
