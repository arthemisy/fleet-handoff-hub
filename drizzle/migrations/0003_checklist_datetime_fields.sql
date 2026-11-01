ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS checked_date date;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS checked_time time;
CREATE INDEX IF NOT EXISTS checklists_checked_date_idx ON public.checklists (checked_date DESC);
COMMENT ON COLUMN public.checklists.checked_at IS 'DEPRECATED: data/hora em texto livre de registros antigos; a conferência agora usa checked_date e checked_time';