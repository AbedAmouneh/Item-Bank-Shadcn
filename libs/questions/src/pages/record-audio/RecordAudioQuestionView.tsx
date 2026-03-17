import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Pause, Play, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@item-bank/ui';
import type { QuestionRow } from '../../components/QuestionsTable';
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

  const recordingsLabel = useMemo(() => t('editor.record_audio.number_of_recordings_allowed') ?? 'Number of recordings allowed', [t]);
  const durationLabel = useMemo(() => t('editor.record_audio.recording_duration_seconds') ?? 'Recording duration (in seconds)', [t]);
  const recordedAudioLabel = useMemo(() => t('editor.record_audio.recorded_audio') ?? 'Recorded audio', [t]);
  const minLabel = useMemo(() => t('editor.record_audio.min') ?? 'min', [t]);
  const maxLabel = useMemo(() => t('editor.record_audio.max') ?? 'max', [t]);

  const canAddMore = useMemo(() => recordings.length < maxRecordings, [recordings, maxRecordings]);
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
    <div className="flex flex-col gap-4">
      {recordings.map((item) => (
        <RecordedAudioPlayer
          key={item.id}
          item={item}
          onDelete={() => deleteRecording(item.id)}
          canDelete={true}
          label={recordedAudioLabel}
        />
      ))}

      {/* Recording controls */}
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex items-center gap-4">
          {/* Play / Pause button */}
          <button
            type="button"
            onClick={startOrResumeRecording}
            disabled={!canAddMore}
            aria-label={recordingState === 'recording' ? 'Pause' : 'Start recording'}
            className={cn(
              'w-16 h-16 rounded-full border-2 flex items-center justify-center transition-colors',
              canAddMore
                ? 'border-primary text-primary hover:bg-primary/10'
                : 'border-muted-foreground/30 text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            {recordingState === 'recording' ? <Pause size={28} /> : <Play size={28} />}
          </button>

          {/* Stop button */}
          <button
            type="button"
            onClick={handleStop}
            disabled={stopDisabled}
            aria-label="Stop recording"
            className={cn(
              'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors',
              stopDisabled
                ? 'border-muted-foreground/30 text-muted-foreground/30 cursor-not-allowed'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            <Square size={20} />
          </button>
        </div>

        {/* Timer */}
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {formatTime(recordedSeconds)}
        </span>
      </div>

      {/* Constraints info */}
      <div>
        <p className="text-center text-sm text-muted-foreground">
          {recordingsLabel}: {minLabel} {minRecordings}. {maxLabel} {maxRecordings}.
        </p>
        <p className="text-center text-sm text-muted-foreground">
          {durationLabel}: {minLabel} {minDuration}. {maxLabel} {maxDuration}.
        </p>
      </div>
    </div>
  );
};

export default RecordAudioQuestionView;
