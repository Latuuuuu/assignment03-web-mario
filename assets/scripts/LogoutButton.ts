import { signOutFirebase } from "./FirebaseManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class LogoutButton extends cc.Component {
    @property
    public loginScene = "Login";

    private isBusy = false;

    protected onLoad(): void {
        this.node.on(cc.Node.EventType.TOUCH_END, this.onLogoutClicked, this);
    }

    protected onDestroy(): void {
        this.node.off(cc.Node.EventType.TOUCH_END, this.onLogoutClicked, this);
    }

    private async onLogoutClicked(): Promise<void> {
        if (this.isBusy) {
            return;
        }

        this.isBusy = true;
        try {
            await signOutFirebase();
        } finally {
            cc.director.loadScene(this.loginScene);
        }
    }
}
