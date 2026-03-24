import React, { useEffect, useRef, useState } from 'react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';

import {
  Button,
  Input,
  Label,
  Textarea,
  Slider,
  Switch,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@item-bank/ui';
import { useItemBanks } from '@item-bank/questions';

import { uploadMedia } from '@item-bank/api';
import type { Activity, UpdateActivityData } from '@item-bank/api';

import { useUpdateActivity } from '../../../features/courses/hooks';

// ─── Zod schema ───────────────────────────────────────────────────────────────
// Zod is a validation library — think of it as a rulebook for your form.
// Every field here gets a rule (min length, max number, etc.) and Zod will
// automatically tell the form which fields are broken.

const settingsSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional(),
  // item_bank_id is always set via setValue(…, Number(v)) — no coerce needed.
  item_bank_id: z.number().optional(),
  // The <input type="number"> registers as a string; we convert to number in onSubmit.
  time_limit_minutes: z.string().optional(),
  pass_score_percent: z.number().min(0).max(100).optional(),
  shuffle: z.boolean().optional(),
  file_url: z.string().optional(),
});

type SettingsFields = z.infer<typeof settingsSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

interface ActivitySettingsPanelProps {
  courseId: number;
  activity: Activity;
}

/**
 * Side-panel form for editing the settings of a single course activity.
 *
 * Renders shared fields (title, description) for every activity type, then
 * shows quiz-specific controls (item bank, time limit, pass score, shuffle)
 * or a PDF upload control based on `activity.type`.
 */
export function ActivitySettingsPanel({ courseId, activity }: ActivitySettingsPanelProps) {
  const { t } = useTranslation('common');
  // useRef creates a stable reference to the hidden file input DOM element so we
  // can trigger it programmatically when the "Browse" button is clicked.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { mutate: saveActivity, isPending } = useUpdateActivity();
  const { data: itemBanksPage } = useItemBanks({ limit: 100 });
  const itemBanks = itemBanksPage?.items ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SettingsFields>({ resolver: zodResolver(settingsSchema) });

  // Sync the form fields whenever a different activity is selected in the sidebar.
  // `reset` replaces all values at once, which is safer than calling `setValue`
  // for each field individually.
  useEffect(() => {
    reset({
      title: activity.title,
      description: activity.description ?? '',
      item_bank_id: activity.item_bank_id,
      time_limit_minutes: activity.time_limit_minutes != null ? String(activity.time_limit_minutes) : '',
      pass_score_percent: activity.pass_score_percent ?? 0,
      shuffle: activity.shuffle ?? false,
      file_url: activity.file_url ?? '',
    });
  }, [activity, reset]);

  const shuffleValue = watch('shuffle') ?? false;
  const passScore = watch('pass_score_percent') ?? 0;
  // Only quiz and practice_quiz activities have the extra academic settings.
  const isQuizType = activity.type === 'quiz' || activity.type === 'practice_quiz';

  const onSubmit = (data: SettingsFields) => {
    const payload: UpdateActivityData = {
      title: data.title,
      description: data.description || undefined,
    };
    if (isQuizType) {
      payload.item_bank_id = data.item_bank_id || undefined;
      payload.time_limit_minutes = data.time_limit_minutes
        ? Number(data.time_limit_minutes)
        : undefined;
      payload.pass_score_percent = data.pass_score_percent;
      payload.shuffle = data.shuffle;
    }
    if (activity.type === 'pdf_book') {
      payload.file_url = data.file_url || undefined;
    }
    saveActivity({ courseId, activityId: activity.id, data: payload });
  };

  /** Upload a PDF file to the server and store its public URL in the form. */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadMedia(file);
      setValue('file_url', url);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-4">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="act-title">{t('courses.activity_title')}</Label>
        <Input
          id="act-title"
          {...register('title')}
          placeholder={t('courses.activity_title_placeholder')}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="act-desc">
          {t('courses.activity_description')}{' '}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="act-desc"
          {...register('description')}
          placeholder={t('courses.activity_description_placeholder')}
          rows={2}
        />
      </div>

      {/* Quiz / Practice Quiz extras */}
      {isQuizType && (
        <>
          {/* Item Bank */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="act-item-bank">{t('courses.item_bank')}</Label>
            <Select
              value={String(watch('item_bank_id') ?? '')}
              onValueChange={(v) => setValue('item_bank_id', Number(v))}
            >
              <SelectTrigger id="act-item-bank">
                <SelectValue placeholder={t('courses.item_bank_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {itemBanks.map((bank) => (
                  <SelectItem key={bank.id} value={String(bank.id)}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Limit */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="act-time-limit">
              {t('courses.time_limit')}{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="act-time-limit"
              type="number"
              min={1}
              max={600}
              {...register('time_limit_minutes')}
              placeholder={t('courses.time_limit_placeholder')}
            />
          </div>

          {/* Pass Score — Slider (a draggable bar) from 0–100% */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>{t('courses.pass_score')}</Label>
              <span className="text-sm tabular-nums text-muted-foreground">{passScore}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[passScore]}
              onValueChange={(vals) => setValue('pass_score_percent', vals[0] ?? 0)}
            />
          </div>

          {/* Shuffle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="act-shuffle" className="cursor-pointer">
              {t('courses.shuffle')}
            </Label>
            <Switch
              id="act-shuffle"
              checked={shuffleValue}
              onCheckedChange={(v) => setValue('shuffle', v)}
            />
          </div>
        </>
      )}

      {/* PDF Book extras */}
      {activity.type === 'pdf_book' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="act-file-url">{t('courses.file_url')}</Label>
          <Input
            id="act-file-url"
            {...register('file_url')}
            placeholder={t('courses.file_url_placeholder')}
            aria-invalid={!!errors.file_url}
          />
          {errors.file_url && (
            <p className="text-xs text-destructive">{errors.file_url.message}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{t('courses.or_upload')}</span>
            {/* Clicking this button invisibly triggers the hidden <input type="file"> below */}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} className="me-1.5" />
              {isUploading ? t('courses.uploading') : t('courses.browse')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}

      {/* Save */}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? t('courses.saving') : t('courses.save_activity')}
      </Button>
    </form>
  );
}
