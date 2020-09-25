const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const nunjucks = require('nunjucks');
const dotenv = require('dotenv');
const ColorHash = require('color-hash');

dotenv.config();
const webSocket = require('./socket');
const indexRouter = require('./routes');
const connect = require('./schemas');

const app = express();
app.set('port', process.env.PORT || 8005);
app.set('view engine', 'html');
nunjucks.configure('views', {
    express: app,
    watch: true,
});
connect();

/*
방에 입장, 퇴장 때 채팅방의 다른 사람에게 ***님이 입장하셨습니다.같은 메세지 보내주기
사용자의 이름은 세션에 들어있기 떄문에 Socket.IO에서 세션에 접근하려면 추가작업이 필요하다
Socket.IO도 미들웨어를 사용할 수 있으므로 express-session을 공유하면 된다.
추가로 채팅방 접속자가 0명일 때 방을 제거하는 코드도 넣는다.
*/

const sessionMiddleware = session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        httpOnly: true,
        secure: false,
    },
});
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/gif', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(sessionMiddleware);

/*
 현재 우리가 사용할 수 있는 고유한 값은 세션아이디(req.sessionID)와 소켓아이디(socket.id)이다.
 매번 페이지를 이동할 때마다 소켓연결이 해제,연결이 반복되면서 소켓아이디가 바뀌어 버린다.
 때문에 세션아이디를 사용한다.

color-hash패키지는 세션 아이디를 HEX형식의 색상 문자열(#12C6B8)로 바꿔주는 패키지이다.
해시이므로 같은 세션 아이디는 항상 같은 색상 문자열로 바뀐다.
*/
//맨처음 접속
app.use((req, res, next) => {
    if (!req.session.color) {
        const colorHash = new ColorHash();
        req.session.color = colorHash.hex(req.sessionID);
        console.log('22222222')
    }
    next();
});

app.use('/', indexRouter);

app.use((req, res, next) => {
    const error =  new Error(`${req.method} ${req.url} 라우터가 없습니다.`);
    error.status = 404;
    next(error);
});

app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = process.env.NODE_ENV !== 'production' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

const server = app.listen(app.get('port'), () => {
    console.log(app.get('port'), '번 포트에서 대기중');
});

webSocket(server, app, sessionMiddleware);