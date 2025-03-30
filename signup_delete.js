const express = require("express");
const session = require("express-session");
const Redis = require("ioredis");
const bodyParser = require("body-parser");
const coolsms = require("coolsms-node-sdk").default;
const sqlite3 = require("sqlite3").verbose();
const md5 = require("md5");
const template = require("./template.js");
const { promisify } = require("util");
require("dotenv").config();

const router = express.Router();
const redis = new Redis();
const messageService = new coolsms(process.env.API_KEY, process.env.API_SECRET);

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

function vali_name(name) {
    const nameRegex = /^[가-힣a-zA-Z]{2,}$/; // 한글 또는 영문 2~자
    return nameRegex.test(name);
}

function vali_id(id) {
    const idRegex = /^(?=.*[A-Za-z])[a-zA-Z0-9_-]{5,15}$/; // 영문, 숫자, _ , - 포함 5~15자
    return idRegex.test(id);
}

function vali_pn(pn) {
    const pnRegex = /^010[0-9]{7,8}$/;
    return pnRegex.test(pn);
}

function vali_pw(pw) {
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*-_])[A-Za-z\d!@#$%^&*-_]{8,20}$/; // 영문 + 숫자 + 특수문자 포함 8~20자
    return pwRegex.test(pw);
}

router.use(
    session({
        secret: process.env.SESSION_SECRET, // 환경 변수에서 키를 가져옴
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        },
    }),
);
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());


const REQUEST_LIMIT = 2; // 5분에 2번
const TOTAL_LIMIT = 10; // 총 10번

// 회원가입 페이지
router.get("/account/signup", (req, res) => {
    const html = template.HTML("signup",`
    <h2>회원가입</h2>
    <form action="/request-code" method="post">
        <div class="form-row">
            <input class="login" type="text" name="phonenumber" placeholder="01012345678" required>
            <input class="btn" style="width: 10%;" type="submit" value="인증코드 전송"></button>
        </div>
    </form>
    <form action="/account/signup" method="post">
        <input class="login" type="text" name="verificationCode" placeholder="인증코드 입력" required>
        <input class="login" type="text" name="name" placeholder="이름" required>
        <span style="display: block; text-align: left; font-size: 12px; padding-left: 7px;">2자 이상 | 한글 또는 영문</span>
        <input class="login" type="text" name="id" placeholder="아이디" required>
        <span style="display: block; text-align: left; font-size: 12px; padding-left: 7px;">5 - 15자 | 영문 포함 | 숫자, -, _ 가능</span>
        <input class="login" type="password" name="password" placeholder="비밀번호" required>
        <span style="display: block; text-align: left; font-size: 12px; padding-left: 7px;">8 - 20자 | 영문, 숫자, 특수문자 포함(!@#$%^&*-_)</span>
        <input class="login" type="password" name="password2" placeholder="비밀번호 확인" required>
        <div class="radio">
            <label><input type="radio" name="accountType" value="t" required> 교수/교사</label>
            <label><input type="radio" name="accountType" value="s" required> 학생</label>
        </div>
        <center><button class="btn" type="submit">회원가입</button></center>
    </form>
    `);
    res.send(html);
});

// 인증번호 요청
router.post("/request-code", async (req, res) => {
    const phone = req.body.phonenumber;
    const ipv6 = req.socket.remoteAddress;
    const clientIp = ipv6.includes('::ffff:') ? ipv6.split('::ffff:')[1] : ipv6;

    const codeKey = `code:${phone}`;
    const rateLimitKey = `rate:${clientIp}`;
    //db.get을 Promise로 변환
    const rateCount = await redis.incr(rateLimitKey);
    if (rateCount === 1) await redis.expire(rateLimitKey, 300); // 5분 제한
    if (rateCount > 2) {
        return res.send(
            '<script>alert("요청이 너무 많습니다. 5분 후에 다시 시도하세요.");history.back();</script>',
        );
    }

    const totalKey = `total:${clientIp}`;
    const totalAttempts = await redis.incr(totalKey);

    if (totalAttempts > 10) {
        await redis.set(totalKey, '1', 'EX', 7 * 24 * 60 * 60); // 차단 키 생성
        return res.redirect('/account/blocked');
    }
    
    const code = Math.floor(100000 + Math.random() * 900000);
    
    await redis.set(codeKey, code, "EX", 300); // 5분 유효
    
    req.session.phone = phone;

    messageService.sendOne({
        to: phone,
        from: '01088501571',
        text: `[모어댄에듀] 인증코드: ${code} \n 타인에게 유출하지 마세요.`,
    }).then(res => console.log(res))
    .catch(err => console.error(err));
    res.send('<script>alert("인증번호가 전송되었습니다.");history.back();</script>');
    console.log(req.session.phone);
});

