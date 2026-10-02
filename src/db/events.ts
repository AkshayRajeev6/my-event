import { eq, desc } from 'drizzle-orm';
import { db } from './index.ts';
import { events, rsvps, users } from './schema.ts';

export async function upsertEvent(eventData: {
  id: string;
  userUid?: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  address?: string;
  hosts: string;
  description?: string;
  theme?: string;
}) {
  try {
    let internalUserId: number | undefined;
    if (eventData.userUid) {
      const userRecord = await db.select().from(users).where(eq(users.uid, eventData.userUid)).limit(1);
      if (userRecord.length > 0) {
        internalUserId = userRecord[0].id;
      }
    }

    const result = await db
      .insert(events)
      .values({
        id: eventData.id,
        userId: internalUserId,
        title: eventData.title,
        date: eventData.date,
        time: eventData.time,
        venue: eventData.venue,
        address: eventData.address,
        hosts: eventData.hosts,
        description: eventData.description,
        theme: eventData.theme,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: events.id,
        set: {
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          venue: eventData.venue,
          address: eventData.address,
          hosts: eventData.hosts,
          description: eventData.description,
          theme: eventData.theme,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertEvent:', error);
    throw new Error('Database operation failed. Please try again later.', { cause: error });
  }
}

export async function getEventById(eventId: string) {
  try {
    const result = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Database query failed in getEventById:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function getEventRsvps(eventId: string) {
  try {
    return await db.select().from(rsvps).where(eq(rsvps.eventId, eventId)).orderBy(desc(rsvps.createdAt));
  } catch (error) {
    console.error('Database query failed in getEventRsvps:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}

export async function upsertRsvp(rsvpData: {
  id: string;
  eventId: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  adults?: number;
  children?: number;
  headcount?: number;
  food?: string;
  source?: string;
  notes?: string;
}) {
  try {
    // Verify event exists
    const existingEvent = await db.select().from(events).where(eq(events.id, rsvpData.eventId)).limit(1);
    if (existingEvent.length === 0) {
      // Auto-create stub event container if not yet saved
      await db.insert(events).values({
        id: rsvpData.eventId,
        title: 'Wedding Celebration & Reception',
        date: 'Saturday, October 24, 2026',
        venue: 'The Grand Heritage Ballroom',
        hosts: 'The Groom & Bride Families',
      }).onConflictDoNothing();
    }

    const adults = rsvpData.adults ?? 1;
    const children = rsvpData.children ?? 0;
    const headcount = rsvpData.headcount ?? (adults + children);

    const result = await db
      .insert(rsvps)
      .values({
        id: rsvpData.id,
        eventId: rsvpData.eventId,
        name: rsvpData.name,
        phone: rsvpData.phone,
        email: rsvpData.email || null,
        status: rsvpData.status,
        adults,
        children,
        headcount,
        food: rsvpData.food || 'Vegetarian',
        source: rsvpData.source || 'Web RSVP',
        notes: rsvpData.notes || null,
      })
      .onConflictDoUpdate({
        target: rsvps.id,
        set: {
          name: rsvpData.name,
          phone: rsvpData.phone,
          email: rsvpData.email || null,
          status: rsvpData.status,
          adults,
          children,
          headcount,
          food: rsvpData.food || 'Vegetarian',
          source: rsvpData.source || 'Web RSVP',
          notes: rsvpData.notes || null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in upsertRsvp:', error);
    throw new Error('Database operation failed. Please try again later.', { cause: error });
  }
}

export async function deleteRsvp(rsvpId: string) {
  try {
    const result = await db.delete(rsvps).where(eq(rsvps.id, rsvpId)).returning();
    return result[0];
  } catch (error) {
    console.error('Database query failed in deleteRsvp:', error);
    throw new Error('Database operation failed. Please try again later.', { cause: error });
  }
}
