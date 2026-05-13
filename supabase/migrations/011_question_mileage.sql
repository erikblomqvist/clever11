-- Add mileage column to questions
alter table public.questions add column mileage integer not null default 0;

-- Function to increment question mileage
create or replace function public.increment_question_mileage()
returns trigger
language plpgsql security definer
as $$
begin
    if new.question_id is not null then
        update public.questions
        set mileage = mileage + 1
        where id = new.question_id;
    end if;
    return new;
end;
$$;

-- Trigger to increment mileage when a round is created
create trigger on_game_round_created
    after insert on public.game_rounds
    for each row execute function public.increment_question_mileage();
