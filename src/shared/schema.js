// src/schema.js
import {
  pgTable,
  text,
  serial,
  boolean,
  timestamp,
  varchar,
  jsonb,
  index,
  decimal,
  integer
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Session storage table for authentication
export const sessions = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  table => [ index('IDX_session_expire').on(table.expire) ]
);

// Users table with social login support
export const users = pgTable('users', {
  id: varchar('id').primaryKey().notNull(),
  email: varchar('email', { length: 100 }).unique(),
  firstName: varchar('first_name', { length: 50 }),
  lastName: varchar('last_name', { length: 50 }),
  password: varchar('password', { length: 255 }),
  profileImageUrl: varchar('profile_image_url'),
  provider: varchar('provider', { length: 20 }).default('local'),
  providerId: varchar('provider_id'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Leads table
export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  message: text('message'),
  action: text('action').notNull(),
  source: text('source').notNull(),
  pageSection: text('page_section'),
  timestamp: timestamp('timestamp').notNull(),
});

// Chat messages table
export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  message: text('message').notNull(),
  response: text('response').notNull(),
  timestamp: timestamp('timestamp').notNull(),
});

// Song requests table
export const songRequests = pgTable('song_requests', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id').references(() => users.id),
  dedicatedTo: text('dedicated_to'),
  prompt: text('prompt').notNull(),
  genres: text('genres').array().notNull(),
  singerGender: varchar('singerGender', { length: 10 }).notNull().default('male'),
  status: text('status').notNull().default('pending'),
  previewUrl: text('preview_url'),
  finalUrl: text('final_url'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('49.99'),
  timestamp: timestamp('timestamp').notNull(),
});

// Cart items table
export const cartItems = pgTable('cart_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  dedicatedTo: text('dedicated_to'),
  prompt: text('prompt').notNull(),
  genres: text('genres').array().notNull(),
  singerGender: varchar('singerGender', { length: 10 }).notNull().default('male'),
  previewUrl: text('preview_url'),
  status: text('status').notNull().default('draft'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('49.99'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Nueva tabla para órdenes de pago (historial de compras)
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id").unique().notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('completed'), // completed, refunded, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
// Nueva tabla para items de órdenes (canciones específicas pagadas)
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  songRequestId: integer("song_request_id").references(() => songRequests.id),
  dedicatedTo: text("dedicated_to"),
  prompt: text("prompt").notNull(),
  genres: text("genres").array().notNull(),
  singerGender: varchar('singerGender', { length: 10 }).notNull().default('male'),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default('processing'), // processing, completed, delivered
  previewUrl: text("preview_url"),
  lyrics: text("lyrics"), // Campo para letras preview
  finalUrl: text("final_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Validation schemas
export const insertUserSchema = createInsertSchema(users)
  .pick({ email: true, firstName: true, lastName: true, password: true })
  .extend({ confirmPassword: z.string().min(1, 'Confirma tu contraseña') })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const upsertUserSchema = createInsertSchema(users)
  .pick({ id: true, email: true, firstName: true, lastName: true, profileImageUrl: true, provider: true, providerId: true });

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  songRequestId: true,
  previewUrl: true,
  finalUrl: true,
  createdAt: true,
});


export const insertLeadSchema = createInsertSchema(leads).omit({ id: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true });
export const insertSongRequestSchema = createInsertSchema(songRequests).omit({ id: true, status: true, previewUrl: true, finalUrl: true });
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ id: true, status: true, previewUrl: true, createdAt: true, updatedAt: true });

