const express = require('express')

const RedisStore = require('connect-redis').default

const redis = require('redis')

const redisClient = redis.createClient({
  password: 'BKDNwuc80RfL5nzrdeMgibvvEcQgHufD',
  socket: {
    host: 'redis-16491.c212.ap-south-1-1.ec2.cloud.redislabs.com',
    port: 16491,
  },
})


redisClient.on('connect', () => {
  console.log('Redis client connected')
})

redisClient.on('error', (err) => {
  console.error('Redis error:', err)
})

redisClient.on('ready', () => {
  console.log('Redis is ready')
})

redisClient.on('end', () => {
  console.log('Redis connection ended')
})


redisClient
  .connect()
  .then(() => {
    console.log('Connected to Redis')
  })
  .catch((err) => {
    console.log(err.message)
  })

const sessionStore = new RedisStore({
  client: redisClient,
})

module.exports = sessionStore
