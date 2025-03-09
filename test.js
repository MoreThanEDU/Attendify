const coolsms = require('coolsms-node-sdk').default;

// apiKey, apiSecret 설정
const messageService = new coolsms('NCSWP3E1RLJHQG9Q', 'PW1E8H0L8C2AFDNCZ5H66LIM5PPK8XFX');

// 2건 이상의 메시지를 발송할 때는 sendMany, 단일 건 메시지 발송은 sendOne을 이용해야 합니다. 
messageService.sendOne({
      to: '01039949214',
      from: '01088501571',
      text: '한글 45자, 영자 90자 이하 입력되면 자동으로 SMS타입의 메시지가 발송됩니다.'
    }).then(res => console.log(res))
  .catch(err => console.error(err));