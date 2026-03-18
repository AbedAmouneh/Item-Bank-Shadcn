// createDefaultQuestion produces a draft with type-specific default fields.
// createEmptyAnswer produces an AnswerEntry with sensible defaults.
import { createDefaultQuestion, createEmptyAnswer } from '../factory';

// --- createDefaultQuestion ----------------------------------------

describe('createDefaultQuestion', () => {
  // Each returned draft always includes these base fields
  const BASE_FIELDS = { name: '', text: '', isDirty: false };

  it('returns a true_false draft with correctAnswer false', () => {
    const q = createDefaultQuestion('true_false');
    expect(q).toMatchObject({ ...BASE_FIELDS, type: 'true_false', correctAnswer: false });
  });

  it('returns a multiple_choice draft with empty options and no allowMultiple', () => {
    const q = createDefaultQuestion('multiple_choice');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'multiple_choice',
      options: [],
      correctOptionIds: [],
      allowMultiple: false,
    });
  });

  it('returns a short_answer draft with empty acceptedAnswers', () => {
    const q = createDefaultQuestion('short_answer');
    expect(q).toMatchObject({ ...BASE_FIELDS, type: 'short_answer', acceptedAnswers: [] });
  });

  it('returns an essay draft with responseFormat html and attachment defaults', () => {
    const q = createDefaultQuestion('essay');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'essay',
      responseFormat: 'html',
      minLimit: '',
      maxLimit: '',
      allowAttachments: false,
      numberOfAttachments: 1,
      requiredAttachments: false,
      maxFileSize: '2MB',
    });
    if (q.type === 'essay') {
      expect(q.attachmentsFormat).toContain('.pdf');
    }
  });

  it('returns a drag_drop_image draft with empty imageUrl and arrays', () => {
    const q = createDefaultQuestion('drag_drop_image');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'drag_drop_image',
      imageUrl: '',
      draggableItems: [],
      dropZones: [],
    });
  });

  it('returns a drag_drop_text draft with empty item and group arrays', () => {
    const q = createDefaultQuestion('drag_drop_text');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'drag_drop_text',
      dragDropItems: [],
      groups: [],
    });
  });

  it('returns a free_hand_drawing draft with default canvas dimensions', () => {
    const q = createDefaultQuestion('free_hand_drawing');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'free_hand_drawing',
      canvasWidth: 800,
      canvasHeight: 600,
      background_image: null,
    });
  });

  it('returns an image_sequencing draft with empty items', () => {
    const q = createDefaultQuestion('image_sequencing');
    expect(q).toMatchObject({ ...BASE_FIELDS, type: 'image_sequencing', items: [] });
  });

  it('returns a multiple_hotspots draft with empty imageUrl and hotspots', () => {
    const q = createDefaultQuestion('multiple_hotspots');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'multiple_hotspots',
      imageUrl: '',
      hotspots: [],
    });
  });

  it('returns a numerical draft with correctAnswer 0 and undefined tolerance and unit', () => {
    const q = createDefaultQuestion('numerical');
    expect(q).toMatchObject({ ...BASE_FIELDS, type: 'numerical', correctAnswer: 0 });
    if (q.type === 'numerical') {
      expect(q.tolerance).toBeUndefined();
      expect(q.unit).toBeUndefined();
    }
  });

  it('returns a fill_in_blanks draft with empty textWithBlanks and blanks', () => {
    const q = createDefaultQuestion('fill_in_blanks');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'fill_in_blanks',
      textWithBlanks: '',
      blanks: [],
    });
  });

  it('returns a select_correct_word draft with empty words', () => {
    const q = createDefaultQuestion('select_correct_word');
    expect(q).toMatchObject({ ...BASE_FIELDS, type: 'select_correct_word', words: [] });
  });

  it('returns a text_sequencing draft with empty items', () => {
    const q = createDefaultQuestion('text_sequencing');
    expect(q).toMatchObject({ ...BASE_FIELDS, type: 'text_sequencing', items: [] });
  });

  it('returns a fill_in_blanks_image draft with empty imageUrl and blanks', () => {
    const q = createDefaultQuestion('fill_in_blanks_image');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'fill_in_blanks_image',
      imageUrl: '',
      blanks: [],
    });
  });

  it('returns a highlight_correct_word draft with empty text and correctRanges', () => {
    const q = createDefaultQuestion('highlight_correct_word');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'highlight_correct_word',
      text: '',
      correctRanges: [],
    });
  });

  it('returns a record_audio draft with maxDurationSeconds 60', () => {
    const q = createDefaultQuestion('record_audio');
    expect(q).toMatchObject({ ...BASE_FIELDS, type: 'record_audio', maxDurationSeconds: 60 });
  });

  it('returns a text_classification draft with columns layout and autoDistribute enabled', () => {
    const q = createDefaultQuestion('text_classification');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'text_classification',
      categories: [],
      layout: 'columns',
      autoDistribute: true,
      justification: 'disabled',
      justificationFraction: 30,
    });
  });

  it('returns an image_classification draft with columns layout and autoDistribute enabled', () => {
    const q = createDefaultQuestion('image_classification');
    expect(q).toMatchObject({
      ...BASE_FIELDS,
      type: 'image_classification',
      categories: [],
      layout: 'columns',
      autoDistribute: true,
      justification: 'disabled',
      justificationFraction: 30,
    });
  });

  it('returns a matching draft with 3 left items and 3 right items', () => {
    const q = createDefaultQuestion('matching');
    expect(q.type).toBe('matching');
    if (q.type === 'matching') {
      expect(q.leftItems).toHaveLength(3);
      expect(q.rightItems).toHaveLength(3);
      expect(q.leftMode).toBe('text');
      expect(q.rightMode).toBe('text');
      expect(q.allowRightItemReuse).toBe(false);
      expect(q.autoDistribute).toBe(true);
      expect(q.penaltyPerWrongPair).toBe(0);
      expect(q.justification).toBe('disabled');
    }
  });

  it('assigns unique ids to each left item in a matching draft', () => {
    const q = createDefaultQuestion('matching');
    if (q.type === 'matching') {
      const ids = q.leftItems.map((item) => item.id);
      expect(new Set(ids).size).toBe(3);
    }
  });

  it('assigns unique ids to each right item in a matching draft', () => {
    const q = createDefaultQuestion('matching');
    if (q.type === 'matching') {
      const ids = q.rightItems.map((item) => item.id);
      expect(new Set(ids).size).toBe(3);
    }
  });

  it('throws for an unrecognised question type', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => createDefaultQuestion('unknown_type' as any)).toThrow();
  });
});

// --- createEmptyAnswer --------------------------------------------

// createEmptyAnswer produces a domain-level AnswerEntry with default values.
describe('createEmptyAnswer', () => {
  it('sets text to an empty string', () => {
    expect(createEmptyAnswer().text).toBe('');
  });

  it('sets mark to 100', () => {
    expect(createEmptyAnswer().mark).toBe(100);
  });

  it('sets ignoreCasing to true', () => {
    expect(createEmptyAnswer().ignoreCasing).toBe(true);
  });

  it('sets feedback to false', () => {
    expect(createEmptyAnswer().feedback).toBe(false);
  });

  it('uses the supplied id when one is provided', () => {
    expect(createEmptyAnswer('explicit-id').id).toBe('explicit-id');
  });

  it('generates a non-empty string id when none is provided', () => {
    const entry = createEmptyAnswer();
    expect(typeof entry.id).toBe('string');
    expect(entry.id.length).toBeGreaterThan(0);
  });

  it('generates unique ids on successive calls without an explicit id', () => {
    const a = createEmptyAnswer();
    const b = createEmptyAnswer();
    expect(a.id).not.toBe(b.id);
  });
});
