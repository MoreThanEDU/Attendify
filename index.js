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

                const a_code = row.a_code;

                // a_code에 해당하는 모든 강좌 이름 조회
                db.all(
                    `SELECT lec_name, l_code FROM lecture WHERE s_a_code LIKE ?`,
                    [`%${a_code}%`],
                    (err, rows) => {
                        if (err) {
                            return console.error(err.message);
                        }

                        // 강좌 이름으로 HTML 요소 생성
                        const courseItems = rows
                            .map(
                                (row) =>
                                    `<div class="course-item">${row.lec_name}</div>`,
                            )
                            .join("");
                        console.log("a_code:", a_code);
                        console.log("rows:", rows);
                        console.log("coureseItems:", courseItems);
                        const content = `
                        <div class="container" style="display: flex; padding: 20px; gap: 20px">
                            <div class="left-panel">
                                <div class="title">수강중인 강좌</div>
                                <div class="course-list">${courseItems}</div>
                            </div>
                            <div class="right-panel">
                                <div class="buttons">
                                    <button>출석체크하기</button>
                                    <button type = "button" onclick="location.href='/enroll-lecture'">강좌 참여하기</button>
                                </div>
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
        return res.send('<script>alert("잘못된 접근입니다.");history.back();</script>');
    }
    const lec_code = req.params.l_code;
    const db = new sqlite3.Database("./DB.db");

    // 강좌 이름 조회
    db.get(
        `SELECT lec_name, s_a_code, t_a_code FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) {
                console.error(err.message);
                return res.send('<script>alert("서버 오류가 발생했습니다.");history.back();</script>');
            }
            if (!lecRow) {
                return res.send('<script>alert("강좌를 찾을 수 없습니다.");history.back();</script>');
            }

            const lec_name = lecRow.lec_name;
            const s_a_codes = lecRow.s_a_code
                .split("/")
                .filter((code) => code.trim() !== ""); // 빈 값 제거

            const t_a_code = lecRow.t_a_code;
            const userId = req.session.username;
            db.get(`SELECT a_code FROM Users WHERE id = ?`, [userId], (err, userRow) => {
                if (err) {
                    console.error("DB 조회 오류:", err);
                    return res.send('<script>alert("서버 오류입니다.");history.back();</script>');
                }
                if (!userRow) {
                    return res.send('<script>alert("강좌를 찾을 수 없습니다.");history.back();</script>');
                }
        
                const userACode = userRow.a_code;
        
                // 강의 정보 조회 (현재 사용자가 강사인지 확인)
                db.all(`SELECT lec_name, l_code FROM lecture WHERE t_a_code = ?`, [userACode], (err, lectureRows) => {
                    if (err) {
                        console.error("DB 조회 오류:", err);
                        return res.send('<script>alert("서버 오류가 발생했습니다.");history.back();</script>');
                    }
        
                    if (lectureRows.length === 0) {
                        return res.send('<script>alert("잘못된 접근입니다.");history.back();</script>');
                    }
                });
            });

            // 학생 이름 조회
            const placeholders = s_a_codes.map(() => "?").join(", ");
            db.all(
                `SELECT name, a_code FROM Users WHERE a_code IN (${placeholders})`,
                s_a_codes,
                (err, studentRows) => {
                    if (err) {
                        console.error(err.message);
                        return res.status(500).send("서버 오류가 발생했습니다.");
                    }

                    // 회차 수 조회 (테이블의 행 개수)
                    db.all(
                        `SELECT * FROM "${lec_code}"`,
                        (err, sessionRows) => {
                            if (err) {
                                console.error(err.message);
                                return res.status(500).send("서버 오류가 발생했습니다.");
                            }

                            const sessionCount = sessionRows.length;

                            // 회차 옵션 생성
                            const sessionOptions = Array.from(
                                { length: sessionCount },
                                (_, i) => {
                                    const sessionNumber = sessionCount - i;
                                    if (sessionNumber == 1) {
                                        return `<option value="${sessionNumber}" selected>${sessionNumber}회차 수업</option>`;
                                    }
                                    else {
                                        return `<option value="${sessionNumber}">${sessionNumber}회차 수업</option>`;
                                    }
                                },
                            ).join("");

                            // HTML 생성 (iframe 포함)
                            const thtml = ltemplate.HTML(
                                req.session.username,
                                `
                                <div class="container">
                                    <div class="left-panel">
                                        <div class="course-title">
                                            <h2>${lec_name}</h2>
                                            <select class="dropdown" id="sessionDropdown">
                                                ${sessionOptions}
                                            </select>
                                        </div>
                                        
                                        <!-- 출석 리스트를 표시할 iframe -->
                                        <iframe id="attendanceFrame" width="100%" height="550" style="overflow-x: hidden; border: none;"></iframe>
                                    </div>
                                    
                                    <div class="right-panel">
                                        <div class="buttons">
                                            <button onclick="location.href='/newsession/${lec_code}'">새 회차 만들기</button>
                                            <button>출석 통계 확인</button>
                                            <button>출석체크 중단</button>
                                            <button>수업 삭제하기</button>
                                        </div>
                                        <center><div class="qr-code">
                                            <h2>출석체크가 시작되면 QR코드가 나타납니다.</h2>
                                        </div></center>
                                    </div>
                                </div>
                                <script>
                                    const iframe = document.getElementById('attendanceFrame');
                                    iframe.src = "/attendancelist/${lec_code}/1";
                                    // 회차 드롭다운이 변경되었을 때 iframe의 src를 동적으로 변경
                                    document.getElementById('sessionDropdown').addEventListener('change', function() {
                                        const selectedSession = this.value;
                                        const iframe = document.getElementById('attendanceFrame');
                                        iframe.src = "/attendancelist/${lec_code}/" + selectedSession;  // 선택된 회차에 맞는 URL로 변경
                                    });
                                </script>
                                `,
                            );
                            res.send(thtml);
                        },
                    );
                },
            );
        },
    );
});

