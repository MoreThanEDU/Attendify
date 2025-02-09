var express = require("express");
var router = express.Router();
var db = require("./DB.js");
var template = require("./template.js");
var sqlite3 = require("sqlite3").verbose();
var session = require("express-session");
const md5 = require("md5");

// Login page
router.get("/login", (req, res) => {
    var html = template.HTML("login",`
    <h2>로그인</h2>
    <form action="/login" method="post">
        <input class="login" type="text" name="id" placeholder="아이디">
        <input class="login" type="password" name="pw" placeholder="비밀번호">
        <center><input class="btn" type="submit" value="로그인하기"></center>
    </form>            
    <p>아직 계정이 없으신가요? <a href="/signup">회원가입</a></p>
    `,
    );
    res.send(html);
});

// Login process
router.post("/login", (req, res) => {
    var { id, pw } = req.body;
    let db = new sqlite3.Database("./DB.db");
    if (id && pw) {
        // id와 pw가 입력되었는지 확인
        db.all(
            "SELECT * FROM Users WHERE id = ? AND pw = ?",
            [id, md5(pw)],
            function (error, results) {
                if (error) {
                    console.error("Database query error:", error); // 에러 로그 출력
                    res.send(`<script type="text/javascript">alert("데이터베이스 오류가 발생했습니다.");
                    document.location.href="/signup";</script>`);
                    return; // 에러가 있으면 함수 종료
                }
                if (results && results.length > 0) {
                    // db에서의 반환값이 있으면 로그인 성공
                    req.session.is_logined = true;
                    req.session.username = id;
                    // t_s 값을 세션에 저장
                    req.session.t_s = results[0].t_s; // t_s 값을 가져와서 세션에 저장
                    res.send(
                        '<script>document.location.href = "/main";</script>',
                    );
                } else {
                    res.send(`<script type="text/javascript">alert("로그인 정보가 일치하지 않습니다."); 
                    document.location.href="/login";</script>`);
                }
            },
        );
    } else {
        res.send(`<script type="text/javascript">alert("아이디와 비밀번호를 입력하세요!"); 
        document.location.href="/login";</script>`);
    }
});

// Logout process
router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.send("로그아웃 중 오류가 발생했습니다.");
        res.redirect("/login");
    });
});

module.exports = router;
