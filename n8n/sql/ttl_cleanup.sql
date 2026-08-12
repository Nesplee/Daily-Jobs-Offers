DELETE FROM job_listings
WHERE last_checked_at < now() - interval '20 days'
  AND is_read = false
  AND is_favorite = false;
