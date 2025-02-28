var express = require("express");
var router = express.Router();
var db = require("./DB.js");
var template = require("./template.js");
var sqlite3 = require("sqlite3").verbose();
var session = require("express-session");

function generateRandomString(length) {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength),
        );
    }

    return result;
}

router.get("/create-lecture", (req, res) => {
    if (req.session.t_s === "t") {
        var html = template.HTML(
            "lecture",
            `
        <h2>강좌 생성</h2>
        <form action="/lec_create" method="post">
            <input class="login" type="text" name="lec_name" placeholder="강좌 이름">
            <label><b>출석체크 횟수</b></label>
            <br>
            <div class="radio">
                <label><input type="radio" name="at_cnt" value="1" required> 1회</label>
                <label><input type="radio" name="at_cnt" value="2" required> 2회</label>
            </div>
            <br>
            <center><input class="btn" type="submit" value="강좌 생성하기"></center>
        </form>
        `,
            "",
        );
        res.send(html);
    } else {
        res.send(
            '<script>alert("잘못된 접근입니다.");history.back();</script>',
        );
    }
});

router.post("/lec_create", (req, res) => {
    const { lec_name, at_cnt } = req.body;

    const db = new sqlite3.Database("./DB.db");
    console.log("세션에서 가져온 ID:", req.session.username);
    let l_code = generateRandomString(6);

    db.get("SELECT * FROM lecture WHERE l_code = ?", [l_code], (err, row) => {
        if (row) {
            l_code = generateRandomString(6);
        }

        db.get(
            "SELECT a_code FROM Users WHERE id = ?",
            [req.session.username],
            (err, row) => {
                if (err) {
                    console.error("에러 발생:", err);
                } else if (row) {
                    console.log("가져온 데이터:", row);
                    const myACode = row.a_code;
                    db.run(
                        "INSERT INTO lecture (lec_name, l_code, t_a_code, s_a_code, at_cnt) VALUES (?, ?, ?, ?, ?)",
                        [lec_name, l_code, myACode, "", at_cnt],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return res.send(
                                    '<script>alert("강좌 생성에 실패했습니다.");history.back();</script>',
                                );
                            }
                        },
                    );
                } else {
                    console.log("오류 발생");
                }
            },
        );
    });

    if (at_cnt == 1) {
        const query = `CREATE TABLE IF NOT EXISTS "${l_code}" (
            session TEXT,
            attend TEXT,
            late TEXT,
            absent TEXT
        );`;

        db.run(query, (err) => {
            if (err) {
                console.error("테이블 생성 중 오류:", err);
            } else {
                console.log("테이블이 성공적으로 생성됨!");
            }
            db.run(
                `INSERT INTO ${l_code} (session, attend, late, absent) VALUES (?, ?, ?, ?)`,
                [1, "", "", ""],
                (err) => {
                    if (err) {
                        console.error(err);
                        return res.send(
                            '<script>alert("데이터 삽입 실패");history.back();</script>',
                        );
                    } else {
                        console.log("데이터 삽입 성공!");
                        return res.send(
                            "<script>alert('강좌 생성 성공');location.href='/main'</script>",
                        );
                    }
                },
            );
        });
    }

    if (at_cnt == 2) {
        const query = `CREATE TABLE IF NOT EXISTS "${l_code}" (
            session TEXT,
            o_1 TEXT,
            x_1 TEXT,
            o_2 TEXT,
            x_2 TEXT
        );`;

        db.run(query, (err) => {
            if (err) {
                console.error("테이블 생성 중 오류:", err);
            } else {
                console.log("테이블이 성공적으로 생성됨!");

                // 테이블 생성 후 INSERT 실행
                db.run(
                    `INSERT INTO ${l_code} (session, o_1, x_1, o_2, x_2) VALUES (?, ?, ?, ?, ?)`,
                    [1, "", "", "", ""],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return res.send(
                                '<script>alert("데이터 삽입 실패");history.back();</script>',
                            );
                        } else {
                            console.log("데이터 삽입 성공!");
                            return res.send(
                                "<script>alert('강좌 생성 성공');location.href='/main'</script>",
                            );
                        }
                    },
                );
            }
        });
    }
});

