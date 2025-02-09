const express = require("express");
const session = require("express-session");
const signupDelete = require("./signup_delete.js");
const loginLogout = require("./login_logout.js");
const phoneauth = require("./phoneauth.js");
const template = require("./main_template.js");
const ltemplate = require("./lecture_template.js");
const lecture = require("./lecture.js");
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");
var sqlite3 = require("sqlite3").verbose();
const deleteExpiredAccounts = require("./deleteExpiredAccounts");

cron.schedule("0 0 * * *", () => {
    console.log("Running account deletion job...");
    deleteExpiredAccounts();
});

const app = express();
const port = 3000;

app.use("/static", express.static(path.join(__dirname, "static")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    session({
        secret: "${SecretKey}",
        resave: false,
        saveUninitialized: true,
    }),
);

app.use(signupDelete);
app.use(loginLogout);
app.use(phoneauth);
app.use(lecture);

app.get("/", (req, res) => {
    if (!req.session.is_logined) {
        return res.redirect("/login");
    }
    res.redirect("/main");
});

app.get("/main", (req, res) => {
    //자신이 진행중인 강좌만 나오도록 수정, 학생페이지 개발
    if (!req.session.is_logined) {
        return res.redirect("/login");
    }
    if (req.session.t_s === "t") {
        let db = new sqlite3.Database("./DB.db");
        db.get(
            `SELECT a_code FROM Users WHERE id = ?`,
            [req.session.username],
            (err, row) => {
                if (err) {
                    return console.error(err.message);
                }
                if (!row) {
                    return res
                        .status(404)
                        .send("사용자 정보를 찾을 수 없습니다.");
                }

                const aCode = row.a_code;

                // a_code에 해당하는 모든 강좌 이름 조회
                db.all(
                    `SELECT lec_name, l_code FROM lecture WHERE t_a_code = ?`,
                    [aCode],
                    (err, rows) => {
                        if (err) {
                            return console.error(err.message);
                        }

                        // 강좌 이름으로 HTML 요소 생성
                        const courseItems = rows
                            .map(
                                (row) =>
                                    `<div class="course-item" onclick="location.href='/lecture/${row.l_code}'">${row.lec_name}</div>`,
                            )
                            .join("");
                        const content = `
                        <div class="container">
                            <div class="title">진행중인 강좌</div>
                            <div class="course-list">
                                ${courseItems}
                            </div>
                        </div>`;

                        // HTML 템플릿에 내용 추가 후 응답
                        const thtml = template.HTML(
                            req.session.username,
                            content,
                        );
                        res.send(thtml);
                    },
                );
            },
        );
    } else {
        let db = new sqlite3.Database("./DB.db");
        db.get(
            `SELECT a_code FROM Users WHERE id = ?`,
            [req.session.username],
            (err, row) => {
                if (err) {
                    return console.error(err.message);
                }
                if (!row) {
                    return res
                        .status(404)
                        .send("사용자 정보를 찾을 수 없습니다.");
                }

                const aCode = row.a_code;

                // a_code에 해당하는 모든 강좌 이름 조회
                db.all(
                    `SELECT lec_name, l_code FROM lecture WHERE s_a_code = ?`,
                    [aCode],
                    (err, rows) => {
                        if (err) {
                            return console.error(err.message);
                        }

                        // 강좌 이름으로 HTML 요소 생성
                        const courseItems = rows
                            .map(
                                (row) =>
                                    `<div class="course-item" onclick="location.href='/lecture/${row.l_code}'">${row.lec_name}</div>`,
                            )
                            .join("");
                        const content = `
                        <div class="container">
                            <input class="btn" onclick="location.href='/enroll-lecture'" value="수강 신청"></button>
                            <div class="title">수강중인 강좌</div>
                            <div class="course-list">
                                ${courseItems}
                            </div>
                        </div>`;

                        // HTML 템플릿에 내용 추가 후 응답
                        const shtml = template.HTML(
                            req.session.username,
                            content,
                        );
                        res.send(shtml);
                    },
                );
            },
        );
    }
});

app.get("/lecture/:l_code", (req, res) => {
    if (!req.session.is_logined) {
        return res.redirect("/login");
    }
    if (req.session.t_s === "s") {
        return '<script>alert("잘못된 접근입니다.");history.back();</script>';
    }
    const lec_code = req.params.l_code;
    const db = new sqlite3.Database("./DB.db");

    // 강좌 이름 조회
    db.get(
        `SELECT lec_name, s_a_code FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("서버 오류가 발생했습니다.");
            }
            if (!lecRow) {
                return res.status(404).send("강좌를 찾을 수 없습니다.");
            }

            const lec_name = lecRow.lec_name;
            const s_a_codes = lecRow.s_a_code
                .split("/")
                .filter((code) => code.trim() !== ""); // 빈 값 제거

            if (s_a_codes.length === 0) {
                return res.status(404).send("등록된 학생이 없습니다.");
            }

            // 학생 이름 조회
            const placeholders = s_a_codes.map(() => "?").join(", ");
            db.all(
                `SELECT name, a_code FROM Users WHERE a_code IN (${placeholders})`,
                s_a_codes,
                (err, studentRows) => {
                    if (err) {
                        console.error(err.message);
                        return res
                            .status(500)
                            .send("서버 오류가 발생했습니다.");
                    }

                    // 회차 수 조회 (테이블의 행 개수)
                    db.all(
                        `SELECT * FROM "${lec_code}"`,
                        (err, sessionRows) => {
                            if (err) {
                                console.error(err.message);
                                return res
                                    .status(500)
                                    .send("서버 오류가 발생했습니다.");
                            }

                            const sessionCount = sessionRows.length;

                            // 1회차 데이터 조회 (session = 1)
                            db.get(
                                `SELECT * FROM "${lec_code}" WHERE session = 1`,
                                (err, sessionData) => {
                                    if (err) {
                                        console.error(err.message);
                                        return res
                                            .status(500)
                                            .send("서버 오류가 발생했습니다.");
                                    }

                                    // 학생 출석 상태 생성
                                    const studentItems = studentRows
                                        .map((student) => {
                                            let circle1 = ""; // 첫 번째 출석 상태
                                            let circle2 = ""; // 두 번째 출석 상태

                                            if (
                                                sessionData.o_1.includes(
                                                    student.a_code,
                                                )
                                            ) {
                                                circle1 = "○";
                                            } else if (
                                                sessionData.x_1.includes(
                                                    student.a_code,
                                                )
                                            ) {
                                                circle1 = "×";
                                            }

                                            if (
                                                sessionData.o_2.includes(
                                                    student.a_code,
                                                )
                                            ) {
                                                circle2 = "○";
                                            } else if (
                                                sessionData.x_2.includes(
                                                    student.a_code,
                                                )
                                            ) {
                                                circle2 = "×";
                                            }

                                            return `
                        <div class="student-item">
                            <span>${student.name}</span>
                            <div class="status">
                                <div class="circle">${circle1}</div>
                                <div class="circle">${circle2}</div>
                                <span class="present">출석</span>
                            </div>
                        </div>`;
                                        })
                                        .join("");

                                    // 회차 옵션 생성
                                    const sessionOptions = Array.from(
                                        { length: sessionCount },
                                        (_, i) => {
                                            const sessionNumber =
                                                sessionCount - i;
                                            return `<option value="${sessionNumber}">${sessionNumber}회차 수업</option>`;
                                        },
                                    ).join("");

                                    // HTML 생성
                                    const thtml = ltemplate.HTML(
                                        req.session.username,
                                        `
                        <div class="container">
                            <div class="left-panel">
                                <div class="course-title">
                                    ${lec_name}
                                    <select class="dropdown">
                                        ${sessionOptions}
                                    </select>
                                </div>
                                <div class="attendance-list">
                                    <div class="attendance-header">
                                        <span>이름</span>
                                        <span>1차</span>
                                        <span>2차</span>
                                        <span>상태</span>
                                    </div>
                                    ${studentItems}
                                </div>
                            </div>

                            <div class="right-panel">
                                <div class="buttons">
                                    <button>출석 통계 확인</button>
                                    <button>출석체크 중단</button>
                                    <button>수업 삭제하기</button>
                                </div>
                                <div class="qr-code">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6f/EAN13_Barcode.svg" alt="QR 코드" width="200">
                                </div>
                            </div>
                        </div>
                        `,
                                    );
                                    res.send(thtml);
                                },
                            );
                        },
                    );
                },
            );
        },
    );
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
