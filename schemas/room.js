const mongoose = require('mongoose');

const { Schema } = mongoose;
const roomSchema = new Schema({
    title: {  // 방제목
        type: String,
        required: true,
    },
    max: {  //최대 수용인원
        type: Number,
        required: true,
        default: 10,
        min: 2,
    },
    owner: {  //방장
        type: String,
        required: true,
    },
    password: String,   //비밀번호
    createdAt: {  // 생성시간
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Room', roomSchema);