const SocketIO = require('socket.io');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cookie = require('cookie-signature');

//const User = require('../schemas/user');

module.exports = (server, app, sessionMiddleware) => {
    const io = SocketIO(server, { path: '/socket.io' });
    app.set('io', io); //라우터에서 io객체를 쓸 수 있게 저장해둔다, req.app.get('io')로 접근할수있음

    //.of는 Socket.IO에 네임스페이스를 부여하는 메서드
    const room = io.of('/room');
    const chat = io.of('/chat');
    const user = io.of('/user');
    // 네임스페이스를 room과 chat으로 구문했으므로 지정된 네임스페이스에 연결한 클라이언트틀에게만 데이터전달

    //io.use에 미들웨어 장착
    // 모든 웹 소켓 연결 시마다 실행
    io.use((socket, next) => {
        cookieParser(process.env.COOKIE_SECRET)(socket.request, socket.request.res, next);
        sessionMiddleware(socket.request, socket.request.res, next);
    });

    // /room네임 스페이스에 이벤트리스너 붙여줌
    room.on('connection', (socket) => {
        console.log('room 네임스페이스에 접속');
        socket.on('disconnect', () => {
            console.log('room 네임스페이스 접속 해제');
        });
    });

    // 채팅방에 들어갈때
    chat.on('connection', (socket) => {
        console.log('chat 네임스페이스에 접속');
        const req = socket.request;
        const { headers: { referer } } = req;



        // try {
        //     const newUser = User.create({
        //         room: req.body.title,
        //         user: req.session.color,
        //     });
        //     const io = req.app.get('io'); //socket.js에서 저장한 io를 가지고 옴
        //     // /room 네임스페이스에 연결한 모든 클라이언트에 데이터를 보내는 메서드
        //     io.of('/room').emit('newRoom', newRoom);
        // } catch (error) {
        //     console.error(error);
        //     next(error);
        // };


        const roomId = referer
            .split('/')[referer.split('/').length - 1]
            .replace(/\?.+/, '');
        socket.join(roomId);  //접속(방id를 인수로 받음)

        const currentRoom = socket.adapter.rooms[roomId]; //침야증인 소켓정보가 들어있음
        const userCount = currentRoom.length;

        console.log("대화참여자는 총 몇명?",userCount)

        //socket.to(방 아이디)로 특정방에 데이터를 보냄
        socket.to(roomId).emit('join', {
            user: 'system',
            chat: `${req.session.color}님이 입장하셨습니다.`,
        });

        socket.on('disconnect', () => {
            console.log('chat 네임스페이스 접속 해제');

            socket.leave(roomId); //접속해제
            const currentRoom = socket.adapter.rooms[roomId]; //침야증인 소켓정보가 들어있음
            const userCount = currentRoom ? currentRoom.length : 0;
            if (userCount === 0) { // 유저가 0명이면 방 삭제
                const signedCookie = cookie.sign( req.signedCookies['connect.sid'], process.env.COOKIE_SECRET );
                const connectSID = `${signedCookie}`;
                axios.delete(`http://localhost:8005/room/${roomId}`, {
                    headers: {
                        Cookie: `connect.sid=s%3A${connectSID}`
                    }
                })

                    .then(() => {
                        console.log('방 제거 요청 성공');
                    })
                        .catch((error) => {
                            console.error(error);
                        });
            } else {
                socket.to(roomId).emit('exit', {
                    user: 'system',
                    chat: `${req.session.color}님이 퇴장하셨습니다.`,
                });
            }
        });
        socket.on('chat', (data) => {
            socket.to(data.room).emit(data);
        });

    });
};






/*
module.exports = (server) => {
    const io = SocketIO(server, { path: '/socket.io' });
    //SocketIO객체의 두번쨰 인수로 서버에 관한 여러 설정 가능

    //connection 이벤트는 클라이언트가 서버와 웹 소켓 연결을 맺을때 발생
    io.on('connection', (socket) => { // 웹소켓 연결 시
        const req = socket.request; //요청 객체에 접근
        // 클라이언트의 IP를 알아내는 방법! 중요
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        console.log('새로운 클라이언트 접속', ip);

        socket.on('disconnect', () => { // 연결 종료 시
            console.log('클라이언트 접속 해제', ip, socket.id); //socket.id로 소켓고유의 아이디 가지고옴
            clearInterval(socket.interval);  //꼭 정리를 해줘야함!!
        });
        socket.on('error', (error) => { // 에러 시
            console.error(error);
        });
        socket.on('reply', (data) => { // 클라이언트로부터 메시지
            console.log(data);
        });

        socket.interval = setInterval(() => { // 3초마다 클라이언트로 메시지 전송
            socket.emit('news', 'Hello Socket.IO');
            //new라는 이벤트 이름으로 Hello Socket.IO라는 데이터를 클라이언트에게 보낸 것
        }, 3000);
    });
};
*/
