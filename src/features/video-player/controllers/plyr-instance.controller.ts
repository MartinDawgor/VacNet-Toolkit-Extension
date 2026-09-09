import Plyr from 'plyr';
import type { ClipData } from '../../../entities/clip.entity';
import plyrSprite from '../assets/plyr-sprite.svg?raw';
import type { Preferences } from '../../../entities/preferences.entity';
import type { ReviewVideoHost, ReviewVideoHostPort } from '../../../shared/ports/review-video-host.port';
import { VolumeMenuController } from './volume-menu.controller';
import { ShareButtonController } from './share-button.controller';
import { PreciseProgressController } from './precise-progress.controller';

export type ReviewPlayerMode = 'plyr' | 'native-fallback';
interface PlayerControlLabels { play: string; pause: string; restart: string; volume: string; settings: string; enterFullscreen: string; exitFullscreen: string; share: string; copied: string; }
export const getReviewPlayerMode = (): ReviewPlayerMode => { try { return sessionStorage.getItem('vacnet:player-mode') === 'native-fallback' ? 'native-fallback' : 'plyr'; } catch { return 'plyr'; } };

export class PlyrInstanceController {
  private host: ReviewVideoHost | null = null;
  private plyr: Plyr | null = null;
  private spriteContainer: HTMLDivElement | null = null;
  private volume: VolumeMenuController | null = null;
  private share: ShareButtonController | null = null;
  private progress: PreciseProgressController | null = null;
  private mode: ReviewPlayerMode = getReviewPlayerMode();
  constructor(private readonly playerHost: ReviewVideoHostPort) {}
  get video(): HTMLVideoElement | null { return this.host?.video ?? null; }
  get element(): HTMLDivElement | null { return this.host?.element ?? null; }
  get isPlyr(): boolean { return this.plyr !== null; }
  ensureMounted(preferences: Preferences | null, clip: ClipData | null, markerLabel: string, labels: PlayerControlLabels, addListeners: (video: HTMLVideoElement) => void): HTMLVideoElement {
    if (this.host?.video.isConnected) return this.host.video;
    this.host = this.playerHost.mount(); addListeners(this.host.video); this.applyPreferences(preferences);
    if (this.mode === 'native-fallback') return this.host.video;
    this.ensureSprite();
    try {
      const config: ConstructorParameters<typeof Plyr>[1] = { autoplay: false, clickToPlay: true, controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'settings', 'fullscreen'], i18n: { play: labels.play, pause: labels.pause, restart: labels.restart, volume: labels.volume, mute: labels.volume, unmute: labels.volume, settings: labels.settings, enterFullscreen: labels.enterFullscreen, exitFullscreen: labels.exitFullscreen }, keyboard: { focused: false, global: false }, invertTime: false, loadSprite: false, storage: { enabled: false }, tooltips: { controls: true, seek: true } };
      if (clip?.eventTime != null) config.markers = { enabled: true, points: [{ time: clip.eventTime, label: markerLabel }] };
      this.plyr = new Plyr(this.host.video, config); this.host.video.controls = false; this.applyPreferences(preferences);
      this.volume = new VolumeMenuController(this.host.element, this.plyr, labels.volume); this.share = new ShareButtonController(this.host.element, this.plyr, labels.share, labels.copied); this.progress = new PreciseProgressController(this.host.element, this.plyr);
    } catch (error) { this.disposeControllers(); try { this.plyr?.destroy(); } catch (disposeError) { console.warn('player-dispose-failed', disposeError); } this.plyr = null; this.mode = 'native-fallback'; this.host.video.controls = true; console.warn('player-init-failed-native-fallback', error); }
    return this.host.video;
  }
  updateMarker(clip: ClipData | null, markerLabel: string): void { if (!this.plyr || !this.host?.element) return; const progress = this.host.element.querySelector('.plyr__progress'); if (!progress) return; progress.querySelectorAll('.plyr__progress__marker').forEach((el) => el.remove()); if (clip?.eventTime != null && this.host.video.duration) { const marker = document.createElement('span'); marker.className = 'plyr__progress__marker'; marker.title = markerLabel; marker.style.left = `${(clip.eventTime / this.host.video.duration) * 100}%`; progress.appendChild(marker); } }
  applyPreferences(preferences: Preferences | null): void { if (!preferences || !this.host) return; this.host.element.classList.toggle('vacnet-keep-controls', preferences.keepControlsVisible); if (this.plyr) { if (Math.abs(this.plyr.volume - preferences.volume) > 0.001) this.plyr.volume = preferences.volume; if (this.plyr.muted !== preferences.muted) this.plyr.muted = preferences.muted; } else { if (Math.abs(this.host.video.volume - preferences.volume) > 0.001) this.host.video.volume = preferences.volume; if (this.host.video.muted !== preferences.muted) this.host.video.muted = preferences.muted; } this.volume?.update(); }
  updateVolumePopup(): void { this.volume?.update(); }
  dispose(removeListeners: (video: HTMLVideoElement) => void): void { const video = this.host?.video; if (video) { video.pause(); removeListeners(video); } this.disposeControllers(); try { this.plyr?.destroy(); } catch (error) { console.warn('[VACNET] Plyr disposal failed.', error); } this.plyr = null; this.host = null; this.spriteContainer?.remove(); this.spriteContainer = null; this.playerHost.dispose(); }
  private disposeControllers(): void { this.progress?.dispose(); this.share?.dispose(); this.volume?.dispose(); this.progress = null; this.share = null; this.volume = null; }
  private ensureSprite(): void { if (document.getElementById('vacnet-plyr-sprite')) return; const container = document.createElement('div'); container.id = 'vacnet-plyr-sprite'; container.style.display = 'none'; const svg = new DOMParser().parseFromString(plyrSprite, 'image/svg+xml').documentElement; if (svg instanceof SVGElement) container.appendChild(document.importNode(svg, true)); document.body.prepend(container); this.spriteContainer = container; }
}
