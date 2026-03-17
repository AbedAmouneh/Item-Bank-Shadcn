import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { Check, Music, Play, Pause, Trash2, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@item-bank/ui';

export type RecordingItem = {
  id: string;
  blobUrl: string;
  durationSeconds: number;
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const PLAYBACK_SPEED_OPTIONS: { value: number; label: string }[] = [
  { value: 0.25, label: '0.25' },
  { value: 0.5, label: '0.5' },
  { value: 0.75, label: '0.75' },
  { value: 1, label: 'Normal' },
  { value: 1.25, label: '1.25' },
  { value: 1.5, label: '1.5' },
  { value: 1.75, label: '1.75' },
  { value: 2, label: '2' },
];

type RecordedAudioPlayerProps = {
  item: RecordingItem;
  onDelete: () => void;
  canDelete: boolean;
  label: string;
};

function RecordedAudioPlayer({ item, onDelete, canDelete, label }: RecordedAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volumeHover, setVolumeHover] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const duration = item.durationSeconds;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => undefined);
    }
    setPlaying(!playing);
  }, [playing]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [item.blobUrl]);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = Number(e.target.value);
      const audio = audioRef.current;
      if (audio) {
        const time = (v / 100) * duration;
        audio.currentTime = time;
        setCurrentTime(time);
      }
    },
    [duration]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted, item.blobUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate, item.blobUrl]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const level = Number(e.target.value) / 100;
    setVolume(level);
    if (level > 0) setMuted(false);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music size={18} className="text-primary" />
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="Delete recording"
          className={cn(
            'p-1.5 rounded-lg transition-colors',
            canDelete
              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground/30 cursor-not-allowed'
          )}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Playback controls row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>

        {/* Time display */}
        <span className="text-sm text-muted-foreground min-w-[80px] tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Progress slider */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={duration > 0 ? progress : 0}
          onChange={handleSliderChange}
          aria-label="Playback position"
          className="flex-1 min-w-[80px] max-w-[240px] h-1 accent-primary cursor-pointer"
        />

        {/* Volume control */}
        <div
          className="flex items-center gap-1 min-h-[40px]"
          onMouseEnter={() => setVolumeHover(true)}
          onMouseLeave={() => setVolumeHover(false)}
        >
          <div
            className={cn(
              'flex items-center overflow-hidden transition-all duration-200',
              volumeHover ? 'w-[72px] opacity-100' : 'w-0 opacity-0'
            )}
          >
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={muted ? 0 : Math.round(volume * 100)}
              onChange={handleVolumeChange}
              aria-label="Volume"
              onClick={(e) => e.stopPropagation()}
              className="w-[72px] h-1 accent-muted-foreground cursor-pointer"
            />
          </div>
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {/* Playback speed menu */}
        <DropdownMenuPrimitive.Root>
          <DropdownMenuPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label="Playback speed"
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenuPrimitive.Trigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.Content
              align="end"
              sideOffset={4}
              className={cn(
                'z-50 min-w-[120px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
              )}
            >
              {PLAYBACK_SPEED_OPTIONS.map(({ value, label: speedLabel }) => (
                <DropdownMenuPrimitive.Item
                  key={value}
                  onSelect={() => setPlaybackRate(value)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm cursor-pointer outline-none select-none',
                    'text-foreground hover:bg-accent focus:bg-accent'
                  )}
                >
                  <span className="w-4 flex items-center justify-center">
                    {playbackRate === value && <Check size={14} className="text-primary" />}
                  </span>
                  {speedLabel}
                </DropdownMenuPrimitive.Item>
              ))}
            </DropdownMenuPrimitive.Content>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </div>

      <audio ref={audioRef} src={item.blobUrl} />
    </div>
  );
}

export default RecordedAudioPlayer;
