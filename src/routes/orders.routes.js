import 'dotenv/config';
import {Router} from 'express'
import { isAuthenticated } from '../middleware/auth.js';
import {
  createOrder,
  createOrderItem,
  getUserOrders,
  checkSongPayment,
  updateOrderItemStatus
} from '../controllers/orders.controller.js';

const router = Router()

router.post('/createOrder', isAuthenticated, createOrder);
router.post('/createOrderItem', isAuthenticated, createOrderItem);
router.get('/getUserOrders', isAuthenticated, getUserOrders);
router.post('/checkSongPayment', isAuthenticated, checkSongPayment);
router.patch('/updateOrderItemStatus/:id', isAuthenticated, updateOrderItemStatus)

export default router;
