import express from 'express'
import { getMe, login, register } from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/auth.middleware.js'
const authRoute = express()

authRoute.post('/register', register)
authRoute.post('/login', login)
// authRoute.post('/logout', )
authRoute.get('/me',authenticate,getMe)
// authRoute.patch('/me',)

export default authRoute
