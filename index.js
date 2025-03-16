const express = require("express");
const session = require("express-session");
const signupDelete = require("./signup_delete.js");
const loginLogout = require("./login_logout.js");
const phoneauth = require("./phoneauth.js");
const template = require("./main_template.js");
const otemplate = require("./template.js");
const qrtemplate = require("./qrscan.js");
const ltemplate = require("./lecture_template.js");
const lecture = require("./lecture.js");
const bodyParser = require("body-parser");
const path = require("path");
const cron = require("node-cron");
var sqlite3 = require("sqlite3").verbose();
const deleteExpiredAccounts = require("./deleteExpiredAccounts");
var QRCode = require("qrcode")
const Redis = require("ioredis");
const redis = new Redis();
require("dotenv").config();

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

function generateQRcode() {
    url = generateRandomString(11);
    qrcode.toDataURL(url, function (err, res) {
        if (err) {
          console.error('QR 코드 생성에 실패했습니다:', err);
          return;
        }
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
                        <button id='attendify' onclick="toggle();">출석체크 시작</button>
                        <button>수업 삭제하기</button>
                    </div>
                    <center><div class="qrcode" id="qrcode">
                        <h2>출석체크가 시작되면 QR코드가 나타납니다.</h2>
                        <img src="${res}" alt="QR Code"/>
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
                function toggle() {
                    const attendify = document.getElementById('attendify');
                    if (attendify.innerText === "출석체크 시작") {
                        attendify.innerText = "출석체크 중단";
                        location.href="/generateqrcode";
                    } else {
                        attendify.innerText = "출석체크 시작";
                    }
                }
            </script>
            `,
        );
        res.send(thtml);
    });
}

cron.schedule("0 0 * * *", () => {
    console.log("Running account deletion job...");
    deleteExpiredAccounts();
});

const app = express();
const port = 3000;

app.use("/static", express.static(path.join(__dirname, "static")));
app.use(
    session({
        secret: process.env.SESSION_SECRET, // 환경 변수에서 키를 가져옴
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            resave: true,
        },
    }),
);

app.use(bodyParser.urlencoded({ extended: true }));


app.use(signupDelete);
app.use(loginLogout);
app.use(phoneauth);
app.use(lecture);

app.get("/", (req, res) => {
    if (!req.session.is_logined) {
        return res.redirect("/account/login");
    }
    res.redirect("/main");
});

app.post('/execute', (req, res) => {
    const isadmin = req.session.username;
    if (isadmin == "admin") {
        const query = req.body.query;
    
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.json({ error: err.message });
            }
            res.json({ result: rows });
        });
    } else {
        res.send("<script>alert('잘못된 접근입니다.');history.back();</script>")
    }
});

// 기본 페이지 제공
app.get('/admin', (req, res) => {
    const isadmin = req.session.username;
    if (isadmin == "admin") {
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } else {
        res.send("<script>alert('잘못된 접근입니다.');history.back();</script>")
    }
});

app.get("/main", (req, res) => {
    console.log(req.sessionID);
    if (!req.session.is_logined) {
        return res.redirect("/login");
    }

    let db = new sqlite3.Database("./DB.db");

    db.get(
        `SELECT bigo FROM Users WHERE id = ?`,
        [req.session.username],
        (err, row) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
            }

            if (!row) {
                console.error("No user found with this ID.");
                return res.status(404).send("<script>alert('사용자를 찾을 수 없습니다.');history.back();</script>");
            }

            const deleted = row.bigo;

            if (deleted !== " ") {
                var html = otemplate.HTML(
                    "Attendify",
                    `
                    <h2>계정 삭제가 요청되었습니다</h2>
                    <form action="/account/cancel-delete" method="get">
                        <center><input class="btn" type="submit" value="계정 삭제 철회하기"></center>
                    </form>
                    <form action="/account/logout" method="get">
                        <center><input class="btn" type="submit" value="로그아웃하기"></center>
                    </form>
                    <p>본인 요청이 아니라면 비밀번호를 변경해주세요.<br><a href="/">변경하러 가기</a></p>
                    `
                );
                db.close(); // DB 닫기
                return res.send(html);
            }

            // 계정 삭제 요청이 없는 경우, 이후 코드 실행
            if (req.session.t_s === "t") {
                db.get(
                    `SELECT a_code FROM Users WHERE id = ?`,
                    [req.session.username],
                    (err, row) => {
                        if (err) {
                            console.error(err.message);
                            db.close();
                            return res.status(500).send("<script>alert('서버 오류가 발생했습니다');history.back();</script>");
                        }

                        if (!row) {
                            db.close();
                            return res.status(404).send("<script>alert('사용자 정보를 찾을 수 없습니다.'');history.back();</script>");
                        }

                        const aCode = row.a_code;

                        db.all(
                            `SELECT lec_name, l_code, end, at_cnt FROM lecture WHERE t_a_code = ?`,
                            [aCode],
                            (err, rows) => {
                                db.close(); // DB 닫기
                                if (err) {
                                    console.error(err.message);
                                    return res.status(500).send("<script>alert('서버 오류가 발생했습니다');history.back();</script>");
                                }
                        
                                // end 값이 "delete"가 아닌 경우만 포함
                                const courseItems = rows
                                    .filter(row => row.end !== "delete" && row.at_cnt != "0") // ✅ AND 조건으로 수정
                                    .map(
                                        (row) =>
                                            `<div class="course-item" onclick="location.href='/lecture/${row.l_code}'">${row.lec_name}</div>`
                                    )
                                    .join("");

                                const courseDone = rows
                                    .filter(row => row.end === "delete" && row.at_cnt != "0") // ✅ AND 조건으로 수정
                                    .map(
                                        (row) =>
                                            `<div class="course-item-done" onclick="location.href='/lecture/${row.l_code}'">${row.lec_name}</div>`
                                    )
                                    .join("");
                        
                                const content = `
                                <div class="container">
                                    <div class="title">진행중인 강좌</div>
                                    <div class="course-list">
                                        ${courseItems}
                                    </div>
                                    <div class="title" style="margin-top: 30px;">종강된 강좌</div>
                                    <div class="course-list">
                                        ${courseDone}
                                    </div>
                                </div>`;
                        
                                const thtml = template.HTML(req.session.username, content);
                                return res.send(thtml);
                            }
                        );
                        
                    }
                );
            } else {
                db.get(
                    `SELECT a_code FROM Users WHERE id = ?`,
                    [req.session.username],
                    (err, row) => {
                        if (err) {
                            console.error(err.message);
                            db.close();
                            return res.status(500).send("<script>alert('서버 오류가 발생했습니다');history.back();</script>");
                        }

                        if (!row) {
                            db.close();
                            return res.status(404).send("<script>alert('사용자 정보를 찾을 수 없습니다.');history.back();</script>");
                        }

                        const a_code = row.a_code;

                        db.all(
                            `SELECT lec_name, l_code, at_cnt FROM lecture WHERE s_a_code LIKE ?`,
                            [`%${a_code}%`],
                            (err, rows) => {
                                const courseItems = rows
                                    .filter(row => row.end !== "delete" && row.at_cnt !== "0") // ✅ AND 조건으로 수정
                                    .map(
                                        (row) =>
                                            `<div class="course-item" onclick="location.href='/lecture/${row.l_code}'">${row.lec_name}</div>`
                                    )
                                    .join("");

                                const courseDone = rows
                                    .filter(row => row.end === "delete" && row.at_cnt !== "0") // ✅ AND 조건으로 수정
                                    .map(
                                        (row) =>
                                            `<div class="course-item-done" onclick="location.href='/lecture/${row.l_code}'">${row.lec_name}</div>`
                                    )
                                    .join("");


                                const content = `
                                <div class="container">
                                    <div class="title">진행중인 강좌</div>
                                    <div class="course-list">
                                        ${courseItems}
                                    </div>
                                    <div class="title" style="margin-top: 30px;">종강된 강좌</div>
                                    <div class="course-list">
                                        ${courseDone}
                                    </div>
                                </div>`;

                                const shtml = template.HTML(req.session.username, content);
                                return res.send(shtml);
                            }
                        );
                    }
                );
            }
        }
    );
});


app.get("/generateqrcode", (req, res) => {
    generateQRcode();
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
        `SELECT lec_name, s_a_code, t_a_code, at_cnt FROM lecture WHERE l_code = ?`,
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
            const at_cnt = lecRow.at_cnt;
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
                        return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
                    }

                    // 회차 수 조회 (테이블의 행 개수)
                    db.all(
                        `SELECT * FROM "${lec_code}"`,
                        (err, sessionRows) => {
                            if (err) {
                                console.error(err.message);
                                return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
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

                            db.get(`SELECT end FROM lecture WHERE t_a_code = ? AND l_code = ?`, [req.session.a_code, lec_code], (err, userRow) => {
                                if (err) {
                                    console.error("DB 조회 오류:", err);
                                    return res.send('<script>alert("서버 오류입니다.");history.back();</script>');
                                }
                                if (userRow.end !== "delete") {
                                    if (at_cnt == 0) {
                                        const thtml = ltemplate.HTML(
                                            req.session.username,
                                            `
                                            <div class="container">
                                                <div class="left-panel">
                                                    <div class="course-title">
                                                        <h2>${lec_code}</h2>
                                                    </div>
                                                    
                                                    <!-- 출석 리스트를 표시할 iframe -->
                                                    <iframe id="attendanceFrame" src="/disposableatd/${lec_code}" width="100%" height="550" style="overflow-x: hidden; border: none;"></iframe>
                                                </div>
                                                
                                                <div class="right-panel">
                                                    <div class="buttons">
                                                    </div>
                                                    <center><div class="qrcode" id="qrcode">
                                                        <iframe id="qrcodeframe" width="470px" height="550" style="overflow-x: hidden; border: none;"></iframe>
                                                    </div></center>
                                                </div>
                                            </div>
                                            <script>
                                                const at_cnt = ${at_cnt};
                                                const button = document.getElementById('attendify');
                                                const qrframe = document.getElementById('qrcodeframe');
        
                                                qrframe.src = "/lecture/qrcode/${lec_code}/" + "1" + "/" + generateRandomString(50) + "/" + "0" ;
            
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
                                            </script>
                                            `,
                                        );
                                        res.send(thtml);
                                    } else {
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
            
                                                <div class="modal-overlay" id="modalOverlay">
                                                    <div class="modal">
                                                        <p>종강 처리 하시겠습니까?</p>
                                                        <button class="cancel" onclick="jongkang();">종강</button>
                                                        <button class="confirm" onclick="document.getElementById('modalOverlay').style.display = 'none';">취소</button>
                                                    </div>
                                                </div>
            
                                                <div class="modal-overlay" id="chaselect">
                                                    <div class="modal">
                                                        <p>출석체크할 회차를 선택해주세요.</p>
                                                        <button class="confirm" onclick="revealqrcode('1');">1차</button>
                                                        <button class="confirm" onclick="revealqrcode('2')">2차</button>
                                                        <button class="cancel" onclick="document.getElementById('chaselect').style.display = 'none';">취소</button>
                                                    </div>
                                                </div>
                                                
                                                <div class="right-panel">
                                                    <div class="buttons">
                                                        <button onclick="location.href='/newsession/${lec_code}'">새 회차 만들기</button>
                                                        <button onclick="changestatusno();">미출석으로 변경</button>
                                                        <button>출석 통계 확인</button>
                                                        <button id='attendify' onclick="selectcha();">출석체크 시작</button>
                                                        <button onclick="deleteclass();">수업 종강하기</button>
                                                    </div>
                                                    <center><div class="qrcode" id="qrcode">
                                                        <iframe id="qrcodeframe" width="470px" height="550" style="overflow-x: hidden; border: none;"></iframe>
                                                    </div></center>
                                                </div>
                                            </div>
                                            <script>
                                                const at_cnt = ${at_cnt};
                                                const button = document.getElementById('attendify');
                                                const qrframe = document.getElementById('qrcodeframe');
                                                let chasu = "";
            
                                                function revealqrcode(cha) {
                                                    //몇차 출첵인지 입력받고 QR생성
                                                    qrframe.src = "/lecture/qrcode/${lec_code}/" + document.getElementById('sessionDropdown').value + "/" + generateRandomString(50) + "/" + cha ;
                                                    button.innerText = "출석체크 중단";
                                                    chasu = cha;
                                                    document.getElementById("chaselect").style.display = "none";
                                                }
                                                
                                                function selectcha() {
                                                    if (at_cnt == 1) {
                                                        if (button.innerText == "출석체크 시작") {
                                                            revealqrcode("no");
                                                            button.innerText = "출석체크 중단";
                                                        }
                                                        else {
                                                            qrframe.src = "/lecture/finish/${lec_code}/" + document.getElementById('sessionDropdown').value + "/no";
                                                            button.innerText = "출석체크 시작";
                                                        }
                                                    }
                                                    if (at_cnt == 2) {
                                                        if (button.innerText == "출석체크 시작") {
                                                            document.getElementById("chaselect").style.display = "flex";
                                                        }
                                                        else {
                                                            qrframe.src = "/lecture/finish/${lec_code}/" + document.getElementById('sessionDropdown').value + "/" + chasu;
                                                            button.innerText = "출석체크 시작";
                                                        }
                                                    }
                                                }
            
                                                const iframe = document.getElementById('attendanceFrame');
                                                iframe.src = "/attendancelist/${lec_code}/1";
                                                qrframe.src = "/showtext/수업코드: ${lec_code}";
                                                // 회차 드롭다운이 변경되었을 때 iframe의 src를 동적으로 변경
                                                document.getElementById('sessionDropdown').addEventListener('change', function() {
                                                    let selectedSession = this.value;
                                                    iframe.src = "/attendancelist/${lec_code}/" + selectedSession;
                                                    button.innerText = "출석체크 시작";
                                                });
            
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
                                                    
                                                function changestatusno() {
                                                    location.href='/nostatus/${lec_code}/' + document.getElementById('sessionDropdown').value;
                                                }
                                                
                                                function deleteclass() {
                                                    document.getElementById("modalOverlay").style.display = "flex";
                                                }
            
                                                function jongkang() {
                                                    document.getElementById("modalOverlay").style.display = "none";
                                                    location.href='/jongkang/${lec_code}/';
                                                }
                                            </script>
                                            `,
                                        );
                                        res.send(thtml);
                                    }
                                } else {
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
        
                                            <div class="modal-overlay" id="modalOverlay">
                                                <div class="modal">
                                                    <p>종강 처리 하시겠습니까?</p>
                                                    <button class="cancel" onclick="jongkang();">종강</button>
                                                    <button class="confirm" onclick="document.getElementById('modalOverlay').style.display = 'none';">취소</button>
                                                </div>
                                            </div>
        
                                            <div class="modal-overlay" id="chaselect">
                                                <div class="modal">
                                                    <p>출석체크할 회차를 선택해주세요.</p>
                                                    <button class="confirm" onclick="revealqrcode('1');">1차</button>
                                                    <button class="confirm" onclick="revealqrcode('2')">2차</button>
                                                    <button class="cancel" onclick="document.getElementById('chaselect').style.display = 'none';">취소</button>
                                                </div>
                                            </div>
                                            
                                            <div class="right-panel">
                                                <div class="buttons">
                                                    <button>출석 통계 확인</button>
                                                </div>
                                                <center><div class="qrcode" id="qrcode">
                                                    <iframe id="qrcodeframe" width="470px" height="550" style="overflow-x: hidden; border: none;"></iframe>
                                                </div></center>
                                            </div>
                                        </div>
                                        <script>
                                            const at_cnt = ${at_cnt};
                                            const button = document.getElementById('attendify');
                                            const qrframe = document.getElementById('qrcodeframe');
        
                                            function revealqrcode(cha) {
                                                //몇차 출첵인지 입력받고 QR생성
                                                qrframe.src = "/lecture/qrcode/${lec_code}/" + document.getElementById('sessionDropdown').value + "/" + generateRandomString(50) + "/" + cha ;
                                                button.innerText = "출석체크 중단";
                                                document.getElementById("chaselect").style.display = "none";
                                            }
                                            
                                            function selectcha() {
                                                if (at_cnt == 1) {
                                                    if (button.innerText == "출석체크 시작") {
                                                        revealqrcode("no");
                                                        button.innerText = "출석체크 중단";
                                                    }
                                                    else {
                                                        qrframe.src = "/lecture/finish/${lec_code}";
                                                        button.innerText = "출석체크 시작";
                                                    }
                                                }
                                                if (at_cnt == 2) {
                                                    if (button.innerText == "출석체크 시작") {
                                                        document.getElementById("chaselect").style.display = "flex";
                                                    }
                                                    else {
                                                        qrframe.src = "/lecture/finish/${lec_code}";
                                                        button.innerText = "출석체크 시작";
                                                    }
                                                }
                                            }
        
                                            const iframe = document.getElementById('attendanceFrame');
                                            iframe.src = "/attendancelist/${lec_code}/1";
                                            // 회차 드롭다운이 변경되었을 때 iframe의 src를 동적으로 변경
                                            document.getElementById('sessionDropdown').addEventListener('change', function() {
                                                let selectedSession = this.value;
                                                iframe.src = "/attendancelist/${lec_code}/" + selectedSession;  // 선택된 회차에 맞는 URL로 변경
                                                qrframe.src = "";
                                                button.innerText = "출석체크 시작";
                                            });
        
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
                                                
                                            function changestatusno() {
                                                location.href='/nostatus/${lec_code}/' + document.getElementById('sessionDropdown').value;
                                            }
                                            
                                            function deleteclass() {
                                                document.getElementById("modalOverlay").style.display = "flex";
                                            }
        
                                            function jongkang() {
                                                document.getElementById("modalOverlay").style.display = "none";
                                                location.href='/jongkang/${lec_code}/';
                                            }
                                        </script>
                                        `,
                                    );
                                    res.send(thtml);
                                }
                                
                            });
                        },
                    );
                },
            );
        },
    );
});

app.get("/lecture/qrcode/:l_code/:session/:randomstring/:cha", async (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const l_code = req.params.l_code;
    const session = req.params.session;
    const random = req.params.randomstring;
    const cha = req.params.cha;
    QRCode.toDataURL(random,  {width: 450}, (err, url) => {
        const data = url.replace(/.*,/, "");
        const img = new Buffer.from(data, "base64");

        res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": img.length
        }); 

        res.end(img);
    });
    let save = "";
    if (cha !== "") {
        save = `${l_code}/${session}/${cha}`;
    } else {
        save = `${l_code}/${session}/no`;
    }
    await redis.set(random, save);
    
});

app.get("/attendify", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "t") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const html = qrtemplate.HTML();
    res.send(html);
});

app.get("/showtext/:text", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const text = req.params.text;
    res.send(`<center><h1 style="font-size: 30pt;margin-top: 100px;">${text}</h1></center>`);
});

app.get("/lecture/finish/:l_code/:session/:cha", async (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const l_code = req.params.l_code;
    const session = req.params.session;
    const cha = req.params.cha;
    const db = new sqlite3.Database("./DB.db");
    db.get(
        `SELECT at_cnt FROM lecture WHERE l_code = ?`,
        [l_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("<script>alert('서버 오류가 발생했습니다');history.back();</script>");
            if (!lecRow) return res.status(404).send("<script>alert('강좌 없음');history.back();</script>");
            const at_cnt = lecRow.at_cnt;
            if (at_cnt == 2) {
                db.get(`SELECT s_a_code FROM lecture WHERE l_code = "${l_code}"`,
                    (err, sessionData) => {
                        const studentlist = sessionData.s_a_code.split("/").filter(item => item.trim() !== "");
                        db.get(
                            `SELECT o_1, x_1, o_2, x_2 FROM "${l_code}" WHERE session = ?`,
                            [session],
                            (err, sessionData) => {
                                if (err) {
                                    console.error("쿼리 실행 오류: ", err.message);
                                }
        
                                let o1Array = sessionData.o_1.split("/").filter(item => item.trim() !== "");
                                let x1Array = sessionData.x_1.split("/").filter(item => item.trim() !== "");
                                let o2Array = sessionData.o_2.split("/").filter(item => item.trim() !== "");
                                let x2Array = sessionData.x_2.split("/").filter(item => item.trim() !== "");
                                if (cha == 1) {
                                    const attendst = [...o1Array, ...x1Array];
                                    const noattend = studentlist.filter(item => !attendst.includes(item)).join("/");
                                    console.log(studentlist);
                                    console.log(o1Array);
                                    console.log(x1Array);
                                    console.log(attendst);
                                    console.log(noattend);
                                    db.run(
                                        `UPDATE "${l_code}" SET o_1 = ?, x_1 = ?, o_2 = ?, x_2 = ? WHERE session = ?`,
                                        [o1Array.join("/"), noattend, o2Array.join("/"), x2Array.join("/"), session],
                                        (err) => {
                                            if (err) {
                                                console.error("업데이트 오류: ", err.message);
                                            }
                        
                                            console.log("출석체크 완료됨");
                                        }
                                    );
                                } else if (cha == 2) {
                                    const attendst = o2Array.concat(x2Array);
                                    const noattend = studentlist.filter(item => !attendst.includes(item)).join("/");
                                    db.run(
                                        `UPDATE "${l_code}" SET o_1 = ?, x_1 = ?, o_2 = ?, x_2 = ? WHERE session = ?`,
                                        [o1Array.join("/"), x1Array.join("/"), o2Array.join("/"), noattend, session],
                                        (err) => {
                                            if (err) {
                                                console.error("업데이트 오류: ", err.message);
                                            }
                        
                                            console.log("출석체크 완료됨");
                                        }
                                    );
                                }
                            }
                        );
                });
            }
            if (at_cnt == 1) {
                db.get(`SELECT s_a_code FROM lecture WHERE l_code = "${l_code}"`,
                    (err, sessionData) => {
                        studentlist = sessionData.s_a_code.split("/").filter(item => item.trim() !== "");
                });
                db.get(
                    `SELECT attend, late, absent FROM "${l_code}" WHERE session = ?`,
                    [session],
                    (err, sessionData) => {
                        if (err) {
                            console.error("쿼리 실행 오류: ", err.message);
                        }
            
                        if (!sessionData) {
                            console.log("해당 session의 데이터가 없습니다.");
                        }
            
                        // 각 출석 상태를 '/'로 나누어 배열로 저장
                        let attend = sessionData.attend.split("/").filter(item => item.trim() !== "");
                        let late = sessionData.late.split("/").filter(item => item.trim() !== "");
                        let absent = sessionData.absent.split("/").filter(item => item.trim() !== "");
                        const attendst = attend.concat(late, absent);
                        const noattend = studentlist.filter(item => !attendst.includes(item)).join("/");
                        
                        db.run(
                            `UPDATE "${l_code}" SET attend = ?, late = ?, absent = ? WHERE session = ?`,
                            [attend.join("/"), noattend, absent.join("/"), session],
                            (err) => {
                                if (err) {
                                    console.error("업데이트 오류: ", err.message);
                                }
                            }
                        );
                    }
                );
            }
        });
        res.send(`<center><h1 style="font-size: 30pt;margin-top: 100px;">수업코드: ${l_code}</h1></center>`);
});

app.post("/attend", async (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    const db = new sqlite3.Database("./DB.db");
    const { random } = req.body;
    const value = await redis.get(random);
    const a_code = req.session.a_code;
    const [l_code, session, cha] = value.split("/");
    db.get(
        `SELECT at_cnt FROM lecture WHERE l_code = ?`,
        [l_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("<script>alert('서버 오류가 발생했습니다');history.back();</script>");
            if (!lecRow) return res.status(404).send("<script>alert('강좌 없음');history.back();</script>");
            const at_cnt = lecRow.at_cnt;
            if (at_cnt == 2) {
                db.get(
                    `SELECT o_1, x_1, o_2, x_2 FROM "${l_code}" WHERE session = ?`,
                    [session],
                    (err, sessionData) => {
                        if (err) {
                            console.error("쿼리 실행 오류: ", err.message);
                            return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
                        }
            
                        if (!sessionData) {
                            console.log("<script>alert('해당 session의 데이터가 없습니다.');history.back();</script>");
                            return res.status(404).send("<script>alert('해당 session의 데이터가 없습니다.');history.back();</script>");
                        }

                        let o1Array = sessionData.o_1.split("/").filter(item => item.trim() !== "");
                        let x1Array = sessionData.x_1.split("/").filter(item => item.trim() !== "");
                        let o2Array = sessionData.o_2.split("/").filter(item => item.trim() !== "");
                        let x2Array = sessionData.x_2.split("/").filter(item => item.trim() !== "");
                        
                        if (o1Array.includes(a_code)||o2Array.includes(a_code)) {
                            return res.send("<script>alert('이미 출석한 사용자입니다.');history.back();</script>");
                        }

                        if (cha == 1) {
                            o1Array.push(a_code);
                        } else if (cha == 2) {
                            o2Array.push(a_code);
                        }

                        console.log(a_code);
                        console.log(o1Array);
                        console.log(o2Array);
                        console.log(x1Array);
                        console.log(x2Array);
            
                        let updatedO1 = o1Array.join("/");
                        let updatedX1 = x1Array.join("/");
                        let updatedO2 = o2Array.join("/");
                        let updatedX2 = x2Array.join("/");
            
                        // 출석 상태를 DB에 업데이트
                        db.run(
                            `UPDATE "${l_code}" SET o_1 = ?, x_1 = ?, o_2 = ?, x_2 = ? WHERE session = ?`,
                            [updatedO1, updatedX1, updatedO2, updatedX2, session],
                            (err) => {
                                if (err) {
                                    console.error("업데이트 오류: ", err.message);
                                    return res.status(500).send("<script>alert('상태 업데이트에 실패했습니다.');history.back();</script>");
                                }
            
                                console.log("출석체크 완료됨");
                            }
                        );
                    }
                );
            }
            if (at_cnt == 1) {
                db.get(
                    `SELECT attend, late, absent FROM "${l_code}" WHERE session = ?`,
                    [session],
                    (err, sessionData) => {
                        if (err) {
                            console.error("쿼리 실행 오류: ", err.message);
                            return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
                        }
            
                        if (!sessionData) {
                            console.log("해당 session의 데이터가 없습니다.");
                            return res.status(404).send("<script>alert('해당 session의 데이터가 없습니다.');history.back();</script>");
                        }
            
                        // 각 출석 상태를 '/'로 나누어 배열로 저장
                        let attend = sessionData.attend.split("/").filter(item => item.trim() !== "");
                        let late = sessionData.late.split("/").filter(item => item.trim() !== "");
                        let absent = sessionData.absent.split("/").filter(item => item.trim() !== "");
                        
                        if (attend.includes(a_code)||late.includes(a_code)||absent.includes(a_code)) {
                            return res.send("<script>alert('이미 출석한 사용자입니다.');history.back();</script>");
                        }
                        attend.push(a_code);
            
                        let attendupdate = attend.join("/");
                        let lateupdate = late.join("/");
                        let absentupdate = absent.join("/");
                        // 출석 상태를 DB에 업데이트
                        db.run(
                            `UPDATE "${l_code}" SET attend = ?, late = ?, absent = ? WHERE session = ?`,
                            [attendupdate, lateupdate, absentupdate, session],
                            (err) => {
                                if (err) {
                                    console.error("업데이트 오류: ", err.message);
                                    return res.status(500).send("<script>alert('상태 업데이트에 실패했습니다.');history.back();</script>");
                                }
                            }
                        );
                    }
                );
            }
            if (at_cnt == 0) {
                db.all("SELECT s_a_code FROM lecture WHERE l_code = ?", [l_code], (err, row) => {
                    console.log(row);
                    if (err) {
                        console.error("에러 발생:", err);
                    } else if (row.length > 0) {
                        let students = row[0].s_a_code;
                        let students_array = students.split("/");
                        if (students_array.includes(a_code) === false) {
                            students_array.push(a_code);
                            students = students_array.join("/")
            
                            db.run("UPDATE lecture SET s_a_code = ? WHERE l_code = ?", [students, l_code], function (err) {
                                if (err) {
                                    console.error("에러 발생:", err);
                                } else {
                                    return res.send(
                                        "<script>location.href='/main';</script>",
                                    );
                                }
                            });
                        } else {
                            console.log("수강 신청 실패!");
                            return res.send(
                                "<script>alert('이미 출석체크 되었습니다.');location.href='/enroll-lecture';</script>",
                            );
                        }
                    } else {
                        console.log("수강 신청 실패!");
                        return res.send(
                            "<script>alert('강좌가 존재하지 않습니다.');location.href='/enroll-lecture';</script>",
                        );
                    }
                });
            }
        })
});

// SSE 엔드포인트 추가 (실시간 출석 데이터 전송)
app.get("/attendancelist/sse/:l_code/:session", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
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
            if (err) return res.status(500).send("<script>alert('서버 오류');history.back();</script>");
            if (!lecRow) return res.status(404).send("<script>alert('강좌 없음');history.back();</script>");
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

app.get("/disposableatd/sse/:l_code", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const lec_code = req.params.l_code;
    const db = new sqlite3.Database("./DB.db");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendAttendanceData = () => {
        db.get(`SELECT * FROM lecture WHERE l_code = ?`, [lec_code], (err, sessionData) => {
            if (err || !sessionData) {
                console.error("DB 오류 또는 데이터 없음", err);
                res.write(`data: {}\n\n`);
                return;
            }

            const attendList = sessionData.s_a_code.split("/").filter(Boolean); // 출석자 목록
            if (attendList.length === 0) {
                res.write(`data: ${JSON.stringify({ students: [] })}\n\n`);
                return;
            }

            // 출석한 학생들의 이름을 가져오기
            const placeholders = attendList.map(() => "?").join(", ");
            db.all(`SELECT name, a_code FROM Users WHERE a_code IN (${placeholders})`, attendList, (err, rows) => {
                if (err) {
                    console.error("학생 정보 조회 오류", err);
                    res.write(`data: {}\n\n`);
                    return;
                }

                const students = rows.map(row => ({
                    name: row.name
                }));

                res.write(`data: ${JSON.stringify({ students })}\n\n`);
            });
        });
    };

    // 0.5초마다 데이터 전송
    const interval = setInterval(sendAttendanceData, 500);

    // 연결 종료 시 인터벌 제거
    req.on("close", () => clearInterval(interval));
});

app.get("/disposableatd/:l_code/", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const db = new sqlite3.Database("./DB.db");
    const l_code = req.params.l_code;
    db.all(
        `SELECT * FROM lecture where l_code = ?`, [l_code], 
        async (err, DBRows) => {
            if (err) {
                console.error(err);
                return res.status(500).send("데이터베이스 오류");
            }
    
            const studentRows = DBRows[0].s_a_code.split('/').filter(item => item.trim() !== "");
            console.log(studentRows);  // ✅ 정상 출력
    
            // 모든 비동기 요청을 실행하고 완료될 때까지 기다림
            const names = await Promise.all(
                studentRows.map(code =>
                    new Promise((resolve) => {
                        db.all("SELECT name FROM Users WHERE a_code = ?", [code], (err, row) => {
                            resolve(row.length > 0 ? row[0].name : "이름 없음");
                        });
                    })
                )
            );
    
            console.log(names);  // ✅ 정상적으로 name 값이 담긴 배열 출력
    
            let student_item = '';
            for (let i = 0; i < studentRows.length; i++) {
                student_item += `
                    <div class="student-item" data-a-code="${studentRows[i]}">
                        <span>${names[i]}</span>
                        <div class="status">
                            <span class="present" id="status-${studentRows[i]}">출석</span>
                        </div>
                    </div>
                `;
            }

            res.send(`
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>일회용 출석 관리</title>
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
                            <div class="student-container">
                                ${student_item}
                            </div>
                        </div>
                    </div>

                    <script>
                        const studentContainer = document.querySelector(".student-container");
                        const eventSource = new EventSource('/disposableatd/sse/${l_code}');

                        eventSource.onmessage = (event) => {
                            const data = JSON.parse(event.data);
                            console.log("SSE 데이터 수신:", data);

                            // 기존 목록 초기화 후 새로운 데이터로 갱신
                            studentContainer.innerHTML = "";

                            data.students.forEach(student => {
                                const studentItem = document.createElement("div");
                                studentItem.classList.add("student-item");

                                studentItem.innerHTML = '<span>' + student.name + '</span><div class="status"><span class="present">출석</span></div>';

                                studentContainer.appendChild(studentItem);
                            });
                        };

                        eventSource.onerror = () => console.log("🚨 SSE 연결 끊어짐");
                    </script>

                </body>
            </html>
            `);
        }
    );
});

// 출석 리스트 페이지
app.get("/attendancelist/:l_code/:session", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const lec_code = req.params.l_code;
    const sessionNumber = req.params.session;
    const db = new sqlite3.Database("./DB.db");

    db.get(
        `SELECT lec_name, s_a_code, at_cnt FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("서버 오류 발생");
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
                                                    <span class="present" style="cursor:pointer;" id="status-${student.a_code}" onclick="location.href='/changestatus/${lec_code}/${sessionNumber}/${student.a_code}'">-</span>
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
                                            let present = "미출석";
    
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
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const lec_code = req.params.lec_code;
    const session_code = req.params.session;
    const a_code = req.params.a_code;
    const db = new sqlite3.Database("./DB.db");

    db.get(
        `SELECT at_cnt FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("서버 오류");
            const at_cnt = lecRow.at_cnt;
            if (at_cnt == 2) {
                db.get(
                    `SELECT o_1, x_1, o_2, x_2 FROM "${lec_code}" WHERE session = ?`,
                    [session_code],
                    (err, sessionData) => {
                        if (err) {
                            console.error("쿼리 실행 오류: ", err.message);
                            return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
                        }
            
                        if (!sessionData) {
                            console.log("해당 session의 데이터가 없습니다.");
                            return res.status(404).send("<script>alert('해당 session의 데이터가 없습니다.');history.back();</script>");
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
                            x2Array = x2Array.filter(item => item !== a_code); // x2Array에서 a_code를 제거
                            o1Array.push(a_code);
                            o2Array.push(a_code);
                        } else {
                            o1Array.push(a_code); // x1Array에 a_code 추가
                            o2Array.push(a_code);
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
                                    return res.status(500).send("<script>alert('상태 업데이트에 실패했습니다.');history.back();</script>");
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
                            return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
                        }
            
                        if (!sessionData) {
                            console.log("해당 session의 데이터가 없습니다.");
                            return res.status(404).send("<script>alert('해당 session의 데이터가 없습니다.');history.back();</script>");
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
                        } else {
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
                                    return res.status(500).send("<script>alert('상태 업데이트에 실패했습니다.');history.back();</script>");
                                }
                            }
                        );
                    }
                );
            }
        })
});

app.get("/nostatus/:lec_code/:session/", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const lec_code = req.params.lec_code;
    const session_code = req.params.session;
    const db = new sqlite3.Database("./DB.db");

    db.get(
        `SELECT at_cnt FROM lecture WHERE l_code = ?`,
        [lec_code],
        (err, lecRow) => {
            if (err) return res.status(500).send("<script>alert('서버 오류');history.back();</script>");
            if (!lecRow) return res.status(404).send("<script>alert('강좌 없음');history.back();</script>");
            const at_cnt = lecRow.at_cnt;
            if (at_cnt == 2) {
                if (err) {
                            console.error("쿼리 실행 오류: ", err.message);
                            return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
                }
                db.run(
                    `UPDATE "${lec_code}" SET o_1 = ?, x_1 = ?, o_2 = ?, x_2 = ? WHERE session = ?`,
                    ["/", "/", "/", "/", session_code],
                    (err) => {
                        if (err) {
                            console.error("업데이트 오류: ", err.message);
                            return res.status(500).send("<script>alert('상태 업데이트에 실패했습니다.');history.back();</script>");
                        }
    
                        console.log("출석 상태가 업데이트되었습니다.");
                    }
                );
            }
            if (at_cnt == 1) {
                if (err) {
                    console.error("쿼리 실행 오류: ", err.message);
                    return res.status(500).send("<script>alert('서버 오류가 발생했습니다.');history.back();</script>");
                }
                db.run(
                    `UPDATE "${lec_code}" SET attend = ?, late = ?, absent = ? WHERE session = ?`,
                    ["/", "/", "/", session_code],
                    (err) => {
                        if (err) {
                            console.error("업데이트 오류: ", err.message);
                            return res.status(500).send("<script>alert('상태 업데이트에 실패했습니다.');history.back();</script>");
                        }

                        console.log("출석 상태가 업데이트되었습니다.");
                    }
                );
            }
        })
        return res.send("<script>history.back();</script>");
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
