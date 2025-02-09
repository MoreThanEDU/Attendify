const express = require('express');
const Redis = require('ioredis');
const bodyParser = require('body-parser');
const coolsms = require('coolsms-node-sdk').default;
const path = require('path');
const template = require('./template.js');
var router = express.Router();
const redis = new Redis();
const PORT = 8080;

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.use(express.static(path.join(__dirname, 'public')));

const REQUEST_LIMIT = 2; // 5분에 2번
const TOTAL_LIMIT = 10; // 총 10번

const messageService = new coolsms('NCSWP3E1RLJHQG9Q', 'PW1E8H0L8C2AFDNCZ5H66LIM5PPK8XFX');


router.use((req, res, next) => {
    req.clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    next();
});

router.get('/account/find', (req, res) => {
    var html = template.HTML('findaccount', `
    <h1>문자 인증 시스템</h1>
    <form action="/request-code" method="POST">
        <label for="phone">전화번호 입력:</label>
        <input class="login" type="text" id="phone" name="phone" placeholder="01012345678" required>
        <button class="btn" type="submit">인증번호 받기</button>
    </form>
	<form action="/verify-code" method="POST">
        <label for="code">인증번호:</label>
        <input class="login" type="text" id="code" name="code" required>
        <br>
        <button class="btn" type="submit">인증하기</button>
    </form>
    `, '')
    res.send(html);
});

router.get('/account/success', (req, res) => {
    var html = template.HTML('success', `
    <h1>인증 성공!</h1>
    <p>인증이 완료되었습니다. 감사합니다.</p>
    `, '')
    res.send(html);
});

router.get('/account/blocked', (req, res) => {
    var html = template.HTML('success', `
    <h1>접근 차단</h1>
    <p>요청이 너무 많아 차단되었습니다. 관리자에게 문의하세요.</p>
    `, '')
    res.send(html);
});

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

// 2. 인증 코드 확인 처리
router.post('/verify-code', async (req, res) => {
	const code = req.body.code;

    // 세션에서 전화번호 가져오기
    const phone = req.session.phone;
    if (!phone) {
        return res.status(400).send('전화번호 세션이 만료되었습니다. 다시 인증해 주세요.');
    }
    // Redis에서 인증번호 확인
    const savedCode = await redis.get(`code:${phone}`);
    if (!savedCode) {
        return res.status(400).send('인증번호가 만료되었거나 잘못되었습니다.');
    }

    if (savedCode === code) {
        return res.redirect('/account/success');
    } else {
        return res.status(400).send('인증번호가 일치하지 않습니다.');
    }
});


module.exports = router;