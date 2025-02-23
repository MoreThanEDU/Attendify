가장 쉬운 출석체크,

# **Attendify**

Attendify 공식 개발 문서입니다. This is Attendify's official development docs.

Attendify 서비스는 기본적으로 Github를 통해 공동작업하며, 프로그래밍 스택으로는 NodeJS를 사용하고 있습니다.  Attendify basically uses Github for cooperating, and NodeJS for programming stack.

이 문서에서는 Attendify의 파일별 함수 위치, 사용하는 npm 모듈 등 개발에 필요한 내용을 안내하고 있습니다. This guides necessary information for programming such as npm modules.

이 문서는 보안상 회사 외부로의 유출을 엄격히 금지하고 있습니다. 외부로 유출할 경우 법률에 따라 처벌받습니다.  For security reasons, this document is strictly prohibited from being leaked outside the company. If it is leaked to the outside world, you will be punished according to the law.



## 사용하는 npm 모듈 목록 (List of npm modules that are using)

express

express-session

body-parser

path

node-cron

sqlite3

md5

ioredis

coolsms **[Github 페이지 필수 참고: https://github.com/coolsms/coolsms-nodejs]**



## Github 레포지토리 구조 (Structure of Github Repositories)

Main(사용자 프로덕션 User Production)

​	-Develop(개발중 베타버전 Beta Version)

​		-기타 기능1(이슈) Other functions1(On Issue Tab)

​		-기타 기능2(이슈) Other functions2(On Issue Tab)

​		-...



***주의! 반드시 .gitignore 파일을 생성 후 node_modules/ 를 추가한 뒤 Push 하시기 바랍니다.***



## 각 함수별 코드 위치, 기능 (Functions' location and functions for each)

**<index.js>**

- main: 선생, 학생 홈화면 Teachers and Students' home page
- lecture: 강좌 상세 화면(현재 선생만 구현, 학생용 개발 예정) Details for each lecture page. (Only teacher page now)
- attendancelist: 강좌 상세 화면에서 보이는 학생 목록(iframe) List of students in lecture detail page.
- changestatus: 강좌 상세 화면에서 학생의 출석 상태 수정 Changing status of students'



**<lecture.js>**

- create-lecture: 강좌 생성 페이지 get 요청 반환 Returning GET request(Lecture creating page)
- lec_create: 강좌 생성 post 요청 Creating lecture(POST request)
- newsession: 회차 생성 Creating session
- enroll-lecture: 강좌 참여 Participating lecture



**<login_logout.js>**

- login(get): 로그인 페이지 Login Page
- login(post): 로그인 요청 Login request
- logout: 로그아웃 기능(랜딩페이지X) Logout feature(No landing page)



**<phoneauth.js>**

- account/find: 계정 찾기 페이지 Account finding page
- account/success: 찾기 성공 페이지(정보 보여주는것 구현해야함) Succeed in finding account page(Not completed)

- account/blocked: 요청 많으면 차단 Block when too many requests
- request-code: 코드 생성 및 전송 Creating code and sending
- verify-code: 코드 검증 Code verification



**<signup_delete.js>**

- signup: 회원가입 페이지 Signup page

- request-code: 코드 생성 및 전송 Creating code and sending
- signup(post): 회원가입 처리 Proceeding signup

- delete-account(get): 계정 삭제 페이지 Account deleting page
- delete-account(post): 계정 삭제 요청 처리 Process account deletion requests
- cancle-delete: 계정 삭제 철회 Withdraw account deletion