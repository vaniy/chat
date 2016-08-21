var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require('path');
var routes = require('./routes/index');
var users = require('./routes/users');
var app = express();
app.use(cookieParser());
app.use(session({ 
	secret: 'secret',
	cookie:{ 
		maxAge: 1000*60*60*24*7
	}
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine("html",require("ejs").__express);
//app.set("view engine","ejs");
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Routing
app.use(express.static(__dirname + '/public'));

app.use(function(req,res,next){ 
	res.locals.user = req.session.user;
	var err = req.session.error;
	delete req.session.error;
	res.locals.message = "";
	if(err){ 
		res.locals.message = '<div class="alert alert-danger" style="margin-bottom:20px;color:red;">'+err+'</div>';
	}
	next();
});

 app.use('/', routes);  // 即为为路径 / 设置路由
app.use('/users', users); // 即为为路径 /users 设置路由
app.use('/sign_in',routes); // 即为为路径 /login 设置路由
app.use('/sign_out',routes); // 即为为路径 /login 设置路由
app.use('/search',routes); 
app.use('/homepage',routes);
app.use('/perInformation',routes);
app.use('/portal',routes);
app.use('/sign_up',routes); // 即为为路径 /register 设置路由
app.use('/home',routes); // 即为为路径 /home 设置路由
// app.use("/logout",routes); // 即为为路径 /logout 设置路由

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

module.exports = app;