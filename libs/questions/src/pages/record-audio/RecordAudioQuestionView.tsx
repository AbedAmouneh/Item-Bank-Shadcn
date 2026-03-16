import { Box, Typography, IconButton, useTheme, alpha } from '@mui/material';
import type { QuestionRow } from '../../components/QuestionsTable';
import { useTranslation } from 'react-i18next';
import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import RecordedAudioPlayer, { type RecordingItem } from './RecordedAudioPlayer';

type RecordAudioQuestionViewProps = {
  question: QuestionRow;
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const RecordAudioQuestionView = ({ question }: RecordAudioQuestionViewProps) => {
  const { t } = useTranslation('questions');
  const theme = useTheme();

  const minRecordings = useMemo(() => question.numberOfRecordingsMin ?? 1, [question.numberOfRecordingsMin]);
  const maxRecordings = useMemo(() => question.numberOfRecordingsMax ?? 3, [question.numberOfRecordingsMax]);
  const minDuration = useMemo(() => question.recordingDurationMinSeconds ?? 10, [question.recordingDurationMinSeconds]);
  const maxDuration = useMemo(() => question.recordingDurationMaxSeconds ?? 32, [question.recordingDurationMaxSeconds]);

  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const recordingsRef = useRef<RecordingItem[]>([]);
  recordingsRef.current = recordings;

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recordedSeconds, setRecordedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedSecondsRef = useRef(0);

  const recordingsLabel =  useMemo(() => t('editor.record_audio.number_of_recordings_allowed') ?? 'Number of recordings allowed', [t]);
  const durationLabel = useMemo(() => t('editor.record_audio.recording_duration_seconds') ?? 'Recording duration (in seconds)', [t]);
  const recordedAudioLabel = useMemo(() => t('editor.record_audio.recorded_audio') ?? 'Recorded audio', [t]);
  const minLabel = useMemo(() => t('editor.record_audio.min') ?? 'min', [t]);
  const maxLabel = useMemo(() => t('editor.record_audio.max') ?? 'max', [t]);

  const canAddMore = useMemo(() => recordings.length < maxRecordings, [recordings, maxRecordings]);
  //const canDelete = recordings.length > minRecordings;
  const stopDisabled = useMemo(() => recordingState === 'idle' || recordedSeconds < minDuration, [recordingState, recordedSeconds, minDuration]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    const stream = streamRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
    }
    stream?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    clearTimer();
    setRecordingState('idle');
    setRecordedSeconds(0);
  }, [clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
      const mr = mediaRecorderRef.current;
      const stream = streamRef.current;
      if (mr && mr.state !== 'inactive') mr.stop();
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      recordingsRef.current.forEach((r) => URL.revokeObjectURL(r.blobUrl));
    };
  }, [clearTimer]);

  const startOrResumeRecording = useCallback(async () => {
    if (recordingState === 'recording') {
      mediaRecorderRef.current?.pause();
      clearTimer();
      setRecordingState('paused');
      return;
    }
    if (recordingState === 'paused') {
      mediaRecorderRef.current?.resume();
      timerRef.current = setInterval(() => {
        setRecordedSeconds((s) => {
          const next = s + 1;
          recordedSecondsRef.current = next;
          return next;
        });
      }, 1000);
      setRecordingState('recording');
      return;
    }

    if (!canAddMore) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      recordedSecondsRef.current = 0;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const duration = recordedSecondsRef.current;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => [
          ...prev,
          {
            id: `rec-${Date.now()}`,
            blobUrl: url,
            durationSeconds: duration,
          },
        ]);
      };

      mr.start(1000);
      setRecordedSeconds(0);
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setRecordedSeconds((s) => {
          const next = s + 1;
          recordedSecondsRef.current = next;
          if (next >= maxDuration) {
            clearTimer();
            setTimeout(() => stopRecording(), 0);
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }, [recordingState, canAddMore, maxDuration, clearTimer, stopRecording]);

  const handleStop = useCallback(() => {
    if (stopDisabled) return;
    const mr = mediaRecorderRef.current;
    const duration = recordedSecondsRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => [
          ...prev,
          {
            id: `rec-${Date.now()}`,
            blobUrl: url,
            durationSeconds: duration,
          },
        ]);
      };
    }
    stopRecording();
  }, [stopDisabled, stopRecording]);

  const deleteRecording = useCallback((id: string) => {
    setRecordings((prev) => {
      const item = prev.find((r) => r.id === id);
      if (item) URL.revokeObjectURL(item.blobUrl);
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  return (
    <Box className="flex flex-col gap-4">
      {recordings.map((item) => (
        <RecordedAudioPlayer
          key={item.id}
          item={item}
          onDelete={() => deleteRecording(item.id)}
          canDelete={true}
          label={recordedAudioLabel}
        />
      ))}

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          py: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={startOrResumeRecording}
            disabled={!canAddMore}
            sx={{
              width: 64,
              height: 64,
              border: `2px solid ${theme.palette.primary.main}`,
              color: 'primary.main',
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
              '&:disabled': {
                borderColor: theme.palette.action.disabled,
                color: theme.palette.action.disabled,
              },
            }}
            aria-label={recordingState === 'recording' ? 'Pause' : 'Start recording'}
          >
            {recordingState === 'recording' ? (
              <PauseIcon sx={{ fontSize: 32 }} />
            ) : (
              <PlayArrowIcon sx={{ fontSize: 32 }} />
            )}
          </IconButton>
          <IconButton
            onClick={handleStop}
            disabled={stopDisabled}
            sx={{
              width: 48,
              height: 48,
              border: `2px solid ${theme.palette.divider}`,
              color: stopDisabled ? 'action.disabled' : 'text.secondary',
              '&:hover': {
                backgroundColor: stopDisabled ? 'transparent' : alpha(theme.palette.action.hover, 0.04),
              },
            }}
            aria-label="Stop recording"
          >
            <StopIcon />
          </IconButton>
        </Box>
        <Typography variant="h4" fontFamily="monospace" color="text.primary">
          {formatTime(recordedSeconds)}
        </Typography>
      </Box>

      <Box sx={{ mt: 0 }}>
        <Typography className="text-center" variant="body2" color="text.secondary">
          {recordingsLabel}: {minLabel} {minRecordings}. {maxLabel} {maxRecordings}.
        </Typography>
        <Typography className="text-center" variant="body2" color="text.secondary">
          {durationLabel}: {minLabel} {minDuration}. {maxLabel} {maxDuration}.
        </Typography>
      </Box>
    </Box>
  );
};

export default RecordAudioQuestionView;
