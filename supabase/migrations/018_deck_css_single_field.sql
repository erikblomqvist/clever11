alter table public.decks
  add column css text;

update public.decks
  set css = concat_ws(E'\n',
    case when css_unselected is not null then
      '.deck-card[data-deck-id="' || id || '"], .deck-card[data-deck-id="' || id || '"]:hover { ' || css_unselected || ' }'
    end,
    case when css_selected is not null then
      '.deck-card[data-deck-id="' || id || '"].deck-card--selected, .deck-card[data-deck-id="' || id || '"].deck-card--selected:hover { ' || css_selected || ' }'
    end
  )
  where css_unselected is not null or css_selected is not null;

alter table public.decks
  drop column css_unselected,
  drop column css_selected;
