import Phaser from "phaser";
import {
  createA11yPanel,
  applyA11yToScene,
  speakIfEnabled,
  stopSpeech,
  getA11yTheme,
} from "../../a11yPanel";
import {
  createEndModal,
  applyEndModalTheme,
  layoutEndModal as layoutSharedEndModal,
  destroyEndModal,
} from "../../shared/ui/endModal";
import { resolvePairs, createMemoryState } from "../systems/state";
import { createTopUi, bindTopUiActions, applyTopUiTheme, layoutTopUi } from "../ui/topBar";
import { createDeck, applyCardsTheme, layoutCards } from "../systems/cards";
import { initKeyboard, teardownKeyboard, applyFocus } from "../systems/keyboard";
import { handleCardClick, handleWin } from "../systems/gameplay";

export class MemoryScene extends Phaser.Scene {
  constructor(onFinish, onExit) {
    super("MemoryScene");
    this._onFinish = onFinish;
    this._onExit = onExit;
    this._resizeHandler = null;
    this._keyHandler = null;
  }

  init(data) {
    this.pairs = resolvePairs(data);
    this.state = createMemoryState();
    this.focusIndex = 0;
  }

  create() {
    this.pendingTimers = [];
    this.endModal = null;
    this.finalResult = null;
    this.gameEnded = false;

    this.bg = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x9eb7e5)
      .setOrigin(0);

    createTopUi(this);
    bindTopUiActions(this);

    this.clockEvent = this.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const sec = Math.floor((Date.now() - this.state.startTime) / 1000);
        this.timeText.setText(`Tiempo: ${sec}s`);
      },
    });

    createDeck(this);

    this.a11yPanel = createA11yPanel(this, {
      anchor: "left",
      onChange: () => {
        this.applyTheme();
        this.layoutTopUI();
        this.layoutCards();
        this.layoutEndModal();
        this.applyFocus(this.focusIndex, true);
      },
    });

    initKeyboard(this);

    this.applyTheme();
    this.layoutTopUI();
    this.layoutCards();
    this.layoutEndModal();
    this.applyFocus(0, true);
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this._resizeHandler = (gameSize) => this.handleResize(gameSize);
    this.scale.on("resize", this._resizeHandler);

    this.events.once("shutdown", () => this.cleanupScene());
    this.events.once("destroy", () => this.cleanupScene());
  }

  cleanupTransientState() {
    this.cancelPendingTimers();
    this.hideEndModal();
  }

  cleanupScene() {
    this.cancelPendingTimers();
    this.hideEndModal();

    if (this.clockEvent) {
      try {
        this.clockEvent.remove(false);
      } catch {}
      this.clockEvent = null;
    }

    if (this._resizeHandler) {
      this.scale.off("resize", this._resizeHandler);
      this._resizeHandler = null;
    }

    teardownKeyboard(this);
    this.stopSpeechNow();
  }

  cancelPendingTimers() {
    if (!this.pendingTimers?.length) return;

    this.pendingTimers.forEach((timer) => {
      try {
        timer.remove(false);
      } catch {}
    });

    this.pendingTimers = [];
  }

  schedule(delay, callback) {
    const timer = this.time.delayedCall(delay, () => {
      this.pendingTimers = this.pendingTimers.filter((t) => t !== timer);
      callback?.();
    });
    this.pendingTimers.push(timer);
    return timer;
  }

  handleResize(gameSize) {
    const width = Math.max(
      320,
      Math.floor(
        gameSize?.width ??
          this.scale.gameSize?.width ??
          this.scale.width ??
          window.innerWidth
      )
    );
    const height = Math.max(
      480,
      Math.floor(
        gameSize?.height ??
          this.scale.gameSize?.height ??
          this.scale.height ??
          window.innerHeight
      )
    );

    this.cameras.resize(width, height);
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.setScroll(0, 0);

    if (this.bg) {
      this.bg.setPosition(0, 0);
      this.bg.setSize(width, height);
    }

    this.applyTheme();
    this.layoutTopUI();
    this.layoutCards();
    this.layoutEndModal();
    this.applyFocus(this.focusIndex, true);
  }

  say(text) {
    speakIfEnabled(this, text);
  }

  stopSpeechNow() {
    stopSpeech();
  }

  applyTheme() {
    if (!this.a11y) return;
    applyA11yToScene(this, this.a11y);

    const theme = getA11yTheme(this.a11y);

    this.cameras.main.setBackgroundColor(theme.sceneBg);
    this.bg.setFillStyle(theme.sceneBg, 1);

    applyTopUiTheme(this, theme);
    applyCardsTheme(this, theme);

    if (this.endModal) {
      applyEndModalTheme(this, this.endModal);
    }
  }

  layoutTopUI() {
    layoutTopUi(this);
  }

  applyFocus(index, silent = false) {
    applyFocus(this, index, silent);
  }

  onCardClick(card) {
    handleCardClick(this, card);
  }


  showEndModal({ durationMs, moves }) {
    if (this.endModal) return;

    const sec = Math.floor(durationMs / 1000);

    this.endModal = createEndModal(this, {
      depth: 2000,
      title: "¡Excelente!",
      bodyText: `Tiempo: ${sec}s   •   Intentos: ${moves}`,
      preferredBoxWidth: 560,
      minBoxWidth: 360,
      maxBoxWidthPct: 0.92,
      minBoxHeight: 260,
      bodyWrapMin: 220,
      titleBaseFont: 40,
      bodyBaseFont: 20,
      primaryButton: {
        label: "Jugar otra vez",
        variant: "primary",
        width: 220,
        height: 52,
        baseFont: 18,
        onClick: () => this.restartGame(),
      },
      secondaryButton: {
        label: "Salir",
        variant: "danger",
        width: 220,
        height: 52,
        baseFont: 18,
        onClick: () => {
          this.hideEndModal();
          this.stopSpeechNow();
          this._onExit?.();
        },
      },
    });
  }

  layoutEndModal() {
    layoutSharedEndModal(this, this.endModal);
  }

  hideEndModal() {
    this.endModal = destroyEndModal(this.endModal);
  }

  layoutCards() {
    layoutCards(this);
  }

  restartGame() {
    this.cleanupTransientState();
    this.stopSpeechNow();
    this.scene.restart({ pairs: this.pairs });
  }
}
