import 'dotenv/config';
import {Router} from 'express'
import {addToCart , getCart , checkoutCart , generatePreview , removeFromCart , clearCart , updateLyrics } from '../controllers/cart.controller.js'
import { isAuthenticated } from '../middleware/auth.js';

const router = Router()

router.get("/getCart", isAuthenticated, getCart);
router.post("/:id/generate-preview", isAuthenticated, generatePreview);
router.patch("/:id/lyrics", isAuthenticated, updateLyrics);
router.delete("/:id", isAuthenticated, removeFromCart);
router.post("/checkout", isAuthenticated, checkoutCart);
router.post("/addToCart", isAuthenticated, addToCart);
router.delete("/clearCart/:userId", isAuthenticated, clearCart)

export default router;