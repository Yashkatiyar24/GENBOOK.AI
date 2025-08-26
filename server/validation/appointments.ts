import { z } from 'zod';

// Coerce and validate ISO datetime strings
const IsoDateTime = z.string().datetime({ offset: true });

export const AppointmentCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  start_time: IsoDateTime,
  end_time: IsoDateTime,
  description: z.string().max(2000, 'Description too long').optional(),
});

export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;

export const AppointmentCreateSchemaWithRules = AppointmentCreateSchema.refine(
  (val: AppointmentCreate) => new Date(val.end_time).getTime() > new Date(val.start_time).getTime(),
  {
    message: 'end_time must be after start_time',
    path: ['end_time'],
  }
);
