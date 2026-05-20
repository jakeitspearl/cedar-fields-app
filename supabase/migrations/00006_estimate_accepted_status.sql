-- Add an `accepted` value to the estimate_status enum so estimates can move
-- from `sent` → `accepted` (client has approved) before converting to a job.
-- Only `accepted` estimates show the "Convert to Job" action.

alter type estimate_status add value if not exists 'accepted';
