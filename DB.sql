CREATE TABLE Users (
    name TEXT NOT NULL,
    id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    phonenumber TEXT NOT NULL,
    whether TEXT NOT NULL CHECK(whether IN ('p', 's'))
);