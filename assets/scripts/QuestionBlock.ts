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

    @property
    public showScorePopup = true;

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

        if (this.isHitFromBelow(otherCollider.node)) {
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
        } else {
            this.node.color = new cc.Color(150, 150, 150);
        }

        this.showPopup();

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
        const gameManagerNode = this.gameManagerNode || cc.find('GameManager') || cc.find('Canvas/GameManager');
        const gameManager = gameManagerNode ? gameManagerNode.getComponent('GameManager') : null;
        if (gameManager && gameManager[methodName]) {
            gameManager[methodName](value);
        }
    }

    private isHitFromBelow(playerNode: cc.Node): boolean {
        const playerBounds = playerNode.getBoundingBoxToWorld();
        const blockBounds = this.node.getBoundingBoxToWorld();
        return playerBounds.yMax <= blockBounds.yMin + 22 && playerBounds.yMax > blockBounds.yMin - 24;
    }

    private showPopup(): void {
        if (!this.showScorePopup) {
            return;
        }

        const popup = new cc.Node('ScorePopup');
        const label = popup.addComponent(cc.Label);
        label.string = `+${this.score}`;
        label.fontSize = 22;
        label.lineHeight = 24;

        popup.color = new cc.Color(255, 224, 64);
        popup.parent = this.node.parent;
        popup.setPosition(this.node.x, this.node.y + this.node.height);

        cc.tween(popup)
            .by(0.45, { y: 36, opacity: -255 })
            .call(() => popup.destroy())
            .start();
    }
}
