import express from 'express'
import { login, register } from '../controllers/auth.controller.js'
const authRoute = express()

authRoute.post('/register', register)
authRoute.post('/login', login)
// authRoute.post('/logout', )
// authRoute.get('/me',)
// authRoute.patch('/me',)

export default authRoute
