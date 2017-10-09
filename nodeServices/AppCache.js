"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var nodeCache = require('node-cache');
const appCache = new nodeCache();
class AppCache {
    static Get(key, next) {
        appCache.get(key, (err, data) => {
            if (err) {
                console.log(`Error retrieving cache for key ${key}`, err);
            }
            next(err, data);
        });
    }
    static Set(key, value, timeoutS, next) {
        appCache.set(key, value, timeoutS, (err, data) => {
            if (err) {
                console.log(`Error caching key ${key}`, err);
            }
            next(err, data);
        });
    }
    static Invalidate(key, next) {
        appCache.del(key, (err, data) => {
            if (err) {
                console.log(`Error deleting cache for key ${key}`, err);
            }
            next(err, data);
        });
    }
    static Clear() {
        appCache.flushAll();
    }
}
exports.AppCache = AppCache;