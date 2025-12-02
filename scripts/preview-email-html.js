import dotenv from 'dotenv';
import { emailService } from '../src/services/emailService.js';

dotenv.config();

const testSongs = [
  { id: 1, title: 'Song V1', genre: 'pop', language: 'es', isGift: false, orderItemId: 101, variation: 1, audioUrl: 'https://example.com/song-v1.mp3', imageUrl: 'https://placehold.co/600x400/png?text=V1' },
  { id: 2, title: 'Song V2 (Highlight)', genre: 'pop', language: 'es', isGift: false, orderItemId: 101, variation: 2, audioUrl: 'https://example.com/song-v2.mp3', imageUrl: 'https://placehold.co/600x400/png?text=V2+GOLD' }
];

(async function preview() {
  try {
    const html = emailService.generateEmailTemplate(999, testSongs, 'es', 'MAGICTOKEN123', process.env.LOGO_URL || '');
    console.log(html);
  } catch (err) {
    console.error('Error generating preview:', err);
    process.exit(1);
  }
})();
