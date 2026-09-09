import { getMessage } from '../shared/services/i18n.service';
import { createClipIdentity, type PageSnapshot } from '../entities/clip.entity';
import type { Preferences, PreferencesPatch } from '../entities/preferences.entity';
import { installValveCompatibility } from '../features/valve-interop/adapters/compatibility.adapter';
import type { ValveTimerHijacker } from '../features/valve-interop/timer-hijacker.injector';
import { ValvePlayerHost } from '../features/valve-interop/adapters/valve-player-host.adapter';
import { PlyrAdapter } from '../features/video-player/adapters/plyr.adapter';
import { VideoJsAdapter } from '../features/video-player/adapters/video-js.adapter';
import type { MainMessageBus } from '../shared/message-bus.adapter';
import type { IsolatedEvent, ReviewCommand } from '../shared/ports/protocol.port';
import { ClipCoordinator } from './controllers/clip-coordinator.controller';
import { MainWorldLifecycle } from './controllers/main-world-lifecycle.controller';
import { MainWorldMessageController } from './controllers/main-world-message.controller';
import { PlayerCoordinator } from './controllers/player-coordinator.controller';
import { RuntimeState } from './runtime-state.store';
import { createSubmitAdapters } from './submit.adapter';
import { SubmitWorkflow } from './submit-workflow.service';
import { waitForValvePageReady } from '../features/valve-interop/valve-page-ready.service';
import { markExtensionMainReady } from './extension-boot.service';

const describeError = (error: unknown): string => error instanceof Error ? error.message : String(error);
const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';

const shouldUseLegacyValvePlayer = (): boolean => {
  try { return sessionStorage.getItem('vacnet:player-mode') === 'legacy'; }
  catch { return false; }
};

export class MainWorldRuntime {
  private readonly state = new RuntimeState();
  private readonly player: PlayerCoordinator;
  private readonly clips: ClipCoordinator;
  private readonly workflow: SubmitWorkflow;
  private readonly messages: MainWorldMessageController;
  private readonly lifecycle: MainWorldLifecycle;
  private stopCompatibility: (() => void) | null = null;
  private isDisposed = false;
  private originalDocumentLanguage: string | null = null;
  private ownsDocumentLanguage = false;
  private readonly initializationController = new AbortController();

  constructor(
    private readonly bus: MainMessageBus,
    private readonly timerHijacker: ValveTimerHijacker,
  ) {
    const onPreferences = (preferences: PreferencesPatch): void => this.bus.emit({ type: 'preferences', preferences });
    const reviewPlayer = shouldUseLegacyValvePlayer()
      ? new VideoJsAdapter(() => this.state.getCatalog(), onPreferences)
      : new PlyrAdapter({
        playerHost: new ValvePlayerHost(() => this.timerHijacker.markPlayerReplacement()),
        catalog: () => this.state.getCatalog(),
        onPreferences,
        onPlayerOverlay: (overlay) => this.bus.emit({ type: 'player-overlay', overlay }),
      });

    this.player = new PlayerCoordinator({
      player: reviewPlayer,
      onError: (error) => this.setError(error),
    });
    this.clips = new ClipCoordinator({
      bus,
      onStateChanged: () => this.publishSnapshot(),
      onError: (message) => this.setError(message),
      onActivated: (page) => this.activatePage(page),
    });
    const submitAdapters = createSubmitAdapters({
      bus,
      onActivated: (page) => this.activatePage(page),
      playerTransition: {
        transition: async (clip) => this.player.transition(this.state.getPreferences(), clip),
      },
    });
    this.workflow = new SubmitWorkflow({
      ...submitAdapters,
      timerHijacker,
      getContext: () => ({ clip: this.requireClip() }),
      onSubmitting: (submitting) => { this.state.setSubmitting(submitting); this.publishSnapshot(); },
      onError: (message) => this.setError(message),
    });
    this.messages = new MainWorldMessageController({
      bus,
      onInitialize: (event) => this.initialize(event),
      onPreferences: (preferences) => this.updatePreferences(preferences),
      onReviewCommand: (command) => this.handleReviewCommand(command),
      onPlayerCommand: (command) => this.player.handle(command),
    });
    this.lifecycle = new MainWorldLifecycle({
      onDomReady: () => { void this.initializePage(); },
      onDispose: () => this.disposeResources(),
    });
  }

  start(): void {
    if (this.isDisposed) return;
    this.lifecycle.start();
    this.bus.emit({ type: 'ready' });
  }