// SSE 엔드포인트 추가 (실시간 출석 데이터 전송)
app.get("/attendancelist/sse/:l_code/:session", (req, res) => {
    const lec_code = req.params.l_code;
    const sessionNumber = req.params.session;
    const db = new sqlite3.Database("./DB.db");

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    db.get(
        `SELECT at_cnt FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("서버 오류");
            if (!lecRow) return res.status(404).send("강좌 없음");
            const at_cnt = lecRow.at_cnt;
            if (at_cnt == 2) {
                const sendAttendanceData = () => {
                    db.get(
                        `SELECT * FROM "${lec_code}" WHERE session = ?`,
                        [sessionNumber],
                        (err, sessionData) => {
                            if (err || !sessionData) {
                                console.error("DB 오류 또는 데이터 없음", err);
                                res.write(`data: {}\n\n`); // 빈 데이터 전송
                                return;
                            }
            
                            const response = {
                                o_1: sessionData.o_1.split("/"),
                                x_1: sessionData.x_1.split("/"),
                                o_2: sessionData.o_2.split("/"),
                                x_2: sessionData.x_2.split("/"),
                            };
            
                            res.write(`data: ${JSON.stringify(response)}\n\n`);
                        }
                    );
                };
            
                // 즉시 데이터 전송 후 3초마다 업데이트
                sendAttendanceData();
                const interval = setInterval(sendAttendanceData, 500);
            
                // 연결이 끊어지면 인터벌 제거
                req.on("close", () => clearInterval(interval));
            }
            if (at_cnt == 1) {
                const sendAttendanceData = () => {
                    db.get(
                        `SELECT * FROM "${lec_code}" WHERE session = ?`,
                        [sessionNumber],
                        (err, sessionData) => {
                            if (err || !sessionData) {
                                console.error("DB 오류 또는 데이터 없음", err);
                                res.write(`data: {}\n\n`); // 빈 데이터 전송
                                return;
                            }
            
                            const response = {
                                attend: sessionData.attend.split("/"),
                                late: sessionData.late.split("/"),
                                absent: sessionData.absent.split("/"),
                            };
            
                            res.write(`data: ${JSON.stringify(response)}\n\n`);
                        }
                    );
                };
            
                // 즉시 데이터 전송 후 3초마다 업데이트
                sendAttendanceData();
                const interval = setInterval(sendAttendanceData, 500);
            
                // 연결이 끊어지면 인터벌 제거
                req.on("close", () => clearInterval(interval));
            }
    });

    
});

// 출석 리스트 페이지
app.get("/attendancelist/:l_code/:session", (req, res) => {
    const lec_code = req.params.l_code;
    const sessionNumber = req.params.session;
    const db = new sqlite3.Database("./DB.db");

    db.get(
        `SELECT lec_name, s_a_code, at_cnt FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("서버 오류");
            if (!lecRow) return res.status(404).send("강좌 없음");

            const lec_name = lecRow.lec_name;
            const at_cnt = lecRow.at_cnt;
            const s_a_codes = lecRow.s_a_code.split("/").filter((code) => code.trim() !== "");

            if (s_a_codes.length === 0) return res.status(404).send("등록된 학생 없음");
            if (at_cnt == 2) {
                db.all(
                    `SELECT name, a_code FROM Users WHERE a_code IN (${s_a_codes.map(() => "?").join(", ")})`,
                    s_a_codes,
                    (err, studentRows) => {
                        if (err) return res.status(500).send("서버 오류");
    
                        // HTML 반환
                        res.send(`
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <title>${lec_name} 출석 관리</title>
                                <style>
                                    body { font-family: Arial, sans-serif; background-color: #f9f9f9; }
                                    .container { width: 95%; padding: 10px; }
                                    .attendance-header { font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 10px; }
                                    .student-item { background: linear-gradient(to right, #10A99A, #AED56F); padding: 10px; border-radius: 8px; color: white; font-weight: bold; display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
                                    .status { display: flex; align-items: center; gap: 10px; }
                                    .circle { width: 20px; height: 20px; margin-right: 16px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="attendance-list" id="attendanceList">
                                        <div class="attendance-header">
                                            <span>이름</span>
                                            <div>
                                                <span style="margin-right: 20px;">1차</span>
                                                <span style="margin-right: 20px;">2차</span>
                                                <span style="margin-right: 10px;">상태</span>
                                            </div>
                                        </div>
                                        ${studentRows.map(student => `
                                            <div class="student-item" data-a-code="${student.a_code}">
                                                <span>${student.name}</span>
                                                <div class="status">
                                                    <img class="circle" id="circle1-${student.a_code}" src="/static/img/none.png">
                                                    <img class="circle" id="circle2-${student.a_code}" src="/static/img/none.png">
                                                    <span class="present" id="status-${student.a_code}" onclick="location.href='/changestatus/${lec_code}/${sessionNumber}/${student.a_code}'">-</span>
                                                </div>
                                            </div>`).join("")}
                                    </div>
                                </div>
    
                                <script>
                                    const eventSource = new EventSource("/attendancelist/sse/${lec_code}/${sessionNumber}");
    
                                    eventSource.onmessage = (event) => {
                                        const data = JSON.parse(event.data);
                                        if (!data.o_1) return;
    
                                        document.querySelectorAll(".student-item").forEach(item => {
                                            const a_code = item.dataset.aCode;
                                            let circle1 = "none";
                                            let circle2 = "none";
                                            let present = "-";
    
                                            if (data.o_1.includes(a_code)) circle1 = "O";
                                            else if (data.x_1.includes(a_code)) circle1 = "X";
    
                                            if (data.o_2.includes(a_code)) circle2 = "O";
                                            else if (data.x_2.includes(a_code)) circle2 = "X";
    
                                            if (circle1 === "O" && circle2 === "O") present = "출석";
                                            else if (circle1 === "X" && circle2 === "O") present = "지각";
                                            else if (circle1 === "O" && circle2 === "X") present = "조퇴";
                                            else if (circle1 === "X" && circle2 === "X") present = "결석";
    
                                            document.getElementById("circle1-" + a_code).src = "/static/img/" + circle1 + "a.png";
                                            document.getElementById("circle2-" + a_code).src = "/static/img/" + circle2 + "a.png";
                                            document.getElementById("status-" + a_code).innerText = present;
                                        });
                                    };
    
                                    eventSource.onerror = () => console.log("SSE 연결 종료됨");
                                </script>
                            </body>
                            </html>
                        `);
                    }
                );
            }
            if (at_cnt == 1) {
                db.all(
                    `SELECT name, a_code FROM Users WHERE a_code IN (${s_a_codes.map(() => "?").join(", ")})`,
                    s_a_codes,
                    (err, studentRows) => {
                        if (err) return res.status(500).send("서버 오류");
    
                        // HTML 반환
                        res.send(`
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <title>${lec_name} 출석 관리</title>
                                <style>
                                    body { font-family: Arial, sans-serif; background-color: #f9f9f9; }
                                    .container { width: 95%; padding: 10px; }
                                    .attendance-header { font-weight: bold; display: flex; justify-content: space-between; margin-bottom: 10px; }
                                    .student-item { background: linear-gradient(to right, #10A99A, #AED56F); padding: 10px; border-radius: 8px; color: white; font-weight: bold; display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
                                    .status { display: flex; align-items: center; gap: 10px; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="attendance-list" id="attendanceList">
                                        <div class="attendance-header">
                                            <span>이름</span>
                                            <div>
                                                <span style="margin-right: 10px;">상태</span>
                                            </div>
                                        </div>
                                        ${studentRows.map(student => `
                                            <div class="student-item" data-a-code="${student.a_code}">
                                                <span>${student.name}</span>
                                                <div class="status">
                                                    <span class="present" style="cursor:pointer;" id="status-${student.a_code}" onclick="location.href='/changestatus/${lec_code}/${sessionNumber}/${student.a_code}'">미출석</span>
                                                </div>
                                            </div>`).join("")}
                                    </div>
                                </div>

                                <script>
                                    const eventSource = new EventSource("/attendancelist/sse/${lec_code}/${sessionNumber}");

                                    eventSource.onmessage = (event) => {
                                        const data = JSON.parse(event.data);

                                        document.querySelectorAll(".student-item").forEach(item => {
                                            const a_code = item.dataset.aCode;
                                            let present = "미출석";  // 기본값

                                            if (data.attend.includes(a_code)) present = "출석";
                                            else if (data.late.includes(a_code)) present = "지각";
                                            else if (data.absent.includes(a_code)) present = "결석";

                                            document.getElementById("status-" + a_code).innerText = present;
                                        });
                                    };

                                    eventSource.onerror = () => console.log("SSE 연결 종료됨");
                                </script>
                            </body>
                        </html>

                            </body>
                            </html>
                        `);
                    }
                );
            }
            
        }
    );
});

