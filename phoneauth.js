const express = require('express');
const md5 = require("md5");
const session = require("express-session");
const Redis = require('ioredis');
const bodyParser = require('body-parser');
const coolsms = require('coolsms-node-sdk').default;
const path = require('path');
const template = require('./template.js');
var router = express.Router();
const sqlite = require('sqlite3').verbose(); // sqlite3 모듈 사용
const redis = new Redis();
require("dotenv").config();
const PORT = 8080;

router.use(
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

const db = new sqlite.Database('./DB.db');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.use(express.static(path.join(__dirname, 'public')));

const REQUEST_LIMIT = 2; // 5분에 2번
const TOTAL_LIMIT = 10; // 총 10번

function vali_pw(pw) {
    const pwRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*-_])[A-Za-z\d!@#$%^&*-_]{8,20}$/; // 영문 + 숫자 + 특수문자 포함 8~20자
    return pwRegex.test(pw);
}

const messageService = new coolsms(process.env.API_KEY, process.env.API_SECRET);
router.get('/account/find', (req, res) => {
    var html = template.HTML('findaccount', `
    <h1>아이디/비밀번호 변경하기</h1>
    <form action="/request-code-find" method="POST">
        <label for="phone">전화번호 입력</label>
        <input class="login" type="text" id="phone" name="phone" placeholder="01012345678" required>
        <center><button class="btn" type="submit">인증번호 받기</button></center>
        <br>
    </form>
	<form action="/verify-code" method="POST">
        <label for="code">인증번호 입력</label>
        <input class="login" type="text" id="code" name="code" required>
        <center><button class="btn" type="submit">인증하기</button></center>
    </form>
    `, '')
    return res.send(html);
});

router.get('/account/success/:id', (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    const id = req.params.id;
    var html = template.HTML('success', `
    <h1>비밀번호 재설정 성공!</h1>
    <p>아이디: ${id}</p>
    `, '')
    res.send(html);
});

router.get('/account/blocked', (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    var html = template.HTML('success', `
    <h1>접근이 차단되었습니다.</h1>
    <p>인증번호 요청이 너무 많아 차단되었습니다. 일주일 뒤 시도하세요.</p>
    `, '')
    res.send(html);
});

router.post('/request-code-find', async (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    const phone = req.body.phone;
    const ipv6 = req.socket.remoteAddress;
    const clientIp = ipv6.includes('::ffff:') ? ipv6.split('::ffff:')[1] : ipv6;

    // Redis 키
    const codeKey = `code:${phone}`;
    const rateLimitKey = `rate:${clientIp}`;

    // 5분 동안 요청 2번 제한
    const rateCount = await redis.incr(rateLimitKey);
    if (rateCount === 1) {
        await redis.expire(rateLimitKey, 300); // 5분 유효
    } else if (rateCount > 2) {
        return res.status(429).send('<script>alert("요청이 너무 많습니다. 5분 후에 다시 시도하세요.");history.back();</script>');
    }

    // 총 요청 횟수 제한 (10번 초과 시 차단)
    const totalKey = `total:${clientIp}`;
    const totalAttempts = await redis.incr(totalKey);
    await redis.expire(totalKey, 7 * 24 * 60 * 60); // 총 횟수 일주일 유지

    if (totalAttempts > 10) {
        await redis.set(totalKey, '1', 'EX', 7 * 24 * 60 * 60); // 차단 키 생성
        return res.redirect('/account/blocked');
    }

    // 인증번호 생성
    const code = Math.floor(100000 + Math.random() * 900000); // 6자리 인증번호
    await redis.set(codeKey, code, 'EX', 300); // 인증번호 5분 유지

    req.session.phone = phone;

    req.session.save((err) => {
        try {
            messageService.sendOne({
                to: phone,
                from: '01088501571',
                text: `[모어댄에듀] 인증코드: ${code} \n 타인에게 유출하지 마세요.`,
            });
            console.log(req.session.phone);
            res.send('<script>alert("인증번호가 전송되었습니다.");history.back();</script>');
        } catch (error) {
            console.error(error);
            res.status(500).send('<script>alert("서버 오류입니다. 고객센터에 문의해 주세요.");history.back();</script>');
        }
    })
    console.log(req.session.phone);
});

// 2. 인증 코드 확인 처리
router.post('/verify-code', async (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    const db = new sqlite.Database("./DB.db");
    console.log(req.sessionID);
    const code = req.body.code;

    // 세션에서 전화번호 가져오기
    const phone = req.session.phone;
    console.log(req.session.phone);
    if (!phone) {
        return res.status(400).send('<script>alert("전화번호 세션이 만료되었습니다. 다시 인증해 주세요.");history.back();</script>');
    }

    // Redis에서 인증번호 확인
    const savedCode = await redis.get(`code:${phone}`);
    if (!savedCode) {
        return res.status(400).send("<script>alert('인증번호가 만료되었거나 잘못되었습니다.');history.back();</script>");
    }

    if (savedCode === code) {
        db.get("SELECT id FROM Users WHERE pn = ?", [phone], (err, row) => {
            if (err) {
                console.error(err);
                return res.status(500).send('<script>alert("데이터베이스 오류입니다.");history.back();</script>');
            }
            if (row) {
                // 사용자 ID를 세션에 저장
                req.session.userId = row.id;
                return res.redirect(`/account/reset-password`);
            } else {
                return res.status(404).send("<script>alert('해당 전화번호에 해당하는 계정을 찾을 수 없습니다.');history.back();</script>");
            }
        });
    } else {
        return res.status(400).send("<script>alert('인증번호가 일치하지 않습니다.');history.back();</script>");
    }
});

// 비밀번호 재설정 페이지
router.get('/account/reset-password', (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    if (!req.session.userId) {
        return res.redirect('/account/find');
    }

    var html = template.HTML('reset-password', `
    <h1>비밀번호 재설정</h1>
    <form action="/account/reset-password" method="POST">
        <label for="new-password">사용할 새 비밀번호를 입력해주세요.</label>
        <input class="login" type="password" id="new-password" name="new-password" required>
        <br>
        <center><button class="btn" type="submit">비밀번호 변경</button><p>8 - 20자 | 영문, 숫자, 특수문자 포함(!@#$%^&*-_)</p></center>
    </form>
    `, '');
    res.send(html);
});

// 비밀번호 재설정 처리
router.post('/account/reset-password', (req, res) => {
    if (!req.session.is_logined) {
        return res.send("<script>alert('로그인 후 이용해주세요.');history.back();</script>");
    }
    const newPassword = req.body['new-password'];
    const userId = req.session.userId;

    if (!userId) {
        return res.status(400).send('<script>alert("사용자가 인증되지 않았습니다.");history.back();</script>');
    }
    if (vali_pw(newPassword)) {
        db.run("UPDATE Users SET pw = ? WHERE id = ?", [md5(newPassword), userId], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).send('<script>alert("비밀번호 업데이트 오류입니다");history.back();</script>');
            }
            db.all("SELECT id FROM Users WHERE pn = ?", [req.session.phone], (err, result) => {
                return res.redirect(`/account/success/${result[0].id}`);
            }); 
        });
    } else {
        return res.send('<script>alert("비밀번호의 입력 형식이 올바르지 않습니다.");history.back();</script>');
    }
});

module.exports = router;
