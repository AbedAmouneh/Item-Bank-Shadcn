import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Music, Trash2, Plus, Play, Pause, Square } from 'lucide-react';
import { uploadQuestionAudio, deleteQuestionAudio } from '@item-bank/api';
import {
  Button,
  Input,
  Slider,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@item-bank/ui';
import type { QuestionFormData } from '../../components/QuestionEditorShell';

/** Format seconds as MM:SS. Returns '--:--' for invalid values. */
function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '--:--';
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

type SpellingDictationEditorProps = {
  onSave: (data: QuestionFormData) => void;
  onCancel: () => void;
  initialData?: QuestionFormData;
  questionId: number | null;
};

/**
 * Editor for the Spelling Dictation question type.
 *
 * Manages audio recording/upload, correct spellings list, and an optional hint.
 * Audio upload requires a saved question ID — in create mode the audio section
 * is locked until the question is saved for the first time.
 */
export default function SpellingDictationEditor({
  onSave,
  onCancel,
  initialData,
  questionId,
}: SpellingDictationEditorProps) {
  const { t } = useTranslation('questions');

  // ------------------------------------------------------------------
  // Form state
  // ------------------------------------------------------------------
  const [name, setName] = useState(initialData?.name ?? '');
  const [mark, setMark] = useState(initialData?.mark ?? 10);

  // ------------------------------------------------------------------
  // Audio state
  // ------------------------------------------------------------------
  const [audioUrl, setAudioUrl] = useState<string | null>(
    initialData?.spellingAudioUrl ?? null,
  );
  const [audioName, setAudioName] = useState<string | null>(
    initialData?.spellingAudioName ?? null,
  );

  // ------------------------------------------------------------------
  // Recording state
  // ------------------------------------------------------------------
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // ------------------------------------------------------------------
  // Audio player state
  // ------------------------------------------------------------------
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ------------------------------------------------------------------
  // Answer + hint state
  // ------------------------------------------------------------------
  const [spellings, setSpellings] = useState<string[]>(
    initialData?.spellingCorrectAnswers?.length
      ? initialData.spellingCorrectAnswers
      : [''],
  );
  const [hint, setHint] = useState(initialData?.spellingHint ?? '');

  // ------------------------------------------------------------------
  // Error state
  // ------------------------------------------------------------------
  const [errors, setErrors] = useState<string[]>([]);

  // ------------------------------------------------------------------
  // Refs
  // ------------------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount: stop timer and release mic
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // ------------------------------------------------------------------
  // Recording handlers
  // ------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    if (questionId === null) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const result = await uploadQuestionAudio(questionId, blob);
          setAudioUrl(result.audioUrl);
          setAudioName(result.audioName);
        } catch {
          // Upload failure is silently noted; user can retry
        }
        // Release mic
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mr.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      // Mic permission denied or unavailable
    }
  }, [questionId]);

  const pauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.pause();
    setIsPaused(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  }, []);

  const resumeRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.resume();
    setIsPaused(false);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const reRecord = useCallback(() => {
    setAudioUrl(null);
    setAudioName(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setRecordingSeconds(0);
    chunksRef.current = [];
  }, []);

  // ------------------------------------------------------------------
  // Upload handler
  // ------------------------------------------------------------------

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || questionId === null) return;
      try {
        const result = await uploadQuestionAudio(questionId, file);
        setAudioUrl(result.audioUrl);
        setAudioName(result.audioName);
      } catch {
        // Upload failure is silently noted; user can retry
      }
      // Clear input so the same file can be re-selected
      e.target.value = '';
    },
    [questionId],
  );

  // ------------------------------------------------------------------
  // Delete audio handler
  // ------------------------------------------------------------------

  const handleDeleteAudio = useCallback(async () => {
    if (questionId === null) return;
    try {
      await deleteQuestionAudio(questionId);
    } catch {
      // Deletion failure is silently noted
    }
    setAudioUrl(null);
    setAudioName(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [questionId]);

  // ------------------------------------------------------------------
  // Audio player handlers
  // ------------------------------------------------------------------

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      void el.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleScrub = useCallback((values: number[]) => {
    const el = audioRef.current;
    if (!el || values[0] === undefined) return;
    el.currentTime = values[0];
    setCurrentTime(values[0]);
  }, []);

  // ------------------------------------------------------------------
  // Spellings handlers
  // ------------------------------------------------------------------

  const updateSpelling = useCallback((index: number, value: string) => {
    setSpellings((prev) => prev.map((s, i) => (i === index ? value : s)));
  }, []);

  const addSpelling = useCallback(() => {
    setSpellings((prev) => [...prev, '']);
  }, []);

  const removeSpelling = useCallback((index: number) => {
    setSpellings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ------------------------------------------------------------------
  // Save handler
  // ------------------------------------------------------------------

  const handleSave = useCallback(() => {
    const errs: string[] = [];
    if (!name.trim()) errs.push(t('editor.spelling_dictation.error_no_name'));
    if (!spellings.some((s) => s.trim() !== ''))
      errs.push(t('editor.spelling_dictation.error_min_answers'));

    if (errs.length > 0) {
      setErrors(errs);
      return;
    }

    setErrors([]);
    onSave({
      type: 'spelling_dictation',
      name,
      mark,
      text: '',
      spellingAudioUrl: audioUrl,
      spellingAudioName: audioName,
      spellingCorrectAnswers: spellings.filter((s) => s.trim() !== ''),
      spellingHint: hint,
    } as QuestionFormData);
  }, [name, mark, spellings, hint, audioUrl, audioName, onSave, t]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const apiBase = import.meta.env.VITE_API_BASE_URL as string;

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* Question name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('question_name')}
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('question_name')}
        />
      </div>

      {/* Mark */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('mark')}
        </label>
        <Input
          type="number"
          value={mark}
          min={0}
          onChange={(e) => setMark(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {/* Audio section */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Audio</span>

        {questionId === null ? (
          <p className="text-sm text-muted-foreground italic">
            {t('editor.spelling_dictation.save_first_for_audio')}
          </p>
        ) : audioUrl ? (
          /* Audio player */
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/30 p-3">
            {/* Filename row */}
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Music size={14} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{audioName ?? 'recording'}</span>
              <button
                type="button"
                aria-label="Delete audio"
                onClick={() => void handleDeleteAudio()}
                className="rounded p-1 text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Hidden audio element */}
            <audio
              ref={audioRef}
              src={`${apiBase}${audioUrl}`}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
            />

            {/* Scrubber */}
            <Slider
              min={0}
              max={duration || 1}
              step={0.01}
              value={[currentTime]}
              onValueChange={handleScrub}
              aria-label="Audio scrubber"
            />

            {/* Controls row */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                onClick={togglePlay}
                className="rounded-full p-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Re-record button */}
            <Button variant="outline" size="sm" onClick={reRecord}>
              {t('editor.spelling_dictation.re_record_btn')}
            </Button>
          </div>
        ) : (
          /* Record / Upload tabs */
          <Tabs defaultValue="record">
            <TabsList>
              <TabsTrigger value="record">
                {t('editor.spelling_dictation.record_tab')}
              </TabsTrigger>
              <TabsTrigger value="upload">
                {t('editor.spelling_dictation.upload_tab')}
              </TabsTrigger>
            </TabsList>

            {/* Record tab */}
            <TabsContent value="record">
              <div className="flex flex-col gap-3 pt-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={() => void startRecording()}
                    className="flex items-center gap-2 self-start rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <Mic size={16} />
                    {t('editor.spelling_dictation.record_btn')}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    {/* Recording indicator + timer */}
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                      <span className="text-sm tabular-nums text-foreground">
                        {formatTime(recordingSeconds)}
                      </span>
                    </div>

                    {/* Pause / Resume / Stop buttons */}
                    <div className="flex items-center gap-2">
                      {isPaused ? (
                        <Button variant="outline" size="sm" onClick={resumeRecording}>
                          {t('editor.spelling_dictation.resume_btn')}
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={pauseRecording}>
                          {t('editor.spelling_dictation.pause_btn')}
                        </Button>
                      )}
                      <Button variant="destructive" size="sm" onClick={stopRecording}>
                        <Square size={12} className="me-1.5" />
                        {t('editor.spelling_dictation.stop_btn')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Upload tab */}
            <TabsContent value="upload">
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {t('editor.spelling_dictation.upload_area')}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => void handleFileChange(e)}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Correct spellings */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">
          {t('editor.spelling_dictation.correct_answers_label')}
        </span>
        {spellings.map((spelling, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={spelling}
              onChange={(e) => updateSpelling(index, e.target.value)}
              placeholder={`${t('answer')} ${index + 1}`}
              className="flex-1"
            />
            {index > 0 && (
              <button
                type="button"
                aria-label="Remove spelling"
                onClick={() => removeSpelling(index)}
                className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addSpelling}
          className="flex items-center gap-1.5 self-start text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
        >
          <Plus size={14} />
          {t('editor.spelling_dictation.add_alternate')}
        </button>
      </div>

      {/* Hint */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">
          {t('editor.spelling_dictation.hint_label')}
        </label>
        <Input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder={t('editor.spelling_dictation.hint_label')}
        />
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <ul className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button onClick={handleSave}>{t('done')}</Button>
      </div>
    </div>
  );
}
