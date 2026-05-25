-- Form steps toggle, date questions and file upload answers.

ALTER TABLE process_questionnaires
  ADD COLUMN IF NOT EXISTS uses_sections BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE office_demand_forms
  ADD COLUMN IF NOT EXISTS uses_sections BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE process_questionnaire_questions
  DROP CONSTRAINT IF EXISTS process_questionnaire_questions_question_type_check;

ALTER TABLE process_questionnaire_questions
  ADD CONSTRAINT process_questionnaire_questions_question_type_check
  CHECK (
    question_type IN (
      'text',
      'short_text',
      'long_text',
      'single_select',
      'multi_select',
      'date',
      'file_upload'
    )
  );

ALTER TABLE office_demand_form_questions
  DROP CONSTRAINT IF EXISTS office_demand_form_questions_question_type_check;

ALTER TABLE office_demand_form_questions
  ADD CONSTRAINT office_demand_form_questions_question_type_check
  CHECK (
    question_type IN (
      'short_text',
      'long_text',
      'single_select',
      'multi_select',
      'date',
      'file_upload'
    )
  );

ALTER TABLE office_questionnaire_answers
  ADD COLUMN IF NOT EXISTS uploaded_files JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE demand_form_answers
  ADD COLUMN IF NOT EXISTS uploaded_files JSONB NOT NULL DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
