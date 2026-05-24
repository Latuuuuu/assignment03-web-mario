const { ccclass, property } = cc._decorator;

const TAG_PLAYER = 2;
const TAG_QUESTION_BLOCK = 4;

@ccclass
export default class QuestionBlock extends cc.Component {
    @property(cc.Node)
    public gameManagerNode: cc.Node = null;

    @property(cc.Prefab)
    public rewardPrefab: cc.Prefab = null;

    @property(cc.SpriteFrame)
    public usedSpriteFrame: cc.SpriteFrame = null;

    @property
    public score = 100;

    private isUsed = false;
    private originY = 0;

    protected onLoad(): void {
        this.originY = this.node.y;

        const collider = this.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.tag = TAG_QUESTION_BLOCK;
        }
    }

    public onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, otherCollider: cc.PhysicsCollider): void {
        if (this.isUsed || otherCollider.tag !== TAG_PLAYER) {
            return;
        }

        if (otherCollider.node.y < this.node.y) {
            this.activateBlock();
        }
    }

    private activateBlock(): void {
        this.isUsed = true;
        this.gameManagerCall('addScore', this.score);
        this.spawnReward();

        const sprite = this.getComponent(cc.Sprite);
        if (sprite && this.usedSpriteFrame) {
            sprite.spriteFrame = this.usedSpriteFrame;
        }

        cc.tween(this.node)
            .to(0.08, { y: this.originY + 14 })
            .to(0.08, { y: this.originY })
            .start();
    }

    private spawnReward(): void {
        if (!this.rewardPrefab) {
            return;
        }

        const reward = cc.instantiate(this.rewardPrefab);
        reward.parent = this.node.parent;
        reward.setPosition(this.node.x, this.node.y + this.node.height);
    }

    private gameManagerCall(methodName: string, value?: number): void {
        if (!this.gameManagerNode) {
            return;
        }

        const gameManager = this.gameManagerNode.getComponent('GameManager');
        if (gameManager && gameManager[methodName]) {
            gameManager[methodName](value);
        }
    }
}
