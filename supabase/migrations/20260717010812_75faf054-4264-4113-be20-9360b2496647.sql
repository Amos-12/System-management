
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_database_size() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_data() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_sales_totals(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_expenses_totals(date, date, uuid) FROM PUBLIC, anon;
