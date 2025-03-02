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
const messageService = new coolsms(
    "NCSWP3E1RLJHQG9Q",
    "PW1E8H0L8C2AFDNCZ5H66LIM5PPK8XFX",
);

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
    const pnRegex = /^010[0-9]{3,4}[0-9]{4}$/; // 01012345678 (하이픈 없음), 10~11자리 숫자
    return pnRegex.test(pn);
}

function vali_pw(pw) {
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*-_])[A-Za-z\d!@#$%^&*-_]{8,20}$/; // 영문 + 숫자 + 특수문자 포함 8~20자
    return pwRegex.test(pw);
}

// Middleware 설정
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
router.use(
    session({
        secret: process.env.SESSION_SECRET, // 환경 변수에서 키를 가져옴
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        },
    }),
);

const REQUEST_LIMIT = 2; // 5분에 2번
const TOTAL_LIMIT = 10; // 총 10번

// 회원가입 페이지
router.get("/signup", (req, res) => {
    const html = template.HTML("signup",`
    <h2>회원가입</h2>
    <form action="/request-code" method="post">
        <div class="form-row">
            <input class="login" type="text" name="phone" placeholder="01012345678" required>
            <input class="btn" style="width: 10%;" type="submit" value="인증코드 전송"></button>
        </div>
    </form>
    <form action="/signup" method="post">
        <input class="login" type="text" name="verificationCode" placeholder="인증코드 입력" required>
        <input class="login" type="text" name="name" placeholder="이름" required>
        <p>2자 이상 | 한글 또는 영문</p>
        <input class="login" type="text" name="id" placeholder="아이디" required>
        <p>5 - 15자 | 영문 포함 | 숫자, -, _ 가능</p>
        <input class="login" type="password" name="password" placeholder="비밀번호" required>
        <p>8 - 20자 | 영문, 숫자, 특수문자 포함(!@#$%^&*-_)</p>
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
router.post('/request-code', async (req, res) => {
    const phone = req.body.phone;

    // Redis 키
    const codeKey = `code:${phone}`;
    const rateLimitKey = `rate:${phone}`;

    // 5분 동안 요청 2번 제한
    const rateCount = await redis.incr(rateLimitKey);
    if (rateCount === 1) {
        await redis.expire(rateLimitKey, 300); // 5분 유효
    } else if (rateCount > 2) {
        return res.status(429).send('요청이 너무 많습니다. 5분 후에 다시 시도하세요.');
    }

    // 총 요청 횟수 제한 (10번 초과 시 차단)
    const totalKey = `total:${phone}`;
    const totalAttempts = await redis.incr(totalKey);
    await redis.expire(totalKey, 7 * 24 * 60 * 60); // 총 횟수 일주일 유지

    if (totalAttempts > 10) {
        await redis.set(blockKey, '1', 'EX', 7 * 24 * 60 * 60); // 차단 키 생성
        return res.redirect('/account/blocked');
    }

    // 인증번호 생성
    const code = Math.floor(100000 + Math.random() * 900000); // 6자리 인증번호
    await redis.set(codeKey, code, 'EX', 300); // 인증번호 5분 유지

    req.session.phone = phone;
    
    try {
        await messageService.sendOne({
            to: phone,
            from: '01088501571',
            text: `[모어댄에듀] 인증코드: ${code} \n 타인에게 유출하지 마세요.`,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('문자 발송 실패!');
    }
});

// 회원가입 처리
router.post("/signup", async (req, res) => {
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
            [name, id, md5(password), phone, accountType, a_code, "", ""],
            (err) => {
                if (err) {
                    console.error(err);
                    return res.send(
                        '<script>alert("회원가입에 실패했습니다.");history.back();</script>',
                    );
                }
                res.send('<script>alert("회원가입이 완료되었습니다.");location.href="/login";</script>');
            },
        );
    });
});

// 계정 삭제 요청 페이지
router.get("/delete-account", (req, res) => {
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
                    '<script>alert("계정 삭제 요청되었습니다. 7일 후에 삭제되며, 기간 이내에 계정 삭제 요청을 철회할 수 있습니다.");location.href="/";</script>',
                );
            },
        );
    });
});

// 계정 삭제 요청 철회
router.get("/cancel-delete", (req, res) => {
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
