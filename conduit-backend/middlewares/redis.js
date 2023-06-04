const express = require('express')

const RedisStore = require('connect-redis').default

const redis = require('redis')

const redisClient = redis.createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
})

redisClient.on('connect', () => {
  console.log('Redis client connected')
})

redisClient.on('error', err => {
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
  .catch(err => {
    console.log(err.message)
  })

const sessionStore = new RedisStore({
  client: redisClient,
})

module.exports = sessionStore
