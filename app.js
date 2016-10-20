var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(require('less-middleware')(path.join(__dirname, 'public'), {compiler: {compress: false, yuicompress:false}}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

var proxy = require('http-proxy').createProxyServer({
	target: {
		host: 'localhost',
		port: 9090
	},
	ws: true})
	.on('error', console.error);

app.all('/webfile', function(req, res){
	proxy.web(req, res);
});
app.all('/Image', function(req, res){
	proxy.web(req, res);
});
app.all('/ws/webScheduler/*', function(req, res){
	proxy.web(req, res);
});
app.all('/Login*', function(req, res){
	proxy.web(req, res);
});
app.all('/reports/*', function(req, res){
	proxy.web(req, res);
});
app.all('/webapps/*', function(req, res){
	proxy.web(req, res);
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


var server = app.listen(3000, function () {
	  var host = server.address().address;
	  var port = server.address().port;
	  console.log('Example app listening at http://%s:%s', host, port);
	});

module.exports = app;
