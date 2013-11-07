var express = require('express');
var SdbStore = require('../lib/connect-sdb')(express);
var app = express();

app.use(express.cookieParser()); // required to handle session cookies!
app.use(express.session({
	secret: 'YOUR_SESSION_SECRET',
	cookie: {
		//maxAge: 100000 // expire the session(-cookie) after 10 seconds
	},
	store: new SdbStore({
		defaultExpirationTime : 100000,
		stringify : false,		
		keyid: 'YOUR_AWS_KEY',
		secret: 'YOUR_AWS_SECRET'
	})
}));

app.get('/', function(req, res) {
	var previous = req.session.value || 0;
	req.session.value = previous + 1;
	res.send('<h1>Previous value: ' + previous + '</h1>');

});

app.listen(13000);
