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

    private body: cc.RigidBody = null;
    private direction = -1;
    private isDead = false;

    protected onLoad(): void {
        this.body = this.getComponent(cc.RigidBody);

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

        this.node.scaleY = 0.45;
        this.scheduleOnce(() => {
            this.node.destroy();
        }, this.deadDelay);
    }

    private turnAround(): void {
        this.direction *= -1;
        this.node.scaleX = Math.abs(this.node.scaleX) * (this.direction < 0 ? 1 : -1);
    }
}
