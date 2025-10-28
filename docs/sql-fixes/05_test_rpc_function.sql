SELECT * FROM start_transition_profile(
  (now() at time zone 'utc')::date + 90,
  true
);
