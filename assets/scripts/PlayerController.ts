const { ccclass, property } = cc._decorator;

const TAG_GROUND = 1;
const TAG_PLAYER = 2;
const TAG_ENEMY = 3;
const TAG_QUESTION_BLOCK = 4;
const TAG_DEATH = 5;
const TAG_GOAL = 6;
const TAG_POWERUP = 8;

enum PlayerState {
    Idle,
    Run,
    Jump,
    Fall,
    Transform,
}

@ccclass
export default class PlayerController extends cc.Component {
    @property(cc.Node)
    public gameManagerNode: cc.Node = null;

    @property
    public moveSpeed = 260;

    @property
    public jumpSpeed = 735;

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
    public autoFitBigCollider = true;

    @property
    public spritePixelScale = 3;

    @property
    public keepFeetOnGroundWhenGrow = true;

    @property
    public animationFps = 10;

    @property
    public groundProbeHeight = 10;

    @property
    public groundProbeInsetX = 8;

    @property
    public transformDuration = 0.9;

    @property
    public transformFlickerInterval = 0.08;

    @property
    public shrinkInvincibleDuration = 1.2;

    @property
    public breakBlockVelocityY = 40;

    private body: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private moveDirection = 0;
    private isLeftPressed = false;
    private isRightPressed = false;
    private groundContacts = 0;
    private isFacingRight = true;
    private animationTimer = 0;
    private animationFrameIndex = 0;
    private currentAnimationState = '';
    private playerState = PlayerState.Idle;
    private isBig = false;
    private smallColliderSize: cc.Size = null;
    private smallColliderOffset: cc.Vec2 = null;
    private transformTimer = 0;
    private transformFrameTimer = 0;
    private transformShowingBig = false;
    private transformBottomY = 0;
    private originalGravityScale = 1;
    private damageInvincibleTimer = 0;

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

    protected update(dt: number): void {
        if (!this.body) {
            return;
        }

        if (this.playerState === PlayerState.Transform) {
            this.updateTransformState(dt);
            return;
        }

        this.updateDamageInvincibility(dt);
        this.updateMoveDirectionFromInput();
        this.body.linearVelocity = cc.v2(this.moveDirection * this.moveSpeed, this.body.linearVelocity.y);
        this.updateFacing();
        this.updateAnimation();
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        switch (otherCollider.tag) {
            case TAG_GROUND:
            case TAG_QUESTION_BLOCK:
                if (this.tryBreakBlockFromBelow(contact, otherCollider)) {
                    break;
                }

                this.groundContacts += this.isStandingOn(otherCollider) ? 1 : 0;
                break;
            case TAG_ENEMY:
                this.handleEnemyContact(contact, otherCollider);
                break;
            case TAG_DEATH:
                this.takeDamage();
                break;
            case TAG_GOAL:
                this.gameManagerCall('levelClear');
                break;
            case TAG_POWERUP:
                this.consumePowerUp(otherCollider.node);
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
            this.isLeftPressed = true;
            this.updateMoveDirectionFromInput();
            return;
        }

        if (event.keyCode === cc.macro.KEY.right || event.keyCode === cc.macro.KEY.d) {
            this.isRightPressed = true;
            this.updateMoveDirectionFromInput();
            return;
        }

        if (event.keyCode === cc.macro.KEY.up || event.keyCode === cc.macro.KEY.w || event.keyCode === cc.macro.KEY.space) {
            if (this.playerState === PlayerState.Transform) {
                return;
            }

            this.jump();
        }
    }

    private onKeyUp(event: cc.Event.EventKeyboard): void {
        if (event.keyCode === cc.macro.KEY.left || event.keyCode === cc.macro.KEY.a) {
            this.isLeftPressed = false;
            this.updateMoveDirectionFromInput();
            return;
        }

        if (event.keyCode === cc.macro.KEY.right || event.keyCode === cc.macro.KEY.d) {
            this.isRightPressed = false;
            this.updateMoveDirectionFromInput();
        }
    }

    private updateMoveDirectionFromInput(): void {
        if (this.playerState === PlayerState.Transform) {
            this.moveDirection = 0;
            return;
        }

        if (this.isLeftPressed && !this.isRightPressed) {
            this.moveDirection = -1;
            return;
        }

        if (this.isRightPressed && !this.isLeftPressed) {
            this.moveDirection = 1;
            return;
        }

        this.moveDirection = 0;
    }

