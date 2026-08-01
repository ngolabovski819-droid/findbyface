CREATE TABLE IF NOT EXISTS sponsor_clicks_rocketreynaxo_fbf (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent TEXT,
  referrer TEXT,
  placement TEXT
);

COMMENT ON TABLE sponsor_clicks_rocketreynaxo_fbf IS
  'FindByFace sponsored-placement click events for Rocket Reyna.';
