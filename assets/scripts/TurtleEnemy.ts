const { ccclass, property } = cc._decorator;

const TAG_GROUND = 1;
const TAG_PLAYER = 2;
const TAG_ENEMY = 3;
const TAG_QUESTION_BLOCK = 4;
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

    @property
    public forceDynamicBody = true;

    @property
    public debugMovement = false;

    @property
    public driveByPosition = true;

    private body: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private state = TurtleState.Walking;
    private direction = -1;
    private frameIndex = 0;
    private animationTimer = 0;
    private turnCooldown = 0;

    protected onLoad(): void {
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);

        if (this.body) {
            if (this.forceDynamicBody) {
                this.body.type = cc.RigidBodyType.Dynamic;
            }

            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
            this.body.allowSleep = false;
            this.body.awake = true;
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

        this.turnCooldown = Math.max(0, this.turnCooldown - dt);

        if (this.state === TurtleState.Walking) {
            this.moveHorizontally(this.direction * this.walkSpeed, dt);
            this.playFrames(this.walkFrames, dt);
            return;
        }

        if (this.state === TurtleState.ShellIdle) {
            this.setHorizontalVelocity(0);
            this.playFrames(this.shellFrames.length > 0 ? this.shellFrames : [this.deadFrame], dt);
            return;
        }

        this.moveHorizontally(this.direction * this.shellSpeed, dt);
        this.playFrames(this.shellMoveFrames.length > 0 ? this.shellMoveFrames : this.shellFrames, dt);
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        if (this.state === TurtleState.Dead) {
            return;
        }

        if (this.state === TurtleState.ShellMoving && otherCollider.tag === TAG_ENEMY) {
            contact.disabled = true;
            this.killEnemy(otherCollider.node);
            return;
        }

        if (this.state === TurtleState.ShellMoving && otherCollider.tag === TAG_PLAYER) {
            return;
        }

        if (
            otherCollider.tag === TAG_WALL ||
            otherCollider.tag === TAG_ENEMY ||
            this.isSideBlocked(contact, selfCollider, otherCollider)
        ) {
            this.turnAround();
        }
    }

    public canBeStomped(): boolean {
        return this.state === TurtleState.Walking;
    }

    public handlePlayerContact(playerNode: cc.Node, isStomp: boolean): boolean {
        if (this.state === TurtleState.Walking) {
            return false;
        }

        this.kickShell(playerNode);
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

        this.kickShell(playerNode);
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

    private killEnemy(enemyNode: cc.Node): void {
        if (enemyNode === this.node) {
            return;
        }

        const enemyScript = enemyNode.getComponent('EnemyPatrol') ||
            enemyNode.getComponent('FlowerEnemy') ||
            enemyNode.getComponent('TurtleEnemy');

        if (enemyScript && enemyScript.die) {
            enemyScript.die();
        }
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
        const turtleCenterX = this.getWorldCenterX(this.node);
        const playerCenterX = this.getWorldCenterX(playerNode);
        this.direction = turtleCenterX >= playerCenterX ? 1 : -1;
        this.unschedule(this.wakeUp);
    }

    private getWorldCenterX(targetNode: cc.Node): number {
        const bounds = targetNode.getBoundingBoxToWorld();
        return bounds.x + bounds.width * 0.5;
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
        if (this.turnCooldown > 0) {
            return;
        }

        this.turnCooldown = 0.12;
        this.direction *= -1;
        this.node.scaleX = Math.abs(this.node.scaleX) * (this.direction < 0 ? 1 : -1);
    }

    private isSideBlocked(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): boolean {
        if (otherCollider.tag !== TAG_GROUND && otherCollider.tag !== TAG_QUESTION_BLOCK) {
            return false;
        }

        const worldManifold = contact.getWorldManifold();
        if (worldManifold && worldManifold.normal) {
            const normalX = selfCollider === contact.colliderA ? worldManifold.normal.x : -worldManifold.normal.x;
            return Math.abs(normalX) > 0.55;
        }

        const selfBounds = this.node.getBoundingBoxToWorld();
        const otherBounds = otherCollider.node.getBoundingBoxToWorld();
        const overlapsVertically = selfBounds.yMin < otherBounds.yMax - 4 && selfBounds.yMax > otherBounds.yMin + 4;
        if (!overlapsVertically) {
            return false;
        }

        return this.direction > 0
            ? selfBounds.xMax <= otherBounds.xMin + 8
            : selfBounds.xMin >= otherBounds.xMax - 8;
    }

    private setHorizontalVelocity(velocityX: number): void {
        if (!this.body) {
            return;
        }

        this.body.awake = true;
        this.body.linearVelocity = cc.v2(velocityX, this.body.linearVelocity.y);

        if (this.debugMovement) {
            cc.log(`[TurtleEnemy:${this.node.name}] vx=${velocityX}, vy=${this.body.linearVelocity.y.toFixed(1)}, type=${this.body.type}`);
        }
    }

    private moveHorizontally(velocityX: number, dt: number): void {
        if (!this.driveByPosition) {
            this.setHorizontalVelocity(velocityX);
            return;
        }

        if (this.body) {
            this.body.awake = true;
            this.body.linearVelocity = cc.v2(0, this.body.linearVelocity.y);
        }

        this.node.x += velocityX * dt;

        if (this.body) {
            this.body.syncPosition(false);
        }

        if (this.debugMovement) {
            cc.log(`[TurtleEnemy:${this.node.name}] x=${this.node.x.toFixed(1)}, vx=${velocityX}`);
        }
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
