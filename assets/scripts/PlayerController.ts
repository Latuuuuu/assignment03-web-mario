const { ccclass, property } = cc._decorator;

const TAG_GROUND = 1;
const TAG_PLAYER = 2;
const TAG_ENEMY = 3;
const TAG_QUESTION_BLOCK = 4;
const TAG_DEATH = 5;
const TAG_GOAL = 6;
const TAG_POWERUP = 8;

@ccclass
export default class PlayerController extends cc.Component {
    @property(cc.Node)
    public gameManagerNode: cc.Node = null;

    @property
    public moveSpeed = 260;

    @property
    public jumpSpeed = 520;

    @property
    public stompBounceSpeed = 360;

    @property(cc.AudioClip)
    public jumpSfx: cc.AudioClip = null;

    @property(cc.AudioClip)
    public stompSfx: cc.AudioClip = null;

    @property(cc.SpriteFrame)
    public idleFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    public idleFrames: cc.SpriteFrame[] = [];

    @property([cc.SpriteFrame])
    public runFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public jumpFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    public jumpFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public fallFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    public fallFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public bigIdleFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    public bigIdleFrames: cc.SpriteFrame[] = [];

    @property([cc.SpriteFrame])
    public bigRunFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public bigJumpFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    public bigJumpFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public bigFallFrame: cc.SpriteFrame = null;

    @property([cc.SpriteFrame])
    public bigFallFrames: cc.SpriteFrame[] = [];

    @property
    public bigColliderHeight = 96;

    @property
    public bigColliderOffsetY = 24;

    @property
    public spritePixelScale = 3;

    @property
    public keepFeetOnGroundWhenGrow = true;

    @property
    public animationFps = 10;

    private body: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private moveDirection = 0;
    private groundContacts = 0;
    private isFacingRight = true;
    private animationTimer = 0;
    private animationFrameIndex = 0;
    private currentAnimationState = '';
    private isBig = false;
    private smallColliderSize: cc.Size = null;
    private smallColliderOffset: cc.Vec2 = null;

    protected onLoad(): void {
        this.body = this.getComponent(cc.RigidBody);
        this.sprite = this.getComponent(cc.Sprite);

        if (this.body) {
            this.body.enabledContactListener = true;
            this.body.fixedRotation = true;
        }

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.tag = TAG_PLAYER;
        }

        const boxCollider = this.getComponent(cc.PhysicsBoxCollider);
        if (boxCollider) {
            this.smallColliderSize = boxCollider.size.clone();
            this.smallColliderOffset = boxCollider.offset.clone();
        }

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected onDestroy(): void {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    protected update(): void {
        if (!this.body) {
            return;
        }

        this.body.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, this.body.linearVelocity.y);
        this.updateFacing();
        this.updateAnimation();
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        switch (otherCollider.tag) {
            case TAG_GROUND:
            case TAG_QUESTION_BLOCK:
                this.groundContacts += this.isStandingOn(otherCollider) ? 1 : 0;
                break;
            case TAG_ENEMY:
                this.handleEnemyContact(contact, otherCollider);
                break;
            case TAG_DEATH:
                this.gameManagerCall('loseLife');
                break;
            case TAG_GOAL:
                this.gameManagerCall('levelClear');
                break;
            case TAG_POWERUP:
                this.becomeBig();
                otherCollider.node.destroy();
                break;
            default:
                break;
        }
    }

