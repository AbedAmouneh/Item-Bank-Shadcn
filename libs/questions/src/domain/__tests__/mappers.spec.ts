// toQuestionDto converts a QuestionDomain or QuestionDraft to a snake_case QuestionDTO.
// fromQuestionDto converts a QuestionDTO back to a camelCase QuestionDomain.
import { toQuestionDto, fromQuestionDto } from '../mappers';
import type { QuestionDomain } from '../domain';
import type { QuestionDTO } from '../dto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBase(type: string) {
  return { type, name: 'Q', text: 'Body', mark: 10 } as const;
}

// ---------------------------------------------------------------------------
// toQuestionDto
// ---------------------------------------------------------------------------

describe('toQuestionDto', () => {
  it('converts true_false domain to DTO with correct_answer field', () => {
    const dto = toQuestionDto({ type: 'true_false', name: 'Q', text: 'T', correctAnswer: true });
    expect(dto.type).toBe('true_false');
    if (dto.type === 'true_false') {
      expect(dto.correct_answer).toBe(true);
    }
  });

  it('defaults true_false correct_answer to false when undefined', () => {
    const dto = toQuestionDto({ type: 'true_false', name: '', text: '' });
    if (dto.type === 'true_false') {
      expect(dto.correct_answer).toBe(false);
    }
  });

  it('converts multiple_choice domain preserving options and correct ids', () => {
    const options = [{ id: 'a', text: 'Yes' }];
    const dto = toQuestionDto({
      type: 'multiple_choice',
      name: 'Q',
      text: 'T',
      options,
      correctOptionIds: ['a'],
      allowMultiple: true,
    });
    if (dto.type === 'multiple_choice') {
      expect(dto.options).toEqual(options);
      expect(dto.correct_option_ids).toEqual(['a']);
      expect(dto.allow_multiple).toBe(true);
    }
  });

  it('falls back to empty arrays for multiple_choice when fields are undefined', () => {
    const dto = toQuestionDto({ type: 'multiple_choice', name: '', text: '' });
    if (dto.type === 'multiple_choice') {
      expect(dto.options).toEqual([]);
      expect(dto.correct_option_ids).toEqual([]);
      expect(dto.allow_multiple).toBe(false);
    }
  });

  it('converts short_answer domain with accepted_answers', () => {
    const dto = toQuestionDto({
      type: 'short_answer',
      name: 'Q',
      text: 'T',
      acceptedAnswers: ['Paris', 'paris'],
    });
    if (dto.type === 'short_answer') {
      expect(dto.accepted_answers).toEqual(['Paris', 'paris']);
    }
  });

  it('falls back to empty array for short_answer when acceptedAnswers is undefined', () => {
    const dto = toQuestionDto({ type: 'short_answer', name: '', text: '' });
    if (dto.type === 'short_answer') {
      expect(dto.accepted_answers).toEqual([]);
    }
  });

  it('converts essay domain to base DTO only', () => {
    const dto = toQuestionDto({ type: 'essay', name: 'E', text: 'T' });
    expect(dto.type).toBe('essay');
    expect(dto.name).toBe('E');
  });

  it('converts drag_drop_image domain with snake_case zone field', () => {
    const dto = toQuestionDto({
      type: 'drag_drop_image',
      name: 'Q',
      text: 'T',
      imageUrl: 'http://img',
      draggableItems: [{ id: 'i1', label: 'Cat' }],
      dropZones: [{ id: 'z1', x: 10, y: 20, correctItemIds: ['i1'] }],
    });
    if (dto.type === 'drag_drop_image') {
      expect(dto.image_url).toBe('http://img');
      expect(dto.drop_zones[0].correct_item_ids).toEqual(['i1']);
    }
  });

  it('converts drag_drop_text domain converting groupId → group_id', () => {
    const dto = toQuestionDto({
      type: 'drag_drop_text',
      name: 'Q',
      text: 'T',
      dragDropItems: [
        { id: 'd1', key: 'k1', answer: 'a', groupId: 'g1', markPercent: 50, unlimitedReuse: false },
      ],
      groups: [{ id: 'g1', name: 'G', color: 'primary' }],
    });
    if (dto.type === 'drag_drop_text') {
      expect(dto.drag_drop_items[0].group_id).toBe('g1');
      expect(dto.drag_drop_items[0].mark_percent).toBe(50);
      expect(dto.drag_drop_items[0].unlimited_reuse).toBe(false);
    }
  });

  it('converts free_hand_drawing domain to snake_case canvas fields', () => {
    const dto = toQuestionDto({
      type: 'free_hand_drawing',
      name: 'Q',
      text: 'T',
      canvasWidth: 1024,
      canvasHeight: 768,
      background_image: null,
    });
    if (dto.type === 'free_hand_drawing') {
      expect(dto.canvas_width).toBe(1024);
      expect(dto.canvas_height).toBe(768);
      expect(dto.background_image).toBeNull();
    }
  });

  it('defaults free_hand_drawing canvas to 800×600 when fields are undefined', () => {
    const dto = toQuestionDto({ type: 'free_hand_drawing', name: '', text: '', background_image: null });
    if (dto.type === 'free_hand_drawing') {
      expect(dto.canvas_width).toBe(800);
      expect(dto.canvas_height).toBe(600);
    }
  });

  it('converts image_sequencing items to snake_case field names', () => {
    const dto = toQuestionDto({
      type: 'image_sequencing',
      name: 'Q',
      text: 'T',
      items: [{ id: 'i1', imageUrl: 'http://img', correctOrder: 2 }],
    });
    if (dto.type === 'image_sequencing') {
      expect(dto.items[0].image_url).toBe('http://img');
      expect(dto.items[0].correct_order).toBe(2);
    }
  });

  it('converts multiple_hotspots domain with image_url and hotspots array', () => {
    const dto = toQuestionDto({
      type: 'multiple_hotspots',
      name: 'Q',
      text: 'T',
      imageUrl: 'http://img',
      hotspots: [{ id: 'h1', x: 5, y: 10, width: 20, height: 30 }],
    });
    if (dto.type === 'multiple_hotspots') {
      expect(dto.image_url).toBe('http://img');
      expect(dto.hotspots).toHaveLength(1);
    }
  });

  it('converts numerical domain (answers array shape) directly', () => {
    const answers = [{ id: 'n1', answer: 42, error: 1, mark: 100, feedback: false }];
    const dto = toQuestionDto({ type: 'numerical', name: 'Q', text: 'T', answers });
    if (dto.type === 'numerical') {
      expect(dto.answers).toEqual(answers);
    }
  });

  it('converts numerical draft (correctAnswer/tolerance shape) into a single-answer array', () => {
    const dto = toQuestionDto({
      type: 'numerical',
      name: 'Q',
      text: 'T',
      correctAnswer: 7,
      tolerance: 0.5,
    });
    if (dto.type === 'numerical') {
      expect(dto.answers).toHaveLength(1);
      expect(dto.answers[0].answer).toBe(7);
      expect(dto.answers[0].error).toBe(0.5);
    }
  });

  it('converts fill_in_blanks domain with text_with_blanks and accepted_answers', () => {
    const dto = toQuestionDto({
      type: 'fill_in_blanks',
      name: 'Q',
      text: 'T',
      textWithBlanks: 'Hello [[world]]',
      blanks: [{ id: 'b1', acceptedAnswers: ['world'] }],
    });
    if (dto.type === 'fill_in_blanks') {
      expect(dto.text_with_blanks).toBe('Hello [[world]]');
      expect(dto.blanks[0].accepted_answers).toEqual(['world']);
    }
  });

  it('converts select_correct_word domain with is_correct field', () => {
    const dto = toQuestionDto({
      type: 'select_correct_word',
      name: 'Q',
      text: 'T',
      words: [{ id: 'w1', text: 'cat', isCorrect: true }],
    });
    if (dto.type === 'select_correct_word') {
      expect(dto.words[0].is_correct).toBe(true);
    }
  });

  it('converts text_sequencing items with correct_order field', () => {
    const dto = toQuestionDto({
      type: 'text_sequencing',
      name: 'Q',
      text: 'T',
      items: [{ id: 's1', text: 'Step 1', correctOrder: 1 }],
    });
    if (dto.type === 'text_sequencing') {
      expect(dto.items[0].correct_order).toBe(1);
    }
  });

  it('converts fill_in_blanks_image blanks with x/y coordinates', () => {
    const dto = toQuestionDto({
      type: 'fill_in_blanks_image',
      name: 'Q',
      text: 'T',
      imageUrl: 'http://img',
      blanks: [{ id: 'b1', x: 10, y: 20, acceptedAnswers: ['yes'] }],
    });
    if (dto.type === 'fill_in_blanks_image') {
      expect(dto.image_url).toBe('http://img');
      expect(dto.blanks[0].accepted_answers).toEqual(['yes']);
    }
  });

  it('converts highlight_correct_word domain with correct_ranges', () => {
    const dto = toQuestionDto({
      type: 'highlight_correct_word',
      name: 'Q',
      text: 'The quick brown fox',
      correctRanges: [{ start: 0, end: 3 }],
    });
    if (dto.type === 'highlight_correct_word') {
      expect(dto.correct_ranges).toEqual([{ start: 0, end: 3 }]);
    }
  });

  it('converts record_audio domain with max_duration_seconds', () => {
    const dto = toQuestionDto({ type: 'record_audio', name: 'Q', text: 'T', maxDurationSeconds: 120 });
    if (dto.type === 'record_audio') {
      expect(dto.max_duration_seconds).toBe(120);
    }
  });

  it('defaults record_audio max_duration_seconds to 60 when undefined', () => {
    const dto = toQuestionDto({ type: 'record_audio', name: '', text: '' });
    if (dto.type === 'record_audio') {
      expect(dto.max_duration_seconds).toBe(60);
    }
  });

  it('converts text_classification to a base DTO (no type-specific fields in DTO union)', () => {
    const dto = toQuestionDto({
      type: 'text_classification',
      name: 'Q',
      text: 'T',
      categories: [],
      layout: 'columns',
      autoDistribute: true,
      justification: 'disabled',
      justificationFraction: 30,
    });
    expect(dto.type).toBe('text_classification');
    expect(dto.name).toBe('Q');
  });

  it('converts image_classification to a base DTO', () => {
    const dto = toQuestionDto({
      type: 'image_classification',
      name: 'Q',
      text: 'T',
      categories: [],
      layout: 'columns',
      autoDistribute: true,
      justification: 'disabled',
      justificationFraction: 30,
    });
    expect(dto.type).toBe('image_classification');
  });

  it('converts matching domain to a full MatchingQuestionDTO', () => {
    const leftItem = {
      id: 'l1',
      text: 'Left A',
      imageUrl: '',
      multipleAnswers: false,
      linkedRightIds: ['r1'],
      markPercent: 100,
    };
    const rightItem = { id: 'r1', text: 'Right A', imageUrl: '' };
    const dto = toQuestionDto({
      type: 'matching',
      name: 'Q',
      text: 'T',
      leftItems: [leftItem],
      rightItems: [rightItem],
      leftMode: 'text',
      rightMode: 'text',
      allowRightItemReuse: false,
      autoDistribute: true,
      penaltyPerWrongPair: 25,
      justification: 'optional',
      justificationFraction: 30,
    });
    expect(dto.type).toBe('matching');
    if (dto.type !== 'matching') return;
    expect(dto.left_mode).toBe('text');
    expect(dto.right_mode).toBe('text');
    expect(dto.allow_right_item_reuse).toBe(false);
    expect(dto.auto_distribute).toBe(true);
    expect(dto.penalty_per_wrong_pair).toBe(25);
    expect(dto.justification).toBe('optional');
    expect(dto.justification_fraction).toBe(30);
    expect(dto.left_items).toHaveLength(1);
    expect(dto.left_items[0].id).toBe('l1');
    expect(dto.left_items[0].linked_right_ids).toEqual(['r1']);
    expect(dto.right_items).toHaveLength(1);
    expect(dto.right_items[0].id).toBe('r1');
  });

  it('round-trips matching through toQuestionDto → fromQuestionDto', () => {
    const domain: Parameters<typeof toQuestionDto>[0] = {
      type: 'matching',
      name: 'Q',
      text: 'T',
      leftItems: [{ id: 'l1', text: 'L', imageUrl: '', multipleAnswers: true, linkedRightIds: ['r1'], markPercent: 50 }],
      rightItems: [{ id: 'r1', text: 'R', imageUrl: '' }],
      leftMode: 'text',
      rightMode: 'image',
      allowRightItemReuse: true,
      autoDistribute: false,
      penaltyPerWrongPair: 10,
      justification: 'required',
      justificationFraction: 50,
    };
    const dto = toQuestionDto(domain);
    const back = fromQuestionDto(dto);
    expect(back.type).toBe('matching');
    if (back.type !== 'matching') return;
    expect(back.leftItems[0].id).toBe('l1');
    expect(back.leftItems[0].multipleAnswers).toBe(true);
    expect(back.rightItems[0].id).toBe('r1');
    expect(back.leftMode).toBe('text');
    expect(back.rightMode).toBe('image');
    expect(back.allowRightItemReuse).toBe(true);
    expect(back.autoDistribute).toBe(false);
    expect(back.penaltyPerWrongPair).toBe(10);
    expect(back.justification).toBe('required');
    expect(back.justificationFraction).toBe(50);
  });

  it('populates the base DTO fields from the domain object', () => {
    const dto = toQuestionDto({ type: 'essay', name: 'My Q', text: 'Body', mark: 5 });
    expect(dto.name).toBe('My Q');
    expect(dto.text).toBe('Body');
    expect(dto.mark).toBe(5);
  });

  it('defaults name, text, and mark to empty/zero when undefined', () => {
    const dto = toQuestionDto({ type: 'essay' } as Parameters<typeof toQuestionDto>[0]);
    expect(dto.name).toBe('');
    expect(dto.text).toBe('');
    expect(dto.mark).toBe(0);
  });

  it('throws for an unrecognised type', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => toQuestionDto({ type: 'unknown' as any, name: '', text: '' })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// fromQuestionDto
// ---------------------------------------------------------------------------

describe('fromQuestionDto', () => {
  it('converts true_false DTO to domain with correctAnswer field', () => {
    const domain = fromQuestionDto({
      ...makeBase('true_false'),
      type: 'true_false',
      correct_answer: false,
    });
    if (domain.type === 'true_false') {
      expect(domain.correctAnswer).toBe(false);
    }
  });

  it('converts multiple_choice DTO to domain with camelCase fields', () => {
    const domain = fromQuestionDto({
      ...makeBase('multiple_choice'),
      type: 'multiple_choice',
      options: [{ id: 'a', text: 'Yes' }],
      correct_option_ids: ['a'],
      allow_multiple: true,
    });
    if (domain.type === 'multiple_choice') {
      expect(domain.correctOptionIds).toEqual(['a']);
      expect(domain.allowMultiple).toBe(true);
    }
  });

  it('converts short_answer DTO with acceptedAnswers array', () => {
    const domain = fromQuestionDto({
      ...makeBase('short_answer'),
      type: 'short_answer',
      accepted_answers: ['Paris'],
    });
    if (domain.type === 'short_answer') {
      expect(domain.acceptedAnswers).toEqual(['Paris']);
    }
  });

  it('converts essay DTO to domain', () => {
    const domain = fromQuestionDto({ ...makeBase('essay'), type: 'essay' });
    expect(domain.type).toBe('essay');
  });

  it('converts drag_drop_image DTO restoring camelCase zone field', () => {
    const domain = fromQuestionDto({
      ...makeBase('drag_drop_image'),
      type: 'drag_drop_image',
      image_url: 'http://img',
      draggable_items: [],
      drop_zones: [{ id: 'z1', x: 1, y: 2, correct_item_ids: ['i1'] }],
    });
    if (domain.type === 'drag_drop_image') {
      expect(domain.imageUrl).toBe('http://img');
      expect(domain.dropZones[0].correctItemIds).toEqual(['i1']);
    }
  });

  it('converts drag_drop_text DTO restoring camelCase item fields', () => {
    const domain = fromQuestionDto({
      ...makeBase('drag_drop_text'),
      type: 'drag_drop_text',
      drag_drop_items: [
        { id: 'd1', key: 'k1', answer: 'a', group_id: 'g1', mark_percent: 50, unlimited_reuse: true },
      ],
      groups: [{ id: 'g1', name: 'G', color: 'primary' }],
    });
    if (domain.type === 'drag_drop_text') {
      expect(domain.dragDropItems[0].groupId).toBe('g1');
      expect(domain.dragDropItems[0].markPercent).toBe(50);
      expect(domain.dragDropItems[0].unlimitedReuse).toBe(true);
    }
  });

  it('converts free_hand_drawing DTO restoring camelCase canvas fields', () => {
    const domain = fromQuestionDto({
      ...makeBase('free_hand_drawing'),
      type: 'free_hand_drawing',
      canvas_width: 1024,
      canvas_height: 768,
      background_image: null,
    });
    if (domain.type === 'free_hand_drawing') {
      expect(domain.canvasWidth).toBe(1024);
      expect(domain.canvasHeight).toBe(768);
    }
  });

  it('converts image_sequencing DTO restoring imageUrl and correctOrder', () => {
    const domain = fromQuestionDto({
      ...makeBase('image_sequencing'),
      type: 'image_sequencing',
      items: [{ id: 'i1', image_url: 'http://img', correct_order: 3 }],
    });
    if (domain.type === 'image_sequencing') {
      expect(domain.items[0].imageUrl).toBe('http://img');
      expect(domain.items[0].correctOrder).toBe(3);
    }
  });

  it('converts multiple_hotspots DTO restoring imageUrl', () => {
    const domain = fromQuestionDto({
      ...makeBase('multiple_hotspots'),
      type: 'multiple_hotspots',
      image_url: 'http://img',
      hotspots: [],
    });
    if (domain.type === 'multiple_hotspots') {
      expect(domain.imageUrl).toBe('http://img');
    }
  });

  it('converts numerical DTO preserving answers array', () => {
    const answers = [{ id: 'n1', answer: 5, error: 0, mark: 100, feedback: false }];
    const domain = fromQuestionDto({ ...makeBase('numerical'), type: 'numerical', answers });
    if (domain.type === 'numerical') {
      expect(domain.answers).toEqual(answers);
    }
  });

  it('converts fill_in_blanks DTO restoring textWithBlanks and acceptedAnswers', () => {
    const domain = fromQuestionDto({
      ...makeBase('fill_in_blanks'),
      type: 'fill_in_blanks',
      text_with_blanks: 'A [[blank]] here',
      blanks: [{ id: 'b1', accepted_answers: ['word'] }],
    });
    if (domain.type === 'fill_in_blanks') {
      expect(domain.textWithBlanks).toBe('A [[blank]] here');
      expect(domain.blanks[0].acceptedAnswers).toEqual(['word']);
    }
  });

  it('converts select_correct_word DTO restoring isCorrect field', () => {
    const domain = fromQuestionDto({
      ...makeBase('select_correct_word'),
      type: 'select_correct_word',
      words: [{ id: 'w1', text: 'dog', is_correct: true }],
    });
    if (domain.type === 'select_correct_word') {
      expect(domain.words[0].isCorrect).toBe(true);
    }
  });

  it('converts text_sequencing DTO restoring correctOrder', () => {
    const domain = fromQuestionDto({
      ...makeBase('text_sequencing'),
      type: 'text_sequencing',
      items: [{ id: 's1', text: 'Step 1', correct_order: 2 }],
    });
    if (domain.type === 'text_sequencing') {
      expect(domain.items[0].correctOrder).toBe(2);
    }
  });

  it('converts fill_in_blanks_image DTO restoring imageUrl and blank coordinates', () => {
    const domain = fromQuestionDto({
      ...makeBase('fill_in_blanks_image'),
      type: 'fill_in_blanks_image',
      image_url: 'http://img',
      blanks: [{ id: 'b1', x: 5, y: 15, accepted_answers: ['val'] }],
    });
    if (domain.type === 'fill_in_blanks_image') {
      expect(domain.imageUrl).toBe('http://img');
      expect(domain.blanks[0].acceptedAnswers).toEqual(['val']);
    }
  });

  it('converts highlight_correct_word DTO restoring correctRanges', () => {
    const domain = fromQuestionDto({
      ...makeBase('highlight_correct_word'),
      type: 'highlight_correct_word',
      text: 'The quick brown fox',
      correct_ranges: [{ start: 4, end: 9 }],
    });
    if (domain.type === 'highlight_correct_word') {
      expect(domain.correctRanges).toEqual([{ start: 4, end: 9 }]);
    }
  });

  it('converts record_audio DTO restoring maxDurationSeconds', () => {
    const domain = fromQuestionDto({
      ...makeBase('record_audio'),
      type: 'record_audio',
      max_duration_seconds: 90,
    });
    if (domain.type === 'record_audio') {
      expect(domain.maxDurationSeconds).toBe(90);
    }
  });

  it('preserves name and text from the DTO base fields', () => {
    const domain = fromQuestionDto({ ...makeBase('essay'), type: 'essay' });
    expect(domain.name).toBe('Q');
    expect(domain.text).toBe('Body');
  });

  // Round-trip: toQuestionDto then fromQuestionDto should restore the domain
  it('round-trips a multiple_choice domain object without data loss', () => {
    const original: QuestionDomain = {
      type: 'multiple_choice',
      name: 'Which?',
      text: 'Pick one',
      options: [{ id: 'x', text: 'X' }],
      correctOptionIds: ['x'],
      allowMultiple: false,
    };
    const dto = toQuestionDto(original) as QuestionDTO;
    const restored = fromQuestionDto(dto);
    expect(restored).toEqual(original);
  });

  it('round-trips a fill_in_blanks domain object without data loss', () => {
    const original: QuestionDomain = {
      type: 'fill_in_blanks',
      name: 'Fill',
      text: 'Text',
      textWithBlanks: 'A [[b1]] thing',
      blanks: [{ id: 'b1', acceptedAnswers: ['big'] }],
    };
    const dto = toQuestionDto(original) as QuestionDTO;
    const restored = fromQuestionDto(dto);
    expect(restored).toEqual(original);
  });
});
