import { z } from 'zod';

export const leadFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  website: z
    .string()
    .min(1, 'Website URL is required')
    .transform((val) => {
      let url = val.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      return url;
    })
    .pipe(z.string().url('Invalid URL')),
  company: z.string().max(100).optional(),
  businessName: z.string().max(200).optional(),
  businessLocation: z.string().max(200).optional(),
});

export type LeadFormInput = z.input<typeof leadFormSchema>;
