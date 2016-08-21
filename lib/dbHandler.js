
var mongoClient = require('mongodb').MongoClient;
var mogoUrl = 'mongodb://localhost:27017/nichetest';
var BSON = require('bson');

function checkUserExists(req, res) {
	mongoClient.connect(mogoUrl, function (err, db) {
		var cursor = db.collection('user').find({ "email": req.body.pNumber }).toArray(function (err, doc) {
			if (err) {
				res.send(500);
				db.close();
			}
			else if (!doc || doc.length == 0) {
				insertUser(req, res);
				db.close();

			} else {
				res.send(404);
				db.close();
			}
		});
    });
};

function updataUserInfo(req, res, data, isAjax) {
	mongoClient.connect(mogoUrl, function (err, db) {
		db.collection('user').updateOne(
			{ "email": req.session.user[0].email },
			{
				$set: data,
				$currentDate: { "lastModified": true }
			});
		var cursor = db.collection('user').find({ "email": req.session.user[0].email }).toArray(function (err, doc) {
			if (doc != null && doc.length > 0) {
				req.session.user = doc;
				var data = { "data": doc, "type": "modify" };
				if (isAjax) {
					res.send(data);
				}
				else {
					res.render('perInformation', { title: "PerInformation", user: req.session.user[0] });
				}
			}
			db.close();
		});
	});
};

function updateUserFriendList(req, res, friend, friendData) {
	mongoClient.connect(mogoUrl, function (err, db) {
		db.collection('user').updateOne(
			{ "email": req.session.user[0].email },
			{
				$set: friend,
				$currentDate: { "lastModified": true }
			});
		db.collection('user').find({ "email": req.session.user[0].email }).toArray(function (err, doc) {
			if (doc != null && doc.length > 0) {
				req.session.user = doc;
			}
		});
		db.collection('user').find({ $or: friendData }).toArray(function (err, doc) {
			if (doc != null && doc.length > 0) {
				var currentIndex = findInArray(toObjectId(req.body.user), doc);
				var currentUser;
				if (currentIndex !== -1) {
					currentUser = doc[currentIndex];
				}
				var data = { "currentUser": currentUser };
				res.send(data);
			}
			db.close();
		});
	});
}

function toObjectId(id) {
    if (id == "" || id == "null" || id == "undefined" || id == undefined || id == null) return null;
    return BSON.ObjectID.createFromHexString(id);
}

function findInArray(data, array) {
	var index = -1;
	for (var j = 0; j < array.length; j++) {
		if (array[j]._id.toString() === data.toString()) {
			index = j;
		}
	}
	return index;
}

function searchFriendInfo(req, res, friendArray, userInfo, userList) {
	mongoClient.connect(mogoUrl, function (err, db) {
		db.collection('user').find({ $or: friendArray }).toArray(function (err, doc) {
			if (doc != null && doc.length > 0) {
				var friendList = new Array();
				for (var i = 0; i < doc.length; i++) {
					var index = findInArray(doc[i]._id, userList);
					var count = userList[index].count;
					friendList.push({ friend: doc[i], count: count });
				}
				res.render("homepage", { title: 'niche', userInfo: userInfo, data: userList, friendList: friendList });
				// res.send(data);
			}
			else {
				res.render("homepage", { title: 'niche', userInfo: userInfo, data: userList, friendList: null });
			}
			db.close();
		});
	});
};


