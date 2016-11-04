/**
 * 项目启动文件
 * 包含：路由及系统配置
 */

'use strict';

var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var server = app.listen(3000, listenHandler);
var io = require('socket.io')(server);
var router = require('./routes/index');
var url = require('url');

var menuRouter = require('./routes/menuRouter');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser('bear'));


//采用connect-mongodb中间件作session存储
var session = require('express-session'),
    Settings = require('./database/settings'),
    MongoStore = require('connect-mongodb'),
    db = require('./database/msession');

var mongoStore = new MongoStore({
    username: Settings.NAME,
    password: Settings.PASSWORD,
    db: db
});

// session配置
app.use(session({
    cookie: { maxAge: 1800000 },
    secret: Settings.COOKIE_SECRET,
    resave: true,
    saveUninitialized: true,
    store: mongoStore
}));

app.use(function (req, res, next) {
    res.locals.user = req.session.user;
    var err = req.session.error;
    delete req.session.error;
    res.locals.message = '';
    if (err) {
        res.locals.message = err;
    }
    next();
});

//设置默认的路由处理函数
app.use(router);
// app.use(menuRouter);


//监听socket连接
//var ioSocket = io.on('connection', function (socket) {
//    console.log('success...socket');
    //socket.emit('connect-success', { hello: 'world' });
    //
    //socket.on('select-dish', function (data) {
    //    ioSocket.emit('addDish', data);
    //});
    //
    //socket.on('unselect-dish', function (data) {
    //    ioSocket.emit('delDish', data);
    //});
    //
    ////监听添加选菜事件
    //socket.on('addMeal', function (data) {
    //    console.log(data);
    //    ioSocket.emit('someOneAddMeal', data);
    //});
    //
    //socket.on('deleteMeal', function (data) {
    //    console.log(data);
    //    ioSocket.emit('someOneDeleteMeal', data);
    //});
//});

let meal = io.of('/meal');
meal.on('connection', socket => {
    console.log('someone connect');
    //获取socket url上的参数
    let socketParams = socket.client.conn.request._query;
    //获取团队ID，由于团队ID是唯一的，所以满足每个团队一个点餐room的要求
    var teamId = socketParams.teamId;
    //加入一个room
    socket.join(teamId);
    //仅该room内的连接可以接收到该信息
    meal.to(teamId).emit('hii', 'I am room:' + teamId);

    //监听“点菜”事件，并将该菜品信息发送给该room内的所有人
    socket.on('add-dish', dishInfo => {
        meal.to(teamId).emit('someone-add-dish', dishInfo);
    });

    socket.on('del-dish', dishInfo => {
        meal.to(teamId).emit('someone-del-dish', dishInfo);
    });


    //该namespace下所有的room中的连接都能接收到该信息
    socket.emit('hi', 'everyone!');
});


function listenHandler() {
    console.log('Server started on port 3000');
}
