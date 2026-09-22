import { describe, expect, it } from 'vitest';
import { parseWhatsAppChat } from './whatsappParser';

describe('parseWhatsAppChat', () => {
  it('parses a basic message', () => {
    const result = parseWhatsAppChat('10/09/2019, 16:04 - Deshan: Hello');
    expect(result.messages).toHaveLength(1);
    const [msg] = result.messages;
    expect(msg.sender).toBe('Deshan');
    expect(msg.text).toBe('Hello');
    expect(msg.date).toBe('2019-09-10');
    expect(msg.timestamp).toBe('16:04');
    expect(msg.type).toBe('message');
  });

  it('detects an emoji sender correctly', () => {
    const result = parseWhatsAppChat('10/09/2019, 16:04 - 🧚Cindy🐰: 🙄');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].sender).toBe('🧚Cindy🐰');
    expect(result.messages[0].text).toBe('🙄');
    expect(result.participants).toContain('🧚Cindy🐰');
  });

  it('keeps a colon inside the message body intact', () => {
    const result = parseWhatsAppChat('10/09/2019, 16:04 - Deshan: Time: 16:04');
    expect(result.messages[0].sender).toBe('Deshan');
    expect(result.messages[0].text).toBe('Time: 16:04');
  });

  it('keeps a URL with a colon intact', () => {
    const result = parseWhatsAppChat(
      '10/09/2019, 16:04 - Deshan: URL: https://example.com'
    );
    expect(result.messages[0].text).toBe('URL: https://example.com');
  });

  it('merges multiline messages into a single message', () => {
    const input = [
      '10/09/2019, 16:04 - Deshan: Hello',
      'second line',
      'third line',
    ].join('\n');
    const result = parseWhatsAppChat(input);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].text).toBe('Hello\nsecond line\nthird line');
  });

  it('treats a line with no "Sender:" pattern as a system message', () => {
    const result = parseWhatsAppChat(
      '10/09/2019, 16:05 - Deshan changed the group icon'
    );
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].type).toBe('system');
    expect(result.messages[0].text).toBe('Deshan changed the group icon');
    expect(result.participants).toHaveLength(0);
  });

  it('treats an encryption notice as a system message', () => {
    const result = parseWhatsAppChat(
      '10/09/2019, 16:10 - Messages to this chat are now secured with end-to-end encryption.'
    );
    expect(result.messages[0].type).toBe('system');
  });

  it('groups messages correctly across multiple dates', () => {
    const input = [
      '10/09/2019, 16:04 - Deshan: Day one',
      '11/09/2019, 09:00 - Deshan: Day two',
      '11/09/2019, 09:05 - Deshan: Still day two',
      '12/09/2019, 08:00 - Deshan: Day three',
    ].join('\n');
    const result = parseWhatsAppChat(input);
    const byDate = result.messages.reduce<Record<string, number>>((acc, m) => {
      acc[m.date] = (acc[m.date] ?? 0) + 1;
      return acc;
    }, {});
    expect(byDate['2019-09-10']).toBe(1);
    expect(byDate['2019-09-11']).toBe(2);
    expect(byDate['2019-09-12']).toBe(1);
    expect(result.firstDate).toBe('2019-09-10');
    expect(result.lastDate).toBe('2019-09-12');
  });

  it('preserves Sinhala and Tamil unicode text', () => {
    const result = parseWhatsAppChat('10/09/2019, 16:04 - Deshan: Koheda inne');
    expect(result.messages[0].text).toBe('Koheda inne');

    const tamil = parseWhatsAppChat('10/09/2019, 16:05 - Deshan: வணக்கம்');
    expect(tamil.messages[0].text).toBe('வணக்கம்');

    const sinhala = parseWhatsAppChat('10/09/2019, 16:06 - Deshan: ආයුබෝවන්');
    expect(sinhala.messages[0].text).toBe('ආයුබෝවන්');
  });

  it('returns an empty result with no crash for an empty/invalid file', () => {
    const result = parseWhatsAppChat('');
    expect(result.messages).toHaveLength(0);
    expect(result.participants).toHaveLength(0);
    expect(result.firstDate).toBeNull();
  });

  it('records a warning for genuinely unparsable content instead of silently dropping it', () => {
    const result = parseWhatsAppChat('this is not a whatsapp export at all');
    expect(result.messages).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('supports the iOS bracket export format', () => {
    const result = parseWhatsAppChat('[10/09/2019, 4:04:32 PM] Deshan: Hello there');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].sender).toBe('Deshan');
    expect(result.messages[0].text).toBe('Hello there');
    expect(result.messages[0].timestamp).toBe('16:04');
  });

  it('detects media placeholders', () => {
    const result = parseWhatsAppChat('10/09/2019, 16:04 - Deshan: <Media omitted>');
    expect(result.messages[0].isMedia).toBe(true);
    expect(result.messages[0].mediaKind).toBe('image');
  });

  it('parses the full sample conversation from the spec with two participants', () => {
    const sample = `10/09/2019, 15:54 - 🧚Cindy🐰: 🙄
10/09/2019, 16:04 - Deshan: Koheda inne
10/09/2019, 16:04 - 🧚Cindy🐰: Gedara yanawa me
10/09/2019, 16:04 - 🧚Cindy🐰: Oya
10/09/2019, 16:04 - Deshan: Koi hariyeda
10/09/2019, 16:04 - 🧚Cindy🐰: Ammala ekka yane aiye
10/09/2019, 16:04 - Deshan: Mkd une
10/09/2019, 16:05 - 🧚Cindy🐰: Oya koheda kiyannko
10/09/2019, 16:05 - Deshan: Eliye
10/09/2019, 16:05 - 🧚Cindy🐰: Thama cmpus ekeda
10/09/2019, 16:05 - Deshan: Nah
10/09/2019, 16:05 - 🧚Cindy🐰: Mmm ain kara neda aiye batch Ekak
10/09/2019, 16:05 - 🧚Cindy🐰: Eken
10/09/2019, 16:05 - Deshan: Ammala dannwda
10/09/2019, 16:05 - Deshan: Ow`;

    const result = parseWhatsAppChat(sample);
    expect(result.messages).toHaveLength(15);
    expect(result.participants.sort()).toEqual(['Deshan', '🧚Cindy🐰'].sort());
    expect(result.firstDate).toBe('2019-09-10');
    expect(result.lastDate).toBe('2019-09-10');
  });
});
