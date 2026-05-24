const { ccclass, property } = cc._decorator;

const TAG_GROUND = 1;
const TAG_PLAYER = 2;
const TAG_ENEMY = 3;
const TAG_QUESTION_BLOCK = 4;
const TAG_DEATH = 5;
const TAG_GOAL = 6;

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
    public runFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    public jumpFrame: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    public fallFrame: cc.SpriteFrame = null;

    @property
    public animationFps = 10;

    private body: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private moveDirection = 0;
    private groundContacts = 0;
    private isFacingRight = true;
    private animationTimer = 0;
    private runFrameIndex = 0;
    private currentAnimationState = '';

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
        if (this.isStompingEnemy(enemyCollider)) {
            contact.disabled = true;
            this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.stompBounceSpeed);
            this.gameManagerCall('addScore', 100);
            this.playEffect(this.stompSfx);

            const enemy = enemyCollider.node.getComponent('EnemyPatrol');
            if (enemy && enemy.die) {
                enemy.die();
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

        if (!isGrounded && velocityY > 10) {
            this.setSingleFrameState('jump', this.jumpFrame || this.idleFrame);
            return;
        }

        if (!isGrounded && velocityY <= 10) {
            this.setSingleFrameState('fall', this.fallFrame || this.jumpFrame || this.idleFrame);
            return;
        }

        if (this.moveDirection !== 0 && this.runFrames.length > 0) {
            this.playRunAnimation();
            return;
        }

        this.setSingleFrameState('idle', this.idleFrame);
    }

    private setSingleFrameState(state: string, frame: cc.SpriteFrame): void {
        if (!frame) {
            return;
        }

        if (this.currentAnimationState !== state) {
            this.currentAnimationState = state;
            this.animationTimer = 0;
            this.runFrameIndex = 0;
        }

        this.sprite.spriteFrame = frame;
    }

    private playRunAnimation(): void {
        if (this.currentAnimationState !== 'run') {
            this.currentAnimationState = 'run';
            this.animationTimer = 0;
            this.runFrameIndex = 0;
            this.sprite.spriteFrame = this.runFrames[this.runFrameIndex];
            return;
        }

        this.animationTimer += cc.director.getDeltaTime();
        const frameDuration = 1 / Math.max(1, this.animationFps);
        if (this.animationTimer < frameDuration) {
            return;
        }

        this.animationTimer -= frameDuration;
        this.runFrameIndex = (this.runFrameIndex + 1) % this.runFrames.length;
        this.sprite.spriteFrame = this.runFrames[this.runFrameIndex];
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
