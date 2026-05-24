insert into public.plan_limits (
  plan,
  max_blocks,
  max_apartments_per_block,
  max_total_apartments,
  max_admins,
  max_syndics,
  max_doormen,
  max_common_areas,
  max_bookings_per_month,
  max_tickets_per_month,
  max_announcements_per_month,
  max_packages_per_month,
  max_storage_mb,
  ads_enabled,
  brand_required,
  advanced_permissions,
  reports_enabled,
  exports_enabled
)
values
  ('free', 2, 12, 24, 1, 1, 0, 2, 20, 30, 20, 10, 30, true, true, false, false, false),
  ('premium', 4, 20, 80, 2, 2, 1, 5, 150, 250, 150, 250, 500, false, false, true, false, false),
  ('pro', 8, 30, 240, 6, 6, 3, 15, 800, 1500, 800, 1500, 3000, false, false, true, true, true),
  ('total', 20, 50, 1000, 20, 20, 10, 100, 5000, 10000, 5000, 10000, 20000, false, false, true, true, true)
on conflict (plan) do update
set
  max_blocks = excluded.max_blocks,
  max_apartments_per_block = excluded.max_apartments_per_block,
  max_total_apartments = excluded.max_total_apartments,
  max_admins = excluded.max_admins,
  max_syndics = excluded.max_syndics,
  max_doormen = excluded.max_doormen,
  max_common_areas = excluded.max_common_areas,
  max_bookings_per_month = excluded.max_bookings_per_month,
  max_tickets_per_month = excluded.max_tickets_per_month,
  max_announcements_per_month = excluded.max_announcements_per_month,
  max_packages_per_month = excluded.max_packages_per_month,
  max_storage_mb = excluded.max_storage_mb,
  ads_enabled = excluded.ads_enabled,
  brand_required = excluded.brand_required,
  advanced_permissions = excluded.advanced_permissions,
  reports_enabled = excluded.reports_enabled,
  exports_enabled = excluded.exports_enabled;
