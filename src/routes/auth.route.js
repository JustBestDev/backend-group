import express from 'express'
import { register } from '../controllers/auth.controller.js'
const authRoute = express()

authRoute.post('/register', register)
// authRoute.post('/login', )
// authRoute.post('/logout', )
// authRoute.get('/me',)
// authRoute.patch('/me',)

export default authRoute