function searchUser(req, res) {
	mongoClient.connect(mogoUrl, function (err, db) {
		var searchContent = req.session.user[0].userTab;
		var search = new Array();
		for (var i = 0; i < searchContent.length; i++) {
			search.push({ "userTab": searchContent[i] });
		}
		//req.session.userlike = "";
		db.collection('user').find({ $or: search }).toArray(function (err, doc) {
			var userInfo = new Object();
			userInfo.uname = req.session.user[0].username;
			userInfo.userTab = req.session.user[0].userTab;
			userInfo.friendlist = req.session.user[0].friendList ? req.session.user[0].friendList : new Array();
			userInfo.photo = req.session.user[0].photo;
			if (doc != null && doc.length > 0) {
				var child = req.session.user[0].userTab;
				if (child) {
					var newChild = new Array();
					for (var key in doc) {
						var temp = doc[key];
						if (temp.email != req.session.user[0].email) {
							var objChild = new Object;
							objChild.userTab = new Array();
							objChild.count = 0;

							for (var i = 0; i < child.length; i++) {
								if (temp.userTab.indexOf(child[i]) != -1) {
									objChild.username = temp.username;
									objChild._id = temp._id;
									objChild.age = temp.age;
									objChild.sex = temp.sex;
									objChild.email = temp.email;
									objChild.photo = temp.photo;
									objChild.userTab.push(child[i]);
									objChild.count++;
								}
							}
							newChild.push(objChild);
						}
					}
					newChild.sort(function (a, b) {
						return b["count"] - a["count"];
					});
					var friendData = new Array();
					for (var i = 0; i < userInfo.friendlist.length; i++) {
						friendData.push({ "_id": toObjectId(userInfo.friendlist[i]) });
					}
					if (friendData.length > 0) {
						searchFriendInfo(req, res, friendData, userInfo, newChild);
					}
					else {
						res.render("homepage", { title: 'niche', userInfo: userInfo, data: newChild, friendList: userInfo.friendlist });
						db.close();
					}
				}
				else {
					res.render("homepage", { title: 'niche', userInfo: userInfo, data: "" });
					db.close();
				}
			}
			else {
				res.render("homepage", { title: 'niche', userInfo: userInfo, data: "" });
				db.close();
			}
		});
	});
};

function findUserName(req, res, pNumber) {
	mongoClient.connect(mogoUrl, function (err, db) {
		var cursor = db.collection('user').find({ "email": pNumber }).toArray(function (err, doc) {
			if (err) {
				res.send(500);
				db.close();
			}
			else if (!doc || doc.length == 0) {
				req.session.error = '用户名不存在';
				res.send(404);
				db.close();

			} else {
				if (req.body.upwd != doc[0].password) {
					req.session.error = "密码错误";
					res.send(404);
					db.close();
				} else {
					req.session.user = doc;
					if (doc[0]._id) {
						res.cookie('user', doc[0]._id.toString(), { maxAge: 1000 * 60 * 60 * 24 * 7 });
					}
					res.send(200);
					// res.redirect("/search");
					db.close();
				}
			}
		});
    });
};

function insertUser(req, res) {
	mongoClient.connect(mogoUrl, function (err, db) {
		db.collection('user').insertOne({
			"username": req.body.uname,
			"email": req.body.pNumber,
			"password": req.body.upwd,
			"sex": req.body.sex
			// "photo": "avatar/" + req.body.pNumber + "_" + "main.png",
			// "right1": "avatar/" + req.body.pNumber + "_" + "right1.png",
			// "right2": "avatar/" + req.body.pNumber + "_" + "right2.png",
			// "btom1": "avatar/" + req.body.pNumber + "_" + "btom1.png",
			// "btom2": "avatar/" + req.body.pNumber + "_" + "btom2.png",
			// "btom3": "avatar/" + req.body.pNumber + "_" + "btom3.png"
		});
		findUserName(req, res, req.body.pNumber);
	});
}

function findUser(req, res) {
	mongoClient.connect(mogoUrl, function (err, db) {
		var cursor = db.collection('user').find().toArray(function (err, doc) {
			var dataM = new Array();
			var dataF = new Array();
			var flagM = 0;
			var flagF = 0;
			if (doc != null && doc.length != 0) {
				for (var i = 0; i < doc.length; i++) {
					if (doc[i].sex == "male") {
						if (flagM < 4) {
							dataM.push(doc[i]);
							flagM++
						}
					}
					else {
						if (flagF < 4) {
							dataF.push(doc[i]);
							flagF++;
						}
					}

					if (flagF >= 4 && flagM >= 4) {
						break;
					}
				}
			}

			for (var i = 0; i < dataM.length; i++) {
				dataF.push(dataM[i]);
			}
			if (!req.session.user) {
				res.render("homepage", { title: "Home", name: "null", data: dataF });
			}
			else {
				res.render("homepage", { title: "Home", name: req.session.user[0].username, data: doc });
			}
			db.close();
		});
	});
}

module.exports.updataUserInfo = updataUserInfo;
module.exports.searchUser = searchUser;
module.exports.findUserName = findUserName;
module.exports.checkUserExists = checkUserExists;
module.exports.updateUserFriendList = updateUserFriendList;