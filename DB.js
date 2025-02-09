var sqlite3 = require('sqlite3').verbose();

var db = new sqlite3.Database('./DB.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database.');
    }
});

module.exports = db;