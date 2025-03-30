module.exports = {
    HTML: function (username, lecture_name, lecture_code, data) {
        return `<!DOCTYPE html>
                <html lang="ko">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>출석 현황 테이블</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            background-color: #f4f4f9;
                            color: black;
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
                            position: relative;
                            display: inline-block;
                            padding: 10px;
                            cursor: pointer;
                            color: white;
                        }
                
                        .header .admin .circle {
                            width: 20px;
                            height: 20px;
                            background-color: red;
                            border-radius: 50%;
                            margin-right: 10px;
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

                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }

                        th, td {
                            padding: 12px;
                            text-align: center;
                            border: 1px solid #ddd;
                            color: black;
                        }

                        th {
                            background-color: #f4f4f9;
                            color: black;
                        }

                        th.backslash {
                            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><line x1="0" y1="0" x2="100%" y2="100%" stroke="gray" /></svg>');
                            position: relative;
                            text-align: left;
                            color: black;
                        }

                        th.backslash div {
                            text-align: right;
                        }

                        th.backslash .top-text {
                            position: absolute;
                            top: 5px;
                            right: 5px;
                            font-weight: bold;
                            color: black;
                        }

                        th.backslash .bottom-text {
                            position: absolute;
                            bottom: 5px;
                            left: 5px;
                            font-weight: bold;
                            color: black;
                        }

                        /* 기본 hover 효과 */
                        td:hover, th:hover {
                            background-color: #ddd;
                        }

                        /* 상태별 색상 */
                        .attendance { background-color: #8BC34A; } /* 출석 */
                        .attendance:hover { background-color: #689F38; }

                        .absence { background-color: #EF5350; } /* 결석 */
                        .absence:hover { background-color: #D32F2F; }

                        .late, .early { background-color: #FFD54F; } /* 지각, 조퇴 */
                        .late:hover, .early:hover { background-color: #FBC02D; }

                        .container {
                            max-width: 1200px;
                            margin: 0 auto;
                        }
                        
                        .navigation {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        }

                        h1 {
                            text-align: left;
                            color: black;
                        }
                        
                        button {
                            padding: 10px;
                            font-size: 14px;
                            border: none;
                            background: #ccc;
                            border-radius: 5px;
                            cursor: pointer;
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
                                <a href="/account/find">비밀번호 변경</a>
                                <a href="/account/delete">계정 삭제</a>
                                <a href="/account/logout">로그아웃</a>
                            </div>
                        </div>
                    </div>
                    <div class="container">
                        <div class="navigation">
                            <h1>나의 ${lecture_name} 출석 현황</h1>
                            <button onclick="location.href='/exitlec/${lecture_code}'">수업에서 나가기</button>
                        </div>
                        <div id="table-container"></div>
                    </div>

                    <script>
                        const data = ${JSON.stringify(data)};

                        function createTable() {
                            const existingTable = document.querySelector('table');
                            if (existingTable) {
                                existingTable.remove();
                            }

                            const table = document.createElement('table');
                            table.style.width = '100%';
                            table.style.borderCollapse = 'collapse';

                            const thStyle = 'padding: 12px; text-align: center; border: 1px solid #ddd; color: black;';
                            const tdStyle = 'padding: 12px; text-align: center; border: 1px solid #ddd; color: black;';
                            
                            const thead = document.createElement('thead');
                            const headerRow = document.createElement('tr');

                            const header = ['학생', ...Array.from(new Set(
                                Object.values(data).flatMap(studentData => Object.keys(studentData))
                            ))];

                            header.forEach((headerItem, index) => {
                                const th = document.createElement('th');
                                if (index === 0) {
                                    th.classList.add('backslash');

                                    const bottomText = document.createElement('div');
                                    bottomText.classList.add('bottom-text');
                                    bottomText.textContent = "학생";

                                    const topText = document.createElement('div');
                                    topText.classList.add('top-text');
                                    topText.textContent = "회차";

                                    th.appendChild(topText);
                                    th.appendChild(bottomText);
                                    th.style = thStyle;
                                } else {
                                    th.textContent = headerItem;
                                    th.style = thStyle;
                                }
                                headerRow.appendChild(th);
                            });

                            thead.appendChild(headerRow);
                            table.appendChild(thead);

                            const tbody = document.createElement('tbody');
                            
                            Object.keys(data).forEach(student => {
                                const row = document.createElement('tr');
                                
                                const studentNameCell = document.createElement('td');
                                studentNameCell.textContent = student;
                                studentNameCell.style = tdStyle;
                                row.appendChild(studentNameCell);

                                header.slice(1).forEach(session => {
                                    const td = document.createElement('td');
                                    const status = data[student][session] || '';

                                    td.textContent = status;
                                    td.style = tdStyle;

                                    // 상태별 클래스 추가
                                    if (status === "출석") {
                                        td.classList.add("attendance");
                                    } else if (status === "결석") {
                                        td.classList.add("absence");
                                    } else if (status === "지각") {
                                        td.classList.add("late");
                                    } else if (status === "조퇴") {
                                        td.classList.add("early");
                                    }

                                    row.appendChild(td);
                                });

                                tbody.appendChild(row);
                            });

                            table.appendChild(tbody);
                            document.getElementById('table-container').appendChild(table);
                        }

                        createTable();
                    </script>
                </body>
                </html>`;
    },
};