router.get("/newsession/:lec_code", (req, res) => {
    const db = new sqlite3.Database("./DB.db");
    const l_code = req.params.lec_code;
    db.get("SELECT at_cnt FROM lecture WHERE l_code = ?", [l_code], (err, row) => {
        if (!err) {
            const at_cnt = row.at_cnt;
            db.get(`SELECT session FROM ${l_code} WHERE ROWID = (SELECT MAX(ROWID) FROM ${l_code})`, [], (err, row) => {
                if (err) {
                    return res.send(
                        "<script>alert('서버 오류입니다.');location.href='/main'</script>",
                    );
                }
                let num = parseInt(row.session, 10);
                let last = num + 1;
                if (at_cnt == 1) {
                    db.run(
                        `INSERT INTO ${l_code} (session, attend, late, absent) VALUES (?, ?, ?, ?)`,
                        [last, "/", "/", "/"],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return res.send(
                                    '<script>alert("데이터 삽입 실패");history.back();</script>',
                                );
                            } else {
                                console.log("데이터 삽입 성공!");
                                return res.send(
                                    "<script>alert('새로고침 후 반영됩니다.');history.back();</script>",
                                );
                            }
                        },
                    );
                }
            
                if (at_cnt == 2) {
                    db.run(
                        `INSERT INTO ${l_code} (session, o_1, x_1, o_2, x_2) VALUES (?, ?, ?, ?, ?)`,
                        [last, "/", "/", "/", "/"],
                        (err) => {
                            if (err) {
                                console.error(err);
                                return res.send(
                                    '<script>alert("서버 오류입니다.");history.back();</script>',
                                );
                            } else {
                                return res.send(
                                    "<script>alert('새로고침 후 반영됩니다.');history.back();</script>",
                                );
                            }
                        },
                    );
                }
            });
        }
    });
});

router.get("/enroll-lecture", (req, res) => {
    if (req.session.t_s === "s") {
        var html = template.HTML(
            "lecture",
            `
        <h2>수강 신청</h2>
        <form action="/lec_create" method="post">
            <input class="login" type="text" name="lec_name" placeholder="강좌 이름">
            <label><b>출석체크 횟수</b></label>
            <div class="radio">
                <label><input type="radio" name="at_cnt" value="1" required> 1회</label>
                <label><input type="radio" name="at_cnt" value="2" required> 2회</label>
            </div>
            <br>
            <input class="btn" type="submit" value="강좌 생성하기"></center>
        </form>
        `,
            ""
        );
        res.send(html);
    } else {
        res.send(
            '<script>alert("잘못된 접근입니다.");history.back();</script>',
        );
    }
});

router.post("/lec_enroll", (req, res) => {
    const l_code = req.body;
    const a_code = req.session.a_code
    console.log(l_code);
    db.all("SELECT * FROM lecture WHERE l_code = ?", [l_code], (err, row) => {
        console.log(row);
        if (err) {
            console.error("에러 발생:", err);
        } else if (row) {
            db.run("UPDATE lecture SET s_a_code = ? WHERE l_code = ?", [a_code, l_code], function (err) {
                if (err) {
                    console.error("에러 발생:", err);
                } else {
                    console.log("수강 신청 성공!");
                }
            });
            return res.send(
                "<script>location.href='/main';</script>",
            );
        } else {
            console.log("수강 신청 실패!");
            return res.send(
                "<script>alert('강좌 코드가 존재하지 않습니다.');location.href='/enroll-lecture';</script>",
            );
        }
    });
});

router.get("/jongkang/:lec_code", (req, res) => {
    const l_code = req.params.lec_code;
    const a_code = req.session.a_code;
    console.log(l_code);
    db.all("SELECT * FROM lecture WHERE l_code = ?", [l_code], (err, row) => {
        console.log(row);
        if (err) {
            console.error("에러 발생:", err);
        } else if (row) {
            db.run("UPDATE lecture SET end = ? WHERE l_code = ?", ["delete", l_code], function (err) {
                if (err) {
                    console.error("에러 발생:", err);
                } else {
                    console.log("수강 신청 성공!");
                }
            });
            return res.send(
                "<script>alert('종강 처리되었습니다');location.href='/main';</script>",
            );
        } else {
            console.log("수강 신청 실패!");
            return res.send(
                "<script>alert('강좌 코드가 존재하지 않습니다.');location.href='/enroll-lecture';</script>",
            );
        }
    });
});

module.exports = router;
