-- Create events storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view event images
CREATE POLICY "Event images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'events');

-- Allow authenticated users to upload event images
CREATE POLICY "Users can upload event images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'events');

-- Allow users to update their own event images
CREATE POLICY "Users can update event images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'events');

-- Allow users to delete their own event images
CREATE POLICY "Users can delete event images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'events');