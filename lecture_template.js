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
                        display: flex;
                        padding: 20px;
                        gap: 20px;
                    }
            
                    .left-panel {
                        flex: 1;
                        width: 40%;
                    }
            
                    .course-title {
                        font-size: 22px;
                        font-weight: bold;
                    }
            
                    .dropdown {
                        padding: 5px 10px;
                        font-size: 16px;
                        margin-left: 10px;
                        border-radius: 5px;
                        border: 1px solid #ccc;
                    }
            
                    .attendance-list {
                        margin-top: 15px;
                    }
            
                    .attendance-header {
                        font-weight: bold;
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 10px;
                    }
            
                    .student-item {
                        background: linear-gradient(to right, #10A99A, #AED56F);
                        padding: 10px;
                        border-radius: 8px;
                        color: white;
                        font-weight: bold;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 5px;
                    }
            
                    .status {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
            
                    .circle {
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 50px;
                        font-weight: bold;
                        margin-right: 20px;
                    }

                    .tablestatus span {
                        margin-right: 16px;
                    }
                    .right-panel {
                        text-align: right;
                        width: 60%;
                    }
            
                    .qr-code {
                        width: 50%;
                        height: 50%;
                        margin-top: 20px;
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
            
                    .buttons button:hover {
                        background: #bbb;
                    }

                    .modal-overlay {
                        display: none;
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        justify-content: center;
                        align-items: center;
                    }
                    /* 모달 창 스타일 */
                    .modal {
                        background: white;
                        padding: 20px;
                        border-radius: 10px;
                        text-align: center;
                        width: 300px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
                    }
                    .modal button {
                        margin: 10px;
                        padding: 10px 20px;
                        border: none;
                        cursor: pointer;
                        border-radius: 5px;
                    }
                    .confirm {
                        background-color: #4CAF50;
                        color: white;
                    }
                    .cancel {
                        background-color: #f44336;
                        color: white;
                    }
                    .code-box {
                        font-size: 20px;
                        font-weight: bold;
                        padding: 12px 24px;
                        background: white;
                        border-radius: 16px;
                        border: 3px solid transparent;
                        background-clip: padding-box;
                        width: 50px;
                        position: relative;
                        text-align: center;
                    }

                    .code-box::before {
                        content: "";
                        position: absolute;
                        top: -3px;
                        left: -3px;
                        right: -3px;
                        bottom: -3px;
                        border-radius: 19px;
                        background: linear-gradient(45deg, #ff7eb3, #ff758c, #ff7eb3);
                        z-index: -1;
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
                    </div>
                </div>
                ${body}
            </body>
            </html>
            
        `;
    },
};
