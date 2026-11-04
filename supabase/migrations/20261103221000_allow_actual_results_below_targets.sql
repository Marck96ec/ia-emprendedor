/*
 * Una meta describe lo que se quería probar; no debe convertirse en una
 * cantidad mínima de resultados reales. Los repeatable_group pueden quedar
 * vacíos y, cuando tengan datos, solo respetan su límite máximo.
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
      or (value_length = 0 and field_type <> 'repeatable_group')
    then
      if (capture_field->>'required')::boolean
        and field_type <> 'repeatable_group'
      then
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