app.get("/changestatus/:lec_code/:session/:a_code", (req, res) => {
    const lec_code = req.params.lec_code;
    const session_code = req.params.session;
    const a_code = req.params.a_code;
    const db = new sqlite3.Database("./DB.db");

    db.get(
        `SELECT at_cnt FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("서버 오류");
            if (!lecRow) return res.status(404).send("강좌 없음");
            const at_cnt = lecRow.at_cnt;
            if (at_cnt == 2) {
                db.get(
                    `SELECT o_1, x_1, o_2, x_2 FROM "${lec_code}" WHERE session = ?`,
                    [session_code],
                    (err, sessionData) => {
                        if (err) {
                            console.error("쿼리 실행 오류: ", err.message);
                            return res.status(500).send("서버 오류가 발생했습니다.");
                        }
            
                        if (!sessionData) {
                            console.log("해당 session의 데이터가 없습니다.");
                            return res.status(404).send("해당 session의 데이터가 없습니다.");
                        }
            
                        // 각 출석 상태를 '/'로 나누어 배열로 저장
                        let o1Array = sessionData.o_1.split("/").filter(item => item.trim() !== "");
                        let x1Array = sessionData.x_1.split("/").filter(item => item.trim() !== "");
                        let o2Array = sessionData.o_2.split("/").filter(item => item.trim() !== "");
                        let x2Array = sessionData.x_2.split("/").filter(item => item.trim() !== "");
            
                        if (o1Array.includes(a_code) && o2Array.includes(a_code)) {
                            o1Array = o1Array.filter(item => item !== a_code); // o1Array에서 a_code를 제거
                            x1Array.push(a_code); // x1Array에 a_code 추가
                        } else if (x1Array.includes(a_code) && o2Array.includes(a_code)) {
                            x1Array = x1Array.filter(item => item !== a_code); // x1Array에서 a_code를 제거
                            o1Array.push(a_code); // o1Array에 a_code 추가
                            o2Array = o2Array.filter(item => item !== a_code); // o2Array에서 a_code를 제거
                            x2Array.push(a_code); // x2Array에 a_code 추가
                        } else if (o1Array.includes(a_code) && x2Array.includes(a_code)) {
                            o1Array = o1Array.filter(item => item !== a_code); // o1Array에서 a_code를 제거
                            x1Array.push(a_code); // x1Array에 a_code 추가
                        } else if (x1Array.includes(a_code) && x2Array.includes(a_code)) {
                            x1Array = x1Array.filter(item => item !== a_code); // x1Array에서 a_code를 제거
                            o1Array.push(a_code); // o1Array에 a_code 추가
                            x2Array = x2Array.filter(item => item !== a_code); // x2Array에서 a_code를 제거
                            o2Array.push(a_code); // o2Array에 a_code 추가
                        }
            
            
                        console.log("O_1 배열: ", o1Array);
                        console.log("X_1 배열: ", x1Array);
                        console.log("O_2 배열: ", o2Array);
                        console.log("X_2 배열: ", x2Array);
            
                        let updatedO1 = o1Array.join("/");
                        let updatedX1 = x1Array.join("/");
                        let updatedO2 = o2Array.join("/");
                        let updatedX2 = x2Array.join("/");
            
                        console.log("수정된 O_1: ", updatedO1);
                        console.log("수정된 X_1: ", updatedX1);
                        console.log("수정된 O_2: ", updatedO2);
                        console.log("수정된 X_2: ", updatedX2);
            
                        // 출석 상태를 DB에 업데이트
                        db.run(
                            `UPDATE "${lec_code}" SET o_1 = ?, x_1 = ?, o_2 = ?, x_2 = ? WHERE session = ?`,
                            [updatedO1, updatedX1, updatedO2, updatedX2, session_code],
                            (err) => {
                                if (err) {
                                    console.error("업데이트 오류: ", err.message);
                                    return res.status(500).send("상태 업데이트에 실패했습니다.");
                                }
            
                                console.log("출석 상태가 업데이트되었습니다.");
                            }
                        );
                    }
                );
            }
            if (at_cnt == 1) {
                db.get(
                    `SELECT attend, late, absent FROM "${lec_code}" WHERE session = ?`,
                    [session_code],
                    (err, sessionData) => {
                        if (err) {
                            console.error("쿼리 실행 오류: ", err.message);
                            return res.status(500).send("서버 오류가 발생했습니다.");
                        }
            
                        if (!sessionData) {
                            console.log("해당 session의 데이터가 없습니다.");
                            return res.status(404).send("해당 session의 데이터가 없습니다.");
                        }
            
                        // 각 출석 상태를 '/'로 나누어 배열로 저장
                        let attend = sessionData.attend.split("/").filter(item => item.trim() !== "");
                        let late = sessionData.late.split("/").filter(item => item.trim() !== "");
                        let absent = sessionData.absent.split("/").filter(item => item.trim() !== "");
            
                        if (attend.includes(a_code)) {
                            attend = attend.filter(item => item !== a_code);
                            late.push(a_code);
                        } else if (late.includes(a_code)) {
                            late = late.filter(item => item !== a_code);
                            absent.push(a_code); 
                        } else if (absent.includes(a_code)) {
                            absent = absent.filter(item => item !== a_code);
                            attend.push(a_code); 
                        }
            
                        let attendupdate = attend.join("/");
                        let lateupdate = late.join("/");
                        let absentupdate = absent.join("/");
                        // 출석 상태를 DB에 업데이트
                        db.run(
                            `UPDATE "${lec_code}" SET attend = ?, late = ?, absent = ? WHERE session = ?`,
                            [attendupdate, lateupdate, absentupdate, session_code],
                            (err) => {
                                if (err) {
                                    console.error("업데이트 오류: ", err.message);
                                    return res.status(500).send("상태 업데이트에 실패했습니다.");
                                }
                            }
                        );
                    }
                );
            }
        })
});



app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
