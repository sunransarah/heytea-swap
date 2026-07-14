-- Stop hard-deleting expired listings. They're now kept in the database (hidden from
-- browsing/matching client-side via expires_at) and only removed when the owner
-- explicitly deletes them via the app's "offline" action.

do $$
begin
  perform cron.unschedule('delete-expired-listings');
exception when others then
  null;
end $$;
