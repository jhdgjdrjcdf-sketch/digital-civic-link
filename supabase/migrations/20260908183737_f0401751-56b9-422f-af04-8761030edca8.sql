revoke execute on function public.set_updated_at() from anon, authenticated, public;
revoke execute on function public.audit_trigger() from anon, authenticated, public;
revoke execute on function public.write_audit(text,text,text) from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.validate_event() from anon, authenticated, public;
revoke execute on function public.has_role(uuid, public.app_role) from anon, authenticated, public;
revoke execute on function public.can_manage(uuid, public.app_role) from anon, authenticated, public;

revoke execute on function public.bootstrap_super_admin() from anon, public;
revoke execute on function public.grant_role(uuid, public.app_role) from anon, public;
revoke execute on function public.revoke_role(uuid, public.app_role) from anon, public;
revoke execute on function public.list_members() from anon, public;
revoke execute on function public.react_to_discussion(uuid, public.reaction_kind) from anon, public;
revoke execute on function public.cast_vote(uuid, uuid) from anon, public;

grant execute on function public.bootstrap_super_admin() to authenticated;
grant execute on function public.grant_role(uuid, public.app_role) to authenticated;
grant execute on function public.revoke_role(uuid, public.app_role) to authenticated;
grant execute on function public.list_members() to authenticated;
grant execute on function public.react_to_discussion(uuid, public.reaction_kind) to authenticated;
grant execute on function public.cast_vote(uuid, uuid) to authenticated;
grant execute on function public.poll_results(uuid) to anon, authenticated;
grant execute on function public.discussion_stats(uuid) to anon, authenticated;