const sqlite3 = require("sqlite3").verbose();

function deleteExpiredAccounts() {
    const db = new sqlite3.Database("./DB.db");
    const weekAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    db.run(
        "DELETE FROM Users WHERE bigo IS NOT NULL AND bigo != '' AND datetime(bigo) < datetime(?)",
        [weekAgo],
        (err) => {
            if (err) {
                console.error("Failed to delete expired accounts:", err);
            } else {
                console.log("Expired accounts deleted successfully.");
            }
        }
    );    
    db.close();
}

// 스크립트를 실행했을 때만 함수 실행
if (require.main === module) {
    deleteExpiredAccounts();
}

module.exports = deleteExpiredAccounts;
