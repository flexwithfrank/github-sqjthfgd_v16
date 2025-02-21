/*
  # Add event notifications trigger

  1. Create trigger function to create notifications when events are created
  2. Add trigger to events table
*/

-- Create function to handle event notifications
CREATE OR REPLACE FUNCTION handle_event_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get trainer's display name
  PERFORM create_notification(
    user_id,
    'event',
    'New Event: ' || NEW.title,
    'Join ' || (SELECT display_name FROM profiles WHERE id = NEW.created_by) || 
    ' for ' || NEW.title || ' on ' || to_char(NEW.start_date, 'Mon DD'),
    jsonb_build_object(
      'event_id', NEW.id,
      'trainer_id', NEW.created_by,
      'start_date', NEW.start_date,
      'location', NEW.location
    )
  )
  FROM profiles
  WHERE role IN ('member', 'trainer')
  AND id != NEW.created_by;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new events
DROP TRIGGER IF EXISTS event_notification_trigger ON events;
CREATE TRIGGER event_notification_trigger
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION handle_event_notification();