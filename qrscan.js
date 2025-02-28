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
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        margin: 20px;
                    }
                    #reader {
                        width: 100%;
                        max-width: 400px;
                        margin: auto;
                    }
                    #result {
                        font-size: 18px;
                        margin-top: 10px;
                        font-weight: bold;
                    }
                    button {
                        margin-top: 15px;
                        padding: 10px 15px;
                        font-size: 16px;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>

                <h1>QR 코드 스캐너</h1>
                <div id="reader"></div>
                <p id="result">QR 코드를 스캔하세요...</p>
                <button onclick="stopScanner()">스캔 중지</button>

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
                                    // "front" 또는 "전면"이 포함된 카메라 찾기 (한국어/영어 대응)
                                    let frontCamera = devices.find(device => 
                                        device.label.toLowerCase().includes("front") || 
                                        device.label.includes("전면")
                                    );

                                    let selectedCamera = frontCamera ? frontCamera.id : devices[1].id; // 없으면 기본 카메라 선택
                                    
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
