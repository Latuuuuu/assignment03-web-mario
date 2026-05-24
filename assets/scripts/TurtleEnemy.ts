const { ccclass, property } = cc._decorator;

const TAG_ENEMY = 3;
const TAG_WALL = 7;

enum TurtleState {
    Walking,
    ShellIdle,
    ShellMoving,
    Dead,
}

@ccclass
export default class TurtleEnemy extends cc.Component {
    @property
    public walkSpeed = 70;

    @property
    public shellSpeed = 260;

    @property
    public wakeDelay = 5;

    @property([cc.SpriteFrame])
    public walkFrames: cc.SpriteFrame[] = [];

    @property([cc.SpriteFrame])
    public shellFrames: cc.SpriteFrame[] = [];

    @property([cc.SpriteFrame])
    public shellMoveFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public deadFrame: cc.SpriteFrame = null;

    @property
    public animationFps = 6;

    private body: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private state = TurtleState.Walking;
    private direction = -1;
    private frameIndex = 0;
    private animationTimer = 0;

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

    protected update(dt: number): void {
        if (!this.body || this.state === TurtleState.Dead) {
            return;
        }

        if (this.state === TurtleState.Walking) {
            this.body.linearVelocity = cc.v2(this.direction * this.walkSpeed, this.body.linearVelocity.y);
            this.playFrames(this.walkFrames, dt);
            return;
        }

        if (this.state === TurtleState.ShellIdle) {
            this.body.linearVelocity = cc.v2(0, this.body.linearVelocity.y);
            this.playFrames(this.shellFrames.length > 0 ? this.shellFrames : [this.deadFrame], dt);
            return;
        }

        this.body.linearVelocity = cc.v2(this.direction * this.shellSpeed, this.body.linearVelocity.y);
        this.playFrames(this.shellMoveFrames.length > 0 ? this.shellMoveFrames : this.shellFrames, dt);
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        if (this.state === TurtleState.Dead) {
            return;
        }

        if (otherCollider.tag === TAG_WALL) {
            this.turnAround();
        }
    }

    public canBeStomped(): boolean {
        return true;
    }

    public onStomp(playerNode: cc.Node): void {
        if (this.state === TurtleState.Walking) {
            this.enterShellIdle();
            return;
        }

        if (this.state === TurtleState.ShellIdle) {
            this.kickShell(playerNode);
            return;
        }

        this.enterShellIdle();
    }

    public die(): void {
        this.state = TurtleState.Dead;

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

        this.scheduleOnce(() => this.node.destroy(), 0.3);
    }

    private enterShellIdle(): void {
        this.state = TurtleState.ShellIdle;
        this.frameIndex = 0;
        this.animationTimer = 0;

        if (this.sprite && this.shellFrames.length > 0) {
            this.sprite.spriteFrame = this.shellFrames[0];
        } else if (this.sprite && this.deadFrame) {
            this.sprite.spriteFrame = this.deadFrame;
        }

        this.unschedule(this.wakeUp);
        this.scheduleOnce(this.wakeUp, this.wakeDelay);
    }

    private kickShell(playerNode: cc.Node): void {
        this.state = TurtleState.ShellMoving;
        this.direction = this.node.x >= playerNode.x ? 1 : -1;
        this.unschedule(this.wakeUp);
    }

    private wakeUp(): void {
        if (this.state !== TurtleState.ShellIdle) {
            return;
        }

        this.state = TurtleState.Walking;
        this.frameIndex = 0;
        this.animationTimer = 0;
    }

    private turnAround(): void {
        this.direction *= -1;
        this.node.scaleX = Math.abs(this.node.scaleX) * (this.direction < 0 ? 1 : -1);
    }

    private playFrames(frames: cc.SpriteFrame[], dt: number): void {
        if (!this.sprite || !frames || frames.length === 0 || !frames[0]) {
            return;
        }

        if (frames.length === 1) {
            this.sprite.spriteFrame = frames[0];
            return;
        }

        this.animationTimer += dt;
        const frameDuration = 1 / Math.max(1, this.animationFps);
        if (this.animationTimer < frameDuration) {
            return;
        }

        this.animationTimer -= frameDuration;
        this.frameIndex = (this.frameIndex + 1) % frames.length;
        this.sprite.spriteFrame = frames[this.frameIndex];
    }
}