  dispose(): void { this.lifecycle.dispose(); }

  private initialize(event: Extract<IsolatedEvent, { type: 'initialize' }>): void {
    this.state.setCatalog(event.catalog);
    this.state.setPreferences(event.preferences);
    if (!this.ownsDocumentLanguage) {
      this.originalDocumentLanguage = document.documentElement.lang;
      this.ownsDocumentLanguage = true;
    }
    document.documentElement.lang = event.catalog.videoJsLocale;
    this.bus.emit({ type: 'initialized' });
    if (this.state.getClip()) this.configurePlayer();
  }

  private updatePreferences(preferences: Extract<IsolatedEvent, { type: 'preferences' }>['preferences']): void {
    const currentPrefs = this.state.getPreferences();
    const definedPreferences = Object.fromEntries(
      Object.entries(preferences).filter((entry) => entry[1] !== undefined),
    ) as Partial<Preferences>;
    const merged: Preferences = { ...currentPrefs, ...definedPreferences };
    this.state.setPreferences(merged);
    this.player.applyPreferences(merged);
  }

  private handleReviewCommand(command: ReviewCommand): void {
    if (command.type === 'set-verdict') {
      this.state.updateVerdict(command.name, command.value);
      this.publishSnapshot();
      return;
    }
    if (command.type === 'set-verdicts') {
      this.state.setVerdicts(command.verdicts);
      this.publishSnapshot();
      return;
    }
    this.state.setVerdicts(command.verdicts);
    this.state.setError(null);
    void this.workflow.submit(command);
  }

  private async initializePage(): Promise<void> {
    if (this.isDisposed) return;
    try {
      await waitForValvePageReady(document, this.initializationController.signal);
      if (!this.isActive()) return;
      this.stopCompatibility ??= installValveCompatibility({
        onRefresh: () => this.publishSnapshot(),
        onSubmit: (badClip) => { void this.workflow.submit({ verdicts: this.state.getVerdicts(), badClip }); },
      });
      const clip = await this.clips.initialize(this.initializationController.signal);
      if (!this.isActive()) return;
      this.state.resetClipState(clip);
      this.configurePlayer();
      markExtensionMainReady();
      void this.identifyClip(clip);
    } catch (error) {
      if (!isAbortError(error)) this.setError(error);
    }
  }

  private configurePlayer(): void {
    const clip = this.state.getClip();
    if (!clip || !this.state.getCatalog()) return;
    this.player.configure(this.state.getPreferences(), clip);
    this.publishSnapshot();
  }

  private async identifyClip(clip: Parameters<ClipCoordinator['identify']>[0]): Promise<void> {
    await this.clips.identify(clip, () => this.state.getClip()?.taskId === clip.taskId, (result) => {
      this.state.setDeduplication(result.status);
      this.state.setPreviousVerdicts(result.previous);
      if ((result.status === 'exact-duplicate')
        && this.state.getPreferences().autoApplyRepeatVerdicts && result.previous) {
        this.state.setVerdicts(result.previous);
      }
      if (result.identity === this.clipIdentity()) this.state.setError(null);
    });
  }

  private activatePage(page: Parameters<ClipCoordinator['activate']>[0]): void {
    this.state.resetClipState(page.clip);
    this.publishSnapshot();
    void this.identifyClip(page.clip);
  }

  private requireClip() {
    const clip = this.state.getClip();
    if (!clip) throw new Error(getMessage("errNoActiveClip"));
    return clip;
  }

  private clipIdentity(): string {
    const clip = this.state.getClip();
    return clip ? createClipIdentity(clip).identity : '';
  }

  private setError(error: unknown): void {
    this.state.setError(describeError(error));
    this.publishSnapshot();
  }

  private isActive(): boolean { return !this.isDisposed; }

  private publishSnapshot(): void {
    if (this.isDisposed) return;
    const snapshot: PageSnapshot = this.state.snapshot(this.player);
    this.bus.emit({ type: 'snapshot', snapshot });
  }

  private disposeResources(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.initializationController.abort();
    this.workflow.dispose();
    this.player.dispose();
    this.messages.dispose();
    this.stopCompatibility?.();
    this.stopCompatibility = null;
    if (this.ownsDocumentLanguage && document.documentElement.lang === this.state.getCatalog()?.videoJsLocale) {
      document.documentElement.lang = this.originalDocumentLanguage ?? '';
    }
    this.originalDocumentLanguage = null;
    this.ownsDocumentLanguage = false;
  }
}