// 회원가입 처리
router.post("/account/signup", async (req, res) => {
    const { name, id, password, password2, verificationCode, accountType } =
        req.body;
    const phone = req.session.phone;
    
    if (!vali_name(name)) {
        return res.send(
            '<script>alert("이름의 입력 형식이 올바르지 않습니다.");history.back();</script>',
        );
    }
    
    if (!vali_id(id)) {
        return res.send(
            '<script>alert("아이디의 입력 형식이 올바르지 않습니다.");history.back();</script>',
        );
    }

    if (!vali_pn(phone)) {
        return res.send(
            '<script>alert("전화번호의 입력 형식이 올바르지 않습니다.");history.back();</script>',
        );
    }

    if (!vali_pw(password)) {
        return res.send(
            '<script>alert("비밀번호의 입력 형식이 올바르지 않습니다.");history.back();</script>',
        );
    }

    const savedCode = await redis.get(`code:${phone}`);
    if (savedCode !== verificationCode) {
        return res.send(
            '<script>alert("잘못되었거나 만료된 인증 코드입니다.");history.back();</script>',
        );
    }

    const db = new sqlite3.Database("./DB.db");
    const dbAll = promisify(db.all).bind(db);
    const row = await dbAll("SELECT * FROM Users WHERE pn = ?", [phone]);
    if (row.length > 0) {
        const types = row.map(row => row.t_s); 
        if (accountType == 't') {
            if (types.includes('t')) {
                return res.send('<script>alert("이미 가입된 선생님 계정이 있습니다.");history.back();</script>');
            }
        } else {
            db.get("SELECT * FROM Users WHERE id = ?", [id], (err, row) => {
                if (err) {
                    console.error(err);
                    return res.send(
                        '<script>alert("데이터베이스 오류입니다.");history.back();</script>',
                    );
                }
                if (row) {
                    return res.send(
                        '<script>alert("동일한 아이디가 이미 존재합니다.");history.back();</script>',
                    );
                }
                const a_code = generateRandomString(6);
                db.run(
                    "INSERT INTO Users (name, id, pw, pn, t_s, a_code, en_lec, bigo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [name, id, md5(password), phone, accountType, a_code, "", " "],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return res.send(
                                '<script>alert("회원가입에 실패했습니다.");history.back();</script>',
                            );
                        }
                        res.send('<script>alert("회원가입이 완료되었습니다.");location.href="/account/login";</script>');
                    },
                );
            });
        }
        if (accountType == 's') {
            if (types.includes('s')) {
                return res.send('<script>alert("이미 가입된 학생 계정이 있습니다.");history.back();</script>');
            }
        } else {
            db.get("SELECT * FROM Users WHERE id = ?", [id], (err, row) => {
                if (err) {
                    console.error(err);
                    return res.send(
                        '<script>alert("데이터베이스 오류입니다.");history.back();</script>',
                    );
                }
                if (row) {
                    return res.send(
                        '<script>alert("동일한 아이디가 이미 존재합니다.");history.back();</script>',
                    );
                }
                const a_code = generateRandomString(6);
                db.run(
                    "INSERT INTO Users (name, id, pw, pn, t_s, a_code, en_lec, bigo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    [name, id, md5(password), phone, accountType, a_code, "", " "],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return res.send(
                                '<script>alert("회원가입에 실패했습니다.");history.back();</script>',
                            );
                        }
                        res.send('<script>alert("회원가입이 완료되었습니다.");location.href="/account/login";</script>');
                    },
                );
            });
        }
    } 
});

// 계정 삭제 요청 페이지
router.get("/account/delete", (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (req.session.t_s == "s") {
        return res.send("<script>alert('잘못된 접근입니다.');history.back();</script>");
    }
    const html = template.HTML(
        "delete-account",
        `
        <h2>비밀번호를 입력해주세요</h2>
        <form action="/delete-account" method="post">
            <p><input class="login" type="password" name="password" placeholder="비밀번호 입력" required></p>
            <p><button class="btn" type="submit">유예 기간 후 계정이 자동 삭제되며,<br>복구할 수 없음을 인지하고 있습니다.</button></p>
        </form>
    `,
        "",
    );
    res.send(html);
});

// 계정 삭제 요청 처리
router.post("/delete-account", (req, res) => {
    const { password } = req.body;
    const userId = req.session.username;

    if (!userId) {
        return res.send(
            '<script>alert("계정을 삭제하려면 로그인되어있어야 합니다.");history.back();</script>',
        );
    }

    const db = new sqlite3.Database("./DB.db");
    db.get("SELECT * FROM Users WHERE id = ?", [userId], (err, user) => {
        if (err) {
            console.error(err);
            return res.send(
                '<script>alert("데이터베이스 오류입니다.");history.back();</script>',
            );
        }
        if (!user || user.pw !== md5(password)) {
            return res.send(
                '<script>alert("잘못된 비밀번호입니다.");history.back();</script>',
            );
        }
        
        const now = new Date().toISOString();
        db.run(
            "UPDATE Users SET bigo = ? WHERE id = ?",
            [now, userId],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.send(
                        '<script>alert("계정 삭제에 실패했습니다.");history.back();</script>',
                    );
                }
                res.send(
                    '<script>alert("계정 삭제가 요청되었습니다. 7일 후에 삭제되며, 기간 이내에 계정 삭제 요청을 철회할 수 있습니다.");location.href="/";</script>',
                );
            },
        );
    });
});

// 계정 삭제 요청 철회
router.get("/account/cancel-delete", (req, res) => {
    const userId = req.session.username;

    if (!userId) {
        return res.send(
            '<script>alert("계정 삭제 요청을 철회하려면 로그인되어있어야 합니다.");history.back();</script>',
        );
    }

    const db = new sqlite3.Database("./DB.db");
    db.run(
        "UPDATE Users SET bigo = ' ' WHERE id = ?",
        [userId],
        (err) => {
            if (err) {
                console.error(err);
                return res.send(
                    '<script>alert("오류가 발생했습니다.");history.back();</script>',
                );
            }
            res.send(
                '<script>alert("계정 삭제 요청이 철회되었습니다.");location.href="/";</script>',
            );
        },
    );
});

module.exports = router;