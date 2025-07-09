import express from 'express'
import cors from 'cors';
import usersRoutes from './routes/users.routes.js'

const app = express()

app.use(cors({
  origin: true,          // lee el Origin de la petición y lo responde
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json()) // Middleware to parse JSON bodies
app.use('/users', usersRoutes)
export default app;