    private jump(): void {
        if (!this.body || !this.isGrounded()) {
            return;
        }

        this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, this.jumpSpeed);
        this.playEffect(this.jumpSfx);
    }

    private handleEnemyContact(contact: cc.PhysicsContact, enemyCollider: cc.PhysicsCollider): void {
        const enemyScript = this.getEnemyScript(enemyCollider.node);
        const isStomp = this.isStompingEnemy(enemyCollider);

        if (enemyScript && enemyScript.handlePlayerContact && enemyScript.handlePlayerContact(this.node, isStomp)) {
            return;
        }

        const canBeStomped = !enemyScript || !enemyScript.canBeStomped || enemyScript.canBeStomped();

        if (canBeStomped && isStomp) {
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

        this.takeDamage();
    }

    public takeDamage(): void {
        if (this.playerState === PlayerState.Transform || this.damageInvincibleTimer > 0) {
            return;
        }

        if (this.isBig) {
            this.becomeSmallAfterDamage();
            return;
        }

        this.gameManagerCall('loseLife');
    }

    private becomeSmallAfterDamage(): void {
        const oldBottomY = this.getColliderWorldBottomY();
        this.isBig = false;
        this.currentAnimationState = '';
        this.updateSmallCollider();
        this.applySpriteFrame(this.getTransformSmallFrame());
        this.alignColliderBottomToWorldY(oldBottomY);
        this.syncBodyAfterShapeChange();
        this.damageInvincibleTimer = this.shrinkInvincibleDuration;
        this.playShrinkEffect();
    }

    private updateDamageInvincibility(dt: number): void {
        if (this.damageInvincibleTimer <= 0) {
            if (this.node.opacity !== 255) {
                this.node.opacity = 255;
            }
            return;
        }

        this.damageInvincibleTimer = Math.max(0, this.damageInvincibleTimer - dt);
        const blinkIndex = Math.floor(this.damageInvincibleTimer / 0.08);
        this.node.opacity = blinkIndex % 2 === 0 ? 140 : 255;

        if (this.damageInvincibleTimer <= 0) {
            this.node.opacity = 255;
        }
    }

    private playShrinkEffect(): void {
        cc.Tween.stopAllByTarget(this.node);
        this.node.opacity = 255;
        cc.tween(this.node)
            .to(0.05, { opacity: 120 })
            .to(0.05, { opacity: 255 })
            .to(0.05, { opacity: 120 })
            .to(0.05, { opacity: 255 })
            .start();
    }

    private tryBreakBlockFromBelow(contact: cc.PhysicsContact, otherCollider: cc.PhysicsCollider): boolean {
        const isMovingUp = this.body && (
            this.body.linearVelocity.y > this.breakBlockVelocityY ||
            this.playerState === PlayerState.Jump
        );

        if (!this.isBig || !isMovingUp) {
            return false;
        }

        if (!this.isBreakableBlock(otherCollider.node)) {
            return false;
        }

        if (!this.isHittingBlockFromBelow(otherCollider)) {
            return false;
        }

        contact.disabled = true;
        this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, 0);
        this.breakBlock(otherCollider.node);
        return true;
    }

    private isBreakableBlock(blockNode: cc.Node): boolean {
        if (!blockNode) {
            return false;
        }

        return !!blockNode.getComponent('BreakableBlock');
    }

    private isHittingBlockFromBelow(blockCollider: cc.PhysicsCollider): boolean {
        const playerBounds = this.node.getBoundingBoxToWorld();
        const blockBounds = blockCollider.node.getBoundingBoxToWorld();
        const horizontalOverlap = playerBounds.xMax > blockBounds.xMin + 6 && playerBounds.xMin < blockBounds.xMax - 6;
        const headNearBlockBottom = playerBounds.yMax >= blockBounds.yMin - 18 && playerBounds.yMax <= blockBounds.yMin + 30;
        return horizontalOverlap && headNearBlockBottom && playerBounds.yMin < blockBounds.yMin;
    }

    private breakBlock(blockNode: cc.Node): void {
        const breakableBlock = blockNode.getComponent('BreakableBlock');
        if (breakableBlock && breakableBlock.breakBlock) {
            breakableBlock.breakBlock();
        }
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
        const isGrounded = this.isGrounded();
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
            this.playerState = PlayerState.Jump;
            this.playFrameAnimation('jump', jumpFrames);
            return;
        }

        if (!isGrounded && velocityY <= 10) {
            this.playerState = PlayerState.Fall;
            this.playFrameAnimation('fall', fallFrames);
            return;
        }

        if (this.moveDirection !== 0 && runFrames.length > 0) {
            this.playerState = PlayerState.Run;
            this.playFrameAnimation('run', runFrames);
            return;
        }

        this.playerState = PlayerState.Idle;
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
        if (!frame) {
            return;
        }

        this.sprite.spriteFrame = frame;

        const originalSize = frame.getOriginalSize();
        this.node.setContentSize(
            originalSize.width * this.spritePixelScale,
            originalSize.height * this.spritePixelScale
        );
    }

    public becomeBig(): void {
        if (this.isBig || this.playerState === PlayerState.Transform) {
            return;
        }

        this.enterTransformState();
    }

    private enterTransformState(): void {
        if (!this.body) {
            this.applyBigForm();
            return;
        }

        this.playerState = PlayerState.Transform;
        this.currentAnimationState = 'transform';
        this.transformTimer = 0;
        this.transformFrameTimer = 0;
        this.transformShowingBig = false;
        this.transformBottomY = this.getColliderWorldBottomY();
        this.originalGravityScale = this.body.gravityScale;
        this.moveDirection = 0;

        this.body.linearVelocity = cc.v2(0, 0);
        this.body.gravityScale = 0;
        this.body.awake = true;
        this.showTransformFrame(false);
    }

    private updateTransformState(dt: number): void {
        if (!this.body) {
            this.exitTransformState();
            return;
        }

        this.body.linearVelocity = cc.v2(0, 0);
        this.body.gravityScale = 0;

        this.transformTimer += dt;
        this.transformFrameTimer += dt;

        if (this.transformFrameTimer >= this.transformFlickerInterval) {
            this.transformFrameTimer = 0;
            this.transformShowingBig = !this.transformShowingBig;
            this.showTransformFrame(this.transformShowingBig);
        }

        if (this.transformTimer >= this.transformDuration) {
            this.exitTransformState();
        }
    }

    private exitTransformState(): void {
        this.applyBigForm();

        if (this.body) {
            this.body.gravityScale = this.originalGravityScale;
            this.body.linearVelocity = cc.v2(0, 0);
            this.body.awake = true;
            this.body.syncPosition(false);
            this.body.syncRotation(false);
        }

        this.updateMoveDirectionFromInput();
        this.groundContacts = this.hasGroundUnderFeet() ? 1 : 0;
        this.playerState = this.isGrounded()
            ? (this.moveDirection === 0 ? PlayerState.Idle : PlayerState.Run)
            : PlayerState.Fall;
        this.currentAnimationState = '';
        this.updateAnimation();
    }

    private showTransformFrame(showBig: boolean): void {
        if (showBig) {
            this.applyBigForm();
            return;
        }

        this.applySmallFormForTransform();
    }

    private applyBigForm(): void {
        const oldBottomY = this.playerState === PlayerState.Transform
            ? this.transformBottomY
            : this.getColliderWorldBottomY();
        this.isBig = true;
        this.applySpriteFrame(this.getTransformBigFrame());
        this.updateBigCollider();
        this.alignColliderBottomToWorldY(oldBottomY);
        this.syncBodyAfterShapeChange();
    }

    private applySmallFormForTransform(): void {
        const oldBottomY = this.transformBottomY;
        this.isBig = false;
        this.applySpriteFrame(this.getTransformSmallFrame());
        this.updateSmallCollider();
        this.alignColliderBottomToWorldY(oldBottomY);
        this.syncBodyAfterShapeChange();
    }

    private getTransformSmallFrame(): cc.SpriteFrame {
        if (this.idleFrames && this.idleFrames.length > 0) {
            return this.idleFrames[0];
        }

        return this.idleFrame || (this.runFrames && this.runFrames.length > 0 ? this.runFrames[0] : null);
    }

    private getTransformBigFrame(): cc.SpriteFrame {
        if (this.bigIdleFrames && this.bigIdleFrames.length > 0) {
            return this.bigIdleFrames[0];
        }

        return this.bigIdleFrame ||
            (this.bigRunFrames && this.bigRunFrames.length > 0 ? this.bigRunFrames[0] : this.getTransformSmallFrame());
    }

    private alignColliderBottomToWorldY(oldBottomY: number): void {
        if (!this.keepFeetOnGroundWhenGrow) {
            return;
        }

        const newBottomY = this.getColliderWorldBottomY();
        this.node.y += oldBottomY - newBottomY;
    }

    private getColliderWorldBottomY(): number {
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            return this.node.getBoundingBoxToWorld().yMin;
        }

        const bottomPoint = this.node.convertToWorldSpaceAR(cc.v2(
            collider.offset.x,
            collider.offset.y - collider.size.height * 0.5
        ));
        return bottomPoint.y;
    }

    private getLocalHeightFromCurrentSprite(): number {
        if (!this.sprite || !this.sprite.spriteFrame) {
            return this.bigColliderHeight;
        }

        return this.sprite.spriteFrame.getOriginalSize().height * this.spritePixelScale;
    }

    private updateBigCollider(): void {
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider) {
            return;
        }

        const nextHeight = this.autoFitBigCollider ? this.getLocalHeightFromCurrentSprite() : this.bigColliderHeight;
        const nextOffsetY = this.autoFitBigCollider
            ? this.getColliderOffsetYForSpriteBottom(nextHeight)
            : this.bigColliderOffsetY;

        collider.size = cc.size(collider.size.width, nextHeight);
        collider.offset = cc.v2(collider.offset.x, nextOffsetY);
        collider.apply();
    }

    private updateSmallCollider(): void {
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        if (!collider || !this.smallColliderSize || !this.smallColliderOffset) {
            return;
        }

        collider.size = this.smallColliderSize.clone();
        collider.offset = this.smallColliderOffset.clone();
        collider.apply();
    }

    private getColliderOffsetYForSpriteBottom(colliderHeight: number): number {
        return -this.node.height * this.node.anchorY + colliderHeight * 0.5;
    }

    private syncBodyAfterShapeChange(): void {
        if (!this.body) {
            return;
        }

        this.groundContacts = this.hasGroundUnderFeet() ? 1 : 0;
        this.body.awake = true;
        this.body.linearVelocity = cc.v2(this.body.linearVelocity.x, 0);
        this.body.syncPosition(false);
        this.body.syncRotation(false);
    }

    private isGrounded(): boolean {
        if (this.groundContacts > 0) {
            return true;
        }

        return this.hasGroundUnderFeet();
    }

    private hasGroundUnderFeet(): boolean {
        const collider = this.getComponent(cc.PhysicsBoxCollider);
        const bounds = this.node.getBoundingBoxToWorld();
        const footY = this.getColliderWorldBottomY();
        const probeWidth = collider
            ? Math.max(4, Math.abs(collider.size.width * this.node.scaleX) - this.groundProbeInsetX * 2)
            : Math.max(4, bounds.width - this.groundProbeInsetX * 2);
        const probeRect = cc.rect(
            bounds.x + this.groundProbeInsetX,
            footY - this.groundProbeHeight,
            probeWidth,
            this.groundProbeHeight + 2
        );
        const colliders = cc.director.getPhysicsManager().testAABB(probeRect);

        for (let i = 0; i < colliders.length; i++) {
            const collider = colliders[i];
            if (collider.node === this.node) {
                continue;
            }

            if (collider.tag === TAG_GROUND || collider.tag === TAG_QUESTION_BLOCK) {
                return true;
            }
        }

        return false;
    }

    private consumePowerUp(powerUpNode: cc.Node): void {
        const mushroom = powerUpNode.getComponent('SuperMushroom');
        if (mushroom && mushroom.consumeByPlayer) {
            mushroom.consumeByPlayer(this.node);
            return;
        }

        this.becomeBig();
        powerUpNode.destroy();
    }

    private playGrowEffect(): void {
        cc.tween(this.node)
            .to(0.08, { opacity: 170 })
            .to(0.08, { opacity: 255 })
            .to(0.08, { opacity: 190 })
            .to(0.08, { opacity: 255 })
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
