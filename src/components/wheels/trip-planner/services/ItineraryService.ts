import { apiFetch } from '@/services/api';
import { Itinerary } from '../types';

export class ItineraryService {
  static async generate(
    start: string,
    end: string,
    duration: number,
    interests: string[]
  ): Promise<Itinerary> {
    const res = await apiFetch('/api/v1/wheels/itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end, duration_days: duration, interests })
    });
    if (!res.ok) throw new Error('Failed to generate itinerary');
    return res.json();
  }
}
