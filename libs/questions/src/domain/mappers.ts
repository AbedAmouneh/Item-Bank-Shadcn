import { QuestionDomain } from './domain';
import { QuestionDraft } from './draft';
import { QuestionDTO } from './dto';

export function toQuestionDto(question: QuestionDomain | QuestionDraft): QuestionDTO {
  const baseDto = {
    type: question.type,
    name: question.name || '',
    text: question.text || '',
    mark: (question as { mark?: number }).mark ?? 0,
  };

  switch (question.type) {
    case 'true_false':
      return {
        ...baseDto,
        type: 'true_false',
        correct_answer: question.correctAnswer ?? false,
      };

    case 'multiple_choice':
      return {
        ...baseDto,
        type: 'multiple_choice',
        options: question.options || [],
        correct_option_ids: question.correctOptionIds || [],
        allow_multiple: question.allowMultiple ?? false,
      };

    case 'short_answer':
      return {
        ...baseDto,
        type: 'short_answer',
        accepted_answers: question.acceptedAnswers || [],
      };

    case 'essay':
      return {
        ...baseDto,
        type: 'essay',
      };

    case 'drag_drop_image':
      return {
        ...baseDto,
        type: 'drag_drop_image',
        image_url: question.imageUrl || '',
        draggable_items: question.draggableItems || [],
        drop_zones: (question.dropZones || []).map((zone) => ({
          id: zone.id,
          x: zone.x,
          y: zone.y,
          correct_item_ids: zone.correctItemIds,
        })),
      };

    case 'drag_drop_text':
      return {
        ...baseDto,
        type: 'drag_drop_text',
        drag_drop_items: (question.dragDropItems || []).map((item) => ({
          id: item.id,
          key: item.key,
          answer: item.answer,
          group_id: item.groupId,
          mark_percent: item.markPercent,
          unlimited_reuse: item.unlimitedReuse,
        })),
        groups: (question.groups || []).map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
        })),
      };

    case 'free_hand_drawing':
      return {
        ...baseDto,
        type: 'free_hand_drawing',
        canvas_width: question.canvasWidth ?? 800,
        canvas_height: question.canvasHeight ?? 600,
        background_image: question.background_image ?? null
      };

    case 'image_sequencing':
      return {
        ...baseDto,
        type: 'image_sequencing',
        items: (question.items || []).map((item) => ({
          id: item.id,
          image_url: item.imageUrl,
          correct_order: item.correctOrder,
        })),
      };

    case 'multiple_hotspots':
      return {
        ...baseDto,
        type: 'multiple_hotspots',
        image_url: question.imageUrl || '',
        hotspots: question.hotspots || [],
      };

    case 'numerical': {
      // NumericalQuestionDraft uses correctAnswer/tolerance/unit (legacy single-answer form)
      // while NumericalQuestion domain uses answers array — normalise to the DTO's answers shape.
      const draft = question as { correctAnswer?: number; tolerance?: number; unit?: string };
      const domain = question as { answers?: Array<{ id: string; answer: number; error: number; mark: number; feedback: boolean }> };
      return {
        ...baseDto,
        type: 'numerical',
        answers: domain.answers ?? [
          {
            id: crypto.randomUUID(),
            answer: draft.correctAnswer ?? 0,
            error: draft.tolerance ?? 0,
            mark: (question as { mark?: number }).mark ?? 0,
            feedback: false,
          },
        ],
      };
    }

    case 'fill_in_blanks':
      return {
        ...baseDto,
        type: 'fill_in_blanks',
        text_with_blanks: question.textWithBlanks || '',
        blanks: (question.blanks || []).map((blank) => ({
          id: blank.id,
          accepted_answers: blank.acceptedAnswers,
        })),
      };

    case 'select_correct_word':
      return {
        ...baseDto,
        type: 'select_correct_word',
        words: (question.words || []).map((word) => ({
          id: word.id,
          text: word.text,
          is_correct: word.isCorrect,
        })),
      };

    case 'text_sequencing':
      return {
        ...baseDto,
        type: 'text_sequencing',
        items: (question.items || []).map((item) => ({
          id: item.id,
          text: item.text,
          correct_order: item.correctOrder,
        })),
      };

    case 'fill_in_blanks_image':
      return {
        ...baseDto,
        type: 'fill_in_blanks_image',
        image_url: question.imageUrl || '',
        blanks: (question.blanks || []).map((blank) => ({
          id: blank.id,
          x: blank.x,
          y: blank.y,
          accepted_answers: blank.acceptedAnswers,
        })),
      };

    case 'highlight_correct_word':
      return {
        ...baseDto,
        type: 'highlight_correct_word',
        text: question.text || '',
        correct_ranges: question.correctRanges || [],
      };

    case 'record_audio':
      return {
        ...baseDto,
        type: 'record_audio',
        max_duration_seconds: question.maxDurationSeconds ?? 60,
      };

    case 'text_classification':
    case 'image_classification':
    case 'matching':
      return baseDto as QuestionDTO;

    default: {
      const exhaustiveCheck: never = question;
      throw new Error(`Unhandled question type: ${(exhaustiveCheck as QuestionDomain | QuestionDraft).type}`);
    }
  }
}

