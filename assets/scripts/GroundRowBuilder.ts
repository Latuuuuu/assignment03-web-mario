const { ccclass, property, executeInEditMode } = cc._decorator;

const GROUND_TAG = 1;
const COLLIDER_NODE_NAME = 'GroundRowCollider';

@ccclass
@executeInEditMode
export default class GroundRowBuilder extends cc.Component {
    @property(cc.Prefab)
    public tilePrefab: cc.Prefab = null;

    @property
    public tileCount = 10;

    @property
    public tileSpacingX = 48;

    @property
    public vertical = false;

    @property
    public tileSpacingY = 48;

    @property
    public startX = 0;

    @property
    public startY = 0;

    @property
    public colliderWidth = 48;

    @property
    public colliderHeight = 48;

    @property
    public colliderOffsetX = 0;

    @property
    public colliderOffsetY = 0;

    @property
    public autoRebuildInEditor = true;

    @property
    public rebuildOnLoad = true;

    @property
    public disablePhysicsOnVisualTiles = true;

    @property
    public showColliderDebug = false;

    private lastBuildSignature = '';

    protected onLoad(): void {
        if (this.rebuildOnLoad) {
            this.rebuild();
        }
    }

    protected start(): void {
        this.scheduleOnce(() => this.syncGroundCollider(), 0);
    }

    protected update(): void {
        if (!CC_EDITOR || !this.autoRebuildInEditor) {
            return;
        }

        const signature = this.getBuildSignature();
        if (signature !== this.lastBuildSignature) {
            this.rebuild();
        }
    }

    public rebuild(): void {
        if (!this.tilePrefab) {
            return;
        }

        this.clearGeneratedChildren();
        cc.director.getPhysicsManager().enabled = true;
        this.createVisualTiles();
        this.createSingleGroundCollider();
        this.syncGroundCollider();
        this.lastBuildSignature = this.getBuildSignature();
    }

    private createVisualTiles(): void {
        const total = Math.max(0, Math.floor(this.tileCount));
        for (let i = 0; i < total; i++) {
            const tile = cc.instantiate(this.tilePrefab);
            tile.name = `GroundTile_${i + 1}`;
            tile.parent = this.node;
            tile.setPosition(
                this.startX + (this.vertical ? 0 : i * this.tileSpacingX),
                this.startY + (this.vertical ? i * this.tileSpacingY : 0)
            );

            if (this.disablePhysicsOnVisualTiles) {
                this.disablePhysics(tile);
            }
        }
    }

    private createSingleGroundCollider(): void {
        const total = Math.max(0, Math.floor(this.tileCount));
        if (total <= 0) {
            return;
        }

        const width = this.vertical ? this.colliderWidth : total * this.tileSpacingX;
        const height = this.vertical ? total * this.tileSpacingY : this.colliderHeight;
        const centerX = this.startX + (this.vertical ? 0 : (total - 1) * this.tileSpacingX * 0.5) + this.colliderOffsetX;
        const centerY = this.startY + (this.vertical ? (total - 1) * this.tileSpacingY * 0.5 : 0) + this.colliderOffsetY;
        const colliderNode = new cc.Node(COLLIDER_NODE_NAME);
        colliderNode.parent = this.node;
        colliderNode.setPosition(centerX, centerY);
        colliderNode.setContentSize(width, height);
        colliderNode.opacity = this.showColliderDebug ? 90 : 0;

        const body = colliderNode.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Static;
        body.enabledContactListener = true;

        const collider = colliderNode.addComponent(cc.PhysicsBoxCollider);
        collider.tag = GROUND_TAG;
        collider.sensor = false;
        collider.size = cc.size(width, height);
        collider.offset = cc.v2(0, 0);
        collider.apply();

        if (this.showColliderDebug) {
            const graphics = colliderNode.addComponent(cc.Graphics);
            graphics.fillColor = new cc.Color(0, 255, 80, 80);
            graphics.rect(-width * 0.5, -height * 0.5, width, height);
            graphics.fill();
        }
    }

    private clearGeneratedChildren(): void {
        const children = this.node.children.slice();
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child.name.indexOf('GroundTile_') === 0 || child.name === COLLIDER_NODE_NAME) {
                child.destroy();
            }
        }
    }

    private disablePhysics(root: cc.Node): void {
        const colliders = root.getComponentsInChildren(cc.PhysicsCollider);
        for (let i = 0; i < colliders.length; i++) {
            colliders[i].enabled = false;
        }

        const bodies = root.getComponentsInChildren(cc.RigidBody);
        for (let i = 0; i < bodies.length; i++) {
            bodies[i].enabled = false;
        }
    }

    private getBuildSignature(): string {
        const prefabName = this.tilePrefab ? this.tilePrefab.name : '';
        return [
            prefabName,
            this.tileCount,
            this.vertical,
            this.tileSpacingX,
            this.tileSpacingY,
            this.startX,
            this.startY,
            this.colliderWidth,
            this.colliderHeight,
            this.colliderOffsetX,
            this.colliderOffsetY,
            this.disablePhysicsOnVisualTiles,
            this.showColliderDebug,
        ].join('|');
    }

    private syncGroundCollider(): void {
        const colliderNode = this.node.getChildByName(COLLIDER_NODE_NAME);
        if (!colliderNode) {
            return;
        }

        const collider = colliderNode.getComponent(cc.PhysicsCollider);
        if (collider) {
            collider.apply();
        }

        const body = colliderNode.getComponent(cc.RigidBody);
        if (body) {
            body.syncPosition(false);
            body.syncRotation(false);
        }
    }
}
