/*
 * Endurece el registro de evidencias de weekly_actions.
 *
 * 1. weekly_actions deja de aceptar INSERT, UPDATE o DELETE desde PostgREST.
 *    Supabase concede privilegios por defecto a anon/authenticated, así que se
 *    revocan todos y solo se devuelve SELECT a authenticated (RLS sigue activo).
 *    Las escrituras legítimas pasan por funciones security definer:
 *    complete_ceo_plan, fail_ceo_plan, approve_action_result y
 *    complete_weekly_action_with_evidence.
 * 2. complete_weekly_action_with_evidence valida la evidencia contra
 *    capture_schema (o el esquema genérico para acciones heredadas), exige
 *    entregable aprobado en acciones con IA y es idempotente solo ante un
 *    reenvío idéntico: nunca sobrescribe la primera evidencia.
 *
 * Las reglas replican validateActionCompletion y ActionCaptureSchema
 * (src/lib/action-capture.ts). tests/fixtures/action-completion-cases.json
 * verifica que ambos validadores coincidan.
 */

create or replace function public.action_capture_generic_schema()
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select '{
    "version": 1,
    "capture_type": "generic_action_result",
    "title": "Registra el resultado de esta acción",
    "fields": [
      { "id": "result", "type": "textarea", "label": "¿Qué ocurrió al realizar esta acción?", "required": true },
      { "id": "learning", "type": "textarea", "label": "¿Qué aprendiste?", "required": true }
    ],
    "completion_rule": { "type": "all_required_fields_valid" }
  }'::jsonb
$$;

