module.exports = {
    HTML: function (username, body) {
        return `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Attendify</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background-color: #f9f9f9;
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
            
                    .header .admin {
                        display: flex;
                        align-items: center;
                        color: white;
                        font-weight: bold;
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
                    }
            
                    .title {
                        font-size: 20px;
                        font-weight: bold;
                        margin-bottom: 15px;
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
            
                    .course-item:hover {
                        opacity: 0.8;
                    }

                    .left-panel {
                        flex: 1;
                        width: 40%;
                    }

                    .right-panel {
                        text-align: right;
                        width: 60%;
                    }

                    .buttons {
                        margin-top: 10px;
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
                    <img style="width: 225px;" src="/static/img/attendify_logo_white.png">
                    <div class="admin">
                        ${username}님
                        <div class="dropdown-menu">
                            <a href="/delete-account">계정 삭제</a>
                            <a href="/logout">로그아웃</a>
                        </div>
                    </div>
                </div>

                ${body}
            </body>
            </html>
            
        `;
    },
};
