-- Add guest_count and title columns to event_rsvps table
ALTER TABLE event_rsvps
ADD COLUMN IF NOT EXISTS guest_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS event_title text;

-- Add check constraint to ensure guest_count is not negative
ALTER TABLE event_rsvps
ADD CONSTRAINT guest_count_check CHECK (guest_count::integer >= 0);

-- Update existing rows to have the event title
UPDATE event_rsvps er
SET event_title = e.title
FROM events e
WHERE er.event_id = e.id;

-- Make event_title NOT NULL after populating existing rows
ALTER TABLE event_rsvps
ALTER COLUMN event_title SET NOT NULL;

-- Add trigger to automatically set event title from events table
CREATE OR REPLACE FUNCTION set_event_title()
RETURNS TRIGGER AS $$
DECLARE
  event_title text;
BEGIN
  SELECT title INTO event_title
  FROM events
  WHERE id = NEW.event_id;
  
  IF event_title IS NOT NULL THEN
    NEW.event_title := event_title;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_event_title_trigger ON event_rsvps;

-- Create new trigger
CREATE TRIGGER set_event_title_trigger
  BEFORE INSERT ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION set_event_title();