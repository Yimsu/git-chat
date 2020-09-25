const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Room = require('../schemas/room');
const Chat = require('../schemas/chat');
//const User = require('../schemas/user');

const router = express.Router();



// 채팅방 목록이 보이는 메인화면을 렌더링
router.get('/', async (req, res, next) => {
    try {
        const rooms = await Room.find({});

        res.render('main', {
            rooms,
            title: 'GIF 채팅방',

        });
    } catch (error) {
        console.error(error);
        next(error);
    }
});

// 채팅방 생성화면을 렌더링
router.get('/room', (req, res) => {
    res.render('room', { title: 'GIF 채팅방 생성' });
});

// 채팅방을 만드는 라우터
router.post('/room', async (req, res, next) => {
    try {
        const newRoom = await Room.create({
            title: req.body.title,
            max: req.body.max,
            owner: req.session.color,
            password: req.body.password,
        });
        const io = req.app.get('io'); //socket.js에서 저장한 io를 가지고 옴
        // /room 네임스페이스에 연결한 모든 클라이언트에 데이터를 보내는 메서드
        io.of('/room').emit('newRoom', newRoom);
        res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

// 채팅방을 렌더링 하는 라우터
router.get('/room/:id', async (req, res, next) => {
    try {
        const room = await Room.findOne({ _id: req.params.id });

        const io = req.app.get('io');
        // 방이 존재하는지 검사
        if (!room) {
            return res.redirect('/?error=존재하지 않는 방입니다.');
        }
        //비밀번호가 맞는지 검사
        if (room.password && room.password !== req.query.password) {
            return res.redirect('/?error=비밀번호가 틀렸습니다.');
        }
        //방에 인원이 초과했는지 검사
        const { rooms } = io.of('/chat').adapter; //방 목록
        // 해당 방의 소켓 목록
        if (rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length) {
            return res.redirect('/?error=허용 인원이 초과하였습니다.');
        }
        const chats = await Chat.find({ room: room._id }).sort('createdAt');


//  console.log('================')
// console.log(req.session.color)
//       //const userid = rooms[req.params.id].sockets;
//         console.log(room._id)
//
// //console.log(rooms[req.params.id].sockets);
//         const userlist = rooms[req.params.id].sockets
//        const json =  JSON.stringify(userlist)
//         const first_key = Object.keys(json);
//         console.log(json)
//
//  console.log('================')

        return res.render('chat', {
            room,
            title: room.title,
            chats: [],
            user: req.session.color,
           // userlist: json,
        });
    } catch (error) {
        console.error(error);
        return next(error);
    }
});

// 채팅방 삭제
router.delete('/room/:id', async (req, res, next) => {
    try {
        await Room.remove({ _id: req.params.id });
        await Chat.remove({ room: req.params.id });
        res.send('ok');
        setTimeout(() => {
            req.app.get('io').of('/room').emit('removeRoom', req.params.id);
        }, 2000);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

// 채팅내용 전송
router.post('/room/:id/chat', async (req, res, next) => {
    try {
        const chat = await Chat.create({
            room: req.params.id,
            user: req.session.color,
            chat: req.body.chat,
        });
        // 같은 방에 들어있는 소켓들에게 메시지 데이터를 전송함
        req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
        res.send('ok');
    } catch (error) {
        console.error(error);
        next(error);
    }
});


try {
    fs.readdirSync('uploads');
} catch (err) {
    console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('uploads');
}

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, done) {
            done(null, 'uploads/');  //uploads폴더에 사진을 저장
        },
        filename(req, file, done) {  //파일명
            const ext = path.extname(file.originalname);
            done(null, path.basename(file.originalname, ext) + Date.now() + ext);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

//채팅 이미지 전송
router.post('/room/:id/gif', upload.single('gif'), async (req, res, next) => {
    try {
        const chat = await Chat.create({
            room: req.params.id,
            user: req.session.color,
            gif: req.file.filename,
        });

        req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
        res.send('ok');
    } catch (error) {
        console.error(error);
        next(error);
    }
});


module.exports = router;