
import os
import json

import redis


REDIS_HOST = os.getenv('REDIS_HOST')

if REDIS_HOST is not None and REDIS_HOST is not '':
    rc = redis.StrictRedis(host=REDIS_HOST)
else:
    rc = None
    local_cache = dict()


class RedisClient():
    def get(self, key):
        if rc is not None:
            return rc.get(key)
        else:
            return local_cache.get(key)

    def set(self, key, val):
        if rc is not None:
            rc.set(key, val)
        else:
            local_cache[key] = val
