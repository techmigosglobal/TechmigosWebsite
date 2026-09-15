-- Folder uploads can contain mixed documents, images, and browser-identified
-- file types. Keep the bucket private and retain the existing 50 MB per-file
-- limit, but do not reject a valid file only because its MIME type is uncommon.
update storage.buckets
set allowed_mime_types = null,
    file_size_limit = 52428800,
    public = false
where id = 'project-files';