create or replace function public.is_json_integer(p_value jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when jsonb_typeof(p_value) = 'number' then p_value::numeric = trunc(p_value::numeric)
    else false
  end
$$;

-- CASE garantiza el orden de evaluación: nunca mide un valor que no es arreglo.
create or replace function public.json_array_length_or_null(p_value jsonb)
returns integer
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case when jsonb_typeof(p_value) = 'array' then jsonb_array_length(p_value) end
$$;

create or replace function public.json_number_or_null(p_value jsonb)
returns numeric
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case when jsonb_typeof(p_value) = 'number' then p_value::numeric end
$$;

create or replace function public.is_valid_action_capture_field(
  p_field jsonb,
  p_depth integer
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  field_type text;
  option_item jsonb;
  option_values text[] := '{}';
  child_field jsonb;
  child_ids text[] := '{}';
begin
  if jsonb_typeof(p_field) is distinct from 'object'
    or jsonb_typeof(p_field->'id') is distinct from 'string'
    or (p_field->>'id') !~ '^[a-z][a-z0-9_]*$'
    or jsonb_typeof(p_field->'label') is distinct from 'string'
    or btrim(p_field->>'label') = ''
    or (p_field ? 'description' and jsonb_typeof(p_field->'description') is distinct from 'string')
    or jsonb_typeof(p_field->'required') is distinct from 'boolean'
    or jsonb_typeof(p_field->'type') is distinct from 'string'
  then
    return false;
  end if;

  field_type := p_field->>'type';

  if field_type in ('text', 'textarea') then
    return not (
      (p_field ? 'placeholder' and jsonb_typeof(p_field->'placeholder') is distinct from 'string')
      or (p_field ? 'max_length' and not (
        public.is_json_integer(p_field->'max_length')
        and coalesce(public.json_number_or_null(p_field->'max_length') > 0, false)
      ))
    );
  end if;

  if field_type = 'number' then
    if (p_field ? 'min' and jsonb_typeof(p_field->'min') is distinct from 'number')
      or (p_field ? 'max' and jsonb_typeof(p_field->'max') is distinct from 'number')
    then
      return false;
    end if;
    return coalesce(
      public.json_number_or_null(p_field->'min') <= public.json_number_or_null(p_field->'max'),
      true
    );
  end if;

  if field_type in ('single_select', 'multi_select') then
    if coalesce(public.json_array_length_or_null(p_field->'options') not between 1 and 12, true) then
      return false;
    end if;

    for option_item in select item from jsonb_array_elements(p_field->'options') as t(item) loop
      if jsonb_typeof(option_item) is distinct from 'object'
        or jsonb_typeof(option_item->'value') is distinct from 'string'
        or btrim(option_item->>'value') = ''
        or jsonb_typeof(option_item->'label') is distinct from 'string'
        or btrim(option_item->>'label') = ''
        or btrim(option_item->>'value') = any(option_values)
      then
        return false;
      end if;
      option_values := option_values || btrim(option_item->>'value');
    end loop;

    if field_type = 'single_select' then
      return true;
    end if;
  end if;

  if field_type not in ('multi_select', 'repeatable_group') then
    return false;
  end if;

  if (p_field ? 'min_items' and not (
      public.is_json_integer(p_field->'min_items')
      and coalesce(public.json_number_or_null(p_field->'min_items') between 0 and 10, false)
    ))
    or (p_field ? 'max_items' and not (
      public.is_json_integer(p_field->'max_items')
      and coalesce(public.json_number_or_null(p_field->'max_items') between 0 and 10, false)
    ))
    or coalesce(
      public.json_number_or_null(p_field->'min_items') > public.json_number_or_null(p_field->'max_items'),
      false
    )
  then
    return false;
  end if;

  if field_type = 'multi_select' then
    return true;
  end if;

  -- repeatable_group: solo en el primer nivel y con hijos que no sean grupos.
  if p_depth > 0
    or coalesce(public.json_array_length_or_null(p_field->'fields') not between 1 and 8, true)
  then
    return false;
  end if;

  for child_field in select item from jsonb_array_elements(p_field->'fields') as t(item) loop
    if not public.is_valid_action_capture_field(child_field, p_depth + 1)
      or (child_field->>'id') = any(child_ids)
    then
      return false;
    end if;
    child_ids := child_ids || (child_field->>'id');
  end loop;

  return true;
end;
$$;

create or replace function public.is_valid_action_capture_schema(p_schema jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  capture_field jsonb;
  field_ids text[] := '{}';
begin
  if jsonb_typeof(p_schema) is distinct from 'object'
    or p_schema->'version' is distinct from '1'::jsonb
    or jsonb_typeof(p_schema->'capture_type') is distinct from 'string'
    or (p_schema->>'capture_type') !~ '^[a-z0-9]+(_[a-z0-9]+)*$'
    or jsonb_typeof(p_schema->'title') is distinct from 'string'
    or btrim(p_schema->>'title') = ''
    or (p_schema ? 'description' and jsonb_typeof(p_schema->'description') is distinct from 'string')
    or jsonb_typeof(p_schema->'completion_rule') is distinct from 'object'
    or p_schema->'completion_rule'->>'type' is distinct from 'all_required_fields_valid'
    or coalesce(public.json_array_length_or_null(p_schema->'fields') not between 1 and 10, true)
  then
    return false;
  end if;

  for capture_field in select item from jsonb_array_elements(p_schema->'fields') as t(item) loop
    if not public.is_valid_action_capture_field(capture_field, 0)
      or (capture_field->>'id') = any(field_ids)
    then
      return false;
    end if;
    field_ids := field_ids || (capture_field->>'id');
  end loop;

  return true;
end;
$$;

/*
 * Devuelve los problemas de un registro como [{path, message}].
 * Supone un esquema ya validado por is_valid_action_capture_schema.
 */
create or replace function public.validate_action_capture_record(
  p_fields jsonb,
  p_record jsonb,
  p_prefix text
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  issues jsonb := '[]'::jsonb;
  capture_field jsonb;
  field_id text;
  field_type text;
  field_path text;
  field_value jsonb;
  value_type text;
  value_length integer;
  text_limit numeric;
  group_item jsonb;
  item_ordinal bigint;
  record_key text;
  known_ids text[];
begin
  select coalesce(array_agg(item->>'id'), '{}')
    into known_ids
  from jsonb_array_elements(p_fields) as t(item);

  for capture_field in select item from jsonb_array_elements(p_fields) as t(item) loop
    field_id := capture_field->>'id';
    field_type := capture_field->>'type';
    field_path := case when p_prefix = '' then field_id else p_prefix || '.' || field_id end;
    field_value := p_record->field_id;
    value_type := jsonb_typeof(field_value);

    value_length := public.json_array_length_or_null(field_value);

    if field_value is null
      or value_type = 'null'
      or (value_type = 'string' and (field_value #>> '{}') ~ E'^[ \t\n\r\f\v]*$')
      or value_length = 0
    then
      if (capture_field->>'required')::boolean then
        issues := issues || jsonb_build_array(jsonb_build_object(
          'path', field_path, 'message', 'Este campo es obligatorio'));
      end if;
      continue;
    end if;

    if field_type in ('text', 'textarea') then
      text_limit := coalesce(
        public.json_number_or_null(capture_field->'max_length'),
        case when field_type = 'text' then 500 else 2000 end
      );
      if value_type <> 'string' or char_length(field_value #>> '{}') > text_limit then
        issues := issues || jsonb_build_array(jsonb_build_object(
          'path', field_path, 'message', 'El texto no tiene un formato válido o supera el límite'));
      end if;

    elsif field_type = 'number' then
      if value_type <> 'number'
        or coalesce(public.json_number_or_null(field_value) < public.json_number_or_null(capture_field->'min'), false)
        or coalesce(public.json_number_or_null(field_value) > public.json_number_or_null(capture_field->'max'), false)
      then
        issues := issues || jsonb_build_array(jsonb_build_object(
          'path', field_path, 'message', 'El número está fuera del rango permitido'));
      end if;

    elsif field_type = 'single_select' then
      if value_type <> 'string'
        or not exists (
          select 1 from jsonb_array_elements(capture_field->'options') as o(item)
          where o.item->>'value' = field_value #>> '{}'
        )
      then
        issues := issues || jsonb_build_array(jsonb_build_object(
          'path', field_path, 'message', 'Selecciona una opción válida'));
      end if;

    elsif field_type = 'multi_select' then
      if value_type <> 'array'
        or coalesce(value_length < public.json_number_or_null(capture_field->'min_items'), false)
        or coalesce(value_length > public.json_number_or_null(capture_field->'max_items'), false)
        or exists (
          select 1 from jsonb_array_elements(case when value_type = 'array' then field_value else '[]'::jsonb end) as e(item)
          where jsonb_typeof(e.item) <> 'string'
            or not exists (
              select 1 from jsonb_array_elements(capture_field->'options') as o(item)
              where o.item->>'value' = e.item #>> '{}'
            )
        )
        or (
          select count(distinct e.item)
          from jsonb_array_elements(case when value_type = 'array' then field_value else '[]'::jsonb end) as e(item)
        ) <> coalesce(value_length, 0)
      then
        issues := issues || jsonb_build_array(jsonb_build_object(
          'path', field_path, 'message', 'Selecciona una cantidad válida de opciones'));
      end if;

    elsif field_type = 'repeatable_group' then
      if value_type <> 'array'
        or coalesce(value_length < public.json_number_or_null(capture_field->'min_items'), false)
        or coalesce(value_length > public.json_number_or_null(capture_field->'max_items'), false)
      then
        issues := issues || jsonb_build_array(jsonb_build_object(
          'path', field_path, 'message', 'Agrega una cantidad válida de elementos'));
      else
        for group_item, item_ordinal in
          select e.item, e.ordinal from jsonb_array_elements(field_value) with ordinality as e(item, ordinal)
        loop
          if jsonb_typeof(group_item) <> 'object' then
            issues := issues || jsonb_build_array(jsonb_build_object(
              'path', field_path || '.' || (item_ordinal - 1), 'message', 'El elemento no tiene un formato válido'));
          else
            issues := issues || public.validate_action_capture_record(
              capture_field->'fields', group_item, field_path || '.' || (item_ordinal - 1));
          end if;
        end loop;
      end if;
    end if;
  end loop;

  for record_key in select jsonb_object_keys(p_record) loop
    if not (record_key = any(known_ids)) then
      issues := issues || jsonb_build_array(jsonb_build_object(
        'path', case when p_prefix = '' then record_key else p_prefix || '.' || record_key end,
        'message', 'Este campo no forma parte de la evidencia solicitada'));
    end if;
  end loop;

  return issues;
end;
$$;

create or replace function public.validate_action_completion_data(
  p_schema jsonb,
  p_data jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
begin
  if not public.is_valid_action_capture_schema(p_schema) then
    return jsonb_build_array(jsonb_build_object('path', '', 'message', 'El esquema de evidencia no es válido'));
  end if;

  if jsonb_typeof(p_data) is distinct from 'object' then
    return jsonb_build_array(jsonb_build_object('path', '', 'message', 'El resultado debe ser un objeto'));
  end if;

  -- Mismo límite que MAX_COMPLETION_DATA_BYTES en src/lib/action-capture.ts.
  if octet_length(p_data::text) > 262144 then
    return jsonb_build_array(jsonb_build_object('path', '', 'message', 'El resultado supera el tamaño permitido'));
  end if;

  return public.validate_action_capture_record(p_schema->'fields', p_data, '');
end;
$$;

create or replace function public.complete_weekly_action_with_evidence(
  p_action_id uuid,
  p_completion_data jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := (select auth.uid());
  action_row public.weekly_actions%rowtype;
  plan_owner_id uuid;
  plan_status text;
  effective_schema jsonb;
  issues jsonb;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required',
      hint = 'AUTHENTICATION_REQUIRED';
  end if;

  if jsonb_typeof(p_completion_data) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Completion data must be an object',
      detail = '[{"path":"","message":"El resultado debe ser un objeto"}]',
      hint = 'COMPLETION_DATA_INVALID';
  end if;

  select wa.*
    into action_row
  from public.weekly_actions wa
  where wa.id = p_action_id
  for update;

  /*
   * Bloquear el plan serializa este registro con el INSERT de weekly_reviews
   * (su FK toma FOR KEY SHARE sobre ceo_plans), así una semana no se cierra
   * entre la comprobación y la escritura.
   */
  select b.owner_id, cp.status
    into plan_owner_id, plan_status
  from public.ceo_plans cp
  join public.businesses b on b.id = cp.business_id
  where cp.id = action_row.ceo_plan_id
  for update of cp;

  if action_row.id is null or plan_owner_id is distinct from current_user_id then
    raise exception using errcode = '42501', message = 'Action does not belong to the current user',
      hint = 'ACTION_NOT_FOUND';
  end if;

  if action_row.status = 'completed' then
    if action_row.completion_data is not distinct from p_completion_data then
      return action_row.id;
    end if;
    raise exception using errcode = 'P0001', message = 'Weekly action already has recorded evidence',
      hint = 'ACTION_ALREADY_COMPLETED';
  end if;

  if exists (
    select 1 from public.weekly_reviews wr
    where wr.ceo_plan_id = action_row.ceo_plan_id
  ) then
    raise exception using errcode = 'P0001', message = 'The weekly plan is already closed',
      hint = 'WEEKLY_PLAN_CLOSED';
  end if;

  if plan_status is distinct from 'ready' then
    raise exception using errcode = 'P0001', message = 'The CEO plan is not ready',
      hint = 'PLAN_NOT_READY';
  end if;

  if action_row.execution_mode = 'ai_assisted' and not exists (
    select 1 from public.action_results ar
    where ar.weekly_action_id = action_row.id
      and ar.status = 'approved'
  ) then
    raise exception using errcode = 'P0001', message = 'The AI deliverable must be approved first',
      hint = 'DELIVERABLE_NOT_APPROVED';
  end if;

  effective_schema := coalesce(action_row.capture_schema, public.action_capture_generic_schema());

  if not public.is_valid_action_capture_schema(effective_schema) then
    raise exception using errcode = '22023', message = 'Stored capture schema is invalid',
      hint = 'CAPTURE_SCHEMA_INVALID';
  end if;

  issues := public.validate_action_completion_data(effective_schema, p_completion_data);

  if jsonb_array_length(issues) > 0 then
    raise exception using errcode = '22023', message = 'Completion data does not satisfy the capture schema',
      detail = issues::text,
      hint = 'COMPLETION_DATA_INVALID';
  end if;

  update public.weekly_actions
  set status = 'completed',
      completion_data = p_completion_data,
      completed_at = clock_timestamp()
  where id = action_row.id
    and status = 'pending';

  if not found then
    raise exception using errcode = 'P0001', message = 'Weekly action is not pending',
      hint = 'ACTION_ALREADY_COMPLETED';
  end if;

  return action_row.id;
end;
$$;

-- Los validadores son internos: solo los usan funciones de confianza.
revoke all on function public.action_capture_generic_schema() from public, anon, authenticated;
revoke all on function public.is_json_integer(jsonb) from public, anon, authenticated;
revoke all on function public.json_array_length_or_null(jsonb) from public, anon, authenticated;
revoke all on function public.json_number_or_null(jsonb) from public, anon, authenticated;
revoke all on function public.is_valid_action_capture_field(jsonb, integer) from public, anon, authenticated;
revoke all on function public.is_valid_action_capture_schema(jsonb) from public, anon, authenticated;
revoke all on function public.validate_action_capture_record(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public.validate_action_completion_data(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.action_capture_generic_schema() to service_role;
grant execute on function public.is_json_integer(jsonb) to service_role;
grant execute on function public.json_array_length_or_null(jsonb) to service_role;
grant execute on function public.json_number_or_null(jsonb) to service_role;
grant execute on function public.is_valid_action_capture_field(jsonb, integer) to service_role;
grant execute on function public.is_valid_action_capture_schema(jsonb) to service_role;
grant execute on function public.validate_action_capture_record(jsonb, jsonb, text) to service_role;
grant execute on function public.validate_action_completion_data(jsonb, jsonb) to service_role;

revoke all on function public.complete_weekly_action_with_evidence(uuid, jsonb) from public, anon, service_role;
grant execute on function public.complete_weekly_action_with_evidence(uuid, jsonb) to authenticated;

/*
 * Sin políticas de escritura, RLS sigue denegando INSERT/UPDATE aunque en el
 * futuro se volviera a conceder el privilegio por error.
 */
drop policy if exists "Users can create their own weekly actions" on public.weekly_actions;
drop policy if exists "Users can update their own open weekly actions" on public.weekly_actions;

revoke all on table public.weekly_actions from public, anon, authenticated;
grant select on table public.weekly_actions to authenticated;
