module.exports = {
    HTML: function (username, body) {
        return `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>QR 코드 스캐너</title>
                <script src="https://unpkg.com/html5-qrcode"></script>
                <style>
                    /* 기본 스타일 */
                    body {
                        font-family: "Noto Sans KR", sans-serif;
                        text-align: center;
                        margin: 0;
                        padding: 0;
                        background: linear-gradient(to right, #10A99A, #AED56F);
                        color: white;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }

                    h1 {
                        font-size: 28px;
                        margin-bottom: 15px;
                        text-shadow: 1px 2px 4px rgba(0, 0, 0, 0.2);
                    }

                    #reader {
                        width: 100%;
                        max-width: 350px;
                        height: 350px;
                        background: white;
                        border-radius: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0px 5px 15px rgba(0, 0, 0, 0.2);
                        margin-bottom: 15px;
                        overflow: hidden;
                    }

                    #result {
                        font-size: 18px;
                        font-weight: bold;
                        background: rgba(255, 255, 255, 0.2);
                        padding: 10px;
                        border-radius: 10px;
                        width: 90%;
                        max-width: 350px;
                        backdrop-filter: blur(10px);
                        margin-bottom: 10px;
                    }

                    button {
                        margin-top: 15px;
                        padding: 12px 20px;
                        font-size: 16px;
                        font-weight: bold;
                        cursor: pointer;
                        background: #ff6b81;
                        color: white;
                        border: none;
                        border-radius: 25px;
                        transition: 0.3s;
                        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.15);
                    }

                    button:hover {
                        background: #ff4757;
                        transform: scale(1.05);
                    }
                </style>
            </head>
            <body>

                <h1>출석체크하기</h1>
                <div id="reader"></div>
                <p id="result">화면의 QR 코드를 스캔하세요</p>
                <button onclick="location.href='/main'">돌아가기</button>

                <script>
                    let scanner;

                    function onScanSuccess(decodedText) {

                        fetch("/attend", { // 원하는 URL로 변경
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ random: decodedText })
                        })
                        .then(response => response.json())
                        .then(data => {
                            console.log("서버 응답:", data);
                        })
                        .catch(error => {
                            console.error("에러 발생:", error);
                        });

                        // 스캔 완료 후 자동 정지
                        stopScanner();
                    }

                    function startScanner() {
                        scanner = new Html5Qrcode("reader");

                        Html5Qrcode.getCameras()
                            .then(devices => {
                                console.log("🔹 감지된 카메라 목록:", devices); // 카메라 목록 출력

                                if (devices && devices.length) {
                                    // "back" 또는 "후면"이 포함된 카메라 찾기
                                    let backCamera = devices.find(device => 
                                        device.label.toLowerCase().includes("back") || 
                                        device.label.includes("후면")
                                    );

                                    // 후면 카메라가 없으면 첫 번째 카메라 사용
                                    let selectedCamera = backCamera ? backCamera.id : devices[0].id;
                                    
                                    console.log("📷 선택된 카메라:", selectedCamera);

                                    scanner.start(
                                        selectedCamera,
                                        { fps: 10, qrbox: { width: 250, height: 250 } },
                                        onScanSuccess
                                    ).catch(err => {
                                        console.error("QR 코드 스캐너 오류:", err);
                                    });
                                } else {
                                    console.error("❌ 사용할 수 있는 카메라가 없습니다.");
                                    alert("카메라를 찾을 수 없습니다. 브라우저 설정을 확인하세요.");
                                }
                            })
                            .catch(err => {
                                console.error("⚠️ 카메라 접근 실패:", err);
                                alert("카메라에 접근할 수 없습니다. 브라우저 설정을 확인하세요.");
                            });
                    }




                    function stopScanner() {
                        if (scanner) {
                            scanner.stop().then(() => {
                                console.log("QR 스캐너 중지됨");
                            }).catch(err => {
                                console.error("스캐너 중지 실패:", err);
                            });
                        }
                    }

                    // 페이지 로드 시 자동 실행
                    startScanner();
                </script>

            </body>
            </html>

        `;
    },
};
