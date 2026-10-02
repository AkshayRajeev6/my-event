import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table storing authenticated users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Events table storing event configurations
export const events = pgTable('events', {
  id: text('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  title: text('title').notNull(),
  date: text('date').notNull(),
  time: text('time'),
  venue: text('venue').notNull(),
  address: text('address'),
  hosts: text('hosts').notNull(),
  description: text('description'),
  theme: text('theme'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// RSVPs table storing guest attendance responses
export const rsvps = pgTable('rsvps', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .references(() => events.id)
    .notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  status: text('status').notNull(), // 'Attending' | 'Declined'
  adults: integer('adults').default(1).notNull(),
  children: integer('children').default(0).notNull(),
  headcount: integer('headcount').default(1).notNull(),
  food: text('food').default('Vegetarian').notNull(),
  source: text('source').default('Web RSVP'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
  rsvps: many(rsvps),
}));

export const rsvpsRelations = relations(rsvps, ({ one }) => ({
  event: one(events, {
    fields: [rsvps.eventId],
    references: [events.id],
  }),
}));
