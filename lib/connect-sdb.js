/*!
 * connect-sdb
 * Copyright(c) 2013 Farid Fadaie <farid.fadaie@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var sdb = require('simpledb');
var url = require('url');


/**
 * Default options
 */

var defaultOptions = {
	stringify: true,
	domain_name: 'sessions',
	cleanup_interval : 60000,
	defaultExpirationTime: 1000 * 60 * 60 * 24 * 14
};

module.exports = function(connect) {
	var Store = connect.session.Store;

	/**
	 * Initialize SdbStore with the given `options`.
	 *
	 * @param {Object} options
	 * @api public
	 */

	function SdbStore(options, callback) {
		options = options || {};
		Store.call(this, options);

		if (options.keyid && options.secret) {
			options.keyid = options.keyid;
			options.secret = options.secret;

			this.db = new sdb.SimpleDB({
				keyid: options.keyid,
				secret: options.secret
			});

		} else {
			if (!options.db) {
				throw new Error('Required SdbStore option `db` missing');
			}

			if (typeof options.db == "object") {
				this.db = options.db; // Assume it's an instantiated DB Object
			} else {
				throw new Error('`db` should be a simpledb object');
			}
		}
		this.domain_name = options.domain_name || defaultOptions.domain_name;
		this.stringify = options.hasOwnProperty('stringify') ? options.stringify : defaultOptions.stringify;
		this.cleanup_interval = options.cleanup_interval || defaultOptions.cleanup_interval;
		
		this._db_cleanup = function(){
			//this function removes expired sessions from the domain
			var query = "select * from `" + this.domain_name + "` where expires < '" + (new Date()).getTime() + "' limit 25";
			//the maximum number of items that can be deletect via batchDelete is 25.
			var self = this;
			this.db.select(query, function( error, result, meta ){
				if (error){
					setTimeout(self._db_cleanup.bind(self), self.cleanup_interval);
					return
				}
				if (result){
					var items = [];
					for (var i=0; i < result.length; i++){
						items.push({'$ItemName' : result[i]['$ItemName']});
					}
					if (items.length > 0){
					self.db.batchDeleteItem(self.domain_name, items, function(){
						setTimeout(self._db_cleanup.bind(self), self.cleanup_interval);
					})}else{
						setTimeout(self._db_cleanup.bind(self), self.cleanup_interval);
					}
				}
			});
		}
		this._db_cleanup();

		if (this.stringify) {
			this._serialize_session = JSON.stringify;
			this._unserialize_session = JSON.parse;
		} else {
			// Copy each property of the session to a new object
			this._serialize_session = function(session) {
				var obj = {};
				for (var prop in session) {
					if (typeof(session[prop]) != 'function') {
						if (prop === 'cookie') {
							// Convert the cookie instance to an object, if possible
							// This gets rid of the duplicate object under session.cookie.data property
							obj.cookie = JSON.stringify(session.cookie.toJSON ? session.cookie.toJSON() : session.cookie);
						} else {
							obj[prop] = JSON.stringify(session[prop]);
						}
					}
				}

				return obj;
			};

			this._unserialize_session = function(x) {
				delete x['$ItemName'];
				delete x['expires'];
				var obj = {}
				for (var prop in x) {
					obj[prop] = JSON.parse(x[prop])
				}
				return obj;
			};
		}

		var self = this;

		this.defaultExpirationTime = options.defaultExpirationTime || defaultOptions.defaultExpirationTime;
	};

	/**
	 * Inherit from `Store`.
	 */

	SdbStore.prototype.__proto__ = Store.prototype;

	/**
	 * Attempt to fetch session by the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} callback
	 * @api public
	 */

	SdbStore.prototype.get = function(sid, callback) {
		var self = this;
		this.db.getItem(this.domain_name, sid, function(err, session) {
			try {
				if (err) {
					callback && callback(err, null);
				} else {
					if (session) {
						if (!session.expires || (new Date()).getTime() < session.expires) {
							if (self.stringify) {
								callback(null, self._unserialize_session(session.session));
							} else {
								callback(null, self._unserialize_session(session));
							}

						} else {
							self.destroy(sid, callback);
						}
					} else {
						callback && callback();
					}
				}
			} catch (err) {
				callback && callback(err);
			}
		});
	};

	/**
	 * Commit the given `sess` object associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Session} sess
	 * @param {Function} callback
	 * @api public
	 */

	SdbStore.prototype.set = function(sid, session, callback) {
		var self = this;
		try {
			if (self.stringify) {
				var s = {
					session: this._serialize_session(session)
				};
			} else {
				var s = this._serialize_session(session);
			}
			if (session && session.cookie && session.cookie.expires) {
				s.expires = (new Date(session.cookie.expires)).getTime();
			} else {
				// If there's no expiration date specified, it is
				// browser-session cookie or there is no cookie at all,
				// as per the connect docs.
				//
				// So we set the expiration to two-weeks from now
				// - as is common practice in the industry (e.g Django) -
				// or the default specified in the options.
				var today = new Date();
				s.expires = today.getTime() + this.defaultExpirationTime;
			}

			this.db.putItem(this.domain_name, sid, s, function(err) {
				if (err) {
					callback && callback(err);
				} else {
					callback && callback(null);
				}
			});
		} catch (err) {
			callback && callback(err);
		}
	};

	/**
	 * Destroy the session associated with the given `sid`.
	 *
	 * @param {String} sid
	 * @param {Function} callback
	 * @api public
	 */

	SdbStore.prototype.destroy = function(sid, callback) {
		this.db.deleteItem(this.domain_name, sid, function(error, result, meta) {
			callback && callback();
		});
	};

	/**
	 * Fetch number of sessions.
	 *
	 * @param {Function} callback
	 * @api public
	 */

	SdbStore.prototype.length = function(callback) {
		this.db.domainMetadata(this.domain_name, function(err, res, meta) {
			if (err) {
				callback && callback(err);
			} else {
				callback && callback(null, res.ItemCount);
			}
		});
	};

	/**
	 * Clear all sessions.
	 *
	 * @param {Function} callback
	 * @api public
	 */

	SdbStore.prototype.clear = function(callback) {
		this.db.deleteDomain(this.domain_name, function(err, res, meta) {
			callback && callback();
		});
	};

	return SdbStore;
};
