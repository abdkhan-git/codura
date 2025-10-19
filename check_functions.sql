SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('search_users', 'get_connection_status', 'get_mutual_connections_count');