export function fromQuestionDto(dto: QuestionDTO): QuestionDomain {
  const baseDomain = {
    type: dto.type,
    name: dto.name,
    text: dto.text,
  };

  switch (dto.type) {
    case 'true_false':
      return {
        ...baseDomain,
        type: 'true_false',
        correctAnswer: dto.correct_answer,
      };

    case 'multiple_choice':
      return {
        ...baseDomain,
        type: 'multiple_choice',
        options: dto.options,
        correctOptionIds: dto.correct_option_ids,
        allowMultiple: dto.allow_multiple,
      };

    case 'short_answer':
      return {
        ...baseDomain,
        type: 'short_answer',
        acceptedAnswers: dto.accepted_answers,
      };

    case 'essay':
      return {
        ...baseDomain,
        type: 'essay',
      };

    case 'drag_drop_image':
      return {
        ...baseDomain,
        type: 'drag_drop_image',
        imageUrl: dto.image_url,
        draggableItems: dto.draggable_items,
        dropZones: dto.drop_zones.map((zone) => ({
          id: zone.id,
          x: zone.x,
          y: zone.y,
          correctItemIds: zone.correct_item_ids,
        })),
      };

    case 'drag_drop_text':
      return {
        ...baseDomain,
        type: 'drag_drop_text',
        dragDropItems: dto.drag_drop_items.map((item) => ({
          id: item.id,
          key: item.key,
          answer: item.answer,
          groupId: item.group_id,
          markPercent: item.mark_percent,
          unlimitedReuse: item.unlimited_reuse,
        })),
        groups: dto.groups.map((g) => ({
          id: g.id,
          name: g.name,
          color: g.color,
        })),
      };

    case 'free_hand_drawing':
      return {
        ...baseDomain,
        type: 'free_hand_drawing',
        canvasWidth: dto.canvas_width,
        canvasHeight: dto.canvas_height,
        background_image: dto.background_image,
      };

    case 'image_sequencing':
      return {
        ...baseDomain,
        type: 'image_sequencing',
        items: dto.items.map((item) => ({
          id: item.id,
          imageUrl: item.image_url,
          correctOrder: item.correct_order,
        })),
      };

    case 'multiple_hotspots':
      return {
        ...baseDomain,
        type: 'multiple_hotspots',
        imageUrl: dto.image_url,
        hotspots: dto.hotspots,
      };

    case 'numerical':
      return {
        ...baseDomain,
        type: 'numerical',
        answers: dto.answers,
      };

    case 'fill_in_blanks':
      return {
        ...baseDomain,
        type: 'fill_in_blanks',
        textWithBlanks: dto.text_with_blanks,
        blanks: dto.blanks.map((blank) => ({
          id: blank.id,
          acceptedAnswers: blank.accepted_answers,
        })),
      };

    case 'select_correct_word':
      return {
        ...baseDomain,
        type: 'select_correct_word',
        words: dto.words.map((word) => ({
          id: word.id,
          text: word.text,
          isCorrect: word.is_correct,
        })),
      };

    case 'text_sequencing':
      return {
        ...baseDomain,
        type: 'text_sequencing',
        items: dto.items.map((item) => ({
          id: item.id,
          text: item.text,
          correctOrder: item.correct_order,
        })),
      };

    case 'fill_in_blanks_image':
      return {
        ...baseDomain,
        type: 'fill_in_blanks_image',
        imageUrl: dto.image_url,
        blanks: dto.blanks.map((blank) => ({
          id: blank.id,
          x: blank.x,
          y: blank.y,
          acceptedAnswers: blank.accepted_answers,
        })),
      };

    case 'highlight_correct_word':
      return {
        ...baseDomain,
        type: 'highlight_correct_word',
        text: dto.text,
        correctRanges: dto.correct_ranges,
      };

    case 'record_audio':
      return {
        ...baseDomain,
        type: 'record_audio',
        maxDurationSeconds: dto.max_duration_seconds,
      };

    default: {
      const exhaustiveCheck: never = dto;
      throw new Error(`Unhandled DTO type: ${(exhaustiveCheck as QuestionDTO).type}`);
    }
  }
}
