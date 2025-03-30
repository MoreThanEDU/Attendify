module.exports = {
    HTML: function (username, body) {
        return `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=0.9, user-scalable=no">
                <title>Attendify</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f9f9f9;
                    }
                    * {
                        font-family: Pretendard-Regular;
                    }
                        
                    @font-face {
                        font-family: 'Pretendard-Regular';
                        src: url('https://fastly.jsdelivr.net/gh/Project-Noonnu/noonfonts_2107@1.1/Pretendard-Regular.woff') format('woff');
                        font-weight: 400;
                        font-style: normal;
                    }
            
                    .header {
                        background: linear-gradient(to right, #10A99A, #AED56F);
                        padding: 15px 20px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
            
                    .header .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: white;
                    }
            
                    .header .admin .circle {
                        width: 20px;
                        height: 20px;
                        background-color: red;
                        border-radius: 50%;
                        margin-right: 10px;
                    }
            
                    .container {
                        padding: 20px;
                        display: flex;
                        flex-direction: column;
                    }

                    .top {
                        display: flex;
                        flex-direction: row;
                        justify-content: space-between;
                        margin-bottom: 20px;
                    }

                    .title {
                        font-size: 20px;
                        font-weight: bold;
                        display : flex;
                        justify-content : center;
                        align-items : center;
                        float: left
                    }
            
                    .course-list {
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }
            
                    .course-item {
                        background: linear-gradient(to right, #10A99A, #AED56F);
                        padding: 15px;
                        border-radius: 8px;
                        color: white;
                        font-weight: bold;
                        text-align: left;
                        cursor: pointer;
                        transition: 0.3s;
                    }

                    .course-item-done {
                        background-color:rgb(177, 177, 177);
                        padding: 15px;
                        border-radius: 8px;
                        color: white;
                        font-weight: bold;
                        text-align: left;
                        cursor: pointer;
                        transition: 0.3s;
                    }
            
                    .course-item:hover {
                        opacity: 0.8;
                    }

                    .buttons {
                        float: right;
                        color: white;
                    }

                    .buttons button {
                        padding: 10px;
                        font-size: 14px;
                        border: none;
                        background: #ccc;
                        margin: 5px;
                        border-radius: 5px;
                        cursor: pointer;
                    }
                    
                    .dropdown-menu {
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
                        min-width: 120px;
                        overflow: hidden;
                        z-index: 1000;
                    }

                    .dropdown-menu a {
                        display: block;
                        padding: 10px;
                        text-decoration: none;
                        color: #333;
                        font-size: 14px;
                    }

                    .dropdown-menu a:hover {
                        background: #f5f5f5;
                    }

                    /* 마우스를 올리면 드롭다운 표시 */
                    .admin:hover .dropdown-menu {
                        display: block;
                    }

                    .header .admin {
                        position: relative;
                        display: inline-block;
                        padding: 10px;
                        cursor: pointer;
                        color: white;
                        font-weight: bold;
                    }

                </style>
            </head>
            <body>
                <div class="header">
                    <a href="/main">
                        <img style="width: 225px;" src="/static/img/attendify_logo_white.png">
                    </a>
                    <div class="admin">
                        ${username}님
                        <div class="dropdown-menu">
                            <a href="/account/delete">계정 삭제</a>
                            <a href="/account/logout">로그아웃</a>
                        </div>
                    </div>
                </div>
                ${body}
            </body>
            </html>
            
        `;
    },
};