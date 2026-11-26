-- The shared resource: one row everybody competes for.
CREATE TABLE game (
    id           int         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    round        int         NOT NULL,
    mode         text        NOT NULL,
    prizes_total int         NOT NULL,
    prizes_left  int         NOT NULL,
    delay_ms     int         NOT NULL,
    started_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO game (round, mode, prizes_total, prizes_left, delay_ms)
VALUES (1, 'naive', 5, 5, 200);

-- Every prize handed out. More rows than prizes_total in a round means oversold.
CREATE TABLE winners (
    id        bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    round     int         NOT NULL,
    user_name text        NOT NULL,
    mode      text        NOT NULL,
    instance  text        NOT NULL,
    won_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX winners_round_idx ON winners (round);

-- One attempt per user and round; used by the atomic strategy.
CREATE TABLE attempts (
    round      int         NOT NULL,
    user_name  text        NOT NULL,
    status     text        NOT NULL CHECK (status IN ('pending', 'won', 'sold_out')),
    claim_id   text,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (round, user_name)
);

CREATE VIEW game_state AS
SELECT g.round, g.mode, g.prizes_total, g.prizes_left, g.delay_ms,
       (SELECT count(*) FROM winners w WHERE w.round = g.round)::int AS winners
FROM game g;
