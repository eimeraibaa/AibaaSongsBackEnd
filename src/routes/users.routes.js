import 'dotenv/config';
import {Router} from 'express'
import {loginUser,registerUser} from '../controllers/users.controller.js'
const router = Router()

router.post('/login',loginUser)
router.post('/register',registerUser)
//router.put('/users/:id')
//router.delete('/users/:id')


export default router;