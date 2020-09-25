const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema({
    user: {  //채팅을 한사람
        type: String,
        required: true,
    },
    room: {   //채팅방 아이디 , Room 스키마와 연결
        type: String,
        required: true,
        ref: 'Room',
    },
    createdAt: {  // 생성시간
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('User', userSchema);