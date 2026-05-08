alter table public.game_players
  drop constraint game_players_status_check,
  add constraint game_players_status_check
    check (status in ('active', 'passed', 'out', 'removed'));
