var express = require('express');
var router = express.Router();
var mongoClient = require('mongodb').MongoClient;
var mogoUrl = 'mongodb://localhost:27017/nichetest';
var BSON = require('bson');
var dbHandler = require('../lib/dbHandler');
var socketHandler = require('../lib/chat_server');
var formidable = require('formidable'),
	fs = require('fs'),
	TITLE = 'formidable',
    AVATAR_UPLOAD_FOLDER = '/avatar/';

router.get('/submitform', function (req, res) {
	res.render('submitform', { title: TITLE });
});

router.post('/perInformation', function (req, res) {
	var email = "";
	if (!req.session.user) {
		res.redirect("/sign_in");
	} else {
		email = req.session.user[0].email;
		var form = new formidable.IncomingForm();   //创建上传表单
		form.encoding = 'utf-8';        //设置编辑
		form.uploadDir = 'public' + AVATAR_UPLOAD_FOLDER;     //设置上传目录
		form.keepExtensions = true;     //保留后缀
		form.maxFieldsSize = 2 * 1024 * 1024;   //文件大小

		form.parse(req, function (err, fields, files) {
			if (err) {
				res.locals.error = err;
				res.render('submitform', { title: TITLE });
				return;
			}
			var needChange = false;
			for (var key in files) {
				var extName = '';  //后缀名
				switch (files[key].type) {
					case 'image/pjpeg':
						extName = 'jpg';
						break;
					case 'image/jpeg':
						extName = 'jpg';
						break;
					case 'image/png':
						extName = 'png';
						break;
					case 'image/x-png':
						extName = 'png';
						break;
				}
				if (files[key].size == 0) {
					fs.unlinkSync(files[key].path);
				}
				else {
					needChange = true;
					var avatarName = email + "_" + key + '.' + extName;
					var newPath = form.uploadDir + avatarName;

					console.log(newPath);
					fs.renameSync(files[key].path, newPath);  //重命名
					var photodata = {};
					switch (key) {
						case "main": photodata = { photo: "avatar/" + avatarName };
							break;
						case "right1": photodata = { right1: "avatar/" + avatarName };
							break;
						case "right2": photodata = { right2: "avatar/" + avatarName };
							break;
						case "btom1": photodata = { btom1: "avatar/" + avatarName };
							break;
						case "btom2": photodata = { btom2: "avatar/" + avatarName };
							break;
						case "btom3": photodata = { btom3: "avatar/" + avatarName };
							break;
					}
					dbHandler.updataUserInfo(req, res, photodata, false);
				}
				if (!needChange) {
					//res.locals.error = '只支持png和jpg格式图片';
					//res.render('submitform', { title: TITLE });
					continue;
				}

			}
		});

		// res.locals.success = '上传成功';
		// res.render('perInformation', { title: TITLE, user: req.session.user[0] });
	}

});


/* GET index page. */
router.get("/", function (req, res, next) {
	res.render("portal", { title: 'Express' });
});
router.get("/index", function (req, res, next) {
	res.render("index", { title: 'Express' });
});

