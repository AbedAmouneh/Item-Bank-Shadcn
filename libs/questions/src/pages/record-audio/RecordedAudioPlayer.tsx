import {
  Box,
  Typography,
  IconButton,
  Slider,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  styled,
} from '@mui/material';
import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import CheckIcon from '@mui/icons-material/Check';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';

export type RecordingItem = {
  id: string;
  blobUrl: string;
  durationSeconds: number;
};

const RecordedCard = styled(Box)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
}));

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
  const [speedMenuAnchor, setSpeedMenuAnchor] = useState<null | HTMLElement>(null);

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
    (_: Event, value: number | number[]) => {
      const v = Array.isArray(value) ? value[0] : value;
      const audio = audioRef.current;
      if (audio && typeof v === 'number') {
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

  const handleVolumeChange = useCallback((_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    const level = typeof v === 'number' ? v / 100 : 1;
    setVolume(level);
    if (level > 0) setMuted(false);
  }, []);

  return (
    <RecordedCard>
      <Box className="flex items-center justify-between mb-3">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MusicNoteIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={500}>
            {label}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onDelete}
          disabled={!canDelete}
          sx={{ color: canDelete ? 'text.secondary' : 'action.disabled' }}
          aria-label="Delete recording"
        >
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <IconButton size="small" onClick={togglePlay} color="primary" aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Typography>
        <Slider
          size="small"
          value={duration > 0 ? progress : 0}
          onChange={handleSliderChange}
          sx={{
            flex: 1,
            minWidth: 80,
            maxWidth: 240,
            margin: 0,
            padding: '0 !important',
            '& .MuiSlider-thumb': { width: 12, height: 12 },
            '& .MuiSlider-track': { height: 2 },
            '& .MuiSlider-rail': { height: 2 },
          }}
          aria-label="Playback position"
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            minHeight: 40,
          }}
          onMouseEnter={() => setVolumeHover(true)}
          onMouseLeave={() => setVolumeHover(false)}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              width: volumeHover ? 72 : 0,
              opacity: volumeHover ? 1 : 0,
              transition: 'width 0.2s ease, opacity 0.2s ease',
              minHeight: 40,
            }}
          >
            <Slider
              size="small"
              value={muted ? 0 : volume * 100}
              onChange={handleVolumeChange}
              min={0}
              max={100}
              sx={{
                width: 72,
                margin: 0,
                padding: '0 !important',
                color: 'text.secondary',
                '& .MuiSlider-thumb': { width: 12, height: 12 },
                '& .MuiSlider-track': { height: 2 },
                '& .MuiSlider-rail': { height: 2 },
              }}
              aria-label="Volume"
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
          <IconButton
            size="small"
            onClick={toggleMute}
            sx={{ color: 'text.secondary' }}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <VolumeOffIcon sx={{ fontSize: 20 }} />
            ) : (
              <VolumeUpIcon sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        </Box>
        <IconButton
          size="small"
          sx={{ color: 'text.secondary' }}
          aria-label="Playback speed"
          onClick={(e) => setSpeedMenuAnchor(e.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
        <Menu
          anchorEl={speedMenuAnchor}
          open={Boolean(speedMenuAnchor)}
          onClose={() => setSpeedMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          {PLAYBACK_SPEED_OPTIONS.map(({ value, label }) => (
            <MenuItem
              key={value}
              selected={playbackRate === value}
              onClick={() => {
                setPlaybackRate(value);
                setSpeedMenuAnchor(null);
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                {playbackRate === value ? <CheckIcon fontSize="small" /> : null}
              </ListItemIcon>
              <ListItemText primary={label} />
            </MenuItem>
          ))}
        </Menu>
      </Box>
      <audio ref={audioRef} src={item.blobUrl} />
    </RecordedCard>
  );
}

export default RecordedAudioPlayer;
