import Promise from 'bluebird';
import nconf from 'nconf';
import redis from 'redis';

import logger from './logger';
import sentry from './sentry';

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

const client_url = nconf.get('REDIS_URL') || nconf.get('REDISCLOUD_URL') || 'redis://127.0.0.1:6379';
const client = redis.createClient({url: client_url});
export default client;


client.on('connect', () => logger.info('Redis connected'));
client.on('reconnecting', () => logger.warn('Redis reconnecting'));
client.on('ready', () => logger.info('Redis ready'));
client.on('error', err => sentry(err, 'redis'));


// Gets a users language based on ID
export function getUserLang(user_id) {
  return client.hgetAsync(`user_${user_id}`, 'lang')
    .then(lang => lang || 'en')
    .timeout(2000)
    .catch(err => {
      sentry(err, 'getUserLang');
      return 'en';
    });
}

// Sets a users language based on ID
export function setUserLang(user_id, lang) {
  return client.hsetAsync(`user_${user_id}`, 'lang', lang)
    .timeout(2000)
    .catch(err => {
      sentry(err, 'setUserLang');
    });
}

export function getMessageTTL(user_id) {
  return client.getAsync(`ttl_${user_id}`)
    .timeout(2000)
    .catch(err => {
      sentry(err, 'getMessageTTL');
      return false;
    });
}

export function setMessageTTL(user_id) {
  const key = `ttl_${user_id}`;
  return client.multi()
    .set(key, 1)
    .expire(key, nconf.get('MESSAGE_TTL') || 1)
    .execAsync()
    .timeout(2000)
    .catch(err => {
      sentry(err, 'setMessageTTL');
    });
}
