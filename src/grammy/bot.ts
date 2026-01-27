import { APP_CONFIG } from '@/config'
import express from 'express'
import fs from 'fs'
import { Bot, webhookCallback } from 'grammy/web'
import http from 'http'
import https from 'https'

export const GRAMMY_BOT = new Bot(APP_CONFIG.botToken)

const server = express()
server.use(express.json())
server.use(webhookCallback(GRAMMY_BOT, 'express'))
if (APP_CONFIG.tls !== undefined) {
  const cert = fs.readFileSync(APP_CONFIG.tls.certPath)
  const key = fs.readFileSync(APP_CONFIG.tls.keyPath)
  https.createServer({ cert, key }, server).listen(APP_CONFIG.port)
}
else {
  http.createServer(server).listen(APP_CONFIG.port)
}
