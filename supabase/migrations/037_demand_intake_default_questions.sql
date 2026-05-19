-- Perguntas padrão editáveis para o formulário "Nova Demanda".

ALTER TABLE process_questionnaire_questions
  ADD COLUMN IF NOT EXISTS demand_field_key TEXT CHECK (
    demand_field_key IS NULL OR demand_field_key IN (
      'requester_name',
      'requester_email',
      'requester_area',
      'demand_title',
      'demand_description',
      'priority'
    )
  );

ALTER TABLE office_demand_form_questions
  ADD COLUMN IF NOT EXISTS demand_field_key TEXT CHECK (
    demand_field_key IS NULL OR demand_field_key IN (
      'requester_name',
      'requester_email',
      'requester_area',
      'demand_title',
      'demand_description',
      'priority'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_questionnaire_demand_field_key
  ON process_questionnaire_questions(questionnaire_id, demand_field_key)
  WHERE demand_field_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_office_demand_form_demand_field_key
  ON office_demand_form_questions(office_demand_form_id, demand_field_key)
  WHERE demand_field_key IS NOT NULL;

DO $$
DECLARE
  template_id UUID;
  identification_section_id UUID;
  demand_section_id UUID;
  priority_question_id UUID;
BEGIN
  SELECT id INTO template_id
  FROM process_questionnaires
  WHERE is_demand_intake_template = true
  LIMIT 1;

  IF template_id IS NULL THEN
    INSERT INTO process_questionnaires (
      title,
      description,
      version,
      is_active,
      is_required_first_access,
      enable_process_linking,
      is_process_activation_form,
      is_demand_intake_template
    )
    VALUES (
      'Nova Demanda',
      'Formulário padrão para abertura de demandas ao Escritório de Processos.',
      COALESCE((SELECT MAX(version) FROM process_questionnaires), 0) + 1,
      false,
      false,
      false,
      false,
      true
    )
    RETURNING id INTO template_id;
  END IF;

  INSERT INTO process_questionnaire_sections (
    questionnaire_id,
    title,
    subtitle,
    description,
    sort_order
  )
  SELECT
    template_id,
    'Identificação',
    NULL,
    'Informe seus dados para que o escritório possa retornar sobre a solicitação.',
    0
  WHERE NOT EXISTS (
    SELECT 1
    FROM process_questionnaire_sections
    WHERE questionnaire_id = template_id
      AND title = 'Identificação'
  )
  RETURNING id INTO identification_section_id;

  IF identification_section_id IS NULL THEN
    SELECT id INTO identification_section_id
    FROM process_questionnaire_sections
    WHERE questionnaire_id = template_id
      AND title = 'Identificação'
    ORDER BY sort_order, created_at
    LIMIT 1;
  END IF;

  INSERT INTO process_questionnaire_sections (
    questionnaire_id,
    title,
    subtitle,
    description,
    sort_order
  )
  SELECT
    template_id,
    'Demanda',
    NULL,
    'Resuma a necessidade que deve ser avaliada pelo escritório.',
    1
  WHERE NOT EXISTS (
    SELECT 1
    FROM process_questionnaire_sections
    WHERE questionnaire_id = template_id
      AND title = 'Demanda'
  )
  RETURNING id INTO demand_section_id;

  IF demand_section_id IS NULL THEN
    SELECT id INTO demand_section_id
    FROM process_questionnaire_sections
    WHERE questionnaire_id = template_id
      AND title = 'Demanda'
    ORDER BY sort_order, created_at
    LIMIT 1;
  END IF;

  INSERT INTO process_questionnaire_questions (
    questionnaire_id,
    section_id,
    prompt,
    helper_text,
    question_type,
    is_required,
    sort_order,
    demand_field_key
  )
  SELECT template_id, identification_section_id, 'Nome', NULL, 'short_text', true, 0, 'requester_name'
  WHERE NOT EXISTS (
    SELECT 1 FROM process_questionnaire_questions
    WHERE questionnaire_id = template_id AND demand_field_key = 'requester_name'
  );

  INSERT INTO process_questionnaire_questions (
    questionnaire_id,
    section_id,
    prompt,
    helper_text,
    question_type,
    is_required,
    sort_order,
    demand_field_key
  )
  SELECT template_id, identification_section_id, 'E-mail', NULL, 'short_text', true, 1, 'requester_email'
  WHERE NOT EXISTS (
    SELECT 1 FROM process_questionnaire_questions
    WHERE questionnaire_id = template_id AND demand_field_key = 'requester_email'
  );

  INSERT INTO process_questionnaire_questions (
    questionnaire_id,
    section_id,
    prompt,
    helper_text,
    question_type,
    is_required,
    sort_order,
    demand_field_key
  )
  SELECT template_id, identification_section_id, 'Área/departamento', NULL, 'short_text', false, 2, 'requester_area'
  WHERE NOT EXISTS (
    SELECT 1 FROM process_questionnaire_questions
    WHERE questionnaire_id = template_id AND demand_field_key = 'requester_area'
  );

  INSERT INTO process_questionnaire_questions (
    questionnaire_id,
    section_id,
    prompt,
    helper_text,
    question_type,
    is_required,
    sort_order,
    demand_field_key
  )
  SELECT template_id, demand_section_id, 'Título da demanda', NULL, 'short_text', true, 0, 'demand_title'
  WHERE NOT EXISTS (
    SELECT 1 FROM process_questionnaire_questions
    WHERE questionnaire_id = template_id AND demand_field_key = 'demand_title'
  );

  INSERT INTO process_questionnaire_questions (
    questionnaire_id,
    section_id,
    prompt,
    helper_text,
    question_type,
    is_required,
    sort_order,
    demand_field_key
  )
  SELECT template_id, demand_section_id, 'Descrição/resumo', NULL, 'long_text', false, 1, 'demand_description'
  WHERE NOT EXISTS (
    SELECT 1 FROM process_questionnaire_questions
    WHERE questionnaire_id = template_id AND demand_field_key = 'demand_description'
  );

  INSERT INTO process_questionnaire_questions (
    questionnaire_id,
    section_id,
    prompt,
    helper_text,
    question_type,
    is_required,
    sort_order,
    demand_field_key
  )
  SELECT template_id, demand_section_id, 'Prioridade', NULL, 'single_select', false, 2, 'priority'
  WHERE NOT EXISTS (
    SELECT 1 FROM process_questionnaire_questions
    WHERE questionnaire_id = template_id AND demand_field_key = 'priority'
  );

  SELECT id INTO priority_question_id
  FROM process_questionnaire_questions
  WHERE questionnaire_id = template_id
    AND demand_field_key = 'priority'
  LIMIT 1;

  INSERT INTO process_questionnaire_options (question_id, label, value, sort_order, is_active)
  SELECT priority_question_id, label, value, sort_order, true
  FROM (
    VALUES
      ('Baixa', 'low', 0),
      ('Média', 'medium', 1),
      ('Alta', 'high', 2),
      ('Urgente', 'urgent', 3)
  ) AS options(label, value, sort_order)
  WHERE priority_question_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM process_questionnaire_options
      WHERE question_id = priority_question_id
        AND value = options.value
    );
END $$;

DO $$
DECLARE
  office_form RECORD;
  identification_section_id UUID;
  demand_section_id UUID;
  priority_question_id UUID;
BEGIN
  FOR office_form IN
    SELECT id
    FROM office_demand_forms
  LOOP
    INSERT INTO office_demand_form_sections (
      office_demand_form_id,
      title,
      subtitle,
      description,
      sort_order
    )
    SELECT
      office_form.id,
      'Identificação',
      NULL,
      'Informe seus dados para que o escritório possa retornar sobre a solicitação.',
      0
    WHERE NOT EXISTS (
      SELECT 1
      FROM office_demand_form_sections
      WHERE office_demand_form_id = office_form.id
        AND title = 'Identificação'
    )
    RETURNING id INTO identification_section_id;

    IF identification_section_id IS NULL THEN
      SELECT id INTO identification_section_id
      FROM office_demand_form_sections
      WHERE office_demand_form_id = office_form.id
        AND title = 'Identificação'
      ORDER BY sort_order, created_at
      LIMIT 1;
    END IF;

    INSERT INTO office_demand_form_sections (
      office_demand_form_id,
      title,
      subtitle,
      description,
      sort_order
    )
    SELECT
      office_form.id,
      'Demanda',
      NULL,
      'Resuma a necessidade que deve ser avaliada pelo escritório.',
      1
    WHERE NOT EXISTS (
      SELECT 1
      FROM office_demand_form_sections
      WHERE office_demand_form_id = office_form.id
        AND title = 'Demanda'
    )
    RETURNING id INTO demand_section_id;

    IF demand_section_id IS NULL THEN
      SELECT id INTO demand_section_id
      FROM office_demand_form_sections
      WHERE office_demand_form_id = office_form.id
        AND title = 'Demanda'
      ORDER BY sort_order, created_at
      LIMIT 1;
    END IF;

    INSERT INTO office_demand_form_questions (
      office_demand_form_id,
      section_id,
      prompt,
      helper_text,
      question_type,
      is_required,
      sort_order,
      demand_field_key
    )
    SELECT office_form.id, identification_section_id, 'Nome', NULL, 'short_text', true, 0, 'requester_name'
    WHERE NOT EXISTS (
      SELECT 1 FROM office_demand_form_questions
      WHERE office_demand_form_id = office_form.id AND demand_field_key = 'requester_name'
    );

    INSERT INTO office_demand_form_questions (
      office_demand_form_id,
      section_id,
      prompt,
      helper_text,
      question_type,
      is_required,
      sort_order,
      demand_field_key
    )
    SELECT office_form.id, identification_section_id, 'E-mail', NULL, 'short_text', true, 1, 'requester_email'
    WHERE NOT EXISTS (
      SELECT 1 FROM office_demand_form_questions
      WHERE office_demand_form_id = office_form.id AND demand_field_key = 'requester_email'
    );

    INSERT INTO office_demand_form_questions (
      office_demand_form_id,
      section_id,
      prompt,
      helper_text,
      question_type,
      is_required,
      sort_order,
      demand_field_key
    )
    SELECT office_form.id, identification_section_id, 'Área/departamento', NULL, 'short_text', false, 2, 'requester_area'
    WHERE NOT EXISTS (
      SELECT 1 FROM office_demand_form_questions
      WHERE office_demand_form_id = office_form.id AND demand_field_key = 'requester_area'
    );

    INSERT INTO office_demand_form_questions (
      office_demand_form_id,
      section_id,
      prompt,
      helper_text,
      question_type,
      is_required,
      sort_order,
      demand_field_key
    )
    SELECT office_form.id, demand_section_id, 'Título da demanda', NULL, 'short_text', true, 0, 'demand_title'
    WHERE NOT EXISTS (
      SELECT 1 FROM office_demand_form_questions
      WHERE office_demand_form_id = office_form.id AND demand_field_key = 'demand_title'
    );

    INSERT INTO office_demand_form_questions (
      office_demand_form_id,
      section_id,
      prompt,
      helper_text,
      question_type,
      is_required,
      sort_order,
      demand_field_key
    )
    SELECT office_form.id, demand_section_id, 'Descrição/resumo', NULL, 'long_text', false, 1, 'demand_description'
    WHERE NOT EXISTS (
      SELECT 1 FROM office_demand_form_questions
      WHERE office_demand_form_id = office_form.id AND demand_field_key = 'demand_description'
    );

    INSERT INTO office_demand_form_questions (
      office_demand_form_id,
      section_id,
      prompt,
      helper_text,
      question_type,
      is_required,
      sort_order,
      demand_field_key
    )
    SELECT office_form.id, demand_section_id, 'Prioridade', NULL, 'single_select', false, 2, 'priority'
    WHERE NOT EXISTS (
      SELECT 1 FROM office_demand_form_questions
      WHERE office_demand_form_id = office_form.id AND demand_field_key = 'priority'
    );

    SELECT id INTO priority_question_id
    FROM office_demand_form_questions
    WHERE office_demand_form_id = office_form.id
      AND demand_field_key = 'priority'
    LIMIT 1;

    INSERT INTO office_demand_form_options (question_id, label, value, sort_order, is_active)
    SELECT priority_question_id, label, value, sort_order, true
    FROM (
      VALUES
        ('Baixa', 'low', 0),
        ('Média', 'medium', 1),
        ('Alta', 'high', 2),
        ('Urgente', 'urgent', 3)
    ) AS options(label, value, sort_order)
    WHERE priority_question_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM office_demand_form_options
        WHERE question_id = priority_question_id
          AND value = options.value
      );
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