/* Get homepage */
router.route("/homepage").get(function (req, res) {
	if (!req.session.user) {
		res.redirect("/sign_in");
	}
	else {
		var userId = req.session.user[0]._id.toString();
		var name = req.session.user[0].username;
		var photo = req.session.user[0].photo;
		socketHandler.addUser(name, photo, userId);
		if (req.session.user[0].userTab && req.session.user[0].userTab) {
			dbHandler.searchUser(req, res);
		}
		else {
			var userInfo = new Object();
			userInfo.uname = req.session.user[0].username;
			userInfo.userTab = req.session.user[0].userTab;
			res.render("homepage", { title: 'niche', userInfo: userInfo, data: "firstin", friendList:null });
		}
	}
}).post(function (req, res) {
	if (req.body.userLike) {
		var flag = true;
		var data = new Object;
		if (req.body.userLike != "") {
			data.userTab = new Array();
			data.userTab.push(req.body.userLike);
			var userTab = req.session.user[0].userTab != null ? req.session.user[0].userTab : new Array();
			for (var i = 0; i < userTab.length; i++) {
				if (req.body.userLike != userTab[i]) {
					data.userTab.push(userTab[i]);
				} else {
					flag = false;
				}

			}
		}
		if (flag) {
			dbHandler.updataUserInfo(req, res, data, true);
		}
		else {
			var a = { "data": "" };
			res.send(a);
		}
	}

	if (req.body.userDislike) {
		var flag = false;
		var data = new Object;
		if (req.body.userDislike != "") {
			data.userTab = new Array();
			var userTab = req.session.user[0].userTab != null ? req.session.user[0].userTab : new Array();
			for (var i = 0; i < userTab.length; i++) {
				if (req.body.userDislike != userTab[i]) {
					data.userTab.push(userTab[i]);
				} else {
					flag = true;
				}

			}
		}
		if (flag) {
			dbHandler.updataUserInfo(req, res, data, true);
		}
		else {
			var a = { "data": "" };
			res.send(a);
		}
	}

	if (req.body.user && !req.body.userDislike && !req.body.userLike) {
		var friendList = req.session.user.length > 0 && req.session.user[0].friendList ? req.session.user[0].friendList : new Array();
		if (findInArray(req.body.user, friendList) === -1) {
			friendList.push(req.body.user);
			var friend = { "friendList": friendList };
			var friendData = new Array();
			for (var i = 0; i < friendList.length; i++) {
				friendData.push({ "_id": toObjectId(friendList[i]) });
			}
			dbHandler.updateUserFriendList(req, res, friend, friendData);
		}
		else{
			res.send({userId:req.body.user});
		}
	}
});

function findInArray(data, array) {
	var index = -1;
	for (var j = 0; j < array.length; j++) {
		if (array[j] === data) {
			index = j;
		}
	}
	return index;
}

function toObjectId(id) {
    if (id == "" || id == "null" || id == "undefined" || id == undefined || id == null) return null;
    return BSON.ObjectID.createFromHexString(id);
} 
// router.route("/search").get(function (req, res) {
// 	if (!req.session.user) {
// 		res.redirect("/sign_in");
// 	}
// 	res.render("search", { title: 'niche' });
// }).post(function (req, res) {
// 	if (req.body.userLike) {
// 		req.session.userlike = req.body.userLike;
// 		var flag = true;
// 		var data = new Object;
// 		if (req.body.userLike != "") {
// 			data.userTab = new Array();
// 			data.userTab.push(req.body.userLike);
// 			var userTab = req.session.user[0].userTab != null ? req.session.user[0].userTab : new Array();
// 			for (var i = 0; i < userTab.length; i++) {
// 				if (req.body.userLike != userTab[i]) {
// 					data.userTab.push(userTab[i]);
// 				} else {
// 					flag = false;
// 				}
// 
// 			}
// 		}
// 		if (flag) {
// 			dbHandler.updataUserInfo(req, res, data, true);
// 		}
// 		else {
// 			var a = { "data": "" };
// 			res.send(a);
// 		}
// 	}
// });

/* Get login page. */
router.route("/sign_in").get(function (req, res) {
	res.render("sign_in", { title: 'User Login' });
}).post(function (req, res) {
	var uname = req.body.Email;
	dbHandler.findUserName(req, res, uname);
});

/* GET home page. */
router.get("/home", function (req, res) {
	if (!req.session.user) { 					//到达/home路径首先判断是否已经登录
		req.session.error = "请先登录"
		res.redirect("/sign_in");				//未登录则重定向到 /login 路径
	}
	else {
		res.render("home", { title: 'Home', name: req.session.user[0].username });         //已登录则渲染home页面
	}
});

/* GET logout page. */
router.get("/sign_out", function (req, res) {    // 到达 /logout 路径则登出， session中user,error对象置空，并重定向到根路径
	req.session.user = null;
	req.session.error = null;
	res.redirect("/homepage");
});

/* GET register page. */
router.route("/sign_up").get(function (req, res) {    // 到达此路径则渲染register文件，并传出title值供 register.html使用
	res.render("sign_up", { title: 'User register' });
}).post(function (req, res) {
	dbHandler.checkUserExists(req, res);
});

/* Get PerInformation page */
router.route("/perInformation").get(function (req, res) {
	if (!req.session.user) {
		res.redirect("/sign_in");
	}
	else {
		res.render("perInformation", { title: 'User Information', user: req.session.user[0] });
	}
});


module.exports = router;