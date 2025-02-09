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