    public onEndContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        if (otherCollider.tag === TAG_GROUND || otherCollider.tag === TAG_QUESTION_BLOCK) {
            this.groundContacts = Math.max(0, this.groundContacts - 1);
        }
    }

    private onKeyDown(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.left || event.keyCode === cc.macro.KEY.a) {
            this.moveDirection = -1;
            return;
        }

        if (event.keyCode === cc.macro.KEY.right || event.keyCode === cc.macro.KEY.d) {
            this.moveDirection = 1;
            return;
        }

        if (event.keyCode === cc.macro.KEY.up || event.keyCode === cc.macro.KEY.w || event.keyCode === cc.macro.KEY.space) {
            this.jump();
        }
    }

    private onKeyUp(event: cc.Event.EventKeyboard): void {
        if (
            (event.keyCode === cc.macro.KEY.left || event.keyCode === cc.macro.KEY.a) && this.moveDirection < 0 ||
            (event.keyCode === cc.macro.KEY.right || event.keyCode === cc.macro.KEY.d) && this.moveDirection > 0
        ) {
            this.moveDirection = 0;
        }
    }

    private jump(): void {
        if (!this.body || this.groundContacts <= 0) {
            return;
        }

        this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.jumpSpeed);
        this.playEffect(this.jumpSfx);
    }

    private handleEnemyContact(contact: cc.PhysicsContact, enemyCollider: cc.PhysicsCollider): void {
        const enemyScript = this.getEnemyScript(enemyCollider.node);
        const canBeStomped = !enemyScript || !enemyScript.canBeStomped || enemyScript.canBeStomped();

        if (canBeStomped && this.isStompingEnemy(enemyCollider)) {
            contact.disabled = true;
            this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.stompBounceSpeed);
            this.gameManagerCall('addScore', 100);
            this.playEffect(this.stompSfx);

            if (enemyScript && enemyScript.onStomp) {
                enemyScript.onStomp(this.node);
            } else if (enemyScript && enemyScript.die) {
                enemyScript.die();
            }
            return;
        }

        this.gameManagerCall('loseLife');
    }

    private isStandingOn(otherCollider: cc.PhysicsCollider): boolean {
        const playerBounds = this.node.getBoundingBoxToWorld();
        const otherBounds = otherCollider.node.getBoundingBoxToWorld();
        return playerBounds.yMin >= otherBounds.yMax - 18;
    }

    private isStompingEnemy(enemyCollider: cc.PhysicsCollider): boolean {
        const playerBounds = this.node.getBoundingBoxToWorld();
        const enemyBounds = enemyCollider.node.getBoundingBoxToWorld();
        return this.body.linearVelocity.y < -20 && playerBounds.yMin >= enemyBounds.yMax - 14;
    }

    private getEnemyScript(enemyNode: cc.Node): any {
        return enemyNode.getComponent('TurtleEnemy') ||
            enemyNode.getComponent('FlowerEnemy') ||
            enemyNode.getComponent('EnemyPatrol');
    }

    private updateFacing(): void {
        if (this.moveDirection === 0) {
            return;
        }

        this.isFacingRight = this.moveDirection > 0;
        this.node.scaleX = Math.abs(this.node.scaleX) * (this.isFacingRight ? 1 : -1);
    }

    private updateAnimation(): void {
        if (!this.sprite || !this.body) {
            return;
        }

        const velocityY = this.body.linearVelocity.y;
        const isGrounded = this.groundContacts > 0;
        const idleFrames = this.pickFrames(
            this.isBig ? this.bigIdleFrames : this.idleFrames,
            this.isBig ? this.bigIdleFrame : this.idleFrame,
            this.idleFrames,
            this.idleFrame
        );
        const runFrames = this.isBig && this.bigRunFrames.length > 0 ? this.bigRunFrames : this.runFrames;
        const jumpFrames = this.pickFrames(
            this.isBig ? this.bigJumpFrames : this.jumpFrames,
            this.isBig ? this.bigJumpFrame : this.jumpFrame,
            this.jumpFrames,
            this.jumpFrame || idleFrames[0]
        );
        const fallFrames = this.pickFrames(
            this.isBig ? this.bigFallFrames : this.fallFrames,
            this.isBig ? this.bigFallFrame : this.fallFrame,
            this.fallFrames,
            this.fallFrame || jumpFrames[0]
        );

        if (!isGrounded && velocityY > 10) {
            this.playFrameAnimation('jump', jumpFrames);
            return;
        }

        if (!isGrounded && velocityY <= 10) {
            this.playFrameAnimation('fall', fallFrames);
            return;
        }

        if (this.moveDirection !== 0 && runFrames.length > 0) {
            this.playFrameAnimation('run', runFrames);
            return;
        }

        this.playFrameAnimation('idle', idleFrames);
    }

    private playFrameAnimation(state: string, frames: cc.SpriteFrame[]): void {
        if (!frames || frames.length === 0) {
            return;
        }

        if (this.currentAnimationState !== state) {
            this.currentAnimationState = state;
            this.animationTimer = 0;
            this.animationFrameIndex = 0;
            this.applySpriteFrame(frames[this.animationFrameIndex]);
            return;
        }

        if (frames.length === 1) {
            this.applySpriteFrame(frames[0]);
            return;
        }

        this.animationTimer += cc.director.getDeltaTime();
        const frameDuration = 1 / Math.max(1, this.animationFps);
        if (this.animationTimer < frameDuration) {
            return;
        }

        this.animationTimer -= frameDuration;
        this.animationFrameIndex = (this.animationFrameIndex + 1) % frames.length;
        this.applySpriteFrame(frames[this.animationFrameIndex]);
    }

    private pickFrames(primaryFrames: cc.SpriteFrame[], primaryFrame: cc.SpriteFrame, fallbackFrames: cc.SpriteFrame[], fallbackFrame: cc.SpriteFrame): cc.SpriteFrame[] {
        if (primaryFrames && primaryFrames.length > 0) {
            return primaryFrames;
        }

        if (primaryFrame) {
            return [primaryFrame];
        }

        if (fallbackFrames && fallbackFrames.length > 0) {
            return fallbackFrames;
        }

        return fallbackFrame ? [fallbackFrame] : [];
    }

    private applySpriteFrame(frame: cc.SpriteFrame): void {
        this.sprite.spriteFrame = frame;

        const originalSize = frame.getOriginalSize();
        this.node.setContentSize(
            originalSize.width * this.spritePixelScale,
            originalSize.height * this.spritePixelScale
        );
    }

    public becomeBig(): void {
        if (this.isBig) {
            return;
        }

        const oldHeight = this.node.height;
        this.isBig = true;
        this.currentAnimationState = '';
        this.updateAnimation();
        this.liftAfterGrow(oldHeight);
        this.updateBigCollider();
        this.playGrowEffect();
    }

    private liftAfterGrow(oldHeight: number): void {
        if (!this.keepFeetOnGroundWhenGrow) {
            return;
        }

        const heightDelta = this.node.height - oldHeight;
        if (heightDelta > 0) {
            this.node.y += heightDelta * (1 - this.node.anchorY);
        }
    }

    private updateBigCollider(): void {
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            return;
        }

        collider.size = cc.size(collider.size.width, this.bigColliderHeight);
        collider.offset = cc.v2(collider.offset.x, this.bigColliderOffsetY);
        collider.apply();
    }

    private playGrowEffect(): void {
        cc.tween(this.node)
            .to(0.08, { scaleY: Math.abs(this.node.scaleY) * 1.15 * (this.node.scaleY < 0 ? -1 : 1) })
            .to(0.08, { scaleY: Math.abs(this.node.scaleY) * (this.node.scaleY < 0 ? -1 : 1) })
            .start();
    }

    private gameManagerCall(methodName: string, value?: number): void {
        const gameManagerNode = this.gameManagerNode || cc.find('GameManager') || cc.find('Canvas/GameManager');
        const gameManager = gameManagerNode ? gameManagerNode.getComponent('GameManager') : null;
        if (gameManager && gameManager[methodName]) {
            gameManager[methodName](value);
        }
    }

    private playEffect(clip: cc.AudioClip): void {
        if (clip) {
            cc.audioEngine.playEffect(clip, false);
        }
    }
}
