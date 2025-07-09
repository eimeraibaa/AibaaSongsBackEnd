import {Router} from 'express'
import {loginUser,createUser} from '../controllers/users.controller.js'
const router = Router()

router.post('/',loginUser)
router.post('/create',createUser)
// router.put('/users/:id')
// router.delete('/users/:id')


export default router;