var generateRandomString = require("./generateRandomString")
var qrcode = require("qrcode")

function generateQRcode() {
    url = generateRandomString(11);
    qrcode.toDataURL(url, function (err, res) {
        if (err) {
          console.error('QR 코드 생성에 실패했습니다:', err);
          return;
        }
        const img = `<img src="${res}" alt="QR Code"/>`;
        document.getElementById('qrcode').innerHTML = img;
    });
}