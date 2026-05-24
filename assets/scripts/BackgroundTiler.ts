const { ccclass, property } = cc._decorator;

@ccclass
export default class BackgroundTiler extends cc.Component {
    @property(cc.Prefab)
    public backgroundPrefab: cc.Prefab = null;

    @property
    public tileCount = 6;

    @property
    public tileWidth = 960;

    @property
    public startX = 480;

    @property
    public tileY = 320;

    @property
    public mirrorEveryOtherTile = true;

    @property
    public clearExistingChildren = true;

    protected onLoad(): void {
        this.buildTiles();
    }

    public buildTiles(): void {
        if (!this.backgroundPrefab) {
            return;
        }

        if (this.clearExistingChildren) {
            this.node.removeAllChildren();
        }

        for (let i = 0; i < this.tileCount; i++) {
            const tile = cc.instantiate(this.backgroundPrefab);
            tile.name = `BackgroundTile_${i + 1}`;
            tile.parent = this.node;
            tile.setPosition(this.startX + i * this.tileWidth, this.tileY);

            const shouldMirror = this.mirrorEveryOtherTile && i % 2 === 1;
            tile.scaleX = Math.abs(tile.scaleX) * (shouldMirror ? -1 : 1);
        }
    }
}
