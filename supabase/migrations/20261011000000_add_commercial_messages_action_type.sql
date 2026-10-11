/*
 * Allow AI-assisted actions to produce three commercial messages.
 * Existing action types and all RLS policies remain unchanged.
 */

alter table public.weekly_actions
drop constraint if exists weekly_actions_action_type_check;

alter table public.weekly_actions
add constraint weekly_actions_action_type_check
check (
  action_type in (
    'generic',
    'value_proposition',
    'commercial_messages'
  )
);