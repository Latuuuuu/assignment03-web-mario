import { createFirebaseUser, getFirebaseErrorMessage, onFirebaseAuthStateChanged, signInFirebase } from "./FirebaseManager";

const { ccclass, property } = cc._decorator;

@ccclass
export default class LoginController extends cc.Component {
    @property(cc.EditBox)
    public emailInput: cc.EditBox = null;

    @property(cc.EditBox)
    public passwordInput: cc.EditBox = null;

    @property(cc.Label)
    public statusLabel: cc.Label = null;

    @property(cc.Label)
    public userLabel: cc.Label = null;

    @property(cc.Node)
    public loginButton: cc.Node = null;

    @property(cc.Node)
    public registerButton: cc.Node = null;

    @property
    public nextScene = "StartMenu";

    @property
    public autoEnterWhenAlreadyLoggedIn = true;

    @property
    public inputFontSize = 20;

    @property
    public inputLineHeight = 24;

    @property
    public placeholderFontSize = 18;

    private unsubscribeAuth: () => void = null;
    private isBusy = false;
    private isLoadingNextScene = false;

    protected onLoad(): void {
        this.configureEditBoxes();
        this.bindButton(this.loginButton, this.onLoginClicked);
        this.bindButton(this.registerButton, this.onRegisterClicked);

        onFirebaseAuthStateChanged((user: any) => {
                this.onAuthChanged(user);
            })
            .then((unsubscribe) => {
                this.unsubscribeAuth = unsubscribe;
            })
            .catch((error) => {
                this.setStatus(getFirebaseErrorMessage(error));
            });
    }

    private configureEditBoxes(): void {
        this.configureEditBox(this.emailInput, 128, false);
        this.configureEditBox(this.passwordInput, 64, true);
    }

    private configureEditBox(editBox: cc.EditBox, maxLength: number, isPassword: boolean): void {
        if (!editBox) {
            return;
        }

        const editBoxClass = cc.EditBox as any;
        const inputMode = editBoxClass.InputMode || {};
        const inputFlag = editBoxClass.InputFlag || {};
        const keyboardReturnType = editBoxClass.KeyboardReturnType || {};

        editBox.maxLength = maxLength;
        editBox.inputMode = isPassword
            ? (inputMode.SINGLE_LINE !== undefined ? inputMode.SINGLE_LINE : 6)
            : (inputMode.EMAIL_ADDR !== undefined ? inputMode.EMAIL_ADDR : 1);
        editBox.inputFlag = isPassword
            ? (inputFlag.PASSWORD !== undefined ? inputFlag.PASSWORD : 0)
            : (inputFlag.DEFAULT !== undefined ? inputFlag.DEFAULT : 5);
        editBox.returnType = keyboardReturnType.DONE !== undefined ? keyboardReturnType.DONE : 0;
        editBox.fontSize = this.inputFontSize;
        editBox.lineHeight = this.inputLineHeight;
        editBox.placeholderFontSize = this.placeholderFontSize;

        if (editBox.textLabel) {
            editBox.textLabel.fontSize = this.inputFontSize;
            editBox.textLabel.lineHeight = this.inputLineHeight;
        }

        if (editBox.placeholderLabel) {
            editBox.placeholderLabel.fontSize = this.placeholderFontSize;
            editBox.placeholderLabel.lineHeight = this.inputLineHeight;
        }
    }

    protected onDestroy(): void {
        this.unbindButton(this.loginButton, this.onLoginClicked);
        this.unbindButton(this.registerButton, this.onRegisterClicked);

        if (this.unsubscribeAuth) {
            this.unsubscribeAuth();
            this.unsubscribeAuth = null;
        }
    }

    public async onLoginClicked(): Promise<void> {
        if (this.isBusy) {
            return;
        }

        const email = this.getEmail();
        const password = this.getPassword();
        if (!this.validateInput(email, password)) {
            return;
        }

        this.setBusy(true, "Signing in...");
        try {
            await signInFirebase(email, password);
            this.setStatus("Login success.");
            this.loadNextScene();
        } catch (error) {
            this.setStatus(getFirebaseErrorMessage(error));
        } finally {
            this.setBusy(false);
        }
    }

    public async onRegisterClicked(): Promise<void> {
        if (this.isBusy) {
            return;
        }

        const email = this.getEmail();
        const password = this.getPassword();
        if (!this.validateInput(email, password)) {
            return;
        }

        this.setBusy(true, "Creating account...");
        try {
            await createFirebaseUser(email, password);
            this.setStatus("Account created.");
            this.loadNextScene();
        } catch (error) {
            this.setStatus(getFirebaseErrorMessage(error));
        } finally {
            this.setBusy(false);
        }
    }

    private onAuthChanged(user: any): void {
        if (this.userLabel) {
            this.userLabel.string = user ? `User: ${user.email || user.uid}` : "";
        }

        if (user && this.autoEnterWhenAlreadyLoggedIn) {
            this.loadNextScene();
        }
    }

    private loadNextScene(): void {
        if (!this.nextScene || this.isLoadingNextScene) {
            return;
        }

        this.isLoadingNextScene = true;
        cc.director.loadScene(this.nextScene);
    }

    private bindButton(buttonNode: cc.Node, handler: () => void): void {
        if (buttonNode) {
            buttonNode.on(cc.Node.EventType.TOUCH_END, handler, this);
        }
    }

    private unbindButton(buttonNode: cc.Node, handler: () => void): void {
        if (buttonNode) {
            buttonNode.off(cc.Node.EventType.TOUCH_END, handler, this);
        }
    }

    private getEmail(): string {
        return this.emailInput ? this.emailInput.string.trim() : "";
    }

    private getPassword(): string {
        return this.passwordInput ? this.passwordInput.string : "";
    }

    private validateInput(email: string, password: string): boolean {
        if (!email) {
            this.setStatus("Email is required.");
            return false;
        }

        if (!password || password.length < 6) {
            this.setStatus("Password must be at least 6 characters.");
            return false;
        }

        return true;
    }

    private setBusy(isBusy: boolean, status?: string): void {
        this.isBusy = isBusy;
        this.setButtonEnabled(this.loginButton, !isBusy);
        this.setButtonEnabled(this.registerButton, !isBusy);

        if (status) {
            this.setStatus(status);
        }
    }

    private setButtonEnabled(buttonNode: cc.Node, enabled: boolean): void {
        if (!buttonNode) {
            return;
        }

        const button = buttonNode.getComponent(cc.Button);
        if (button) {
            button.interactable = enabled;
        }

        buttonNode.opacity = enabled ? 255 : 150;
    }

    private setStatus(message: string): void {
        if (this.statusLabel) {
            this.statusLabel.string = message;
        }
    }

}
