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

                    
                </style>
            </head>
            <body>
                <div class="header">
                    <img style="width: 225px;" src="/static/img/attendify_logo_white.png">
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
