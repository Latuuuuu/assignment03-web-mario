import { getCurrentUser, onFirebaseAuthStateChanged } from "./FirebaseManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class AuthSceneGuard extends cc.Component {
    @property
    public loginScene = "Login";

    @property
    public allowAnonymous = false;

    @property
    public redirectDelay = 0;

    private unsubscribeAuth: () => void = null;
    private hasResolvedAuth = false;
    private isRedirecting = false;

    protected onLoad(): void {
        onFirebaseAuthStateChanged((user: any) => {
                this.hasResolvedAuth = true;

                if (!user && !this.allowAnonymous) {
                    this.redirectToLogin();
                }
            })
            .then((unsubscribe) => {
                this.unsubscribeAuth = unsubscribe;
            })
            .catch(() => {
                this.hasResolvedAuth = true;
                this.redirectToLogin();
            });
    }

    protected onDestroy(): void {
        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
            this.unsubscribeAuth = null;
        }
    }

    protected update(): void {
        if (this.hasResolvedAuth || this.allowAnonymous) {
            return;
        }

        if (!getCurrentUser()) {
            return;
        }

        this.hasResolvedAuth = true;
    }

    private redirectToLogin(): void {
        if (!this.loginScene || this.isRedirecting) {
            return;
        }

        this.isRedirecting = true;
        this.scheduleOnce(() => cc.director.loadScene(this.loginScene), Math.max(0, this.redirectDelay));
    }
}
