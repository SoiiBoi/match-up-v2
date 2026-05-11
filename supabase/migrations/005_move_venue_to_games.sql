-- Move venue from matches to games — all 6 matches share the same venue, no need to repeat it
ALTER TABLE public.games ADD COLUMN venue TEXT NOT NULL DEFAULT 'Football Arena Bangkok';

UPDATE public.games g
SET venue = m.venue
FROM public.matches m
WHERE m.game_id = g.id
  AND m.game_id IS NOT NULL;

ALTER TABLE public.matches DROP COLUMN venue;
