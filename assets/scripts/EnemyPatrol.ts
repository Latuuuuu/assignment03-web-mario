const { ccclass, property } = cc._decorator;

const TAG_GROUND = 1;
const TAG_ENEMY = 3;
const TAG_QUESTION_BLOCK = 4;
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

    @property([cc.SpriteFrame])
    public deadFrames: cc.SpriteFrame[] = [];

    @property
    public animationFps = 6;

    private body: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private direction = -1;
    private isDead = false;
    private animationTimer = 0;
    private walkFrameIndex = 0;
    private deadFrameIndex = 0;
    private turnCooldown = 0;

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
        if (!this.body || this.isDead) {
            return;
        }

        this.turnCooldown = Math.max(0, this.turnCooldown - dt);
        this.body.linearVelocity = cc.v2(this.direction * this.speed, this.body.linearVelocity.y);
        this.updateWalkAnimation();
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        if (this.isDead) {
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

        if (this.deadFrames.length > 0) {
            this.playDeadAnimation();
        } else if (this.sprite && this.deadFrame) {
            this.sprite.spriteFrame = this.deadFrame;
        }

        if (this.deadFrames.length === 0) {
            this.node.scaleY = 0.45;
            this.scheduleOnce(() => {
                this.node.destroy();
            }, this.deadDelay);
        }
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

    private playDeadAnimation(): void {
        if (!this.sprite) {
            this.node.destroy();
            return;
        }

        this.deadFrameIndex = 0;
        this.sprite.spriteFrame = this.deadFrames[this.deadFrameIndex];
        this.schedule(this.advanceDeadFrame, 1 / Math.max(1, this.animationFps), this.deadFrames.length - 1, 0);
        this.scheduleOnce(() => this.node.destroy(), this.deadFrames.length / Math.max(1, this.animationFps));
    }

    private advanceDeadFrame(): void {
        if (!this.sprite || this.deadFrames.length === 0) {
            return;
        }

        this.deadFrameIndex = Math.min(this.deadFrameIndex + 1, this.deadFrames.length - 1);
        this.sprite.spriteFrame = this.deadFrames[this.deadFrameIndex];
    }
}
