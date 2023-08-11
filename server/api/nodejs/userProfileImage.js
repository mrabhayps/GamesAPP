var express = require('express');
const app = express();
const port = 3010;
var multer = require('multer');
var config=require('../../common/secret.config.json');

var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, '/home/vcoi/images/user/');
     },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '.' + file.originalname.split('.')[file.originalname.split('.').length - 1].toLowerCase());
    }
});

var upload = multer({ storage: storage });


app.get('/', (req, res) => {
    res.send('hello File Upload');
});

app.post('/single', upload.single('profile'), (req, res) => {
    try {
        res.send({"meta":{"error":false,"statusCode":200,"message":"User Image Upload Successfully","recordTotal":0},"data":{"filename":config.userProfileImage+req.file.filename}});
    }catch(err) {
        res.send({"meta":{"error":true,"statusCode":500,"message":"User Image Upload Failed","recordTotal":0},"data":[]});
    }
});

app.listen(port, () => {
    console.log('listening to the port: ' + port);
    console.log("This port is using for user image file upload ");
});
